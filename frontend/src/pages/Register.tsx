import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";
 

const API_URL = "http://localhost:5000/api";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password,
      });

      setSuccess("Registration successful! Redirecting to login...");

      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err: any) {
  console.log("Registration error:", err.response?.data || err);

  const errorData = err.response?.data;

  if (typeof errorData?.error?.message === "string") {
    setError(errorData.error.message);
  } else if (typeof errorData?.message === "string") {
    setError(errorData.message);
  } else {
    setError("Registration failed. Please try again.");
  }
} finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page">
      <div className="register-card">

        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join Smart Appointment Queue</p>
        </div>

        <form onSubmit={handleRegister}>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          {success && (
            <div className="register-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>

        </form>

        <div className="register-footer">
          <p>
            Already have an account?{" "}
            <Link to="/">Login</Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Register;