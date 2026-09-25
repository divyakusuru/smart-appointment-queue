import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/api";
import "./Waitlist.css";

type Branch = {
  id: number;
  name: string;
  active: boolean;
};

type Service = {
  id: number;
  branchId: number;
  name: string;
  duration: number;
  active: boolean;
};

type WaitlistEntry = {
  id: number;
  branchId: number;
  serviceId: number;
  requestedDate: string;
  requestedTime?: string;
  status: string;
  position?: number;
  branch: {
    name: string;
  };
  service: {
    name: string;
  };
};

export default function Waitlist() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const [entries, setEntries] = useState<WaitlistEntry[]>([]);

  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");

  // LOAD BRANCHES
  useEffect(() => {
    async function loadBranches() {
      try {
        const response = await api.get("/branches");
        setBranches(response.data.data);
      } catch (error) {
        console.error(error);
        setMessage("Could not load branches.");
      }
    }

    loadBranches();
  }, []);

  // LOAD SERVICES
  useEffect(() => {
    async function loadServices() {
      if (!branchId) {
        setServices([]);
        return;
      }

      try {
        setServices([]);

        const response = await api.get(
          `/services?branchId=${branchId}`
        );

        setServices(response.data.data);
      } catch (error) {
        console.error(error);
        setMessage("Could not load services.");
      }
    }

    loadServices();
  }, [branchId]);

  // LOAD MY WAITLIST
  async function loadWaitlist() {
    try {
      setLoading(true);
      setMessage("");

      const response = await api.get("/waitlist/my");

      setEntries(response.data.data || []);
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
            error.response?.data?.error?.message ||
            "Could not load waitlist."
        );
      } else {
        setMessage("Could not load waitlist.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWaitlist();
  }, []);

  // JOIN WAITLIST
  async function joinWaitlist() {
    if (!branchId || !serviceId || !date) {
      setMessage(
        "Please select a branch, service and date."
      );
      return;
    }

    try {
      setJoining(true);
      setMessage("");

      await api.post("/waitlist", {
        branchId: Number(branchId),
        serviceId: Number(serviceId),
        requestedDate: date,
        requestedTime: time || undefined,
      });

      setMessage(
        "You have been added to the waitlist."
      );

      setDate("");
      setTime("");

      await loadWaitlist();
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
            error.response?.data?.error?.message ||
            "Could not join waitlist."
        );
      } else {
        setMessage("Could not join waitlist.");
      }
    } finally {
      setJoining(false);
    }
  }

  // CANCEL WAITLIST
  async function cancelWaitlist(id: number) {
    const confirmed = window.confirm(
      "Remove yourself from this waitlist?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setMessage("");

      await api.delete(`/waitlist/${id}`);

      setMessage(
        "Removed from waitlist successfully."
      );

      await loadWaitlist();
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
            error.response?.data?.error?.message ||
            "Could not cancel waitlist entry."
        );
      } else {
        setMessage(
          "Could not cancel waitlist entry."
        );
      }
    }
  }

  return (
    <main className="waitlist-page">
      <div className="waitlist-container">

        {/* HEADER */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="secondary-button"
          >
            ← Back to Dashboard
          </button>

          <h1>Waitlist</h1>

          <p className="waitlist-subtitle">
            Join a waitlist when your preferred appointment
            slot is unavailable.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <p
            role="status"
            className={
              message.toLowerCase().includes("could not") ||
              message.toLowerCase().includes("please select") ||
              message.toLowerCase().includes("already")
                ? "waitlist-error"
                : "waitlist-success"
            }
          >
            {message}
          </p>
        )}

        {/* JOIN WAITLIST */}
        <section className="waitlist-form">
          <h2>Join Waitlist</h2>

          <label htmlFor="branch">
            Branch
          </label>

          <select
            id="branch"
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              setServiceId("");
            }}
          >
            <option value="">
              Select branch
            </option>

            {branches
              .filter((branch) => branch.active)
              .map((branch) => (
                <option
                  key={branch.id}
                  value={branch.id}
                >
                  {branch.name}
                </option>
              ))}
          </select>

          <label htmlFor="service">
            Service
          </label>

          <select
            id="service"
            value={serviceId}
            onChange={(event) =>
              setServiceId(event.target.value)
            }
            disabled={!branchId}
          >
            <option value="">
              Select service
            </option>

            {services
              .filter((service) => service.active)
              .map((service) => (
                <option
                  key={service.id}
                  value={service.id}
                >
                  {service.name}
                </option>
              ))}
          </select>

          <label htmlFor="date">
            Date
          </label>

          <input
            id="date"
            type="date"
            value={date}
            min={
              new Date()
                .toISOString()
                .split("T")[0]
            }
            onChange={(event) =>
              setDate(event.target.value)
            }
          />

          <label htmlFor="time">
            Preferred Time (optional)
          </label>

          <input
            id="time"
            type="time"
            value={time}
            onChange={(event) =>
              setTime(event.target.value)
            }
          />

          <button
            type="button"
            onClick={joinWaitlist}
            disabled={joining}
          >
            {joining
              ? "Joining..."
              : "Join Waitlist"}
          </button>
        </section>

        {/* MY WAITLIST */}
        <section>
          <h2>My Waitlist Entries</h2>

          {loading ? (
            <p>Loading...</p>
          ) : entries.length === 0 ? (
            <p className="no-waitlist">
              You have no waitlist entries.
            </p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="waitlist-card"
              >
                <h3>{entry.service.name}</h3>

                <p>
                  <strong>Branch:</strong>{" "}
                  {entry.branch.name}
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {entry.requestedDate.slice(0, 10)}
                </p>

                {entry.requestedTime && (
                  <p>
                    <strong>Preferred Time:</strong>{" "}
                    {entry.requestedTime}
                  </p>
                )}

                <p>
                  <strong>Status:</strong>{" "}
                  <span className="waitlist-status">
                    {entry.status}
                  </span>
                </p>

                {entry.position && (
                  <p>
                    <strong>Queue Position:</strong>{" "}
                    <span className="waitlist-position">
                      #{entry.position}
                    </span>
                  </p>
                )}

                {entry.status === "WAITING" && (
                  <button
                    type="button"
                    onClick={() =>
                      cancelWaitlist(entry.id)
                    }
                  >
                    Leave Waitlist
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}