import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

const API_URL = "http://localhost:5000/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { user, accessToken, refreshToken } = response.data.data;

      sessionStorage.setItem("accessToken", accessToken);
      sessionStorage.setItem("refreshToken", refreshToken);
      sessionStorage.setItem("user", JSON.stringify(user));

      if (user.role === "ADMIN") {
        navigate("/admin");
      } else if (user.role === "STAFF") {
        navigate("/staff");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.log("Login error:", err.response?.data || err);

      const errorData = err.response?.data;

      if (typeof errorData?.error?.message === "string") {
        setError(errorData.error.message);
      } else if (typeof errorData?.message === "string") {
        setError(errorData.message);
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <div className="login-icon">SAQ</div>

          <h1>Smart Appointment & Queue</h1>

          <p>
            Manage your appointments and queues with ease
          </p>
        </div>

        <form onSubmit={handleLogin}>

          <div className="login-form-group">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="login-form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>

        </form>

        <div className="login-register">
          <span>Don't have an account?</span>{" "}
          <Link to="/register">Register</Link>
        </div>

      </div>
    </div>
  );
}

export default Login;