import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function ShareView() {
    const { id } = useParams();
    const [debate, setDebate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(`http://localhost:3001/api/debates/${id}`)
            .then(res => {
                if (!res.ok) throw new Error("Debate not found");
                return res.json();
            })
            .then(data => {
                // Parse fallacies if string
                if (typeof data.fallacies_found === 'string') {
                    try { data.fallacies_found = JSON.parse(data.fallacies_found); } catch (e) { data.fallacies_found = []; }
                }
                setDebate(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;
    if (error) return <div className="text-center py-5 text-danger font-monospace">ERROR: {error}</div>;

    return (
        <div className="container py-5 animate-fade-in">
            {/* Reusing the result layout */}
            <div className="mb-5 text-center">
                <h1 className="h3 font-serif mb-3">The Steel Man <span className="text-danger">🥊</span></h1>
                <span className="badge bg-black text-white font-monospace p-2">SHARED DEBATE # {id.slice(0, 8)}</span>
            </div>

            <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="card h-100 text-center p-4">
                        <div className="small fw-bold text-muted text-uppercase mb-2">Logic Score</div>
                        <div className={`display-1 fw-bold ${debate.strength_score > 80 ? 'text-success' : debate.strength_score > 50 ? 'text-warning' : 'text-danger'}`}>
                            {debate.strength_score}
                        </div>
                    </div>
                </div>
                <div className="col-md-8">
                    <div className="card h-100 p-4">
                        <div className="small fw-bold text-muted text-uppercase mb-3 border-bottom pb-2">Detected Fallacies</div>
                        {debate.fallacies_found && debate.fallacies_found.length > 0 ? (
                            <ul className="list-unstyled mb-0">
                                {debate.fallacies_found.map((f, i) => (
                                    <li key={i} className="mb-3 d-flex align-items-start">
                                        <span className="badge bg-danger rounded-0 me-3 font-monospace">{f.type}</span>
                                        <div>
                                            <div className="fst-italic text-muted">"{f.quote}"</div>
                                            <div className="small">{f.explanation}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-success d-flex align-items-center h-100">
                                <i className="bi bi-check-circle-fill fs-4 me-3"></i>
                                <span>Clean Logic. No major fallacies detected.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="row g-5">
                <div className="col-md-6">
                    <h5 className="border-bottom border-dark pb-3 mb-4 text-uppercase small ls-1 text-muted">User Argument</h5>
                    <div className="p-4 bg-white border border-secondary font-serif fs-5">
                        {debate.argument_text}
                    </div>
                </div>
                <div className="col-md-6">
                    <h5 className="border-bottom border-dark pb-3 mb-4 text-uppercase small ls-1 d-flex justify-content-between align-items-center text-dark">
                        <span>The Steel Man Response</span>
                        <span className="badge bg-black rounded-0 fw-normal">OPPOSING VIEW</span>
                    </h5>
                    <div className="p-4 bg-black text-white border border-dark font-serif fs-5 position-relative shadow-lg">
                        {debate.steel_man_response}
                    </div>
                </div>
            </div>

            <div className="text-center mt-5">
                <Link to="/" className="btn btn-primary btn-lg px-5">Enter The Arena Yourself</Link>
            </div>
        </div>
    );
}

export default ShareView;
