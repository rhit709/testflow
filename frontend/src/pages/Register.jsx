import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="logo"><span className="logo-mark">T</span>TestFlow</div>
        <h2>Create account</h2>
        <p className="sub">Build and run browser tests without writing code.</p>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Name</label>
          <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="field-label">Email</label>
          <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="field-label">Password</label>
          <input className="input" type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 20, padding: 12 }}>Register</button>
        </form>
        <p className="auth-foot">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  );
}