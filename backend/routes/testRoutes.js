const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { listTests, createTest, updateTest, deleteTest, runTest, listRuns } = require("../controllers/testController");

const router = express.Router();
router.use(requireAuth);

router.get("/", listTests);
router.post("/", createTest);
router.put("/:id", updateTest);
router.delete("/:id", deleteTest);
router.post("/:id/run", runTest);
router.get("/:id/runs", listRuns);

module.exports = router;