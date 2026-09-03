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
    onRename
}) {
    return (
        <div>
            <h3>{file.original_name}</h3>
            <p>{file.mime_type}</p>
            <p>{formatFileSize(file.file_size)}</p>



            <button onClick={() => onDownload(file.id, file.original_name)}>
                Download
            </button>

            <button onClick={() => onRename(file)}>
                Rename
            </button>

            <button onClick={() => onDelete(file.id)}>
                Delete
            </button>


        </div>

    );
}

export default FileCard;