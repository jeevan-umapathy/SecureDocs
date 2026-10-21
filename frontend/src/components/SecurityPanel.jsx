import { API } from "../config";
import { useState } from "react";



export default function SecurityPanel({ enabled, onSessionEnded }) {
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [setup, setSetup] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function request(path, body) {
        const response = await fetch(API + path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Request failed.");
        return data;
    }

    async function startSetup(event) {
        event.preventDefault();
        setError(""); setBusy(true);
        try {
            setSetup(await request("/auth/mfa/setup", { password }));
            setPassword("");
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }

    async function complete(event) {
        event.preventDefault();
        setError(""); setBusy(true);
        try {
            await request(setup ? "/auth/mfa/enable" : "/auth/mfa/disable",
                setup ? { code } : { code, password });
            setSetup(null);
            onSessionEnded();
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }

    return <section className="review-panel security-panel">
        <h2>Authenticator MFA</h2>
        <p>{enabled ? "Enabled. Your password and a six-digit code are required at sign-in."
            : "Add an authenticator app to protect sign-ins."}</p>
        {error && <p className="error-message" role="alert">{error}</p>}

        {!enabled && !setup && <form onSubmit={startSetup}>
            <label htmlFor="setup-password">Current password</label>
            <input id="setup-password" type="password" required value={password}
                onChange={(event) => setPassword(event.target.value)} />
            <button disabled={busy}>Set up MFA</button>
        </form>}

        {setup && <>
            <p>Scan this QR code in Google Authenticator or another TOTP app.</p>
            <img className="mfa-qr" src={setup.qr} alt="Authenticator setup QR code" />
            <p>Manual setup key: <code>{setup.secret}</code></p>
            <p>Setup expires in 10 minutes. Keep this key private.</p>
        </>}

        {(setup || enabled) && <form onSubmit={complete}>
            {enabled && <><label htmlFor="disable-password">Current password</label>
                <input id="disable-password" type="password" required value={password}
                    onChange={(event) => setPassword(event.target.value)} /></>}
            <label htmlFor="security-code">Six-digit authenticator code</label>
            <input id="security-code" inputMode="numeric" autoComplete="one-time-code"
                maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} />
            <button disabled={busy}>{setup ? "Enable MFA" : "Disable MFA"}</button>
        </form>}
        <p>After changing MFA, sign in again with your new settings.</p>
    </section>;
}
