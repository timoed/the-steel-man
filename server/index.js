const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001; // Using 3001 to avoid conflict if promptimize is running

// Middleware
app.use(cors());
app.use(express.json());

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

// ...

// Parallel Execution: Run Steel Man and Fallacy Checker simultaneously
app.post('/analyze', async (req, res) => {
    try {
        const { argument } = req.body;

        const [steelManResponse, fallacyResponse] = await Promise.all([
    // 1. The Steel Man: Construct the strongest counter-argument
    openai.chat.completions.create({
        messages: [
            { role: "system", content: "You are 'The Steel Man', a world-class debater and philosopher. Your goal is to represent the opposing view of the user's argument with maximum charity, intellectual rigor, and nuance. \n\nRULES:\n- Do NOT straw man the user. Interpret their argument in its strongest possible form.\n- Do NOT simply summarize. Argue FOR the opposing side.\n- Your tone should be respectful but formidable. You are a worthy adversary.\n- Keep it concise but potent (under 400 words)." },
            { role: "user", content: `Here is my argument:\n"${argument}"\n\nGive me your strongest counter-argument.` }
        ],
        model: "sonar-pro",
    }),

    // 2. The Referee: Find logical fallacies
    openai.chat.completions.create({
        messages: [
            { role: "system", content: "You are a Logic Referee. Analyze the user's text for logical errors effectively. Return ONLY a valid JSON object with two keys: 'score' (0-100 integer representing logical strength) and 'fallacies' (an array of objects with 'type', 'quote', and 'explanation').\n\nExample JSON:\n{\n  \"score\": 65,\n  \"fallacies\": [\n    { \"type\": \"Ad Hominem\", \"quote\": \"because you're stupid\", \"explanation\": \"Attacking the person instead of the argument.\" }\n  ]\n}\n\nIf no fallacies are found, return empty array." },
            { role: "user", content: `Analyze the logic of this argument:\n"${argument}"` }
        ],
        model: "sonar-pro",
    })
]);

const steelManText = steelManResponse.choices[0].message.content;

// Perplexity might return markdown, clean it
let fallacyContent = fallacyResponse.choices[0].message.content;
fallacyContent = fallacyContent.replace(/```json/g, '').replace(/```/g, '').trim();
const analysisData = JSON.parse(fallacyContent);

// Save to DB (Fire and forget, or await if critical)
// const { rows } = await pool.query(...) 

        res.json({
            steel_man: steelManText,
            score: analysisData.score,
            fallacies: analysisData.fallacies
        });
    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ error: "Failed to analyze argument." });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
