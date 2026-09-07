function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileCard({
    file,
    onDownload,
    onDelete,
    onRename,
    onShare,
    readOnly = false
}) {
    return (
        <div className="file-card">

            <div className="file-info">
                <h3>{file.original_name}</h3>
                {readOnly && <p>Shared by {file.owner_name}</p>}
                <p>{file.mime_type}</p>
            </div>

            <div className="file-meta">
                <p>{formatFileSize(file.file_size)}</p>

                <div className="file-actions">
                    <button onClick={() => onDownload(file.id, file.original_name)}>
                        Download
                    </button>

                    {!readOnly && (
                        <>
                            <button onClick={() => onShare(file)}>
                                Share
                            </button>

                            <button onClick={() => onRename(file)}>
                                Rename
                            </button>

                            <button onClick={() => onDelete(file.id)}>
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </div>


        </div>

    );
}

export default FileCard;