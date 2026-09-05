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
            "http://localhost:3000/auth/register",
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
                <div className="visual-content">

                    <div className="visual-icon">
                        ⇄
                    </div>

                    <h2>Share files with confidence.</h2>

                    <p>
                        Secure storage, controlled access,
                        and simple sharing.
                    </p>

                </div>
            </section>

        </div>
    );
}

export default Register;