import { API } from "../config";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import FileCard from "../components/FileCard";
import ReviewTabs from "../components/ReviewTabs";
import SecurityPanel from "../components/SecurityPanel";
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
    const handleUpload = async () => {
        if (!selectedFile) {
            return;
        }

        const token = localStorage.getItem("token");

        const formData = new FormData();
        formData.append("file", selectedFile);
        if (currentFolder) formData.append("folder_id", currentFolder);

        const response = await fetch(
            API + "/files/upload",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            setError(data.message || "Upload failed.");
            return;
        }

        setFiles((currentFiles) => [
            data.file,
            ...currentFiles
        ]);

        setSelectedFile(null);
        fileInput.current.value = "";
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

    const handleRename = async (file) => {
        const newName = prompt("Enter new file name:", file.original_name);

        if (!newName || newName === file.original_name) {
            return;
        }

        const token = localStorage.getItem("token");

        const response = await fetch(
            `${API}/files/${file.id}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    original_name: newName
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            setError(data.message || "Rename failed.");
            return;
        }

        setFiles((currentFiles) =>
            currentFiles.map((item) =>
                item.id === file.id ? data.file : item
            )
        );
    };

    const handleShare = async (file) => {
        const enteredEmail = window.prompt(
            `Share "${file.original_name}" with which email?`
        );

        if (enteredEmail === null) return;

        const email = enteredEmail.trim();

        if (!email) {
            setError("Please enter the recipient's email.");
            return;
        }

        setError("");

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API}/files/${file.id}/share`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ email })
                }

            );

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Sharing failed.");
                return;
            }

            window.alert(`File shared with ${email}`);

        } catch {
            setError("Could not complete sharing!");
        }
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

    const createFolder = async () => {
        const name = window.prompt("New folder name:");
        if (!name) return;
        try {
            await folderRequest("/folders", "POST", {
                name, parent_id: currentFolder || null
            });
            await refreshFolders();
            setError("");
        } catch (err) { setError(err.message); }
    };

    const renameFolder = async () => {
        const folder = folders.find((item) => String(item.id) === currentFolder);
        const name = window.prompt("Rename folder:", folder?.name);
        if (!name) return;
        try {
            await folderRequest(`/folders/${currentFolder}`, "PATCH", { name });
            await refreshFolders();
            setError("");
        } catch (err) { setError(err.message); }
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

    const displayedFiles = activeTab === "my"
        ? files.filter((file) => String(file.folder_id || "") === currentFolder)
        : files;

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
                                : activeTab === "shared" ? "Shared with me"
                                    : activeTab === "admin" ? "Admin Panel"
                                        : activeTab === "security" ? "Security" : "Activity"}
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

                {activeTab === "my" && (
                    <section className="file-controls">
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <button onClick={handleSearch}>
                            Search
                        </button>

                        <button onClick={() => {
                            setSearch("");
                            setError("");
                            fetch(API + "/files", {
                                headers: {
                                    Authorization: `Bearer ${localStorage.getItem("token")}`
                                }
                            })
                                .then((response) => response.json())
                                .then((data) => setFiles(data.files || []))
                                .catch(() => setError("Could not reload files."));
                        }}>
                            Clear
                        </button>

                        <input
                            type="file"
                            ref={fileInput}
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                        />

                        <button onClick={handleUpload}>
                            Upload
                        </button>
                    </section>
                )}

                {error && <p className="error-message">{error}</p>}

                {(activeTab === "my" || activeTab === "shared") && (
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




            </main>
        </div>

    )


}

export default Dashboard;
