import { useNavigate } from "react-router-dom";

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
    <main>
      <h1>Smart Appointment & Queue</h1>

      <h2>Customer Dashboard</h2>

      {user && (
        <p>
          Welcome, <strong>{user.name}</strong>
        </p>
      )}

      <hr />

      <h3>Appointments</h3>

      <button onClick={() => navigate("/book")}>
        Book Appointment
      </button>

      <button onClick={() => navigate("/appointments")}>
        My Appointments
      </button>

      <h3>Queue</h3>

      <button onClick={() => navigate("/queue")}>
        My Queue
      </button>

      <h3>Waitlist</h3>

      <button onClick={() => navigate("/waitlist")}>
        Join Waitlist
      </button>

      <hr />

      <button onClick={handleLogout}>
        Logout
      </button>
    </main>
  );
}