const mongoose = require("mongoose");

const stepResultSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    status: { type: String, enum: ["passed", "failed"], required: true },
    errorMessage: { type: String },
  },
  { _id: false }
);

const testRunSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
    overallPass: { type: Boolean, required: true },
    results: { type: [stepResultSchema], default: [] },
    generatedCode: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TestRun", testRunSchema);