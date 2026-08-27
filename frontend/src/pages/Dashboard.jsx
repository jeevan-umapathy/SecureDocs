import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import FileCard from "../components/FileCard";

function Dashboard() {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
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
                    setLoading(false);
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
        return <p>Loading files...</p>;
    }
    if (error) {
        return <p>{error}</p>;
    }
    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome, {user?.username}</p>
            <p>{user?.email}</p>

            {files.length === 0 ? (
                <p>No files uploaded yet.</p>
            ) : (
                files.map((file) => (
                    <FileCard
                        key={file.id}
                        file={file}
                    />
                ))
            )}
            <button onClick={handleLogout}>
                Logout
            </button>
        </div>

    )
}

export default Dashboard;