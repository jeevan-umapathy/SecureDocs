import { formatDate, formatSize } from '../api';
export default function FileCard({ file, onDownload, onDelete, onRename, onShare, readOnly = false, busy }) {
    return <article className="file-card">
        <div className="file-info"><h3>{file.original_name}</h3>
            <p>{readOnly ? 'Shared by ' + file.owner_name : 'Owned by you'} · {formatSize(file.file_size)}</p>
            <p className="muted">{file.mime_type} · {formatDate(file.shared_at || file.uploaded_at)}</p>
        </div>
        <div className="file-actions">
            <button disabled={busy} onClick={() => onDownload(file.id, file.original_name)}>Download</button>
            {!readOnly && <><button disabled={busy} onClick={() => onShare(file)}>Share / access</button><button disabled={busy} onClick={() => onRename(file)}>Rename</button><button disabled={busy} className="danger" onClick={() => onDelete(file)}>Delete</button></>}
            {readOnly && <span className="badge">Download only</span>}
        </div>
    </article>;
}

