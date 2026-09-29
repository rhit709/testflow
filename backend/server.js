require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.set("io", io); // lets controllers reach io via req.app.get("io")

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// A frontend client joins a "room" for the specific test it wants live updates for
io.on("connection", (socket) => {
  socket.on("join-test-room", (testId) => {
    socket.join(`test-${testId}`);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

connectDB();