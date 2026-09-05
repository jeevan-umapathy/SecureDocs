import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import FileCard from "../components/FileCard";
import "../styles/dashboard.css";
import "../styles/fileCard.css";
import "../styles/auth.css";


function Dashboard() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [search, setSearch] = useState("");
    const [showEgg, setShowEgg] = useState(false);
    const navigate = useNavigate();

    const user = JSON.parse(
        localStorage.getItem("user")
    );

    useEffect(() => {
        const fetchFiles = async () => {
            const token = localStorage.getItem("token");
            try {
                const response = await fetch(
                    "http://localhost:3000/files",
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
            } catch (err) {
                setError("Could not connect to the server.");
            } finally {
                setLoading(false);
            }
        };
        fetchFiles();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
    };

    if (loading) {
        return <p className="status-message">Loading files...</p>;
    }


    const handleSearch = async () => {
        if (search.trim().toLowerCase() === "aha") {
            setShowEgg(true);
            setSearch("");
            return;
        }

        if (!search.trim()) {
            return;
        }

        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/files/search?q=${encodeURIComponent(search)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const data = await response.json();
        console.log("SEARCH RESPONSE:", data);
        console.log("COUNT:", data.files.length);
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

        const response = await fetch(
            "http://localhost:3000/files/upload",
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
    };

    const handleDownload = async (fileId, fileName) => {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/files/${fileId}/download`,
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
            `http://localhost:3000/files/${file.id}`,
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

    const handleDelete = async (fileId) => {
        const token = localStorage.getItem("token");

        const response = await fetch(
            `http://localhost:3000/files/${fileId}`,
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

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <h2>SecureDocs</h2>
                <nav className="sidebar-nav">
                    <button className="nav-item active">My Files</button>
                    <button className="nav-item">Shared</button>
                    <button className="nav-item">Activity</button>
                </nav>
            </aside>


            <main className="main-content">
                <header className="topbar">
                    <div>
                        <h1>My Files</h1>
                        <p>Welcome, {user?.username}</p>
                    </div>

                    <button onClick={handleLogout}>
                        Logout
                    </button>
                </header>

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

                    <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                    />

                    <button onClick={handleUpload}>
                        Upload
                    </button>
                </section>

                {error && <p className="error-message">{error}</p>}

                <section className="file-list">

                    {files.length === 0 ? (
                        <p className="status-message">No files uploaded yet.</p>
                    ) : (
                        files.map((file) => (
                            <FileCard
                                key={file.id}
                                file={file}
                                onDownload={handleDownload}
                                onDelete={handleDelete}
                                onRename={handleRename}

                            />
                        ))
                    )}

                </section>




            </main>
        </div>

    )


}

export default Dashboard;