const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { listTests, createTest, runTest, listRuns } = require("../controllers/testController");

const router = express.Router();

router.use(requireAuth); // every route below requires a valid JWT

router.get("/", listTests);
router.post("/", createTest);
router.post("/:id/run", runTest);
router.get("/:id/runs", listRuns);

module.exports = router;