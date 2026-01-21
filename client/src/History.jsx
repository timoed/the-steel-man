import React, { useEffect, useState } from 'react';

function History({ onViewDebate }) {
    const [debates, setDebates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:3001/api/debates')
            .then(res => res.json())
            .then(data => {
                setDebates(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load history", err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="container animate-fade-in">
            <h2 className="display-4 text-center mb-5 font-serif">Debate History</h2>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border" role="status"></div>
                </div>
            ) : debates.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <p className="lead font-monospace">No battles recorded yet.</p>
                </div>
            ) : (
                <div className="row g-4 justify-content-center">
                    {debates.map(debate => (
                        <div key={debate.id} className="col-lg-8">
                            <div className="card h-100 hover-shadow transition-all cursor-pointer" onClick={() => onViewDebate(debate)}>
                                <div className="card-body p-4 d-flex justify-content-between align-items-center">
                                    <div>
                                        <div className="small text-muted font-monospace mb-2">
                                            {new Date(debate.created_at).toLocaleDateString()}
                                        </div>
                                        <h5 className="font-serif mb-0 text-truncate" style={{ maxWidth: '500px' }}>
                                            {debate.argument_text.substring(0, 80)}...
                                        </h5>
                                    </div>
                                    <div className="text-end">
                                        <div className={`display-6 fw-bold ${debate.strength_score > 80 ? 'text-success' : 'text-danger'}`}>
                                            {debate.strength_score}
                                        </div>
                                        <div className="small text-muted uppercase font-monospace" style={{ fontSize: '0.65rem' }}>STRENGTH</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default History;
