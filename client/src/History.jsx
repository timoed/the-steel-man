import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './config';

function History({ onViewDebate, userId, isPro, isGuest, onUpgrade }) {
    const [debates, setDebates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissionError, setPermissionError] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (!userId) return;
        fetchHistory();
    }, [userId]);

    const handleLockClick = () => {
        if (isGuest) {
            navigate('/login?mode=signup');
        } else {
            onUpgrade();
        }
    };

    const fetchHistory = () => {
        fetch(`${API_URL}/api/debates`, {
            headers: { 'x-user-id': userId }
        })
            .then(res => {
                if (res.status === 403) throw new Error("Payment Required");
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) setDebates(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load history", err);
                if (err.message === "Payment Required") setPermissionError(true);
                setLoading(false);
            });
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent card click
        if (!window.confirm("Are you sure you want to delete this record?")) return;

        try {
            const res = await fetch(`${API_URL}/api/debates/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': userId }
            });
            if (res.ok) {
                setDebates(debates.filter(d => d.id !== id));
            } else {
                alert("Failed to delete record.");
            }
        } catch (error) {
            console.error("Delete failed", error);
            alert("Error deleting record.");
        }
    };

    if (permissionError) {
        return (
            <div className="container animate-fade-in text-center py-5">
                <h2 className="display-4 mb-4 font-serif">Full Access Required</h2>
                <div className="alert alert-warning d-inline-block p-4">
                    <strong>Upgrade to Chamber Access</strong> to unlock your full battle history.
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in">
            <h2 className="display-4 text-center mb-5 font-serif border-bottom border-dark pb-3">Debate History</h2>

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border" role="status"></div>
                </div>
            ) : debates.length === 0 ? (
                <div className="text-center text-muted py-5 border-2 border-dashed border-secondary">
                    <p className="lead font-monospace mb-0">No battles recorded yet.</p>
                </div>
            ) : (
                <div className="row g-4">
                    {debates.map((debate, index) => {
                        const isLocked = !isPro && index > 0;
                        let fallacyCount = 0;
                        try {
                            const raw = debate.fallacies_found;
                            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (Array.isArray(parsed)) fallacyCount = parsed.length;
                        } catch (e) {
                            console.warn("Failed to count fallacies", e);
                        }

                        return (
                            <div key={debate.id} className="col-md-6 col-lg-4">
                                <div
                                    className={`card h-100 position-relative ${isLocked ? 'bg-light' : ''}`}
                                    style={isLocked ? { cursor: 'pointer' } : {}}
                                    onClick={() => isLocked && handleLockClick()}
                                >
                                    {isLocked && (
                                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 10 }}>
                                            <div className="text-center p-3">
                                                <i className="bi bi-lock-fill fs-1 mb-2"></i>
                                                <div className="fw-bold small text-uppercase">
                                                    {isGuest ? (
                                                        <>Sign Up / Login<br />and Upgrade to Unlock</>
                                                    ) : (
                                                        "Upgrade to Unlock"
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <div className="small font-monospace text-muted d-flex align-items-center">
                                            {new Date(debate.created_at).toLocaleDateString()}
                                            {debate.attachment_url && <i className="bi bi-paperclip ms-2 text-dark" title="Has attachment"></i>}
                                        </div>
                                        {/* Dropdown Menu - Hide for Guests */}
                                        {!isLocked && !isGuest && (
                                            <div className="dropdown">
                                                <button
                                                    className="btn btn-link text-dark p-0 border-0 shadow-none"
                                                    type="button"
                                                    data-bs-toggle="dropdown"
                                                    aria-expanded="false"
                                                    onClick={(e) => { e.stopPropagation(); }}
                                                >
                                                    <i className="bi bi-three-dots-vertical"></i>
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end shadow-hard border-dark rounded-0">
                                                    <li><button className="dropdown-item font-monospace small" onClick={(e) => { e.stopPropagation(); onViewDebate(debate); }}>View Analysis</button></li>
                                                    <li>
                                                        <button
                                                            className="dropdown-item font-monospace small"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const newTitle = prompt("Enter new title:", debate.title || "Debate " + debate.id.substring(0, 6));
                                                                if (newTitle) {
                                                                    try {
                                                                        await fetch(`${API_URL}/api/debates/${debate.id}`, {
                                                                            method: 'PUT',
                                                                            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
                                                                            body: JSON.stringify({ title: newTitle })
                                                                        });
                                                                        window.location.reload();
                                                                    } catch (err) { console.error(err); alert("Failed to rename"); }
                                                                }
                                                            }}
                                                        >
                                                            Rename
                                                        </button>
                                                    </li>
                                                    <li><hr className="dropdown-divider" /></li>
                                                    <li>
                                                        <button
                                                            className="dropdown-item text-danger font-monospace small"
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(e, debate.id); }}
                                                        >
                                                            Delete Record
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        className={`card-body ${isLocked ? 'blur-content' : ''}`}
                                        onClick={() => !isLocked && onViewDebate(debate)}
                                        style={{ cursor: isLocked ? 'default' : 'pointer' }}
                                    >
                                        <h5 className="card-title font-serif mb-3 fw-bold">
                                            {debate.title || (debate.argument_text ? debate.argument_text.substring(0, 50) + "..." : "Untitled Argument")}
                                        </h5>
                                        <p className="card-text small text-muted font-monospace mb-2">
                                            <strong>Steel Man says:</strong> "{debate.steel_man_response ? debate.steel_man_response.substring(0, 60) : ""}..."
                                        </p>

                                        <div className="mt-3 pt-3 border-top border-dark"></div>
                                    </div>

                                    <div className="card-footer pt-3">
                                        <div className="row text-center">
                                            <div className="col-6 border-end border-dark border-2">
                                                <div className="small text-uppercase text-muted mb-1">Logic Score</div>
                                                <div className={`fw-bold fs-4 font-monospace ${debate.strength_score > 80 ? 'text-success' : debate.strength_score > 50 ? 'text-warning' : 'text-danger'}`}>
                                                    {debate.strength_score}
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="small text-uppercase text-muted mb-1">Fallacies</div>
                                                <div className="fw-bold fs-4 font-monospace">{fallacyCount}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div >
            )}
        </div >
    );
}

export default History;
