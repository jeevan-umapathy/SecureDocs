function formatFileSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileCard({ file }) {
    return (
        <div>
            <h3>{file.original_name}</h3>
            <p>{file.mime_type}</p>
            <p>formatFileSize(file.file_size)</p>
        </div>
    );
}

export default FileCard;