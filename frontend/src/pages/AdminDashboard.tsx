import { useEffect, useState } from "react";
import axios from "axios";
import "./AdminDashboard.css";

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

type Resource = {
  id: number;
  branchId: number;
  name: string;
  active: boolean;
};

type BusinessHour = {
  id?: number;
  branchId?: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  breakStart?: string;
  breakEnd?: string;
};

type Holiday = {
  id: number;
  branchId: number;
  date: string;
  description?: string;
};

const days = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

function createDefaultSchedule(): BusinessHour[] {
  return days.map((day) => ({
    dayOfWeek: day.value,
    openTime: "09:00",
    closeTime: "18:00",
    breakStart: "",
    breakEnd: "",
  }));
}

export default function AdminDashboard() {
  // -----------------------------
  // MAIN DATA
  // -----------------------------

  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [message, setMessage] = useState("");

  // -----------------------------
  // BRANCH FORM
  // -----------------------------

  const [branchName, setBranchName] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchContact, setBranchContact] = useState("");

  // -----------------------------
  // SERVICE FORM
  // -----------------------------

  const [serviceBranch, setServiceBranch] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceCapacity, setServiceCapacity] = useState("1");

  // -----------------------------
  // RESOURCE FORM
  // -----------------------------

  const [resourceBranch, setResourceBranch] = useState("");
  const [resourceName, setResourceName] = useState("");

  // -----------------------------
  // SCHEDULE
  // -----------------------------

  const [scheduleBranch, setScheduleBranch] = useState("");
  const [schedule, setSchedule] =
    useState<BusinessHour[]>(createDefaultSchedule());

  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // -----------------------------
  // HOLIDAY
  // -----------------------------

  const [holidayBranch, setHolidayBranch] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayDescription, setHolidayDescription] = useState("");

  // -----------------------------
  // AUTH
  // -----------------------------

  const token = sessionStorage.getItem("accessToken");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // ============================================================
  // BRANCHES
  // ============================================================

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

  // ============================================================
  // SERVICES
  // ============================================================

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

  // ============================================================
  // RESOURCES
  // ============================================================

  async function loadResources() {
    try {
      const response = await axios.get(`${API_URL}/resources`);

      setResources(response.data.data || []);
    } catch (error) {
      console.error("LOAD RESOURCES ERROR:", error);
    }
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadBranches();
    loadServices();
    loadResources();
  }, []);

  // ============================================================
  // ADD BRANCH
  // ============================================================

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

      await loadBranches();
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

  // ============================================================
  // UPDATE BRANCH
  // ============================================================

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

  // ============================================================
  // TOGGLE BRANCH
  // ============================================================

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

  // ============================================================
  // DELETE BRANCH
  // ============================================================

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
      await loadResources();
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

  // ============================================================
  // ADD SERVICE
  // ============================================================

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

      await loadServices();
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

  // ============================================================
  // ADD RESOURCE
  // ============================================================

  async function addResource() {
    if (!resourceBranch || !resourceName) {
      setMessage("Please select a branch and enter resource name");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/resources`,
        {
          branchId: Number(resourceBranch),
          name: resourceName,
        },
        authConfig
      );

      setMessage("Resource added successfully");

      setResourceBranch("");
      setResourceName("");

      await loadResources();
    } catch (error) {
      console.error("ADD RESOURCE ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            error.response?.data?.message ||
            "Failed to add resource"
        );
      }
    }
  }

  // ============================================================
  // TOGGLE RESOURCE
  // ============================================================

  async function toggleResource(
    id: number,
    active: boolean
  ) {
    try {
      await axios.patch(
        `${API_URL}/resources/${id}`,
        {
          active: !active,
        },
        authConfig
      );

      setMessage(
        active
          ? "Resource deactivated"
          : "Resource activated"
      );

      await loadResources();
    } catch (error) {
      console.error("TOGGLE RESOURCE ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            error.response?.data?.message ||
            "Failed to update resource"
        );
      }
    }
  }

  // ============================================================
  // EDIT RESOURCE
  // ============================================================

  async function editResource(
    id: number,
    currentName: string
  ) {
    const name = window.prompt(
      "Resource name:",
      currentName
    );

    if (name === null || !name.trim()) {
      return;
    }

    try {
      await axios.patch(
        `${API_URL}/resources/${id}`,
        {
          name: name.trim(),
        },
        authConfig
      );

      setMessage("Resource updated successfully");

      await loadResources();
    } catch (error) {
      console.error("EDIT RESOURCE ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            error.response?.data?.message ||
            "Failed to update resource"
        );
      }
    }
  }

  // ============================================================
  // LOAD SCHEDULE
  // ============================================================

  async function loadSchedule(branchId: string) {
    if (!branchId) {
      setSchedule(createDefaultSchedule());
      return;
    }

    try {
      setLoadingSchedule(true);

      const response = await axios.get(
        `${API_URL}/branches/${branchId}/hours`
      );

      const existingHours: BusinessHour[] =
        response.data.data || [];

      const completeSchedule = days.map((day) => {
        const existing = existingHours.find(
          (item) => item.dayOfWeek === day.value
        );

        if (existing) {
          return {
            id: existing.id,
            branchId: Number(branchId),
            dayOfWeek: existing.dayOfWeek,
            openTime: existing.openTime,
            closeTime: existing.closeTime,
            breakStart: existing.breakStart || "",
            breakEnd: existing.breakEnd || "",
          };
        }

        return {
          dayOfWeek: day.value,
          openTime: "09:00",
          closeTime: "18:00",
          breakStart: "",
          breakEnd: "",
        };
      });

      setSchedule(completeSchedule);
    } catch (error) {
      console.error("LOAD SCHEDULE ERROR:", error);

      setMessage("Could not load branch schedule.");
    } finally {
      setLoadingSchedule(false);
    }
  }

  // ============================================================
  // SCHEDULE BRANCH CHANGE
  // ============================================================

  useEffect(() => {
    if (scheduleBranch) {
      loadSchedule(scheduleBranch);
    } else {
      setSchedule(createDefaultSchedule());
    }
  }, [scheduleBranch]);

  // ============================================================
  // UPDATE SCHEDULE FIELD
  // ============================================================

  function updateSchedule(
    dayOfWeek: number,
    field: keyof BusinessHour,
    value: string
  ) {
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    );
  }

  // ============================================================
  // SAVE SCHEDULE
  // ============================================================

  async function saveSchedule() {
    if (!scheduleBranch) {
      setMessage("Please select a branch.");
      return;
    }

    for (const day of schedule) {
      if (!day.openTime || !day.closeTime) {
        setMessage(
          "Please provide opening and closing times for every day."
        );
        return;
      }

      if (
        (day.breakStart && !day.breakEnd) ||
        (!day.breakStart && day.breakEnd)
      ) {
        setMessage(
          "Please provide both break start and break end."
        );
        return;
      }
    }

    try {
      setSavingSchedule(true);

      const scheduleData = schedule.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        openTime: day.openTime,
        closeTime: day.closeTime,
        ...(day.breakStart
          ? { breakStart: day.breakStart }
          : {}),
        ...(day.breakEnd
          ? { breakEnd: day.breakEnd }
          : {}),
      }));

      await axios.put(
        `${API_URL}/branches/${scheduleBranch}/hours`,
        scheduleData,
        authConfig
      );

      setMessage("Business hours saved successfully.");

      await loadSchedule(scheduleBranch);
    } catch (error) {
      console.error("SAVE SCHEDULE ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            error.response?.data?.message ||
            "Failed to save schedule."
        );
      }
    } finally {
      setSavingSchedule(false);
    }
  }

  // ============================================================
  // LOAD HOLIDAYS
  // ============================================================

  async function loadHolidays(branchId: string) {
    if (!branchId) {
      setHolidays([]);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/branches/${branchId}/holidays`
      );

      setHolidays(response.data.data || []);
    } catch (error) {
      console.error("LOAD HOLIDAYS ERROR:", error);

      setMessage("Could not load holidays.");
    }
  }

  // ============================================================
  // HOLIDAY BRANCH CHANGE
  // ============================================================

  useEffect(() => {
    if (holidayBranch) {
      loadHolidays(holidayBranch);
    } else {
      setHolidays([]);
    }
  }, [holidayBranch]);

  // ============================================================
  // ADD HOLIDAY
  // ============================================================

  async function addHoliday() {
    if (!holidayBranch || !holidayDate) {
      setMessage("Please select a branch and holiday date.");
      return;
    }

    try {
      await axios.post(
        `${API_URL}/branches/${holidayBranch}/holidays`,
        {
          date: holidayDate,
          description:
            holidayDescription.trim() || undefined,
        },
        authConfig
      );

      setMessage("Holiday added successfully.");

      setHolidayDate("");
      setHolidayDescription("");

      await loadHolidays(holidayBranch);
    } catch (error) {
      console.error("ADD HOLIDAY ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            error.response?.data?.message ||
            "Failed to add holiday."
        );
      }
    }
  }

  // ============================================================
  // DELETE HOLIDAY
  // ============================================================

  async function deleteHoliday(id: number) {
    if (!holidayBranch) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this holiday?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/branches/${holidayBranch}/holidays/${id}`,
        authConfig
      );

      setMessage("Holiday deleted successfully.");

      await loadHolidays(holidayBranch);
    } catch (error) {
      console.error("DELETE HOLIDAY ERROR:", error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            error.response?.data?.message ||
            "Failed to delete holiday."
        );
      }
    }
  }

  // ============================================================
  // REFRESH EVERYTHING
  // ============================================================

  async function refreshAll() {
    await Promise.all([
      loadBranches(),
      loadServices(),
      loadResources(),
    ]);

    if (scheduleBranch) {
      await loadSchedule(scheduleBranch);
    }

    if (holidayBranch) {
      await loadHolidays(holidayBranch);
    }

    setMessage("Dashboard refreshed.");
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="admin-page">

      {/* HEADER */}
      <header className="admin-header">
        <div>
          <h1>Smart Appointment & Queue</h1>
          <p>Administrator Dashboard</p>
        </div>

        <button
          className="admin-refresh-button"
          onClick={refreshAll}
        >
          Refresh
        </button>
      </header>

      <main className="admin-container">

        {/* INTRO */}
        <section className="admin-intro">
          <h2>System Management</h2>

          <p>
            Manage branches, services, resources,
            working hours and holidays.
          </p>
        </section>

        {/* MESSAGE */}
        {message && (
          <div className="admin-message">
            {message}
          </div>
        )}

        {/* ======================================================
            BRANCH
        ====================================================== */}

        <section className="admin-card">

          <div className="admin-section-title">
            <div>
              <h2>Add Branch</h2>
              <p>
                Create a new branch for your organization.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">

            <div className="admin-form-group">
              <label>Branch Name</label>

              <input
                type="text"
                placeholder="Enter branch name"
                value={branchName}
                onChange={(e) =>
                  setBranchName(e.target.value)
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Address</label>

              <input
                type="text"
                placeholder="Enter branch address"
                value={branchAddress}
                onChange={(e) =>
                  setBranchAddress(e.target.value)
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Contact</label>

              <input
                type="text"
                placeholder="Enter contact number"
                value={branchContact}
                onChange={(e) =>
                  setBranchContact(e.target.value)
                }
              />
            </div>

          </div>

          <button
            className="admin-primary-button"
            onClick={addBranch}
          >
            + Add Branch
          </button>

        </section>

        {/* ======================================================
            BRANCH LIST
        ====================================================== */}

        <section className="admin-card">

          <div className="admin-section-title">
            <div>
              <h2>Branches</h2>
              <p>
                View and manage existing branches.
              </p>
            </div>

            <span className="admin-count">
              {branches.length}
            </span>
          </div>

          {branches.length === 0 ? (
            <div className="admin-empty">
              <p>No branches found.</p>
            </div>
          ) : (
            <div className="branch-grid">

              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="branch-card"
                >

                  <div className="branch-card-header">
                    <div>
                      <h3>{branch.name}</h3>

                      <span
                        className={
                          branch.active
                            ? "active-badge"
                            : "inactive-badge"
                        }
                      >
                        {branch.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div className="branch-info">

                    <p>
                      <strong>Address:</strong>{" "}
                      {branch.address}
                    </p>

                    <p>
                      <strong>Contact:</strong>{" "}
                      {branch.contact}
                    </p>

                  </div>

                  <div className="branch-actions">

                    <button
                      className="edit-button"
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
                    >
                      Edit
                    </button>

                    <button
                      className="toggle-button"
                      onClick={() =>
                        toggleBranch(
                          branch.id,
                          branch.active
                        )
                      }
                    >
                      {branch.active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        deleteBranch(branch.id)
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* ======================================================
            SERVICE
        ====================================================== */}

        <section className="admin-card">

          <div className="admin-section-title">
            <div>
              <h2>Add Service</h2>
              <p>
                Create a service and assign it to a branch.
              </p>
            </div>
          </div>

          <div className="admin-form-grid">

            <div className="admin-form-group">
              <label>Branch</label>

              <select
                value={serviceBranch}
                onChange={(e) =>
                  setServiceBranch(e.target.value)
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
            </div>

            <div className="admin-form-group">
              <label>Service Name</label>

              <input
                type="text"
                placeholder="e.g. General Consultation"
                value={serviceName}
                onChange={(e) =>
                  setServiceName(e.target.value)
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Duration (minutes)</label>

              <input
                type="number"
                min="1"
                placeholder="30"
                value={serviceDuration}
                onChange={(e) =>
                  setServiceDuration(e.target.value)
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Price (₹)</label>

              <input
                type="number"
                min="0"
                placeholder="500"
                value={servicePrice}
                onChange={(e) =>
                  setServicePrice(e.target.value)
                }
              />
            </div>

            <div className="admin-form-group">
              <label>Capacity</label>

              <input
                type="number"
                min="1"
                value={serviceCapacity}
                onChange={(e) =>
                  setServiceCapacity(e.target.value)
                }
              />
            </div>

          </div>

          <button
            className="admin-primary-button"
            onClick={addService}
          >
            + Add Service
          </button>

        </section>

        {/* ======================================================
            SERVICES
        ====================================================== */}

        <section className="admin-card">

          <div className="admin-section-title">

            <div>
              <h2>Services</h2>

              <p>
                Services currently available across branches.
              </p>
            </div>

            <span className="admin-count">
              {services.length}
            </span>

          </div>

          {services.length === 0 ? (
            <div className="admin-empty">
              <p>No services found.</p>
            </div>
          ) : (
            <div className="service-grid">

              {services.map((service) => (
                <div
                  key={service.id}
                  className="service-card"
                >

                  <div className="service-card-header">

                    <div>
                      <h3>{service.name}</h3>

                      <span
                        className={
                          service.active
                            ? "active-badge"
                            : "inactive-badge"
                        }
                      >
                        {service.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                  </div>

                  <div className="service-info">

                    <p>
                      <strong>Branch ID:</strong>{" "}
                      {service.branchId}
                    </p>

                    <p>
                      <strong>Duration:</strong>{" "}
                      {service.duration} minutes
                    </p>

                    <p>
                      <strong>Price:</strong>{" "}
                      ₹{service.price}
                    </p>

                    <p>
                      <strong>Capacity:</strong>{" "}
                      {service.capacity}
                    </p>

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* ======================================================
            RESOURCES
        ====================================================== */}

        <section className="admin-card">

          <div className="admin-section-title">
            <div>
              <h2>Resource Management</h2>

              <p>
                Manage counters, rooms, desks,
                bays and service stations.
              </p>
            </div>

            <span className="admin-count">
              {resources.length}
            </span>
          </div>

          {/* ADD RESOURCE */}

          <div className="admin-form-grid">

            <div className="admin-form-group">
              <label>Branch</label>

              <select
                value={resourceBranch}
                onChange={(e) =>
                  setResourceBranch(e.target.value)
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
            </div>

            <div className="admin-form-group">
              <label>Resource Name</label>

              <input
                type="text"
                placeholder="e.g. Counter 1"
                value={resourceName}
                onChange={(e) =>
                  setResourceName(e.target.value)
                }
              />
            </div>

          </div>

          <button
            className="admin-primary-button"
            onClick={addResource}
          >
            + Add Resource
          </button>

          {/* RESOURCE LIST */}

          <div className="resource-grid">

            {resources.length === 0 ? (
              <div className="admin-empty">
                <p>No resources found.</p>
              </div>
            ) : (
              resources.map((resource) => (
                <div
                  key={resource.id}
                  className="resource-card"
                >

                  <div>
                    <h3>{resource.name}</h3>

                    <p>
                      Branch ID: {resource.branchId}
                    </p>

                    <span
                      className={
                        resource.active
                          ? "active-badge"
                          : "inactive-badge"
                      }
                    >
                      {resource.active
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </div>

                  <div className="resource-actions">

                    <button
                      className="edit-button"
                      onClick={() =>
                        editResource(
                          resource.id,
                          resource.name
                        )
                      }
                    >
                      Edit
                    </button>

                    <button
                      className="toggle-button"
                      onClick={() =>
                        toggleResource(
                          resource.id,
                          resource.active
                        )
                      }
                    >
                      {resource.active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                  </div>

                </div>
              ))
            )}

          </div>

        </section>

        {/* ======================================================
            BUSINESS HOURS
        ====================================================== */}

        <section className="admin-card">

          <div className="admin-section-title">

            <div>
              <h2>Business Hours & Breaks</h2>

              <p>
                Configure working hours and break periods
                for each branch.
              </p>
            </div>

          </div>

          <div className="admin-form-group admin-single-field">

            <label>Select Branch</label>

            <select
              value={scheduleBranch}
              onChange={(e) =>
                setScheduleBranch(e.target.value)
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

          </div>

          {!scheduleBranch ? (
            <div className="admin-empty">
              <p>
                Select a branch to configure its
                business hours.
              </p>
            </div>
          ) : loadingSchedule ? (
            <div className="admin-empty">
              <p>Loading schedule...</p>
            </div>
          ) : (
            <>
              <div className="schedule-table-wrapper">

                <table className="schedule-table">

                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Opening</th>
                      <th>Closing</th>
                      <th>Break Start</th>
                      <th>Break End</th>
                    </tr>
                  </thead>

                  <tbody>

                    {schedule.map((day) => {

                      const dayName =
                        days.find(
                          (item) =>
                            item.value === day.dayOfWeek
                        )?.label || "";

                      return (
                        <tr key={day.dayOfWeek}>

                          <td>
                            <strong>{dayName}</strong>
                          </td>

                          <td>
                            <input
                              type="time"
                              value={day.openTime}
                              onChange={(e) =>
                                updateSchedule(
                                  day.dayOfWeek,
                                  "openTime",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="time"
                              value={day.closeTime}
                              onChange={(e) =>
                                updateSchedule(
                                  day.dayOfWeek,
                                  "closeTime",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="time"
                              value={day.breakStart || ""}
                              onChange={(e) =>
                                updateSchedule(
                                  day.dayOfWeek,
                                  "breakStart",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="time"
                              value={day.breakEnd || ""}
                              onChange={(e) =>
                                updateSchedule(
                                  day.dayOfWeek,
                                  "breakEnd",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>

              <button
                className="admin-primary-button"
                onClick={saveSchedule}
                disabled={savingSchedule}
              >
                {savingSchedule
                  ? "Saving..."
                  : "Save Business Hours"}
              </button>
            </>
          )}

        </section>

        {/* ======================================================
            HOLIDAYS
        ====================================================== */}

        <section className="admin-card">

          <div className="admin-section-title">

            <div>
              <h2>Holiday Management</h2>

              <p>
                Configure dates when a branch will
                remain closed.
              </p>
            </div>

          </div>

          <div className="admin-form-grid">

            <div className="admin-form-group">

              <label>Select Branch</label>

              <select
                value={holidayBranch}
                onChange={(e) =>
                  setHolidayBranch(e.target.value)
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

            </div>

            <div className="admin-form-group">

              <label>Holiday Date</label>

              <input
                type="date"
                value={holidayDate}
                onChange={(e) =>
                  setHolidayDate(e.target.value)
                }
              />

            </div>

            <div className="admin-form-group">

              <label>Description</label>

              <input
                type="text"
                placeholder="e.g. Dasara Holiday"
                value={holidayDescription}
                onChange={(e) =>
                  setHolidayDescription(e.target.value)
                }
              />

            </div>

          </div>

          <button
            className="admin-primary-button"
            onClick={addHoliday}
          >
            + Add Holiday
          </button>

          {/* HOLIDAY LIST */}

          <div className="holiday-list">

            {!holidayBranch ? (
              <div className="admin-empty">
                <p>
                  Select a branch to view holidays.
                </p>
              </div>
            ) : holidays.length === 0 ? (
              <div className="admin-empty">
                <p>No holidays configured.</p>
              </div>
            ) : (
              holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="holiday-card"
                >

                  <div>

                    <h3>
                      {new Date(
                        holiday.date
                      ).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </h3>

                    <p>
                      {holiday.description ||
                        "Branch closed"}
                    </p>

                  </div>

                  <button
                    className="delete-button"
                    onClick={() =>
                      deleteHoliday(holiday.id)
                    }
                  >
                    Delete
                  </button>

                </div>
              ))
            )}

          </div>

        </section>

      </main>
    </div>
  );
}