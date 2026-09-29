const Test = require("../models/Test");
const TestRun = require("../models/TestRun");
const { generateScript } = require("../services/generateScript");
const { runBlocksLive } = require("../services/runner");

// GET /api/tests — list the logged-in user's saved tests
async function listTests(req, res) {
  const tests = await Test.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(tests);
}

// POST /api/tests — save a new test (block sequence)
async function createTest(req, res) {
  const { name, blocks } = req.body;
  if (!name || !Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ error: "Test name and at least one block are required" });
  }
  const test = await Test.create({ userId: req.userId, name, blocks });
  res.status(201).json(test);
}

// POST /api/tests/:id/run — run a saved test
async function runTest(req, res) {
  const test = await Test.findOne({ _id: req.params.id, userId: req.userId });
  if (!test) return res.status(404).json({ error: "Test not found" });

  const io = req.app.get("io");
  const room = `test-${test._id}`;
  const generatedCode = generateScript(test.blocks);

  try {
    const { overallPass, results } = await runBlocksLive(test.blocks, (stepResult) => {
      if (io) io.to(room).emit("step-result", stepResult); // live push, one event per step
    });

    const run = await TestRun.create({
      testId: test._id,
      overallPass,
      results,
      generatedCode,
    });

    if (io) io.to(room).emit("run-complete", { overallPass, runId: run._id });
    res.json({ overallPass, results, generatedCode, runId: run._id });
  } catch (err) {
    res.status(500).json({ error: err.message, generatedCode });
  }
}

// GET /api/tests/:id/runs — history of past runs for a test
async function listRuns(req, res) {
  const runs = await TestRun.find({ testId: req.params.id }).sort({ createdAt: -1 });
  res.json(runs);
}

module.exports = { listTests, createTest, runTest, listRuns };