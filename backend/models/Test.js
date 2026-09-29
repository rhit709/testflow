const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["navigate", "click", "type", "wait", "assert", "screenshot"],
      required: true,
    },
    target: { type: String }, // CSS selector - not needed for "navigate"
    value: { type: String },  // URL or text, depending on the action
  },
  { _id: false }
);

const testSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    blocks: { type: [blockSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Test", testSchema);    