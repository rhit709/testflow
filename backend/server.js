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

// In production, set FRONTEND_URL to your deployed frontend address
const allowedOrigin = process.env.FRONTEND_URL || "*";
const io = new Server(server, { cors: { origin: allowedOrigin } });

app.set("io", io);
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

io.on("connection", (socket) => {
  socket.on("join-test-room", (testId) => {
    socket.join(`test-${testId}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
connectDB();