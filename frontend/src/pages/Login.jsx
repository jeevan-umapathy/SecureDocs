import { useState } from "react";
import { useNavigate, Link } from "react-router-dom"


function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const [error, setError] = useState("");

    const handleLogin = async () => {
        const response = await fetch(
            "http://localhost:3000/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-type": "application/json"
                },
                body: JSON.stringify({
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

        localStorage.setItem("token", data.token);

        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );
        navigate("/dashboard");

    }
    return (
        <div className="auth-page">
            <section className="auth-panel">
                <div className="auth-card">



                    <div className="auth-header">
                        <h1>SecureDocs</h1>
                        <p>Sign in to your account</p>
                    </div>

                    <div className="auth-form">
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
                        {error && <p className="error-message">{error}</p>}

                        <button onClick={handleLogin}>
                            Login
                        </button>
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
                <div className="visual-content">
                    <div className="visual-icon">
                        ⇄
                    </div>

                    <h2>Share files with confidence.</h2>
                    <p>
                        Secure storage, controlled access, and simple sharing.
                    </p>
                </div>
            </section>
        </div>
    )
}

export default Login;