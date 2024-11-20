const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const redis = require("redis");
const cors = require("cors");
const { auth, requiresAuth } = require("express-openid-connect");
const jwt = require("jsonwebtoken");
const jwks = require("jwks-rsa");

// Load environment variables
dotenv.config();
require("./updateDB/cronJobs");
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "redis://localhost:6379",
});

async () => {
  await redisClient.connect();
  console.log("Connected to Redis");
};

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.auth_secret,
  baseURL: "http://localhost:3000",
  clientID: "YFciTRGyYGdKyq3FtQMIclgm8RD1SOWG",
  issuerBaseURL: "https://dev-lalbvr4u1decxft1.us.auth0.com",
};

const app = express();
app.use(auth(config));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// MySQL connection
const db = mysql
  .createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "realtime_bidding",
  })
  .promise();

// Test API endpoint
app.get("/", requiresAuth(), (req, res) => {
  res.send(req.oidc.isAuthenticated() ? "Logged in" : "Logged out");
});

app.get("/user_balance", requiresAuth(), (req, res) => {
  res.send(`Hello ${req.oidc.user.name}, you have accessed a protected route!`);
});

app.post("/api/auth/user", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  const user = req.body;
  try {
    value = await db.query("SELECT * FROM Users WHERE auth0_id = ?", [
      user.auth0_id,
    ]);
    if (value[0].length === 0) {
      await db.query(
        "INSERT INTO Users (auth0_id, name, email) VALUES (?, ?, ?)",
        [user.auth0_id, user.name, user.email]
      );
      // for every new user that is added, we are adding a balance of 0
      await db.query(
        "INSERT INTO user_balance (auth0_id, balance) VALUES (?, ?)",
        [user.auth0_id, 0]
      );
      console.log("User saved to database");
    }
  } catch (err) {
    console.error(err);
  }
});

app.post("/api/items", async (req, res) => {
  const item = req.body;
  console.log("Items: ", item);
  try {
    const [value] = await db.query(
      "INSERT INTO user_bids (auth0_id, item_name, description, starting_price, current_price, bid_start_time, bid_end_time) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        item.auth0_id,
        item.itemName,
        item.description,
        item.price,
        item.price,
        item.bid_start_time,
        item.bid_end_time,
      ]
    );
    res.json({ id: value.insertId });
  } catch (error) {
    console.error(error);
  }
});

app.get("/api/balance", async (req, res) => {
  const auth0id = req.query.id;
  try {
    const [value] = await db.query(
      "SELECT balance from user_balance WHERE auth0_id = ?",
      [auth0id]
    );
    res.json({ amount: value[0].balance });
  } catch (err) {
    console.error(err);
  }
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on("newBid", async (data) => {});

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
