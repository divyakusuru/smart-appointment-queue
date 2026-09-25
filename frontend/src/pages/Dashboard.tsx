import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const userString = sessionStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  function handleLogout() {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("user");

    navigate("/");
  }

  return (
    <main className="dashboard-page">

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>Smart Appointment & Queue</h1>
          <p>Customer Dashboard</p>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      {/* Welcome Section */}
      <section className="welcome-section">
        <div>
          <p className="welcome-label">Welcome back</p>

          <h2>
            {user ? user.name : "Customer"} 👋
          </h2>

          <p className="welcome-text">
            Manage your appointments, queue status and waitlist
            from one place.
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-section">

        <div className="section-heading">
          <h2>Quick Actions</h2>
          <p>What would you like to do?</p>
        </div>

        <div className="dashboard-grid">

          {/* Book Appointment */}
          <div className="dashboard-card">
            <div className="card-icon">📅</div>

            <h3>Book Appointment</h3>

            <p>
              Find an available time slot and book your
              appointment.
            </p>

            <button
              className="primary-button"
              onClick={() => navigate("/book")}
            >
              Book Appointment
            </button>
          </div>

          {/* My Appointments */}
          <div className="dashboard-card">
            <div className="card-icon">📋</div>

            <h3>My Appointments</h3>

            <p>
              View your upcoming and previous appointments.
            </p>

            <button
              className="secondary-button"
              onClick={() => navigate("/appointments")}
            >
              View Appointments
            </button>
          </div>

          {/* Queue */}
          <div className="dashboard-card">
            <div className="card-icon">🎫</div>

            <h3>My Queue</h3>

            <p>
              Check your current queue position and status.
            </p>

            <button
              className="secondary-button"
              onClick={() => navigate("/queue")}
            >
              View Queue
            </button>
          </div>

          {/* Waitlist */}
          <div className="dashboard-card">
            <div className="card-icon">⏳</div>

            <h3>Waitlist</h3>

            <p>
              Join a waitlist when your preferred slot is
              unavailable.
            </p>

            <button
              className="secondary-button"
              onClick={() => navigate("/waitlist")}
            >
              Manage Waitlist
            </button>
          </div>

          {/* Notifications */}
<div className="dashboard-card">
  <div className="card-icon">🔔</div>

  <h3>Notifications</h3>

  <p>
    View appointment confirmations, cancellations,
    reminders and other updates.
  </p>

  <button
    className="secondary-button"
    onClick={() => navigate("/notifications")}
  >
    View Notifications
  </button>
</div>

        </div>
      </section>

      {/* Information Section */}
      <section className="info-section">

        <div className="info-card">
          <h3>How it works</h3>

          <div className="steps">

            <div className="step">
              <span>1</span>
              <div>
                <strong>Book</strong>
                <p>Select a branch, service and available slot.</p>
              </div>
            </div>

            <div className="step">
              <span>2</span>
              <div>
                <strong>Check your queue</strong>
                <p>Track your appointment and queue status.</p>
              </div>
            </div>

            <div className="step">
              <span>3</span>
              <div>
                <strong>Get served</strong>
                <p>Follow the queue until your service is completed.</p>
              </div>
            </div>

          </div>
        </div>

      </section>

    </main>
  );
}