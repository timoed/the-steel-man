import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import History from './History';
import ShareView from './ShareView';
import Account from './Account';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { API_URL } from './config';

function Arena({ userId }) {
  const [argument, setArgument] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.debate) {
      // Initialize with debate from history navigation
      const debate = location.state.debate;
      setResult({
        id: debate.id,
        score: debate.strength_score,
        steel_man: debate.steel_man_response,
        fallacies: debate.fallacies_found // Assuming this matches schema
      });
      setArgument(debate.argument_text);
      // Clear state so reload doesn't persist? Or keep it. keeping for now.
    }
  }, [location.state]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!argument.trim()) return;
    setLoading(true);
    setResult(null);

    let attachmentUrl = null;

    try {
      if (file) {
        const storageRef = ref(storage, `uploads/${userId}/${file.name}-${Date.now()}`);
        await uploadBytes(storageRef, file);
        attachmentUrl = await getDownloadURL(storageRef);
      }

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          argument,
          attachment_url: attachmentUrl
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis Failed:", error);
      alert("Failed to connect to the server or upload file.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/share/${result.id}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard: " + url);
  };

  return (
    <div className="container">
      {/* Hero Section */}
      {!result && (
        <div className="text-center mb-5">
          <h2 className="display-1 mb-4">The Anti-Echo Chamber</h2>
          <p className="lead font-monospace text-muted mx-auto" style={{ maxWidth: '700px' }}>
            Test your logic, Expose your fallacies. <br />
          </p>
        </div>
      )}

      {/* Input Chamber */}
      {!result && (
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card mb-4">
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center border-bottom border-dark pb-2 mb-3">
                  <label className="form-label small fw-bold text-uppercase mb-0">
                    Initial Argument
                  </label>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      className="btn btn-sm btn-link text-dark p-0 border-0 text-decoration-none"
                      onClick={() => file ? handleRemoveFile() : fileInputRef.current.click()}
                      title={file ? "Remove file" : "Attach file"}
                    >
                      {file ? (
                        <span className="d-flex align-items-center">
                          <span className="small me-2 text-muted fst-italic font-monospace" style={{ fontSize: '0.8rem' }}>{file.name}</span>
                          <i className="bi bi-x-lg fs-5"></i>
                        </span>
                      ) : (
                        <i className="bi bi-paperclip fs-4"></i>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  className="form-control fs-5 border-0 shadow-none px-0"
                  rows="8"
                  placeholder="State your strongest beliefs here...Or your enemies'"
                  style={{ resize: 'none' }}
                  value={argument}
                  onChange={(e) => setArgument(e.target.value)}
                ></textarea>
              </div>
              <div className="card-footer bg-black p-0 border-top border-dark">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !argument}
                  className="btn btn-primary w-100 py-3 rounded-0 border-0"
                >
                  {loading ? (
                    <span><span className="spinner-border spinner-border-sm me-2"></span>ANALYZING...</span>
                  ) : (
                    'COMMENCE ANALYSIS →'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Dashboard */}
      {result && (
        <div className="animate-fade-in">
          <div className="d-flex justify-content-end mb-3">
            <button
              onClick={() => { setResult(null); setArgument(''); }}
              className="btn btn-outline-dark btn-sm font-monospace me-2"
            >
              ← RE-ENTER
            </button>
            <button
              onClick={handleShare}
              className="btn btn-primary btn-sm font-monospace"
            >
              <i className="bi bi-share-fill me-2"></i>SHARE
            </button>
          </div>

          {/* Unified Scorecard */}
          <div className="card mb-5 shadow-hard">
            <div className="card-header bg-white py-3 border-bottom border-dark d-flex justify-content-between align-items-center">
              <div className="small fw-bold text-muted text-uppercase">Detected Fallacies</div>
              <div className="d-flex align-items-center">
                <span className="small text-muted text-uppercase me-3">Logic Score:</span>
                <span className={`fs-3 fw-bold font-monospace ${result.score > 80 ? 'text-success' : result.score > 50 ? 'text-warning' : 'text-danger'}`}>
                  {result.score}
                </span>
              </div>
            </div>
            <div className="card-body p-4">
              {result.fallacies && result.fallacies.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {result.fallacies.map((f, i) => (
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

          {/* The Main Event: Cross-Examination */}
          <div className="row g-5">
            <div className="col-md-6">
              <h2 className="border-bottom border-dark pb-3 mb-4 text-uppercase small ls-1 text-muted">Echo Chamber</h2>
              <div className="p-4 bg-white border border-secondary font-serif fs-5">
                {argument}
              </div>
            </div>

            <div className="col-md-6">
              <h2 className="border-bottom border-dark pb-3 mb-4 text-uppercase small ls-1 d-flex justify-content-between align-items-center text-dark">
                <span>The Steel Man</span>
              </h2>
              <div className="card bg-black text-white p-4 border border-dark font-serif fs-5 position-relative">
                {result.steel_man}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

import Login from './Login';
// ... existing imports

// ... Arena component code ...

// ... existing imports

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = localStorage.getItem('sm_user_id');
  const [isPro, setIsPro] = useState(false);
  const [isGuest, setIsGuest] = useState(true);

  const checkProStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/api/me`, {
        headers: { 'x-user-id': userId }
      });
      const data = await res.json();
      setIsPro(data.is_pro);
      setIsGuest(data.is_guest);
    } catch (error) {
      console.error("Failed to check status", error);
    }
  }, [userId]);

  const verifySubscription = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API_URL}/api/verify-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (data.success) {
        setIsPro(true);
        setIsGuest(false);
        alert("Upgrade Successful! Welcome to the Chamber.");
      }
    } catch (error) {
      console.error("Verification failed", error);
    }
  }, []);

  useEffect(() => {
    console.log("🚀 API Configured:", API_URL); // DEBUG LOG
    let currentUserId = localStorage.getItem('sm_user_id');
    if (!currentUserId) {
      currentUserId = crypto.randomUUID();
      localStorage.setItem('sm_user_id', currentUserId);
      window.location.reload();
      return;
    }

    // Check for success URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true' && params.get('session_id')) {
      setTimeout(() => {
        verifySubscription(params.get('session_id'));
      }, 0);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      setTimeout(() => {
        checkProStatus();
      }, 0);
    }
  }, [checkProStatus, verifySubscription]);

  const handleUpgrade = async () => {
    if (!userId) return navigate('/login');

    try {
      const res = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Upgrade failed. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sm_user_id');
    window.location.href = '/login';
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Header */}
      <header className="border-bottom border-dark py-4 bg-white sticky-top">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h3 mb-0 font-serif cursor-pointer" onClick={() => navigate('/')}>
              The Steel Man <span className="text-danger"></span>
            </h1>
            <nav className="nav">
              <Link to="/history" className="nav-link text-muted px-2 small font-monospace">HISTORY</Link>

              {/* Show Profile only for Registered Users (Pro or Free), not Guests */}
              {userId && !isGuest && location.pathname !== '/login' && (
                <Link to="/account" className="nav-link text-dark px-2 small font-monospace fw-bold">PROFILE</Link>
              )}

              {userId && !isGuest && location.pathname !== '/login' ? (
                <>
                  {!isPro && <button onClick={handleUpgrade} className="nav-link text-primary fw-bold px-2 small font-monospace bg-transparent border-0">UPGRADE</button>}
                  <button onClick={handleLogout} className="nav-link text-muted px-2 small font-monospace bg-transparent border-0">LOGOUT</button>
                </>
              ) : (
                <Link to="/login" className="nav-link text-muted px-2 small font-monospace">LOGIN</Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow-1 py-5">
        <Routes>
          <Route path="/" element={<Arena userId={userId} />} />
          <Route path="/history" element={<History onViewDebate={(debate) => navigate('/', { state: { debate } })} userId={userId} isPro={isPro} isGuest={isGuest} onUpgrade={handleUpgrade} />} />
          <Route path="/account" element={<Account userId={userId} isPro={isPro} isGuest={isGuest} onLogout={handleLogout} onUpgrade={handleUpgrade} />} />
          <Route path="/share/:id" element={<ShareView />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>

      <footer className="py-4 text-center small text-muted mt-auto font-monospace">
        &copy; {new Date().getFullYear()} The Steel Man. Leave the Chamber.
      </footer>
    </div>
  );
}

export default App;
