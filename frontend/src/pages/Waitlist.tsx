import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/api";

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

  // -----------------------------
  // LOAD BRANCHES
  // -----------------------------

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

  // -----------------------------
  // LOAD SERVICES
  // -----------------------------

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

  // -----------------------------
  // LOAD MY WAITLIST
  // -----------------------------

  async function loadWaitlist() {
    try {
      setLoading(true);

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

  // -----------------------------
  // JOIN WAITLIST
  // -----------------------------

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

  // -----------------------------
  // CANCEL WAITLIST
  // -----------------------------

  async function cancelWaitlist(id: number) {
  const confirmed = window.confirm(
    "Remove yourself from this waitlist?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await api.delete(`/waitlist/${id}`);

    setMessage(
      "Removed from waitlist successfully."
    );

    await loadWaitlist();
  } catch (error) {
    console.error(error);

    if (axios.isAxiosError(error)) {
      setMessage(
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
    <main>
      <h1>Waitlist</h1>

      <button
        type="button"
        onClick={() => navigate("/dashboard")}
      >
        ← Back to Dashboard
      </button>

      <hr />

      {/* JOIN WAITLIST */}

      <section>
        <h2>Join Waitlist</h2>

        <label htmlFor="branch">
          Branch
        </label>

        <br />

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

        <br />
        <br />

        <label htmlFor="service">
          Service
        </label>

        <br />

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

        <br />
        <br />

        <label htmlFor="date">
          Date
        </label>

        <br />

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

        <br />
        <br />

        <label htmlFor="time">
          Preferred Time (optional)
        </label>

        <br />

        <input
          id="time"
          type="time"
          value={time}
          onChange={(event) =>
            setTime(event.target.value)
          }
        />

        <br />
        <br />

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

      <hr />

      {/* MY WAITLIST */}

      <section>
        <h2>My Waitlist Entries</h2>

        {loading ? (
          <p>Loading...</p>
        ) : entries.length === 0 ? (
          <p>You have no waitlist entries.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id}>
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
                {entry.status}
              </p>

              {entry.position && (
                <p>
                  <strong>Queue Position:</strong>{" "}
                  {entry.position}
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

              <hr />
            </div>
          ))
        )}
      </section>

      {message && (
        <p role="status">
          {message}
        </p>
      )}
    </main>
  );
}