import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api, formatSize } from '../api';
import FileCard from '../components/FileCard';
import Modal from '../components/Modal';
import ActivityList from '../components/ActivityList';
import '../styles/dashboard.css';
import '../styles/fileCard.css';

const tabs = { my: 'My Files', shared: 'Shared with me', activity: 'Activity', admin: 'Admin panel' };
export default function Dashboard() {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('my');
    const [files, setFiles] = useState([]);
    const [activity, setActivity] = useState([]);
    const [admin, setAdmin] = useState(null);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [modal, setModal] = useState(null);
    const [value, setValue] = useState('');
    const [shares, setShares] = useState(null);
    const [dialogError, setDialogError] = useState('');
    const [dialogSuccess, setDialogSuccess] = useState('');
    const input = useRef(null);
    const navigate = useNavigate();
    const refresh = () => setRevision(v => v + 1);
    function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }
    useEffect(() => {
        const end = () => navigate('/login', { state: { message: 'Your session ended. Please sign in again.' } });
        window.addEventListener('session-ended', end);
        return () => window.removeEventListener('session-ended', end);
    }, [navigate]);
    useEffect(() => {
        let current = true;
        setLoading(true); setError('');
        (async () => {
            try {
                const profile = await api('/users/profile');
                if (!current) return;
                setUser(profile.user);
                if (activeTab === 'admin') {
                    const [overview, users, events] = await Promise.all([api('/admin/overview'), api('/admin/users'), api('/admin/activity')]);
                    if (current) setAdmin({ ...overview, ...users, ...events });
                } else if (activeTab === 'activity') {
                    const data = await api('/activity'); if (current) setActivity(data.activity);
                } else {
                    const data = await api(activeTab === 'shared' ? '/files/shared' : query ? '/files/search?q=' + encodeURIComponent(query) : '/files');
                    if (current) setFiles(data.files);
                }
            } catch (err) { if (current) setError(err.message); }
            finally { if (current) setLoading(false); }
        })();
        return () => { current = false; };
    }, [activeTab, query, revision]);
    useEffect(() => {
        if (modal?.type !== 'share') return;
        let current = true; setShares(null);
        api('/files/' + modal.file.id + '/shares').then(data => { if (current) setShares(data.shares); }).catch(err => { if (current) setDialogError(err.message); });
        return () => { current = false; };
    }, [modal]);
    function open(type, file) { setModal({ type, file }); setValue(type === 'rename' ? file.original_name : ''); setDialogError(''); setDialogSuccess(''); }
    async function run(task, message) {
        setBusy(true); setError(''); setSuccess('');
        try { await task(); setSuccess(message); return true; }
        catch (err) { setError(err.message); return false; }
        finally { setBusy(false); }
    }
    async function upload(event) {
        event.preventDefault();
        if (!selectedFile) return;
        if (selectedFile.size > 5 * 1024 * 1024) { setError('File must be 5 MB or smaller.'); return; }
        await run(async () => {
            const body = new FormData(); body.append('file', selectedFile);
            await api('/files/upload', { method: 'POST', body });
            setSelectedFile(null); input.current.value = ''; setQuery(''); setSearch(''); refresh();
        }, 'File uploaded successfully.');
    }
    async function download(id, name) {
        await run(async () => {
            const response = await api('/files/' + id + '/download', { raw: true });
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement('a'); link.href = url; link.download = name; link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }, 'Download ready.');
    }
    async function submitDialog(event) {
        event.preventDefault(); setBusy(true); setDialogError(''); setDialogSuccess('');
        try {
            const base = '/files/' + modal.file.id;
            if (modal.type === 'share') {
                await api(base + '/share', { method: 'POST', body: { email: value } });
                setValue(''); setDialogSuccess('File shared. The recipient can download it.');
                const data = await api(base + '/shares'); setShares(data.shares);
            } else if (modal.type === 'status') {
                await api('/admin/users/' + modal.file.id + '/status', { method: 'PATCH', body: { is_active: !modal.file.is_active } });
                setModal(null); setSuccess('Account status updated.'); refresh();
            } else {
                await api(base, { method: modal.type === 'delete' ? 'DELETE' : 'PATCH', ...(modal.type === 'rename' ? { body: { original_name: value } } : {}) });
                setModal(null); setSuccess(modal.type === 'delete' ? 'File deleted.' : 'File renamed.'); refresh();
            }
        } catch (err) { setDialogError(err.message); }
        finally { setBusy(false); }
    }
    async function revoke(share) {
        setBusy(true); setDialogError(''); setDialogSuccess('');
        try {
            await api('/files/' + modal.file.id + '/shares/' + share.id, { method: 'DELETE' });
            setShares(items => items.filter(item => item.id !== share.id)); setDialogSuccess('Access revoked for ' + share.email + '.');
        } catch (err) { setDialogError(err.message); }
        finally { setBusy(false); }
    }
    return <div className="dashboard">
        <aside className="sidebar"><h2>SecureDocs</h2><nav className="sidebar-nav" aria-label="Main navigation">
            {Object.entries(tabs).filter(([key]) => key !== 'admin' || user?.role === 'admin').map(([key, title]) => <button key={key} className={'nav-item ' + (activeTab === key ? 'active' : '')} aria-current={activeTab === key ? 'page' : undefined} onClick={() => { setActiveTab(key); setSearch(''); setQuery(''); setSuccess(''); }}>{title}</button>)}
        </nav><p className="sidebar-note">Your files.<br />Your permissions.</p></aside>
        <main className="main-content" id="main-content">
            <header className="topbar"><div><h1>{tabs[activeTab]}</h1><p>Welcome{user ? ', ' + user.username : ''}</p></div><button onClick={logout}>Logout</button></header>
            {activeTab === 'my' && <section className="controls-panel" aria-label="File controls">
                <form className="file-controls" onSubmit={e => { e.preventDefault(); setQuery(search.trim()); refresh(); }}>
                    <label htmlFor="search">Find a file</label><input id="search" type="search" placeholder="Search filenames…" value={search} onChange={e => setSearch(e.target.value)} maxLength={255} />
                    <button disabled={busy}>Search</button><button type="button" onClick={() => { setSearch(''); setQuery(''); refresh(); }}>Clear</button>
                </form>
                <form className="file-controls" onSubmit={upload}><label htmlFor="upload">Upload file</label><input id="upload" ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,.ppt,.pptx" disabled={busy} onChange={e => setSelectedFile(e.target.files[0] || null)} /><button className="primary" disabled={busy || !selectedFile}>{busy ? 'Working…' : 'Upload'}</button></form>
                <p className="muted">PDF, JPG, PNG, PPT or PPTX · Up to 5 MB per file</p>
            </section>}
            {error && <div role="alert" className="error-message">{error} <button onClick={refresh}>Retry</button></div>}
            {success && <p role="status" className="success-message">{success}</p>}
            {loading ? <p role="status" className="status-message">Loading {tabs[activeTab].toLowerCase()}…</p> : !error && <>
                {(activeTab === 'my' || activeTab === 'shared') && <section className="file-list" aria-label={tabs[activeTab]}>
                    <p className="muted">{files.length} {files.length === 1 ? 'file' : 'files'}{query ? ' matching “' + query + '”' : ''}{activeTab === 'shared' ? ' · Download-only access' : ''}</p>
                    {!files.length ? <div className="empty-state"><h2>{query ? 'No matching files' : activeTab === 'shared' ? 'Nothing shared yet' : 'Your files belong here'}</h2><p>{query ? 'Try a different filename or clear your search.' : activeTab === 'shared' ? 'Files shared with your registered email will appear here.' : 'Choose a document above to upload your first file.'}</p></div> :
                        files.map(file => <FileCard key={file.id} file={file} busy={busy} readOnly={activeTab === 'shared'} onDownload={download} onRename={f => open('rename', f)} onShare={f => open('share', f)} onDelete={f => open('delete', f)} />)}
                </section>}
                {activeTab === 'activity' && <ActivityList activity={activity} />}
                {activeTab === 'admin' && admin && <>
                    <section className="stats-grid" aria-label="System overview">{[['Users', admin.overview.users], ['Files', admin.overview.files], ['Shares', admin.overview.shares], ['Stored bytes', formatSize(admin.overview.bytes_stored)]].map(([label, count]) => <div className="stat-card" key={label}><span>{label}</span><strong>{count}</strong></div>)}</section>
                    <section className="panel"><h2>Accounts</h2><p className="muted">Disabled accounts cannot sign in or use existing tokens. Files are preserved.</p><div className="table-scroll"><table><thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Files</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
                        <tbody>{admin.users.map(account => <tr key={account.id}><td>{account.username}<small>{account.email}</small></td><td>{account.role}</td><td>{account.file_count}</td><td><span className="badge">{account.is_active ? 'Enabled' : 'Disabled'}</span></td><td>{account.role === 'admin' ? 'Protected' : <button disabled={busy} onClick={() => open('status', account)}>{account.is_active ? 'Disable' : 'Enable'}</button>}</td></tr>)}</tbody></table></div></section>
                    <ActivityList activity={admin.activity} system />
                </>}
            </>}
        </main>
        {modal && <Modal title={{ rename: 'Rename file', delete: 'Delete file', share: 'Share & manage access', status: 'Change account status' }[modal.type]} busy={busy} onClose={() => setModal(null)}>
            <p className="dialog-filename">{modal.file.original_name || modal.file.email}</p>
            {dialogError && <p role="alert" className="error-message">{dialogError}</p>}
            {dialogSuccess && <p role="status" className="success-message">{dialogSuccess}</p>}
            <form className="dialog-form" onSubmit={submitDialog}>
                {modal.type === 'rename' && <><label htmlFor="new-name">Filename</label><input id="new-name" required maxLength={255} value={value} onChange={e => setValue(e.target.value)} /></>}
                {modal.type === 'share' && <><p>Recipients can download only. Revoking access blocks future downloads; it cannot remove copies already downloaded.</p><label htmlFor="recipient">Registered email</label><input id="recipient" type="email" required value={value} onChange={e => setValue(e.target.value)} /></>}
                {modal.type === 'delete' && <p>This permanently removes the file and all sharing access. Its activity history will remain.</p>}
                {modal.type === 'status' && <p>{modal.file.is_active ? 'Disable this account and block its current tokens? Existing files will be preserved.' : 'Enable this account again?'}</p>}
                <div className="dialog-actions"><button type="button" disabled={busy} onClick={() => setModal(null)}>Cancel</button><button className={modal.type === 'delete' ? 'danger' : 'primary'} disabled={busy}>{busy ? 'Working…' : { share: 'Share file', rename: 'Save name', delete: 'Delete permanently', status: 'Confirm status' }[modal.type]}</button></div>
            </form>
            {modal.type === 'share' && <section className="recipients"><h3>People with access</h3>{shares === null ? <p role="status">{dialogError ? 'Close and reopen this dialog to retry loading recipients.' : 'Loading recipients…'}</p> : !shares.length ? <p className="muted">Only you have access.</p> : <ul>{shares.map(share => <li key={share.id}><span>{share.username}<small>{share.email}</small></span><button disabled={busy} onClick={() => revoke(share)}>Revoke<span className="sr-only"> access for {share.email}</span></button></li>)}</ul>}</section>}
        </Modal>}
    </div>;
}

