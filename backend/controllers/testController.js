const Test = require("../models/Test");
const TestRun = require("../models/TestRun");
const { generateScript } = require("../services/generateScript");
const { runBlocksLive } = require("../services/runner");
const { explainFailure } = require("../services/aiExplainer");
let activeRuns = 0;
const MAX_RUNS = 1;
async function listTests(req, res) {
  const tests = await Test.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(tests);
}

async function createTest(req, res) {
  const { name, blocks } = req.body;
  if (!name || !Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ error: "Test name and at least one block are required" });
  }
  const test = await Test.create({ userId: req.userId, name, blocks });
  res.status(201).json(test);
}

// EDIT: update an existing test (only if it belongs to the logged-in user)
async function updateTest(req, res) {
  const { name, blocks } = req.body;
  if (!name || !Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ error: "Test name and at least one block are required" });
  }
  const test = await Test.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { name, blocks },
    { new: true, runValidators: true }
  );
  if (!test) return res.status(404).json({ error: "Test not found" });
  res.json(test);
}

async function deleteTest(req, res) {
  const test = await Test.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!test) return res.status(404).json({ error: "Test not found" });
  await TestRun.deleteMany({ testId: test._id });
  res.json({ message: "Test deleted" });
}

async function runTest(req, res) {
  if (activeRuns >= MAX_RUNS) {
    return res.status(429).json({ error: "The server is busy running other tests. Please try again in a few seconds." });
  }

  const test = await Test.findOne({ _id: req.params.id, userId: req.userId });
  if (!test) return res.status(404).json({ error: "Test not found" });

  activeRuns++;
  const io = req.app.get("io");
  const room = `test-${test._id}`;
  const generatedCode = generateScript(test.blocks);

  try {
    const { overallPass, results, failureContext } = await runBlocksLive(test.blocks, (stepResult) => {
      if (io) io.to(room).emit("step-result", stepResult);
    });

    let explanation = null;
    let explanationSource = null;
    if (!overallPass) {
      const failedIndex = results.findIndex((r) => r.status === "failed");
      const b = test.blocks[failedIndex];
      const out = await explainFailure({
        failedStep: { action: b.action, target: b.target, value: b.value },
        errorMessage: results[failedIndex].errorMessage,
        previousSteps: results.slice(0, failedIndex),
        pageContext: failureContext,
      });
      explanation = out.text;
      explanationSource = out.source;
    }

    const run = await TestRun.create({
      testId: test._id, overallPass, results, generatedCode, explanation, explanationSource,
    });
    if (io) io.to(room).emit("run-complete", { overallPass, runId: run._id });
    res.json({ overallPass, results, generatedCode, runId: run._id, explanation, explanationSource });
  } catch (err) {
    res.status(500).json({ error: err.message, generatedCode });
  } finally {
    activeRuns--; // always free the slot, even if the run crashed
  }
}

// Checks the test belongs to the user before returning its run history
async function listRuns(req, res) {
  const test = await Test.findOne({ _id: req.params.id, userId: req.userId });
  if (!test) return res.status(404).json({ error: "Test not found" });
  const runs = await TestRun.find({ testId: test._id }).sort({ createdAt: -1 });
  res.json(runs);
}

module.exports = { listTests, createTest, updateTest, deleteTest, runTest, listRuns };