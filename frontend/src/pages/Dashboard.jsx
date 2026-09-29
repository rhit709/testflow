import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

export default function Dashboard() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/tests")
      .then((res) => setTests(res.data))
      .catch(() => navigate("/login"))
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem("token");
    navigate("/login");
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "Arial" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>My Tests</h2>
        <div>
          <Link to="/builder"><button style={{ marginRight: 10, padding: "8px 14px" }}>+ New Test</button></Link>
          <button onClick={logout} style={{ padding: "8px 14px" }}>Logout</button>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && tests.length === 0 && <p>No tests yet — create your first one.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {tests.map((t) => (
          <li key={t._id} style={{ background: "#f6fafc", border: "1px solid #d8e3ea", borderRadius: 6, padding: 12, marginBottom: 8 }}>
            <Link to="/builder" state={{ test: t }} style={{ textDecoration: "none", color: "#0b3d5c", fontWeight: "bold" }}>
              {t.name}
            </Link>
            <span style={{ color: "#888", marginLeft: 10, fontSize: 13 }}>
              {t.blocks.length} steps · created {new Date(t.createdAt).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}