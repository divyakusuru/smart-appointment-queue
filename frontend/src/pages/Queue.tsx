import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

interface QueueItem {
  queueId: number;
  appointmentId: number;
  position: number;
  priority: string;
  status: string;
  calledAt?: string | null;
  service?: {
    name: string;
  };
}

export default function Queue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/queue/mine");

      setQueue(response.data.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error?.message ||
            "Failed to load queue"
        );
      } else {
        setError("Failed to load queue");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  if (loading) {
    return <div style={{ padding: 30 }}>Loading queue...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <h1>My Queue</h1>

      <button type="button" onClick={loadQueue}>
        Refresh
      </button>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {queue.length === 0 ? (
        <p>No active queue entries.</p>
      ) : (
        queue.map((item) => (
          <div
            key={item.queueId}
            style={{
              border: "1px solid #ddd",
              padding: 20,
              marginTop: 15,
              borderRadius: 8,
            }}
          >
            <h2>Queue #{item.position}</h2>

            <p>
              <strong>Service:</strong>{" "}
              {item.service?.name || "Service"}
            </p>

            <p>
              <strong>Priority:</strong> {item.priority}</p>

            <p>
              <strong>Status:</strong> {item.status}
            </p>

            {item.calledAt && (
              <p>
                <strong>Called at:</strong>{" "}
                {new Date(item.calledAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}