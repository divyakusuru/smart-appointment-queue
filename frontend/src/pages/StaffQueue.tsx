import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

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
const [walkInPriority, setWalkInPriority] =
  useState("NORMAL");

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

      setBranches(response.data.branches || response.data.data || []);
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

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "40px auto",
        padding: "20px",
      }}
    >
      <h1>Staff Queue Dashboard</h1>

      <p>
        Manage customers waiting at the selected branch.
      </p>

      <div style={{ marginBottom: "20px" }}>
        <label>Branch</label>

        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          style={{
            display: "block",
            marginTop: "8px",
            padding: "10px",
            width: "300px",
          }}
        >
          <option value="">Select branch</option>

          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
    
    <div
  style={{
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "25px",
  }}
>
  <h2>Add Walk-in Customer</h2>

  <input
    type="text"
    placeholder="Customer name"
    value={walkInName}
    onChange={(e) =>
      setWalkInName(e.target.value)
    }
    style={{
      display: "block",
      marginBottom: "10px",
      padding: "10px",
      width: "300px",
    }}
  />

  <select
    value={walkInService}
    onChange={(e) =>
      setWalkInService(e.target.value)
    }
    style={{
      display: "block",
      marginBottom: "10px",
      padding: "10px",
      width: "320px",
    }}
  >
    <option value="">Select service</option>

    {services.map((service) => (
      <option
        key={service.id}
        value={service.id}
      >
        {service.name}
      </option>
    ))}
  </select>

  <select
    value={walkInPriority}
    onChange={(e) =>
      setWalkInPriority(e.target.value)
    }
    style={{
      display: "block",
      marginBottom: "10px",
      padding: "10px",
      width: "320px",
    }}
  >
    <option value="NORMAL">Normal</option>
    <option value="PRIORITY">Priority</option>
    <option value="EMERGENCY">Emergency</option>
  </select>

  <button onClick={addWalkIn}>
    Add Walk-in
  </button>
</div>


      {message && (
        <p
          style={{
            padding: "10px",
            background: "#eef6ff",
          }}
        >
          {message}
        </p>
      )}

      {!branchId && (
        <p>Select a branch to view the queue.</p>
      )}

      {loading && <p>Loading queue...</p>}

      {branchId && !loading && queue.length === 0 && (
        <p>No customers in the queue.</p>
      )}

      {queue.map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <h3>
            #{item.position} - {item.user.name}
          </h3>

          <p>
            <strong>Email:</strong>{" "}
            {item.user.email}
          </p>

          <p>
            <strong>Priority:</strong>{" "}
            {item.priority}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {item.status}
          </p>

          {item.appointment && (
            <>
              <p>
                <strong>Appointment:</strong>{" "}
                {item.appointment.appointmentNumber}
              </p>

              <p>
                <strong>Service:</strong>{" "}
                {item.appointment.service.name}
              </p>
            </>
          )}

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {item.status === "WAITING" && (
  <>
    <button onClick={callNext}>
      Call Next
    </button>

    <button
      onClick={() => cancelCustomer(item.id)}
    >
      Cancel
    </button>
  </>
)}

            {item.status === "CALLED" && (
              <>
                <button
                  onClick={() => startService(item.id)}
                >
                  Start Service
                </button>

                <button
                  onClick={() => skipCustomer(item.id)}
                >
                  Skip
                </button>
              </>
            )}

            {item.status === "IN_PROGRESS" && (
              <button
                onClick={() => completeService(item.id)}
              >
                Complete Service
              </button>
            )}
          </div>
        </div>
      ))}
    </main>
  );
}