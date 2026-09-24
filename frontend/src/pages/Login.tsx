import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("Logging in...");

    try {
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
        }
      );

      const { user, accessToken, refreshToken } =
        response.data.data;

      // Store login information for the current browser session
      sessionStorage.setItem("accessToken", accessToken);
      sessionStorage.setItem("refreshToken", refreshToken);
      sessionStorage.setItem("user", JSON.stringify(user));

      // Go to dashboard after successful login
      navigate("/dashboard");

    } catch (error) {
      console.error("LOGIN ERROR:", error);

      if (axios.isAxiosError(error)) {
        console.error(
          "BACKEND ERROR RESPONSE:",
          error.response?.data
        );

        console.error(
          "HTTP STATUS:",
          error.response?.status
        );

        setMessage(
          error.response?.data?.error?.message ||
            (error.response
              ? `Login failed with status ${error.response.status}`
              : "Cannot connect to the backend. Check if the server is running.")
        );
      } else {
        console.error("UNEXPECTED ERROR:", error);
        setMessage(
          "Something went wrong. Check the browser console."
        );
      }
    }
  }

  return (
    <main>
      <h1>Smart Appointment & Queue</h1>

      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">
            Email
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
          />
        </div>

        <button type="submit">
          Login
        </button>
      </form>

      <p role="status">
        {message}
      </p>
    </main>
  );
}