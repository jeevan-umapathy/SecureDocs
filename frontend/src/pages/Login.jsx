import { API } from "../config";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"


function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [challenge, setChallenge] = useState("");
    const [code, setCode] = useState("");
    const navigate = useNavigate();

    const [error, setError] = useState("");

    const handleLogin = async () => {
        setError("");
        try {
            const response = await fetch(
                challenge ? API + "/auth/login/mfa" : API + "/auth/login",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(challenge ? { challenge, code } : { email, password })
                }
            );
            const data = await response.json();
            if (!response.ok) {
                setError(data.message || "Sign in failed.");
                return;
            }
            if (data.mfa_required) {
                setChallenge(data.challenge);
                setPassword("");
                return;
            }
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            navigate("/dashboard");
        } catch {
            setError("Could not connect to the server.");
        }
    };
    return (
        <div className="auth-page">
            <section className="auth-panel">
                <div className="auth-card">



                    <div className="auth-header">
                        <h1>SecureDocs</h1>
                        <p>{challenge ? "Enter your authenticator code" : "Sign in to your account"}</p>
                    </div>

                    <div className="auth-form">
                        {!challenge && <><label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <label>Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            /></>}
                        {challenge && <>
                            <label htmlFor="mfa-code">Six-digit code</label>
                            <input id="mfa-code" inputMode="numeric" autoComplete="one-time-code"
                                maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
                        </>}
                        {error && <p className="error-message">{error}</p>}

                        <button onClick={handleLogin}>
                            {challenge ? "Verify and sign in" : "Login"}
                        </button>
                        {challenge && <button type="button" onClick={() => {
                            setChallenge(""); setCode(""); setError("");
                        }}>Start over</button>}
                    </div>

                    <p className="auth-switch">
                        Don't have an account? {" "}
                        <Link to="/register">
                            Create an account
                        </Link>
                    </p>
                </div>
            </section>


            <section className="auth-visual">
                <div className="auth-art" aria-hidden="true">
                    <div className="art-grid" />

                    <div className="art-document art-document-back">
                        <div className="art-file-icon">≡</div>
                        <div className="art-line art-line-long" />
                        <div className="art-line art-line-short" />
                        <div className="art-line art-line-medium" />
                    </div>

                    <div className="art-transfer-path">
                        <span className="art-transfer-dot" />
                    </div>

                    <div className="art-document art-document-front">
                        <div className="art-doc-top">
                            <span className="art-file-icon">≡</span>
                            <span className="art-verified">✓</span>
                        </div>

                        <div className="art-line art-line-long" />
                        <div className="art-line art-line-medium" />
                        <div className="art-line art-line-short" />

                        <div className="art-doc-footer">
                            <span className="art-avatar">S</span>
                            <span>Shared securely</span>
                        </div>
                    </div>

                    <div className="art-security-label">
                        <span className="art-security-dot" />
                        END-TO-END CONTROL
                    </div>
                </div>

                <div className="visual-content">
                    <h2>Files, shared securely.</h2>
                    <p>
                        A simple place to keep your files
                        and share them with others.
                    </p>
                </div>
            </section>

        </div>
    )
}

export default Login;
