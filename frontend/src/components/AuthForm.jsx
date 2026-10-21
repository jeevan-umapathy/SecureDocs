import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import '../styles/auth.css';
export default function AuthForm({ register = false }) {
    const [values, setValues] = useState({ username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    async function submit(event) {
        event.preventDefault(); setError(''); setBusy(true);
        try {
            const data = await api('/auth/' + (register ? 'register' : 'login'), { method: 'POST', body: values });
            if (register) navigate('/login', { state: { message: 'Account created. Sign in to get started.' } });
            else {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate('/dashboard');
            }
        } catch (err) { setError(err.message); }
        finally { setBusy(false); }
    }
    return <div className="auth-page">
        <section className="auth-panel"><div className="auth-card">
            <div className="auth-header"><h1>{register ? 'Create your account' : 'SecureDocs'}</h1><p>{register ? 'Start using SecureDocs' : 'Sign in to your account'}</p></div>
            {!register && location.state?.message && <p role="status" className="success-message">{location.state.message}</p>}
            <form className="auth-form" onSubmit={submit}>
                {register && <><label htmlFor="username">Username</label><input id="username" autoComplete="username" maxLength={100} required value={values.username} onChange={e => setValues({ ...values, username: e.target.value })} /></>}
                <label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" maxLength={255} required value={values.email} onChange={e => setValues({ ...values, email: e.target.value })} />
                <label htmlFor="password">Password</label><input id="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : undefined} required value={values.password} onChange={e => setValues({ ...values, password: e.target.value })} />
                {register && <small>At least 8 characters; maximum 72 bytes.</small>}
                {error && <p role="alert" className="error-message">{error}</p>}
                <button disabled={busy}>{busy ? 'Please wait…' : register ? 'Register' : 'Login'}</button>
            </form>
            <p className="auth-switch">{register ? 'Already have an account? ' : "Don't have an account? "}<Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p>
        </div></section>
        <section className="auth-visual"><div className="visual-content"><div className="visual-icon" aria-hidden="true">⇄</div><h2>Share files with confidence.</h2><p>Secure storage, controlled access, and simple sharing.</p></div></section>
    </div>;
}

