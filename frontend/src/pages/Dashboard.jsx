import { API } from "../config";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import FileCard from "../components/FileCard";
import ReviewTabs from "../components/ReviewTabs";
import SecurityPanel from "../components/SecurityPanel";
import NotificationCenter from "../components/NotificationCenter";
import "../styles/dashboard.css";
import "../styles/fileCard.css";



function Dashboard() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInput = useRef(null);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("my");
    const [accessFile, setAccessFile] = useState(null);
    const [recipients, setRecipients] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolder, setCurrentFolder] = useState("");
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [dialog, setDialog] = useState(null);
    const [dialogBusy, setDialogBusy] = useState(false);
    const [toast, setToast] = useState("");
    const [page, setPage] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [uploadStage, setUploadStage] = useState("");
    const [fileType, setFileType] = useState("all");
    const [sortBy, setSortBy] = useState("recent");
    const PAGE_SIZE = 8;

    useEffect(() => {
        setSearch("");
        setPage(1);
        setFileType("all");
        setSortBy("recent");
    }, [activeTab, currentFolder]);
    const navigate = useNavigate();


    const user = JSON.parse(
        localStorage.getItem("user")
    );


    const [role, setRole] = useState("user");

    useEffect(() => {
        fetch(API + "/users/profile", {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        })
            .then(response => {
                if (!response.ok) throw new Error("Profile unavailable");
                return response.json();
            })
            .then(data => {
                setRole(data.user.role);
                setMfaEnabled(data.user.mfa_enabled);
            })
            .catch(console.error);
        fetch(API + "/folders", {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
            .then(response => response.json())
            .then(data => setFolders(data.folders || []))
            .catch(console.error);
    }, []);

    useEffect(() => {
        const fetchFiles = async () => {
            if (activeTab === "activity" || activeTab === "admin" || activeTab === "security") {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError("");
            const token = localStorage.getItem("token");
            try {
                const response = await fetch(
                    activeTab === "shared"
                        ? API + "/files/shared"
                        : API + "/files",
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();
                if (!response.ok) {
                    setError(data.message);
                    return;
                }
                setFiles(data.files);
            } catch {
                setError("Could not connect to the server.");
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, [activeTab]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    const handleSearch = async () => {


        if (!search.trim()) {
            return;
        }

        const token = localStorage.getItem("token");

        const response = await fetch(
            `${API}/files/search?q=${encodeURIComponent(search)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();

        if (!response.ok) {
            setError(data.message);
            return;
        }

        setFiles(data.files);
    }

    const handleUpload = () => {
        if (!selectedFile || uploading) return;

        const MAX_SIZE = 5 * 1024 * 1024;

        if (selectedFile.size > MAX_SIZE) {
            setError("File exceeds the current 5 MB upload limit.");
            return;
        }

        const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".ppt", ".pptx"];

        const extension = selectedFile.name
            .slice(selectedFile.name.lastIndexOf("."))
            .toLowerCase();

        if (!allowed.includes(extension)) {
            setError("Supported formats: PDF, JPG, PNG, PPT and PPTX.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        if (currentFolder) {
            formData.append("folder_id", currentFolder);
        }

        const xhr = new XMLHttpRequest();

        setUploading(true);
        setUploadProgress(0);
        setUploadStage("Uploading file...");
        setError("");

        xhr.open("POST", `${API}/files/upload`);

        xhr.setRequestHeader(
            "Authorization",
            `Bearer ${localStorage.getItem("token")}`
        );

        xhr.timeout = 65000;

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentage = Math.round(
                    (event.loaded / event.total) * 100
                );

                setUploadProgress(percentage);

                if (percentage === 100) {
                    setUploadStage("Saving to cloud...");
                }
            }
        };

        xhr.onload = () => {
            let data = {};

            try {
                data = JSON.parse(xhr.responseText);
            } catch {
                data = {};
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                setFiles((current) => [data.file, ...current]);

                setSelectedFile(null);

                if (fileInput.current) {
                    fileInput.current.value = "";
                }

                setToast("File uploaded successfully");
            } else {
                setError(
                    data.message ||
                    `Upload failed (${xhr.status}).`
                );
            }

            setUploading(false);
            setUploadProgress(null);
            setUploadStage("");
        };

        xhr.onerror = () => {
            setError("Network error. Check your connection and try again.");
            setUploading(false);
            setUploadProgress(null);
            setUploadStage("");
        };

        xhr.ontimeout = () => {
            setError("Upload timed out. Please try again.");
            setUploading(false);
            setUploadProgress(null);
            setUploadStage("");
        };

        xhr.send(formData);
    };

    const handleDownload = async (fileId, fileName) => {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `${API}/files/${fileId}/download`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            setError("Download failed.");
            return;
        }

        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();

        window.URL.revokeObjectURL(url);


    };

    const handleRename = (file) => {
        setError("");

        setDialog({
            type: "rename-file",
            file,
            value: file.original_name
        });
    };

    const handleShare = (file) => {
        setDialog({
            type: "share",
            file,
            value: ""
        });
    };
    const handleManageAccess = async (file) => {
        setError("");
        try {
            const response = await fetch(
                `${API}/files/${file.id}/shares`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setAccessFile(file);
            setRecipients(data.shares);
        } catch (err) {
            setError(err.message || "Could not load recipients.");
        }
    };

    const handleRevoke = async (shareId) => {
        if (!window.confirm("Revoke this person's access?")) return;

        try {
            const response = await fetch(
                `${API}/files/${accessFile.id}/shares/${shareId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setRecipients((current) => current.filter((share) => share.id !== shareId));
        } catch (err) {
            setError(err.message || "Could not revoke access.");
        }
    };

    const handleDelete = async (fileId) => {
        const token = localStorage.getItem("token");
        if (!window.confirm("Delete this file permanently?")) return;
        const response = await fetch(
            `${API}/files/${fileId}`,
            {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            setError("Delete failed");
            return;
        }

        setFiles((currentFiles) =>
            currentFiles.filter((file) => file.id !== fileId)
        );
    };

    const folderRequest = async (path, method, body) => {
        const response = await fetch(`${API}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Folder action failed.");
        return data;
    };

    const refreshFolders = async () => {
        const data = await folderRequest("/folders", "GET");
        setFolders(data.folders);
    };

    const createFolder = () => {
        setDialog({
            type: "folder",
            value: ""
        });
    };

    const submitDialog = async (event) => {
        event.preventDefault();

        if (!dialog || dialogBusy) return;

        const value = dialog.value.trim();

        if (!value) {
            setError("Please fill in the required field.");
            return;
        }

        setDialogBusy(true);
        setError("");

        try {
            if (dialog.type === "share") {
                const response = await fetch(
                    `${API}/files/${dialog.file.id}/share`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token")}`
                        },
                        body: JSON.stringify({ email: value })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Sharing failed.");
                }

                setToast(`Shared with ${value}`);
            }

            if (dialog.type === "folder") {
                await folderRequest("/folders", "POST", {
                    name: value,
                    parent_id: currentFolder || null
                });

                await refreshFolders();

                setToast("Folder created");
            }

            if (dialog.type === "rename-file") {
                const response = await fetch(
                    `${API}/files/${dialog.file.id}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${localStorage.getItem("token")}`
                        },
                        body: JSON.stringify({
                            original_name: value
                        })
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Could not rename file.");
                }

                setFiles((current) =>
                    current.map((file) =>
                        file.id === dialog.file.id
                            ? { ...file, ...data.file }
                            : file
                    )
                );

                setToast("File renamed");
            }

            if (dialog.type === "rename-folder") {
                await folderRequest(
                    `/folders/${dialog.folder.id}`,
                    "PATCH",
                    { name: value }
                );

                await refreshFolders();

                setToast("Folder renamed");
            }

            setDialog(null);
        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setDialogBusy(false);
        }
    };

    const renameFolder = () => {
        const folder = folders.find(
            (item) => String(item.id) === String(currentFolder)
        );

        if (!folder) return;

        setError("");

        setDialog({
            type: "rename-folder",
            folder,
            value: folder.name
        });
    };

    const deleteFolder = async () => {
        if (!window.confirm("Delete this empty folder?")) return;
        try {
            await folderRequest(`/folders/${currentFolder}`, "DELETE");
            setCurrentFolder("");
            await refreshFolders();
            setError("");
        } catch (err) { setError(err.message); }
    };

    const moveFile = async (file, folderId) => {
        try {
            const data = await folderRequest(`/files/${file.id}/folder`, "PATCH", {
                folder_id: folderId || null
            });
            setFiles((current) => current.map((item) => item.id === file.id ? data.file : item));
            setError("");
        } catch (err) { setError(err.message); }
    };

    const filteredFiles = files
        .filter((file) =>
            activeTab !== "my" ||
            String(file.folder_id || "") === currentFolder
        )
        .filter((file) =>
            file.original_name
                .toLowerCase()
                .includes(search.trim().toLowerCase())
        )
        .filter((file) => {
            if (fileType === "all") return true;

            if (fileType === "pdf") {
                return file.mime_type === "application/pdf";
            }

            if (fileType === "image") {
                return file.mime_type?.startsWith("image/");
            }

            if (fileType === "presentation") {
                return (
                    file.mime_type?.includes("presentation") ||
                    file.mime_type === "application/vnd.ms-powerpoint"
                );
            }

            return true;
        })
        .sort((a, b) => {
            if (sortBy === "name") {
                return a.original_name.localeCompare(b.original_name);
            }

            if (sortBy === "size") {
                return b.file_size - a.file_size;
            }

            const dateA = new Date(
                a.shared_at || a.uploaded_at || 0
            ).getTime();

            const dateB = new Date(
                b.shared_at || b.uploaded_at || 0
            ).getTime();

            return dateB - dateA;
        });

    const totalPages = Math.max(
        1,
        Math.ceil(filteredFiles.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const displayedFiles = filteredFiles.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <h2>SecureDocs</h2>
                <nav className="sidebar-nav">

                    <button
                        className={`nav-item ${activeTab === "my" ? "active" : ""}`}
                        onClick={() => setActiveTab("my")}
                    >
                        My Files
                    </button>

                    <button
                        className={`nav-item ${activeTab === "shared" ? "active" : ""}`}
                        onClick={() => setActiveTab("shared")}
                    >
                        Shared with me
                    </button>

                    <button
                        className={`nav-item ${activeTab === "activity" ? "active" : ""}`}
                        onClick={() => setActiveTab("activity")}
                    >
                        Activity
                    </button>

                    <button
                        className={`nav-item ${activeTab === "notifications" ? "active" : ""}`}
                        onClick={() => setActiveTab("notifications")}
                    >
                        Notifications
                    </button>

                    {role === "admin" && (
                        <button
                            className={`nav-item ${activeTab === "admin" ? "active" : ""}`}
                            onClick={() => setActiveTab("admin")}
                        >
                            Admin Panel
                        </button>
                    )}
                    <button className={`nav-item ${activeTab === "security" ? "active" : ""}`}
                        onClick={() => setActiveTab("security")}>Security</button>
                </nav>
            </aside>


            <main className="main-content">
                <header className="topbar">
                    <div>
                        <h1>
                            {activeTab === "my" ? "My Files"
                                : activeTab === "notifications" ? "Notifications"
                                    : activeTab === "shared" ? "Shared with me"
                                        : activeTab === "admin" ? "Admin Panel"
                                            : activeTab === "security" ? "Security" : "Activity"

                            }
                        </h1>
                        <p>Welcome, {user?.username}</p>
                    </div>

                    <button onClick={handleLogout}>
                        Logout
                    </button>
                </header>

                {activeTab === "my" && (
                    <section className="folders-panel">
                        <label htmlFor="current-folder">Folder</label>
                        <select id="current-folder" value={currentFolder}
                            onChange={(event) => setCurrentFolder(event.target.value)}>
                            <option value="">My Files (root)</option>
                            {folders.map((folder) => <option key={folder.id} value={folder.id}>
                                {folder.parent_id ? "↳ " : ""}{folder.name}
                            </option>)}
                        </select>
                        <button onClick={createFolder}>New folder</button>
                        {currentFolder && <>
                            <button onClick={renameFolder}>Rename folder</button>
                            <button onClick={deleteFolder}>Delete empty folder</button>
                        </>}
                    </section>
                )}

                {(activeTab === "my" || activeTab === "shared") && (
                    <>
                        <section className="file-controls">
                            <input
                                type="search"
                                placeholder={
                                    activeTab === "shared"
                                        ? "Search files shared with you..."
                                        : "Search your files..."
                                }
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                aria-label="Search files"
                            />

                            <select
                                value={fileType}
                                onChange={(event) => {
                                    setFileType(event.target.value);
                                    setPage(1);
                                }}
                                aria-label="Filter by file type"
                            >
                                <option value="all">All files</option>
                                <option value="pdf">PDF</option>
                                <option value="image">Images</option>
                                <option value="presentation">Presentations</option>
                            </select>

                            <select
                                value={sortBy}
                                onChange={(event) => {
                                    setSortBy(event.target.value);
                                    setPage(1);
                                }}
                                aria-label="Sort files"
                            >
                                <option value="recent">Newest first</option>
                                <option value="name">Name A–Z</option>
                                <option value="size">Largest first</option>
                            </select>

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch("");
                                        setPage(1);
                                    }}
                                >
                                    Clear
                                </button>
                            )}

                            {activeTab === "my" && (
                                <>
                                    <input
                                        type="file"
                                        ref={fileInput}
                                        onChange={(e) => setSelectedFile(e.target.files[0])}
                                    />

                                    <button
                                        onClick={handleUpload}
                                        disabled={!selectedFile || uploading}
                                    >
                                        {uploading ? "Uploading..." : "Upload"}
                                    </button>
                                </>
                            )}
                        </section>

                        {activeTab === "my" && uploading && (
                            <div className="sd-upload-status" role="status">
                                <div className="sd-upload-label">
                                    <span>{uploadStage}</span>
                                    <strong>{uploadProgress ?? 0}%</strong>
                                </div>

                                <div
                                    className="sd-upload-track"
                                    role="progressbar"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={uploadProgress ?? 0}
                                >
                                    <div
                                        className="sd-upload-fill"
                                        style={{ width: `${uploadProgress ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {error && <p className="error-message">{error}</p>}

                {(activeTab === "my" || activeTab === "shared") && (
                    <>
                        <section className="file-list">

                            {loading ? (
                                <p className="status-message">Loading files...</p>
                            ) : displayedFiles.length === 0 ? (
                                <p className="status-message">
                                    {activeTab === "shared"
                                        ? "No files have been shared with you yet."
                                        : "No files uploaded yet."}
                                </p>
                            ) : (
                                displayedFiles.map((file) => (
                                    <FileCard
                                        readOnly={activeTab === "shared"}
                                        key={file.id}
                                        file={file}
                                        onDownload={handleDownload}
                                        onDelete={handleDelete}
                                        onRename={handleRename}
                                        onShare={handleShare}
                                        onManageAccess={handleManageAccess}
                                        folders={folders}
                                        onMove={moveFile}
                                    />
                                ))
                            )}

                        </section>

                        {!loading && filteredFiles.length > 0 && (
                            <div className="pagination">
                                <span>
                                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                                    {Math.min(currentPage * PAGE_SIZE, filteredFiles.length)}
                                    {" "}of {filteredFiles.length} files
                                </span>

                                <div className="pagination-actions">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setPage(currentPage - 1)}
                                    >
                                        Previous
                                    </button>

                                    <span>
                                        Page {currentPage} of {totalPages}
                                    </span>

                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setPage(currentPage + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {accessFile && activeTab === "my" && (
                    <section className="access-panel" aria-label="People with access">
                        <h2>Access to {accessFile.original_name}</h2>
                        <button onClick={() => setAccessFile(null)}>Close</button>
                        {recipients.length === 0 ? <p>Only you have access.</p> : (
                            <ul>
                                {recipients.map((share) => (
                                    <li key={share.id}>
                                        {share.username} ({share.email})
                                        <button onClick={() => handleRevoke(share.id)}>
                                            Revoke
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                )}

                {(activeTab === "activity" || activeTab === "admin") && (
                    <ReviewTabs tab={activeTab} />
                )}
                {activeTab === "security" && (
                    <SecurityPanel enabled={mfaEnabled} onSessionEnded={handleLogout} />
                )}
                {activeTab === "notifications" && (
                    <NotificationCenter />
                )}


                {dialog && (
                    <div
                        className="sd-dialog-backdrop"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget && !dialogBusy) {
                                setDialog(null);
                                setError("");
                            }
                        }}
                    >
                        <div
                            className="sd-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="sd-dialog-title"
                        >
                            <div className="sd-dialog-heading">
                                <div>
                                    <h2 id="sd-dialog-title">
                                        {{
                                            share: "Share file",
                                            folder: "New folder",
                                            "rename-file": "Rename file",
                                            "rename-folder": "Rename folder"
                                        }[dialog.type]}
                                    </h2>

                                    <p>
                                        {dialog.type === "share"
                                            ? dialog.file.original_name
                                            : dialog.type === "folder"
                                                ? "Create a folder to organise your files."
                                                : "Enter a new name below."}
                                    </p>
                                </div>

                                <button
                                    className="sd-dialog-close"
                                    type="button"
                                    onClick={() => {
                                        setDialog(null);
                                        setError("");
                                    }}
                                    disabled={dialogBusy}
                                    aria-label="Close dialog"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={submitDialog}>
                                <label htmlFor="sd-dialog-input">
                                    {dialog.type === "share"
                                        ? "Recipient email"
                                        : dialog.type === "rename-file"
                                            ? "File name"
                                            : "Folder name"}
                                </label>

                                <input
                                    id="sd-dialog-input"
                                    autoFocus
                                    required
                                    type={dialog.type === "share" ? "email" : "text"}
                                    placeholder={
                                        dialog.type === "share"
                                            ? "name@example.com"
                                            : dialog.type === "rename-file"
                                                ? "Document.pdf"
                                                : "Folder name"
                                    }
                                    value={dialog.value}
                                    onChange={(event) =>
                                        setDialog((current) => ({
                                            ...current,
                                            value: event.target.value
                                        }))
                                    }
                                />

                                {error && (
                                    <p className="sd-dialog-error" role="alert">
                                        {error}
                                    </p>
                                )}

                                <div className="sd-dialog-actions">
                                    <button
                                        type="button"
                                        className="sd-button-secondary"
                                        onClick={() => {
                                            setDialog(null);
                                            setError("");
                                        }}
                                        disabled={dialogBusy}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="sd-button-primary"
                                        disabled={dialogBusy}
                                    >
                                        {dialogBusy
                                            ? "Please wait..."
                                            : dialog.type === "share"
                                                ? "Share file"
                                                : dialog.type === "folder"
                                                    ? "Create folder"
                                                    : "Save changes"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {toast && (
                    <div className="sd-toast" role="status">
                        <span className="sd-toast-icon">✓</span>
                        <span>{toast}</span>
                        <button
                            type="button"
                            onClick={() => setToast("")}
                            aria-label="Dismiss notification"
                        >
                            ×
                        </button>
                    </div>
                )}





            </main>
        </div>

    )


}

export default Dashboard;
