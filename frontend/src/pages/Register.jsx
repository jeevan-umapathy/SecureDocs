import { API } from "../config";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/auth.css";

function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleRegister = async () => {
        setError("");

        const response = await fetch(
            API + "/auth/register",
            {
                method: "POST",
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify({
                    username,
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            setError(data.message);
            return;
        }

        navigate("/login");
    };

    return (
        <div className="auth-page">

            <section className="auth-panel">
                <div className="auth-card">

                    <div className="auth-header">
                        <h1>Create your account</h1>
                        <p>Start using SecureDocs</p>
                    </div>

                    <div className="auth-form">

                        <label>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        <label>Email</label>
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
                        />

                        {error && (
                            <p className="error-message">
                                {error}
                            </p>
                        )}

                        <button onClick={handleRegister}>
                            Register
                        </button>

                    </div>

                    <p className="auth-switch">
                        Already have an account?{" "}
                        <Link to="/login">
                            Sign in
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
    );
}

export default Register;