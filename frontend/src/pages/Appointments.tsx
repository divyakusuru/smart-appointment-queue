import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";
import "./Appointments.css";

interface Appointment {
  id: number;
  appointmentNumber: string;
  branchId: number;
  serviceId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string | null;
  service?: {
    name: string;
    duration?: number;
  };
  branch?: {
    name: string;
  };
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduling, setRescheduling] = useState(false);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/appointments/mine");

      setAppointments(response.data.data || []);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error?.message ||
            "Failed to load appointments"
        );
      } else {
        setError("Failed to load appointments");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const cancelAppointment = async (id: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await api.patch(`/appointments/${id}/cancel`);

      setMessage("Appointment cancelled successfully.");

      await loadAppointments();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error?.message ||
            "Failed to cancel appointment"
        );
      } else {
        setError("Failed to cancel appointment");
      }
    }
  };

  const rescheduleAppointment = async () => {
    if (!rescheduleId || !newDate || !newTime) {
      setError("Please select a date and time.");
      return;
    }

    try {
      setRescheduling(true);
      setError("");
      setMessage("");

      await api.patch(
        `/appointments/${rescheduleId}/reschedule`,
        {
          date: newDate,
          startTime: newTime,
        }
      );

      setMessage("Appointment rescheduled successfully.");

      setRescheduleId(null);
      setNewDate("");
      setNewTime("");

      await loadAppointments();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error?.message ||
            "Failed to reschedule appointment"
        );
      } else {
        setError("Failed to reschedule appointment");
      }
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 30 }}>
        <h1>My Appointments</h1>
        <p>Loading appointments...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 20,
      }}
    >
      <h1>My Appointments</h1>

      <button type="button" onClick={loadAppointments}>
        Refresh
      </button>

      {message && (
        <p style={{ color: "green" }}>
          {message}
        </p>
      )}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        appointments.map((appointment) => (
          <div
            key={appointment.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 20,
              marginTop: 20,
            }}
          >
            <h2>
              Appointment #{appointment.appointmentNumber}
            </h2>

            <p>
              <strong>Service:</strong>{" "}
              {appointment.service?.name || "Service"}
            </p>

            <p>
              <strong>Branch:</strong>{" "}
              {appointment.branch?.name ||
                `Branch ${appointment.branchId}`}
            </p>

            <p>
              <strong>Date:</strong>{" "}
              {new Date(
                appointment.appointmentDate
              ).toLocaleDateString()}
            </p>

            <p>
              <strong>Time:</strong>{" "}
              {appointment.startTime} - {appointment.endTime}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {appointment.status}
            </p>

            {appointment.notes && (
              <p>
                <strong>Notes:</strong>{" "}
                {appointment.notes}
              </p>
            )}

            {["PENDING", "CONFIRMED"].includes(
              appointment.status
            ) && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    cancelAppointment(appointment.id)
                  }
                  style={{ marginRight: 10 }}
                >
                  Cancel Appointment
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRescheduleId(appointment.id);
                    setNewDate(
                      appointment.appointmentDate.slice(0, 10)
                    );
                    setNewTime(appointment.startTime);
                    setError("");
                    setMessage("");
                  }}
                >
                  Reschedule
                </button>
              </>
            )}

            {rescheduleId === appointment.id && (
              <div
                style={{
                  marginTop: 20,
                  padding: 15,
                  borderTop: "1px solid #ddd",
                }}
              >
                <h3>Reschedule Appointment</h3>

                <label>
                  New Date:
                </label>

                <br />

                <input
                  type="date"
                  value={newDate}
                  min={new Date()
                    .toISOString()
                    .split("T")[0]}
                  onChange={(e) =>
                    setNewDate(e.target.value)
                  }
                />

                <br />
                <br />

                <label>
                  New Time:
                </label>

                <br />

                <input
                  type="time"
                  step="900"
                  value={newTime}
                  onChange={(e) =>
                    setNewTime(e.target.value)
                  }
                />

                <br />
                <br />

                <button
                  type="button"
                  onClick={rescheduleAppointment}
                  disabled={rescheduling}
                >
                  {rescheduling
                    ? "Rescheduling..."
                    : "Confirm Reschedule"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRescheduleId(null);
                    setNewDate("");
                    setNewTime("");
                  }}
                  style={{ marginLeft: 10 }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </main>
  );
}