import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

type Branch = {
  id: number;
  name: string;
  address: string;
  contact: string;
  active: boolean;
};

type Service = {
  id: number;
  branchId: number;
  name: string;
  description?: string;
  duration: number;
  price: number;
  capacity: number;
  active: boolean;
};

export default function AdminDashboard() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("");

  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchContact, setBranchContact] = useState("");

  const [serviceBranch, setServiceBranch] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCapacity, setServiceCapacity] = useState("1");

  const token = sessionStorage.getItem("accessToken");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  async function loadBranches() {
    try {
      const response = await axios.get(`${API_URL}/branches`);

      setBranches(
        response.data.branches ||
        response.data.data ||
        []
      );
    } catch (error) {
      console.error("LOAD BRANCHES ERROR:", error);
    }
  }

  async function loadServices() {
    try {
      const response = await axios.get(`${API_URL}/services`);

      setServices(
        response.data.services ||
        response.data.data ||
        []
      );
    } catch (error) {
      console.error("LOAD SERVICES ERROR:", error);
    }
  }

  useEffect(() => {
    loadBranches();
    loadServices();
  }, []);

  async function addBranch() {
    if (!branchName || !branchAddress || !branchContact) {
      setMessage("Please fill all branch details");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/branches`,
        {
          name: branchName,
          address: branchAddress,
          contact: branchContact,
        },
        authConfig
      );

      setMessage("Branch added successfully");

      setBranchName("");
      setBranchAddress("");
      setBranchContact("");

      loadBranches();
    } catch (error) {
      console.error("ADD BRANCH ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
          "Failed to add branch"
        );
      }
    }
  }

  async function updateBranch(
  id: number,
  name: string,
  address: string,
  contact: string
) {
  try {
    await axios.patch(
      `${API_URL}/branches/${id}`,
      {
        name,
        address,
        contact,
      },
      authConfig
    );

    setMessage("Branch updated successfully");
    await loadBranches();
  } catch (error) {
    console.error("UPDATE BRANCH ERROR:", error);

    if (axios.isAxiosError(error)) {
      setMessage(
        error.response?.data?.message ||
          "Failed to update branch"
      );
    }
  }
}

async function toggleBranch(
  id: number,
  active: boolean
) {
  try {
    await axios.patch(
      `${API_URL}/branches/${id}`,
      {
        active: !active,
      },
      authConfig
    );

    setMessage(
      active
        ? "Branch deactivated"
        : "Branch activated"
    );

    await loadBranches();
  } catch (error) {
    console.error("TOGGLE BRANCH ERROR:", error);

    if (axios.isAxiosError(error)) {
      setMessage(
        error.response?.data?.message ||
          "Failed to update branch status"
      );
    }
  }
}

async function deleteBranch(id: number) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this branch?"
  );

  if (!confirmed) {
    return;
  }

  try {
    await axios.delete(
      `${API_URL}/branches/${id}`,
      authConfig
    );

    setMessage("Branch deleted successfully");

    await loadBranches();
    await loadServices();
  } catch (error) {
    console.error("DELETE BRANCH ERROR:", error);

    if (axios.isAxiosError(error)) {
      setMessage(
        error.response?.data?.message ||
          "Failed to delete branch"
      );
    }
  }
}

  async function addService() {
    if (
      !serviceBranch ||
      !serviceName ||
      !serviceDuration ||
      !servicePrice
    ) {
      setMessage("Please fill all service details");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/services`,
        {
          branchId: Number(serviceBranch),
          name: serviceName,
          duration: Number(serviceDuration),
          price: Number(servicePrice),
          capacity: Number(serviceCapacity),
        },
        authConfig
      );

      setMessage("Service added successfully");

      setServiceBranch("");
      setServiceName("");
      setServiceDuration("");
      setServicePrice("");
      setServiceCapacity("1");

      loadServices();
    } catch (error) {
      console.error("ADD SERVICE ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.message ||
          "Failed to add service"
        );
      }
    }
  }

  return (
    <main style={{ padding: "30px" }}>

      <h1>Admin Dashboard</h1>

      <p>
        Manage branches and services from this dashboard.
      </p>

      {message && (
        <p style={{ color: "green" }}>
          {message}
        </p>
      )}

      <hr />

      {/* ADD BRANCH */}

      <section style={{ marginTop: "25px" }}>

        <h2>Add Branch</h2>

        <input
          type="text"
          placeholder="Branch name"
          value={branchName}
          onChange={(e) =>
            setBranchName(e.target.value)
          }
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "300px",
          }}
        />

        <input
          type="text"
          placeholder="Address"
          value={branchAddress}
          onChange={(e) =>
            setBranchAddress(e.target.value)
          }
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "300px",
          }}
        />

        <input
          type="text"
          placeholder="Contact"
          value={branchContact}
          onChange={(e) =>
            setBranchContact(e.target.value)
          }
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "300px",
          }}
        />

        <button onClick={addBranch}>
          Add Branch
        </button>

      </section>

      <hr />

      {/* BRANCH LIST */}

      {/* BRANCH LIST */}

<section style={{ marginTop: "25px" }}>

  <h2>Branches</h2>

  {branches.length === 0 ? (
    <p>No branches found.</p>
  ) : (
    branches.map((branch) => (
      <div
        key={branch.id}
        style={{
          border: "1px solid #ddd",
          padding: "15px",
          marginBottom: "10px",
          borderRadius: "8px",
        }}
      >
        <strong>{branch.name}</strong>

        <p>{branch.address}</p>

        <p>
          Contact: {branch.contact}
        </p>

        <p>
          Status:{" "}
          {branch.active ? "Active" : "Inactive"}
        </p>

        <button
          onClick={() => {
            const name = window.prompt(
              "Branch name:",
              branch.name
            );

            if (name === null) return;

            const address = window.prompt(
              "Branch address:",
              branch.address
            );

            if (address === null) return;

            const contact = window.prompt(
              "Branch contact:",
              branch.contact
            );

            if (contact === null) return;

            updateBranch(
              branch.id,
              name,
              address,
              contact
            );
          }}
          style={{ marginRight: "10px" }}
        >
          Edit
        </button>

        <button
          onClick={() =>
            toggleBranch(
              branch.id,
              branch.active
            )
          }
          style={{ marginRight: "10px" }}
        >
          {branch.active ? "Deactivate" : "Activate"}
        </button>

        <button
          onClick={() => deleteBranch(branch.id)}
        >
          Delete
        </button>

      </div>
    ))
  )}

</section>

<hr />

{/* ADD SERVICE */}
      {/* ADD SERVICE */}

      <section style={{ marginTop: "25px" }}>

        <h2>Add Service</h2>

       <select
  value={serviceBranch}
  onChange={(e) =>
    setServiceBranch(e.target.value)
  }
  style={{
    display: "block",
    marginBottom: "10px",
    padding: "10px",
    width: "320px",
  }}
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

        <input
          type="text"
          placeholder="Service name"
          value={serviceName}
          onChange={(e) =>
            setServiceName(e.target.value)
          }
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "300px",
          }}
        />

        <input
          type="number"
          placeholder="Duration in minutes"
          value={serviceDuration}
          onChange={(e) =>
            setServiceDuration(e.target.value)
          }
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "300px",
          }}
        />

        <input
          type="number"
          placeholder="Price"
          value={servicePrice}
          onChange={(e) =>
            setServicePrice(e.target.value)
          }
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "300px",
          }}
        />

        <input
          type="number"
          placeholder="Capacity"
          value={serviceCapacity}
          onChange={(e) =>
            setServiceCapacity(e.target.value)
          }
          style={{
            display: "block",
            marginBottom: "10px",
            padding: "10px",
            width: "300px",
          }}
        />

        <button onClick={addService}>
          Add Service
        </button>

      </section>

      <hr />

      {/* SERVICE LIST */}

      <section style={{ marginTop: "25px" }}>

        <h2>Services</h2>

        {services.length === 0 ? (
          <p>No services found.</p>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                marginBottom: "10px",
                borderRadius: "8px",
              }}
            >
              <strong>
                {service.name}
              </strong>

              <p>
                Branch ID: {service.branchId}
              </p>

              <p>
                Duration: {service.duration} minutes
              </p>

              <p>
                Price: ₹{service.price}
              </p>

              <p>
                Capacity: {service.capacity}
              </p>

              <p>
                Status:{" "}
                {service.active
                  ? "Active"
                  : "Inactive"}
              </p>
            </div>
          ))
        )}

      </section>

    </main>
  );
}