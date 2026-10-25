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

  async function deleteTest(id) {
    if (!window.confirm("Delete this test and its run history?")) return;
    try {
      await api.delete(`/tests/${id}`);
      setTests(tests.filter((t) => t._id !== id));
    } catch (err) {
      alert("Delete failed: " + (err.response?.data?.error || err.message));
    }
  }

  return (
    <div className="page">
      <div className="topbar">
        <div className="logo"><span className="logo-mark">T</span>TestFlow</div>
        <div className="spacer" />
        <Link to="/builder" className="btn btn-primary">+ New test</Link>
        <button className="btn" onClick={logout}>Log out</button>
      </div>

      <h2 className="page-title">My tests</h2>

      {loading && <p className="muted">Loading...</p>}
      {!loading && tests.length === 0 && <div className="empty">No tests yet. Create your first one.</div>}

      <ul className="test-list">
        {tests.map((t) => (
          <li key={t._id} className="test-item">
            <div>
              <Link to="/builder" state={{ test: t }} className="test-link">{t.name}</Link>
              <div className="test-meta">
                {t.blocks.length} steps · created {new Date(t.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button className="btn btn-danger" onClick={() => deleteTest(t._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}