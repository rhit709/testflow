import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api";

const ACTIONS = ["navigate", "click", "type", "wait", "assert", "screenshot"];

export default function TestBuilder() {
  const location = useLocation();
  const navigate = useNavigate();
  const existingTest = location.state?.test;

  const [testId, setTestId] = useState(existingTest?._id || null);
  const [testName, setTestName] = useState(existingTest?.name || "");
  const [blocks, setBlocks] = useState(existingTest?.blocks || []);
  const [action, setAction] = useState("navigate");
  const [target, setTarget] = useState("");
  const [value, setValue] = useState("");

  const [stepStatuses, setStepStatuses] = useState([]); // live pass/fail per block index
  const [running, setRunning] = useState(false);
  const [overallPass, setOverallPass] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [runs, setRuns] = useState([]);

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("http://localhost:5000");
    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    if (testId) {
      socketRef.current.emit("join-test-room", testId);
      loadRuns(testId);
    }
  }, [testId]);

  function loadRuns(id) {
    api.get(`/tests/${id}/runs`).then((res) => setRuns(res.data)).catch(() => {});
  }

  function addStep() {
    if (!action) return;
    setBlocks([...blocks, { action, target, value }]);
    setTarget("");
    setValue("");
  }

  function deleteStep(i) {
    setBlocks(blocks.filter((_, idx) => idx !== i));
  }

  async function saveTest() {
    if (!testName || blocks.length === 0) {
      alert("Give the test a name and at least one step first.");
      return;
    }
    const res = await api.post("/tests", { name: testName, blocks });
    setTestId(res.data._id);
    alert("Test saved!");
  }

  async function runTest() {
    if (!testId) {
      alert("Save the test first before running it.");
      return;
    }
    setRunning(true);
    setOverallPass(null);
    setStepStatuses(blocks.map(() => "pending"));

    socketRef.current.off("step-result");
    socketRef.current.off("run-complete");

    socketRef.current.on("step-result", (data) => {
      setStepStatuses((prev) => {
        const next = [...prev];
        next[data.index] = data.status;
        return next;
      });
    });

    socketRef.current.on("run-complete", (data) => {
      setOverallPass(data.overallPass);
    });

    try {
      const res = await api.post(`/tests/${testId}/run`);
      setGeneratedCode(res.data.generatedCode);
      setOverallPass(res.data.overallPass);
      loadRuns(testId);
    } catch (err) {
      alert("Run failed: " + (err.response?.data?.error || err.message));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "30px auto", fontFamily: "Arial" }}>
      <button onClick={() => navigate("/dashboard")} style={{ marginBottom: 10 }}>← Back to Dashboard</button>
      <h2>Test Builder</h2>

      <input
        placeholder="Test name"
        value={testName}
        onChange={(e) => setTestName(e.target.value)}
        style={{ display: "block", width: "100%", padding: 8, marginBottom: 14, fontSize: 15 }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <select value={action} onChange={(e) => setAction(e.target.value)} style={{ padding: 8 }}>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input placeholder="target (CSS selector)" value={target} onChange={(e) => setTarget(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <input placeholder="value (URL / text)" value={value} onChange={(e) => setValue(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <button onClick={addStep} style={{ padding: "8px 14px" }}>Add Step</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {blocks.map((b, i) => {
          const status = stepStatuses[i];
          const bg = status === "passed" ? "#e6f7ee" : status === "failed" ? "#fdecea" : status === "pending" ? "#fff8e1" : "#f6fafc";
          const icon = status === "passed" ? "✅" : status === "failed" ? "❌" : status === "pending" ? "⏳" : "";
          return (
            <li key={i} style={{ background: bg, border: "1px solid #d8e3ea", borderRadius: 6, padding: 10, marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>{icon} <b>{b.action}</b> {b.target && `→ ${b.target}`} {b.value && `= ${b.value}`}</span>
              <button onClick={() => deleteStep(i)}>Delete</button>
            </li>
          );
        })}
      </ul>

      <div style={{ marginTop: 16 }}>
        <button onClick={saveTest} style={{ padding: "10px 18px", marginRight: 10 }}>Save Test</button>
        <button onClick={runTest} disabled={running || !testId} style={{ padding: "10px 18px", background: "#ff7a45", color: "white", border: "none" }}>
          {running ? "Running..." : "Run Test"}
        </button>
      </div>

      {overallPass !== null && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: overallPass ? "#e6f7ee" : "#fdecea" }}>
          <b>Result: {overallPass ? "PASSED ✅" : "FAILED ❌"}</b>
          {generatedCode && (
            <pre style={{ background: "#1b2530", color: "#e8f0f5", padding: 12, borderRadius: 6, marginTop: 10, whiteSpace: "pre-wrap" }}>
              {generatedCode}
            </pre>
          )}
        </div>
      )}

      {runs.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Run History</h3>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {runs.map((r) => (
              <li key={r._id} style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                {r.overallPass ? "✅ Passed" : "❌ Failed"} — {new Date(r.createdAt).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}