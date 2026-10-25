import { useCallback, useEffect, useState } from "react";
import { API } from "../config";

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            const response = await fetch(`${API}/api/notifications`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || "Could not load notifications");
            }

            setNotifications(data.notifications || []);
            setUnread(data.unreadCount || 0);
            setError("");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function markRead(id) {
        try {
            const response = await fetch(
                `${API}/api/notifications/${id}/read`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Could not mark notification as read.");
            }

            setNotifications((current) =>
                current.map((item) =>
                    item.id === id
                        ? { ...item, is_read: true }
                        : item
                )
            );

            setUnread((count) => Math.max(0, count - 1));
            setError("");
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <section className="notification-center">
            <div className="notification-header">
                <div>
                    <h2>Notifications</h2>
                    <p>Updates about files shared with you.</p>
                </div>

                <span className="notification-count">
                    {unread} unread
                </span>
            </div>

            {error && <p className="error-message">{error}</p>}

            {loading ? (
                <p>Loading notifications...</p>
            ) : notifications.length === 0 ? (
                <div className="notification-empty">
                    <span>✦</span>
                    <h3>You're all caught up</h3>
                    <p>New file-sharing activity will appear here.</p>
                </div>
            ) : (
                <div className="notification-list">
                    {notifications.map((item) => (
                        <article
                            key={item.id}
                            className={`notification-item ${!item.is_read ? "unread" : ""}`}
                        >
                            <div className="notification-symbol">
                                ↗
                            </div>

                            <div className="notification-body">
                                <strong>
                                    {item.type === "file_received"
                                        ? "File shared with you"
                                        : item.type.replaceAll("_", " ")}
                                </strong>

                                <p>
                                    {item.details?.filename ||
                                        item.details?.message ||
                                        "A new notification is available."}
                                </p>

                                <small>
                                    {new Date(item.created_at).toLocaleString()}
                                </small>
                            </div>

                            {!item.is_read && (
                                <button
                                    type="button"
                                    onClick={() => markRead(item.id)}
                                >
                                    Mark read
                                </button>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}
