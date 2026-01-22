import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from './firebase';
import { API_URL } from './config';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let userCredential;
            if (isLogin) {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            } else {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
            }

            // Sync with our backend to get the UUID
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firebase_uid: userCredential.user.uid,
                    email: userCredential.user.email
                })
            });

            if (!res.ok) throw new Error("Backend sync failed");

            const data = await res.json();

            // Critical: Update the local storage ID so the rest of the app sees the logged-in user
            localStorage.setItem('sm_user_id', data.id);

            // Navigate to home to update App state (since App.jsx checks localStorage on mount)
            // Prefer client-side navigation instead of full reload.
            navigate('/');

        } catch (err) {
            console.error(err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="container min-vh-100 d-flex align-items-center justify-content-center">
            <div className="card shadow-hard" style={{ maxWidth: '400px', width: '100%' }}>
                <div className="card-header text-center py-4">
                    <h2 className="fw-bold font-serif mb-0">{isLogin ? 'Enter the Chamber' : 'Join the Fight'}</h2>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleSubmit}>
                        {error && <div className="alert alert-danger border-dark rounded-0 font-monospace small">{error}</div>}

                        <div className="mb-3">
                            <label className="form-label fw-bold small text-uppercase">Email :</label>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label fw-bold small text-uppercase">Password :</label>
                            <input
                                type="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="btn btn-primary w-100 py-3 mb-3"
                        >
                            {loading ? 'AUTHENTICATING...' : (isLogin ? 'LOG IN' : 'CREATE ACCOUNT')}
                        </button>
                    </form>
                </div>
                <div className="card-footer text-center py-3">
                    <span className="small font-monospace text-muted">
                        {isLogin ? "New to logic?" : "Already initiated?"}
                        <button
                            type="button"
                            className="btn btn-link text-dark fw-bold text-decoration-none p-0 ms-2 align-baseline border-0 shadow-none"
                            onClick={() => setIsLogin(!isLogin)}
                        >
                            {isLogin ? "Sign up" : "Log in"}
                        </button>
                    </span>
                </div>
            </div>
        </div>
    );
}
