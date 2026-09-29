import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", fontFamily: "Arial" }}>
      <h2>Log in</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginBottom: 10 }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: "block", width: "100%", padding: 8, marginBottom: 10 }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ padding: "8px 16px" }}>Login</button>
      </form>
      <p>No account? <Link to="/register">Register</Link></p>
    </div>
  );
}