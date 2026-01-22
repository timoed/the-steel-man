import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, storage } from './firebase'; // Ensure storage is exported from firebase.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { API_URL } from './config';

function Account({ userId, isPro, onLogout, onUpgrade }) {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        if (!userId) return;
        try {
            const res = await fetch(`${API_URL}/api/me`, {
                headers: { 'x-user-id': userId }
            });
            const data = await res.json();
            setProfile(data);
            setNewName(data.display_name || '');
        } catch (e) {
            console.error("Failed to fetch profile", e);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const storageRef = ref(storage, `avatars/${userId}/${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            // Update Backend
            await updateBackend({ photo_url: url });
            setProfile(prev => ({ ...prev, photo_url: url }));
        } catch (e) {
            console.error("Upload failed", e);
            alert("Failed to upload image. Ensure Firebase Storage is enabled.");
        } finally {
            setUploading(false);
        }
    };

    const handleNameUpdate = async () => {
        await updateBackend({ display_name: newName });
        setProfile(prev => ({ ...prev, display_name: newName }));
        setIsEditing(false);
    };

    const updateBackend = async (updates) => {
        try {
            await fetch(`${API_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify(updates)
            });
        } catch (e) {
            console.error("Update failed", e);
        }
    };

    if (!profile) return <div className="p-5 text-center font-monospace">L O A D I N G . . .</div>;

    return (
        <div className="container py-5">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                    <div className="card shadow-hard">
                        <div className="card-header py-4 d-flex justify-content-between align-items-center">
                            <h4 className="mb-0 font-serif fw-bold">User Profile</h4>
                            {isPro && <span className="badge bg-black text-white rounded-0 font-monospace border border-dark">AG PRO</span>}
                        </div>
                        <div className="card-body p-4 text-center">

                            {/* Avatar Section */}
                            <div className="position-relative d-inline-block mb-4">
                                <img
                                    src={profile.photo_url || "https://ui-avatars.com/api/?name=" + (profile.email || "User") + "&background=000&color=fff"}
                                    alt="Profile"
                                    className="rounded-circle border border-dark"
                                    style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                />
                                <label className="position-absolute bottom-0 end-0 bg-white border border-dark rounded-circle p-2 cursor-pointer hover-shadow" title="Change Avatar">
                                    <i className="bi bi-camera-fill text-dark"></i>
                                    <input type="file" onChange={handleAvatarUpload} className="d-none" accept="image/*" />
                                </label>
                            </div>
                            {uploading && <div className="small font-monospace text-muted mb-2">Uploading...</div>}

                            {/* Name Section */}
                            {isEditing ? (
                                <div className="input-group mb-3 px-5">
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                    />
                                    <button className="btn btn-dark rounded-0" onClick={handleNameUpdate}><i className="bi bi-check-lg"></i></button>
                                </div>
                            ) : (
                                <h3 className="font-serif mb-1">
                                    {profile.display_name || "Anonymous User"}
                                    <button className="btn btn-link text-muted ms-2 p-0 border-0 shadow-none align-baseline" onClick={() => setIsEditing(true)}><i className="bi bi-pencil-square"></i></button>
                                </h3>
                            )}

                            <p className="font-monospace text-muted small mb-4">{profile.email}</p>

                            <hr className="my-4 border-dark" />

                            {/* Stats */}
                            <div className="row g-0 mb-4 text-start">
                                <div className="col-6 border-end border-dark px-3">
                                    <div className="small text-uppercase text-muted fw-bold">Status</div>
                                    <div className="fs-4 font-monospace">{isPro ? "PRO" : "FREE"}</div>
                                </div>
                                <div className="col-6 px-3">
                                    <div className="small text-uppercase text-muted fw-bold">Joined</div>
                                    <div className="fs-4 font-monospace">2024</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="d-grid gap-3">
                                {!isPro && (
                                    <button onClick={onUpgrade} className="btn btn-primary py-3">
                                        UPGRADE TO PRO
                                    </button>
                                )}
                                <button onClick={onLogout} className="btn btn-outline-dark py-2">
                                    LOGOUT
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Account;
