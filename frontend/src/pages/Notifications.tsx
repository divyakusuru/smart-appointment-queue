import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";
import "./Notifications.css";
interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications");

      setNotifications(response.data.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error?.message ||
            "Failed to load notifications"
        );
      } else {
        setError("Failed to load notifications");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      setError("");

      await api.patch(`/notifications/${id}/read`);

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error?.message ||
            "Failed to mark notification as read"
        );
      } else {
        setError("Failed to mark notification as read");
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      setError("");
      setMessage("");

      await api.patch("/notifications/read-all");

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      setMessage("All notifications marked as read.");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error?.message ||
            "Failed to mark notifications as read"
        );
      } else {
        setError("Failed to mark notifications as read");
      }
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  if (loading) {
  return (
    <main className="notifications-page">
      <div className="notifications-container">
        <h1>Notifications</h1>
        <p>Loading notifications...</p>
      </div>
    </main>
  );
}

return (
  <main className="notifications-page">
    <div className="notifications-container">

      <div className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p className="unread-count">
            <strong>Unread:</strong> {unreadCount}
          </p>
        </div>
      </div>

      <div className="notification-actions">
        <button type="button" onClick={loadNotifications}>
          Refresh
        </button>

        {unreadCount > 0 && (
          <button
            type="button"
            className="mark-all-button"
            onClick={markAllAsRead}
          >
            Mark All as Read
          </button>
        )}
      </div>

      {message && (
        <p className="notification-message">
          {message}
        </p>
      )}

      {error && (
        <p className="notification-error">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <p className="empty-notifications">
          No notifications.
        </p>
      ) : (
        notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification-card ${
              notification.isRead ? "read" : "unread"
            }`}
          >
            <h2>{notification.title}</h2>

            <p>{notification.message}</p>

            <p>
              <strong>Type:</strong> {notification.type}
            </p>

            <p>
              <strong>Created:</strong>{" "}
              {new Date(notification.createdAt).toLocaleString()}
            </p>

            {!notification.isRead && (
              <button
                type="button"
                onClick={() => markAsRead(notification.id)}
              >
                Mark as Read
              </button>
            )}

            {notification.isRead && (
              <p className="read-status">
                <strong>Status:</strong> Read
              </p>
            )}
          </div>
        ))
      )}

    </div>
  </main>
);
}