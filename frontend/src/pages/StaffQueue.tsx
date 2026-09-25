import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";
import "./StaffQueue.css";

type QueueItem = {
  id: number;
  position: number;
  priority: "NORMAL" | "PRIORITY" | "EMERGENCY";
  status:
    | "WAITING"
    | "CALLED"
    | "SKIPPED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED"
    | "NO_SHOW";
  queueDate: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  appointment?: {
    id: number;
    appointmentNumber: string;
    startTime: string;
    endTime: string;
    service: {
      name: string;
    };
  };
};

type Branch = {
  id: number;
  name: string;
};

export default function StaffQueue() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [walkInName, setWalkInName] = useState("");
  const [walkInService, setWalkInService] = useState("");
  const [walkInPriority, setWalkInPriority] = useState("NORMAL");

  const [services, setServices] = useState<
    {
      id: number;
      name: string;
    }[]
  >([]);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (branchId) {
      loadQueue();
      loadServices();
    }
  }, [branchId]);

  const loadBranches = async () => {
    try {
      const response = await api.get("/branches");

      setBranches(
        response.data.branches ||
          response.data.data ||
          []
      );
    } catch (error) {
      console.error(error);
      setMessage("Failed to load branches");
    }
  };

  const loadQueue = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await api.get("/queue", {
        params: {
          branchId: Number(branchId),
          date: new Date().toISOString().split("T")[0],
        },
      });

      setQueue(
        response.data.queue ||
          response.data.data ||
          []
      );
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
            "Failed to load queue"
        );
      } else {
        setMessage("Failed to load queue");
      }
    } finally {
      setLoading(false);
    }
  };

  const callNext = async () => {
    try {
      setMessage("");

      await api.patch("/queue/next", {
        branchId: Number(branchId),
      });

      setMessage("Next customer called");
      await loadQueue();
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
            "Failed to call next customer"
        );
      }
    }
  };

  const startService = async (id: number) => {
    try {
      await api.patch(`/queue/${id}/start`);

      setMessage("Service started");
      await loadQueue();
    } catch (error) {
      console.error(error);
      setMessage("Failed to start service");
    }
  };

  const completeService = async (id: number) => {
    try {
      await api.patch(`/queue/${id}/complete`);

      setMessage("Service completed");
      await loadQueue();
    } catch (error) {
      console.error(error);
      setMessage("Failed to complete service");
    }
  };

  const skipCustomer = async (id: number) => {
    try {
      await api.patch(`/queue/${id}/skip`);

      setMessage("Customer skipped");
      await loadQueue();
    } catch (error) {
      console.error(error);
      setMessage("Failed to skip customer");
    }
  };

  const cancelCustomer = async (id: number) => {
    try {
      await api.patch(`/queue/${id}/cancel`);

      setMessage("Queue entry cancelled");
      await loadQueue();
    } catch (error) {
      console.error(error);
      setMessage("Failed to cancel queue entry");
    }
  };

  const loadServices = async () => {
    try {
      const response = await api.get(
        `/services?branchId=${branchId}`
      );

      setServices(
        response.data.services ||
          response.data.data ||
          []
      );
    } catch (error) {
      console.error(error);
    }
  };

  const addWalkIn = async () => {
    if (!walkInName || !walkInService || !branchId) {
      setMessage("Please fill all walk-in details");
      return;
    }

    try {
      await api.post("/queue/walk-in", {
        name: walkInName,
        branchId: Number(branchId),
        serviceId: Number(walkInService),
        priority: walkInPriority,
      });

      setMessage("Walk-in customer added");

      setWalkInName("");
      setWalkInService("");
      setWalkInPriority("NORMAL");

      await loadQueue();
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
            "Failed to add walk-in"
        );
      }
    }
  };

  const waitingCount = queue.filter(
    (item) => item.status === "WAITING"
  ).length;

  const calledCount = queue.filter(
    (item) => item.status === "CALLED"
  ).length;

  const inProgressCount = queue.filter(
    (item) => item.status === "IN_PROGRESS"
  ).length;

  return (
    <div className="staff-page">

      {/* HEADER */}
      <header className="staff-header">
        <div>
          <h1>Smart Appointment & Queue</h1>
          <p>Staff Queue Dashboard</p>
        </div>

        <button
          className="staff-refresh-button"
          onClick={loadQueue}
          disabled={!branchId || loading}
        >
          Refresh
        </button>
      </header>

      <main className="staff-container">

        {/* BRANCH SELECTION */}
        <section className="staff-section">
          <div className="section-title">
            <div>
              <h2>Queue Management</h2>
              <p>
                Manage customers waiting at the selected branch.
              </p>
            </div>
          </div>

          <label className="staff-label">
            Select Branch
          </label>

          <select
            className="staff-select"
            value={branchId}
            onChange={(e) =>
              setBranchId(e.target.value)
            }
          >
            <option value="">
              Select branch
            </option>

            {branches.map((branch) => (
              <option
                key={branch.id}
                value={branch.id}
              >
                {branch.name}
              </option>
            ))}
          </select>
        </section>

        {/* QUEUE SUMMARY */}
        {branchId && (
          <section className="queue-stats">

            <div className="stat-card">
              <span className="stat-number">
                {waitingCount}
              </span>
              <span className="stat-label">
                Waiting
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-number">
                {calledCount}
              </span>
              <span className="stat-label">
                Called
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-number">
                {inProgressCount}
              </span>
              <span className="stat-label">
                In Progress
              </span>
            </div>

          </section>
        )}

        {/* WALK-IN */}
        {branchId && (
          <section className="walkin-card">

            <div className="section-title">
              <div>
                <h2>Add Walk-in Customer</h2>
                <p>
                  Add a customer who arrived without an appointment.
                </p>
              </div>
            </div>

            <div className="walkin-form">

              <div className="form-field">
                <label>Customer Name</label>

                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={walkInName}
                  onChange={(e) =>
                    setWalkInName(e.target.value)
                  }
                />
              </div>

              <div className="form-field">
                <label>Service</label>

                <select
                  value={walkInService}
                  onChange={(e) =>
                    setWalkInService(e.target.value)
                  }
                >
                  <option value="">
                    Select service
                  </option>

                  {services.map((service) => (
                    <option
                      key={service.id}
                      value={service.id}
                    >
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Priority</label>

                <select
                  value={walkInPriority}
                  onChange={(e) =>
                    setWalkInPriority(e.target.value)
                  }
                >
                  <option value="NORMAL">
                    Normal
                  </option>

                  <option value="PRIORITY">
                    Priority
                  </option>

                  <option value="EMERGENCY">
                    Emergency
                  </option>
                </select>
              </div>

              <button
                className="primary-button"
                onClick={addWalkIn}
              >
                + Add Walk-in
              </button>

            </div>
          </section>
        )}

        {/* MESSAGE */}
        {message && (
          <div className="staff-message">
            {message}
          </div>
        )}

        {/* EMPTY STATE */}
        {!branchId && (
          <div className="staff-empty">
            <h3>Select a branch</h3>
            <p>
              Select a branch above to view and manage its queue.
            </p>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="staff-empty">
            <p>Loading queue...</p>
          </div>
        )}

        {/* NO QUEUE */}
        {branchId &&
          !loading &&
          queue.length === 0 && (
            <div className="staff-empty">
              <h3>No customers in the queue</h3>
              <p>
                Add a walk-in customer or wait for appointments.
              </p>
            </div>
          )}

        {/* QUEUE */}
        {branchId &&
          !loading &&
          queue.length > 0 && (
            <section className="queue-section">

              <div className="queue-section-header">
                <div>
                  <h2>Today's Queue</h2>
                  <p>
                    {queue.length} customer
                    {queue.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <button
                  className="call-next-button"
                  onClick={callNext}
                >
                  Call Next
                </button>
              </div>

              <div className="queue-list">

                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="queue-card"
                  >

                    {/* POSITION */}
                    <div className="queue-position">
                      #{item.position}
                    </div>

                    {/* CUSTOMER */}
                    <div className="queue-customer">
                      <h3>{item.user.name}</h3>

                      <p>
                        {item.user.email}
                      </p>

                      {item.appointment && (
                        <p className="appointment-number">
                          Appointment:{" "}
                          {item.appointment.appointmentNumber}
                        </p>
                      )}
                    </div>

                    {/* DETAILS */}
                    <div className="queue-details">

                      {item.appointment && (
                        <div>
                          <span className="detail-label">
                            Service
                          </span>

                          <span>
                            {item.appointment.service.name}
                          </span>
                        </div>
                      )}

                      <div>
                        <span className="detail-label">
                          Priority
                        </span>

                        <span
                          className={`priority-badge priority-${item.priority.toLowerCase()}`}
                        >
                          {item.priority}
                        </span>
                      </div>

                      <div>
                        <span className="detail-label">
                          Status
                        </span>

                        <span
                          className={`status-badge status-${item.status.toLowerCase()}`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>

                    </div>

                    {/* ACTIONS */}
                    <div className="queue-actions">

                      {item.status === "WAITING" && (
                        <>
                          <button
                            className="action-primary"
                            onClick={callNext}
                          >
                            Call Next
                          </button>

                          <button
                            className="action-danger"
                            onClick={() =>
                              cancelCustomer(item.id)
                            }
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {item.status === "CALLED" && (
                        <>
                          <button
                            className="action-primary"
                            onClick={() =>
                              startService(item.id)
                            }
                          >
                            Start Service
                          </button>

                          <button
                            className="action-warning"
                            onClick={() =>
                              skipCustomer(item.id)
                            }
                          >
                            Skip
                          </button>
                        </>
                      )}

                      {item.status === "IN_PROGRESS" && (
                        <button
                          className="action-success"
                          onClick={() =>
                            completeService(item.id)
                          }
                        >
                          Complete Service
                        </button>
                      )}

                    </div>

                  </div>
                ))}

              </div>
            </section>
          )}

      </main>
    </div>
  );
}