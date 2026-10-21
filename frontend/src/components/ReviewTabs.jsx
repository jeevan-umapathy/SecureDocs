
import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:3000";

async function request(path, options = {}) {
    const response = await fetch(API + path, {
        ...options,
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            ...(options.body ? { "Content-Type": "application/json" } : {})
        }
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }
    return data;
}

export default function ReviewTabs({ tab }) {
    const [activity, setActivity] = useState([]);
    const [users, setUsers] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            if (tab === "activity") {
                const data = await request("/activity");
                setActivity(data.activity);
            }

            if (tab === "admin") {
                const [stats, accounts, logs] = await Promise.all([
                    request("/admin/overview"),
                    request("/admin/users"),
                    request("/admin/activity")
                ]);

                setOverview(stats.overview);
                setUsers(accounts.users);
                setActivity(logs.activity);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => {
        load();
    }, [load]);

    async function toggleUser(user) {
        if (!window.confirm(
            `${user.is_active ? "Disable" : "Enable"} ${user.username}?`
        )) return;

        try {
            await request(`/admin/users/${user.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({
                    is_active: !user.is_active
                })
            });
            await load();
        } catch (err) {
            setError(err.message);
        }
    }

    if (loading) return <p>Loading...</p>;

    return (
        <div className="review-panel">
            {error && <p className="error-message">{error}</p>}

            {tab === "admin" && overview && (
                <>
                    <div className="review-stats">
                        <div><strong>{overview.users}</strong><p>Users</p></div>
                        <div><strong>{overview.files}</strong><p>Files</p></div>
                        <div><strong>{overview.shares}</strong><p>Shares</p></div>
                        <div>
                            <strong>{(Number(overview.bytes_stored) / 1024 / 1024).toFixed(2)} MB</strong>
                            <p>Storage</p>
                        </div>
                    </div>

                    <h2>User Management</h2>
                    <div className="review-scroll">
                        <table className="review-table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Files</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.username}</td>
                                        <td>{user.email}</td>
                                        <td>{user.role}</td>
                                        <td>{user.file_count}</td>
                                        <td>{user.is_active ? "Active" : "Disabled"}</td>
                                        <td>
                                            {user.role === "admin" ? "Protected" : (
                                                <button onClick={() => toggleUser(user)}>
                                                    {user.is_active ? "Disable" : "Enable"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <h2>{tab === "admin" ? "System Activity" : "My Activity"}</h2>
            <div className="review-scroll">
                <table className="review-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            {tab === "admin" && <th>User</th>}
                            <th>Details</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activity.map(event => (
                            <tr key={event.id}>
                                <td>{event.action}</td>
                                {tab === "admin" && <td>{event.actor_name || "Deleted user"}</td>}
                                <td>
                                    {event.details?.filename ||
                                        event.details?.username || "—"}
                                </td>
                                <td>{new Date(event.created_at).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!activity.length && <p>No activity recorded yet.</p>}
        </div>
    );
}
