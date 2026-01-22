const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const OpenAI = require('openai');
require('dotenv').config();

console.log("Starting Server...");
console.log("Environment Check:", {
    PORT: process.env.PORT,
    DB_URL: !!process.env.DATABASE_URL,
    STRIPE: !!process.env.STRIPE_SECRET_KEY,
    OPENAI: !!process.env.PERPLEXITY_API_KEY || !!process.env.OPENAI_API_KEY
});

const app = express();
const port = process.env.PORT || 3001; // Using 3001 to avoid conflict if promptimize is running

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Perplexity Setup
const openai = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: 'https://api.perplexity.ai',
});

// Stripe & User Helpers
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const getOrCreateUser = async (userId) => {
    if (!userId) return null;
    try {
        let res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (res.rows.length === 0) {
            // Create user with simplified data satisfying schema constraints
            // We use the UUID for firebase_uid to satisfy NOT NULL and UNIQUE
            // We create a unique dummy email
            const anonEmail = `anon_${userId.substring(0, 8)}@example.com`;
            await pool.query(
                'INSERT INTO users (id, email, firebase_uid, subscription_tier) VALUES ($1, $2, $3, $4)',
                [userId, anonEmail, userId, 'free']
            );
            return { id: userId, subscription_tier: 'free' };
        }
        return res.rows[0];
    } catch (e) {
        console.error("User Fetch/Create Error", e);
        return null;
    }
};

const isPro = (user) => user && (user.subscription_tier === 'pro' || user.subscription_tier === 'enterprise');

// ...

// --- ROUTES ---

// Get User Status
app.get('/api/me', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const user = await getOrCreateUser(userId);
    res.json({
        is_pro: isPro(user),
        is_guest: user && user.email && user.email.startsWith('anon_'),
        email: user.email,
        display_name: user.display_name,
        photo_url: user.photo_url,
        subscription_tier: user.subscription_tier
    });
});

// Firebase Auth Sync
app.post('/api/auth/login', async (req, res) => {
    const { firebase_uid, email } = req.body;
    try {
        // Try finding by firebase_uid
        let result = await pool.query('SELECT * FROM users WHERE firebase_uid = $1', [firebase_uid]);

        if (result.rows.length === 0) {
            // New User via Firebase
            result = await pool.query(
                'INSERT INTO users (firebase_uid, email, subscription_tier) VALUES ($1, $2, $3) RETURNING *',
                [firebase_uid, email, 'free']
            );
        }
        res.json(result.rows[0]);
    } catch (e) {
        console.error("Auth Sync Error", e);
        res.status(500).json({ error: "Auth failed" });
    }
});

// Create Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
    const { userId } = req.body;
    const priceId = process.env.VITE_STRIPE_PRICE_PRO_ID || 'price_1SrrVyBP6Gnbkkx3W5NCv7qd';

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: `${req.headers.origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}/?canceled=true`,
            metadata: { userId: userId }
        });
        res.json({ url: session.url });
    } catch (e) {
        console.error("Stripe Error", e);
        res.status(500).json({ error: e.message });
    }
});

// Manual Verification Endpoint (for when webhooks fail locally)
app.post('/api/verify-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
            const userId = session.metadata.userId;
            await pool.query("UPDATE users SET subscription_tier = 'pro' WHERE id = $1", [userId]);
            return res.json({ success: true, is_pro: true });
        }
        res.json({ success: false });
    } catch (e) {
        console.error("Verification Error", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.userId;
        if (userId) {
            await pool.query("UPDATE users SET subscription_tier = 'pro' WHERE id = $1", [userId]);
            console.log(`User ${userId} upgraded to PRO`);
        }
    }
    res.json({ received: true });
});


// Parallel Execution: Run Steel Man and Fallacy Checker simultaneously
app.post('/api/analyze', async (req, res) => {
    try {
        const { argument } = req.body;
        const userId = req.headers['x-user-id'];

        // Get User context
        const user = await getOrCreateUser(userId);
        const userIsPro = isPro(user);

        const [steelManResponse, fallacyResponse] = await Promise.all([
            // 1. The Steel Man
            openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are 'The Steel Man', a world-class debater and philosopher. Your goal is to represent the opposing view of the user's argument with maximum charity, intellectual rigor, and nuance. \n\nRULES:\n- Do NOT straw man the user. Interpret their argument in its strongest possible form.\n- Do NOT simply summarize. Argue FOR the opposing side.\n- Your tone should be respectful but formidable. You are a worthy adversary.\n- Keep it concise but potent (under 400 words)." },
                    { role: "user", content: `Here is my argument:\n"${argument}"\n\nGive me your strongest counter-argument.` }
                ],
                model: "sonar-pro",
            }),

            // 2. The Referee
            openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a Logic Referee. Analyze the user's text for logical errors effectively. Return ONLY a valid JSON object with two keys: 'score' (0-100 integer representing logical strength) and 'fallacies' (an array of objects with 'type', 'quote', and 'explanation').\n\nExample JSON:\n{\n  \"score\": 65,\n  \"fallacies\": [\n    { \"type\": \"Ad Hominem\", \"quote\": \"because you're stupid\", \"explanation\": \"Attacking the person instead of the argument.\" }\n  ]\n}\n\nIf no fallacies are found, return empty array." },
                    { role: "user", content: `Analyze the logic of this argument:\n"${argument}"` }
                ],
                model: "sonar-pro",
            })
        ]);

        const steelManText = steelManResponse.choices[0].message.content;

        // Clean JSON
        let fallacyContent = fallacyResponse.choices[0].message.content;
        fallacyContent = fallacyContent.replace(/```json/g, '').replace(/```/g, '').trim();
        let analysisData = {};
        try {
            analysisData = JSON.parse(fallacyContent);
        } catch (e) {
            console.error("JSON Parse Error", e);
            analysisData = { score: 50, fallacies: [] };
        }

        let savedId = null;
        let createdAt = new Date().toISOString();

        // Save to DB (Persistence for History)
        // We save for everyone so Free users can see their "Last 1" debate.
        const insertQuery = `
            INSERT INTO debates (user_id, argument_text, steel_man_response, fallacies_found, strength_score, attachment_url)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at
        `;

        try {
            const { rows } = await pool.query(insertQuery, [
                userId,
                argument,
                steelManText,
                JSON.stringify(analysisData.fallacies || []),
                analysisData.score || 0,
                req.body.attachment_url || null // Fix: Grab attachment from request body
            ]);
            savedId = rows[0].id;
            createdAt = rows[0].created_at;
        } catch (dbErr) {
            console.error("DB Insert Error", dbErr);
        }

        res.json({
            id: savedId, // Null if not saved (Free tier)
            steel_man: steelManText,
            score: analysisData.score,
            fallacies: analysisData.fallacies,
            created_at: createdAt,
            is_pro: userIsPro,
            saved: !!savedId
        });
    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ error: "Failed to analyze argument." });
    }
});

// Get Single Debate (Public/Shared)
app.get('/api/debates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM debates WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Debate not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch debate" });
    }
});

// History Endpoint (User Specific)
app.get('/api/debates', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: "Missing identity" });

    // Check Pro Status
    const user = await getOrCreateUser(userId);
    const isProUser = isPro(user);

    // Limits: Always fetch 50, client handles hiding/locking
    const limit = 50;

    try {
        const result = await pool.query('SELECT * FROM debates WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// Update User Profile
app.put('/api/users/me', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { display_name, photo_url } = req.body;
    if (!userId) return res.status(401).json({ error: "Missing identity" });

    try {
        await pool.query(
            'UPDATE users SET display_name = COALESCE($1, display_name), photo_url = COALESCE($2, photo_url) WHERE id = $3',
            [display_name, photo_url, userId]
        );
        res.json({ success: true });
    } catch (e) {
        console.error("Profile Update Error", e);
        res.status(500).json({ error: "Failed to update profile" });
    }
});

// Delete Debate
app.delete('/api/debates/:id', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { id } = req.params;

    if (!userId) return res.status(401).json({ error: "Missing identity" });

    try {
        // Verify ownership
        const checkResult = await pool.query('SELECT user_id FROM debates WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: "Debate not found" });
        }
        if (checkResult.rows[0].user_id !== userId) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await pool.query('DELETE FROM debates WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Delete Error", err);
        res.status(500).json({ error: "Failed to delete debate" });
    }
});

// Update Debate (Rename/Notes)
app.put('/api/debates/:id', async (req, res) => {
    const userId = req.headers['x-user-id'];
    const { id } = req.params;
    const { title } = req.body;

    if (!userId) return res.status(401).json({ error: "Missing identity" });

    try {
        const checkResult = await pool.query('SELECT user_id FROM debates WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) return res.status(404).json({ error: "Debate not found" });
        if (checkResult.rows[0].user_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        await pool.query('UPDATE debates SET title = $1 WHERE id = $2', [title, id]);
        res.json({ success: true, title }); // return title to update frontend state
    } catch (err) {
        console.error("Update Debate Error", err);
        res.status(500).json({ error: "Failed to update debate" });
    }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

// Export for Vercel
module.exports = app;
