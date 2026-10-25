import { useEffect, useState, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api";

const ACTIONS = ["navigate", "click", "type", "wait", "assert", "screenshot"];

const HINTS = {
  navigate: { target: "target (not needed)", value: "URL, e.g. https://example.com" },
  click: { target: "CSS selector, e.g. #loginBtn", value: "value (not needed)" },
  type: { target: "CSS selector, e.g. #email", value: "text to type" },
  wait: { target: "CSS selector to wait for", value: "value (not needed)" },
  assert: { target: "target (not needed)", value: "text that should appear" },
  screenshot: { target: "target (not needed)", value: "value (not needed)" },
};

export default function TestBuilder() {
  const location = useLocation();
  const existingTest = location.state?.test;

  const [testId, setTestId] = useState(existingTest?._id || null);
  const [testName, setTestName] = useState(existingTest?.name || "");
  const [blocks, setBlocks] = useState(existingTest?.blocks || []);
  const [action, setAction] = useState("navigate");
  const [target, setTarget] = useState("");
  const [value, setValue] = useState("");

  const [stepStatuses, setStepStatuses] = useState([]);
  const [running, setRunning] = useState(false);
  const [overallPass, setOverallPass] = useState(null);
  const [generatedCode, setGeneratedCode] = useState("");
  const [explanation, setExplanation] = useState(null);
  const [explanationSource, setExplanationSource] = useState("");
  const [runs, setRuns] = useState([]);

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL || "http://localhost:5000");
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

  function resetResults() {
    setStepStatuses([]);
    setOverallPass(null);
    setExplanation(null);
  }

  function addStep() {
    setBlocks([...blocks, { action, target, value }]);
    resetResults();
    setTarget("");
    setValue("");
  }

  function deleteStep(i) {
    setBlocks(blocks.filter((_, idx) => idx !== i));
    resetResults();
  }

  async function saveTest() {
    if (!testName || blocks.length === 0) {
      alert("Give the test a name and at least one step first.");
      return;
    }
    try {
      if (testId) {
        await api.put(`/tests/${testId}`, { name: testName, blocks });
        alert("Test updated!");
      } else {
        const res = await api.post("/tests", { name: testName, blocks });
        setTestId(res.data._id);
        alert("Test saved!");
      }
    } catch (err) {
      alert("Save failed: " + (err.response?.data?.error || err.message));
    }
  }

  async function runTest() {
    if (!testId) {
      alert("Save the test first before running it.");
      return;
    }
    setRunning(true);
    setOverallPass(null);
    setExplanation(null);
    setStepStatuses(blocks.map(() => "pending"));

    socketRef.current.off("step-result");
    socketRef.current.off("run-complete");

    socketRef.current.on("step-result", (data) => {
      setStepStatuses((prev) => {
        const next = [...prev];
        next[data.index] = data;
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
      setExplanation(res.data.explanation || null);
      setExplanationSource(res.data.explanationSource || "");
      loadRuns(testId);
    } catch (err) {
      alert("Run failed: " + (err.response?.data?.error || err.message));
    } finally {
      setRunning(false);
    }
  }

  const firstPending = running ? stepStatuses.findIndex((s) => s === "pending") : -1;
  const passedCount = stepStatuses.filter((s) => typeof s === "object" && s.status === "passed").length;

  function stepView(i) {
    const d = stepStatuses[i];
    if (!d) return { cls: "", label: "" };
    if (typeof d === "object") {
      return d.status === "passed" ? { cls: "passed", label: "Passed" } : { cls: "failed", label: "Failed" };
    }
    if (!running) return { cls: "", label: "Skipped" };
    return i === firstPending ? { cls: "running", label: "Running..." } : { cls: "", label: "Waiting" };
  }

  const hint = HINTS[action];

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/dashboard" className="btn btn-ghost">← Dashboard</Link>
        <h1 className="page-title">Test Builder</h1>
      </div>

      <input
        className="input"
        placeholder="Test name"
        value={testName}
        onChange={(e) => setTestName(e.target.value)}
        style={{ marginBottom: 20, padding: "14px 16px", fontSize: 16 }}
      />

      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">Steps</h3>

          <div className="add-row">
            <select className="input select" value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input className="input" placeholder={hint.target} value={target} onChange={(e) => setTarget(e.target.value)} />
            <input className="input" placeholder={hint.value} value={value} onChange={(e) => setValue(e.target.value)} />
            <button className="btn" onClick={addStep}>Add step</button>
          </div>

          <ul className="steps">
            {blocks.map((b, i) => {
              const v = stepView(i);
              const d = stepStatuses[i];
              const healed = typeof d === "object" && d?.healed;
              const failedMsg = typeof d === "object" && d?.status === "failed" ? d.errorMessage?.split("\n")[0] : null;
              return (
                <li key={i} className={`step ${v.cls}`}>
                  <span className="step-num">{i + 1}</span>
                  <div className="step-main">
                    <div className="step-action">{b.action}</div>
                    <div className="step-detail">
                      {b.target ? `→ ${b.target}` : ""}{b.target && b.value ? " " : ""}{b.value ? `= ${b.value}` : ""}
                    </div>
                    {healed && <span className="heal-badge">Self-healed → {d.healedSelector}</span>}
                    {failedMsg && <div className="step-error">{failedMsg}</div>}
                  </div>
                  {v.label && <span className={`status ${v.cls}`}>{v.label}</span>}
                  <button className="step-del" onClick={() => deleteStep(i)}>Delete</button>
                </li>
              );
            })}
          </ul>

          <div className="actions">
            <button className="btn" onClick={saveTest}>Save test</button>
            <button className="btn btn-primary" onClick={runTest} disabled={running || !testId}>
              {running ? "Running..." : "Run test"}
            </button>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 className="card-title">Result</h3>

            {running && <p className="muted">Running. Each step reports back on the left as it finishes.</p>}
            {!running && overallPass === null && <p className="muted">Select "Run test" to see the result here.</p>}

            {!running && overallPass !== null && (
              <>
                <div className={`result-box ${overallPass ? "pass" : "fail"}`}>
                  <div className={`result-head ${overallPass ? "pass" : "fail"}`}>{overallPass ? "Passed" : "Failed"}</div>
                  <div className="result-sub">{passedCount} of {blocks.length} steps passed</div>
                </div>

                {explanation && (
                  <div className="explain">
                    <div className="explain-title">
                      Why did it fail?
                      <span className="tag">{explanationSource === "ai" ? "AI" : "Rule-based"}</span>
                    </div>
                    <p>{explanation}</p>
                  </div>
                )}

                {generatedCode && (
                  <>
                    <div className="code-label">Generated Playwright code</div>
                    <pre className="code">{generatedCode}</pre>
                  </>
                )}
              </>
            )}
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <h3 className="card-title">Run history</h3>
            {runs.length === 0 ? (
              <p className="muted">No runs yet.</p>
            ) : (
              <ul className="history">
                {runs.map((r) => (
                  <li key={r._id}>
                    <span className={`pill ${r.overallPass ? "pass" : "fail"}`}>{r.overallPass ? "Passed" : "Failed"}</span>
                    {new Date(r.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}