import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import History from './History';
import ShareView from './ShareView';

function Arena() {
  const [argument, setArgument] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    if (!argument.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ argument }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Analysis Failed:", error);
      alert("Failed to connect to the server.");
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
          <h2 className="display-1 mb-4">The Anti Echo Chamber.</h2>
          <p className="lead font-monospace text-muted mx-auto" style={{ maxWidth: '700px' }}>
            Test your logic, Expose your fallacies, Leave the Chamber. <br />
            <span className="text-decoration-underline fw-bold text-dark">Face the strongest version of your opposition.</span>
          </p>
        </div>
      )}

      {/* Input Chamber */}
      {!result && (
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-lg">
              <div className="card-body p-4">
                <label className="form-label small fw-bold text-uppercase border-bottom border-dark pb-2 mb-3 d-block">
                  "Resume your spell witch, and I will conjure the order to match your chaos" - Doom
                </label>
                <textarea
                  className="form-control fs-5 border-0 shadow-none px-0"
                  rows="8"
                  placeholder="State your strongest belief here..."
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
          <div className="mb-4 text-center">
            <button
              onClick={() => { setResult(null); setArgument(''); }}
              className="btn btn-outline-dark btn-sm font-monospace me-3"
            >
              ← TEST ANOTHER ARGUMENT
            </button>
            <button
              onClick={handleShare}
              className="btn btn-primary btn-sm font-monospace"
            >
              <i className="bi bi-share-fill me-2"></i>SHARE RESULT
            </button>
          </div>

          {/* Scorecard */}
          <div className="row g-4 mb-5">
            <div className="col-md-4">
              <div className="card h-100 text-center p-4">
                <div className="small fw-bold text-muted text-uppercase mb-2">Logic Score</div>
                <div className={`display-1 fw-bold ${result.score > 80 ? 'text-success' : result.score > 50 ? 'text-warning' : 'text-danger'}`}>
                  {result.score}
                </div>
              </div>
            </div>
            <div className="col-md-8">
              <div className="card h-100 p-4">
                <div className="small fw-bold text-muted text-uppercase mb-3 border-bottom pb-2">Detected Fallacies</div>
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
          </div>

          {/* The Main Event: Cross-Examination */}
          <div className="row g-5">
            <div className="col-md-6">
              <h5 className="border-bottom border-dark pb-3 mb-4 text-uppercase small ls-1 text-muted">Your Argument</h5>
              <div className="p-4 bg-white border border-secondary font-serif fs-5">
                {argument}
              </div>
            </div>

            <div className="col-md-6">
              <h5 className="border-bottom border-dark pb-3 mb-4 text-uppercase small ls-1 d-flex justify-content-between align-items-center text-dark">
                <span>The Steel Man Response</span>
                <span className="badge bg-black rounded-0 fw-normal">OPPOSING VIEW</span>
              </h5>
              <div className="p-4 bg-black text-white border border-dark font-serif fs-5 position-relative shadow-lg">
                {result.steel_man}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function App() {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Header */}
      <header className="border-bottom border-dark py-4 bg-white sticky-top">
        <div className="container">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h3 mb-0 font-serif cursor-pointer" onClick={() => navigate('/')}>
              The Steel Man <span className="text-danger">🥊</span>
            </h1>
            <nav className="nav">
              <Link to="/history" className="nav-link text-muted px-2 small font-monospace">HISTORY</Link>
              <a href="#" className="nav-link text-muted px-2 small font-monospace">LOGIN</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow-1 py-5">
        <Routes>
          <Route path="/" element={<Arena />} />
          <Route path="/history" element={<History onViewDebate={(debate) => navigate('/')} />} />
          <Route path="/share/:id" element={<ShareView />} />
        </Routes>
      </main>

      <footer className="py-4 text-center small text-muted border-top border-dark mt-auto font-monospace">
        &copy; {new Date().getFullYear()} The Steel Man. Challenge Yourself.
      </footer>
    </div>
  );
}

export default App;
