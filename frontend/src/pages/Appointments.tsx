import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

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

            {[
              "PENDING",
              "CONFIRMED",
              "CHECKED_IN",
            ].includes(appointment.status) && (
              <button
                type="button"
                onClick={() =>
                  cancelAppointment(appointment.id)
                }
              >
                Cancel Appointment
              </button>
            )}
          </div>
        ))
      )}
    </main>
  );
}