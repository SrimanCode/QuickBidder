const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2");
const dotenv = require("dotenv");
const redis = require("redis");
const cors = require("cors");
const { auth, requiresAuth } = require("express-openid-connect");
const cron = require("node-cron");
const {
  initializeIO,
  moveItemsToRedisAndNotify,
} = require("./updateDB/cronJobs");
const { parse } = require("path");

dotenv.config();

// Initialize Redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis from index.js");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
})();

// Auth Configuration
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

// Enable CORS and JSON parsing
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// Create server and Socket.IO instance
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Pass the io instance to cronJobs.js
initializeIO(io);

// MySQL connection
const db = mysql
  .createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "realtime_bidding",
  })
  .promise();

// Test API endpoints
app.get("/", requiresAuth(), (req, res) => {
  res.send(req.oidc.isAuthenticated() ? "Logged in" : "Logged out");
});

app.get("/api/balance", async (req, res) => {
  const auth0id = req.query.id;
  try {
    // Query the database to get the user's balance
    const [value] = await db.query(
      "SELECT balance from user_balance WHERE auth0_id = ?",
      [auth0id]
    );
    res.json({ amount: value[0].balance });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving balance");
  }
});

// API for adding a user
app.post("/api/auth/user", async (req, res) => {
  const user = req.body;
  try {
    const [value] = await db.query("SELECT * FROM Users WHERE auth0_id = ?", [
      user.auth0_id,
    ]);
    if (value.length === 0) {
      await db.query(
        "INSERT INTO Users (auth0_id, name, email) VALUES (?, ?, ?)",
        [user.auth0_id, user.name, user.email]
      );
      await db.query(
        "INSERT INTO user_balance (auth0_id, balance) VALUES (?, ?)",
        [user.auth0_id, 0]
      );
      console.log("User saved to database");
    }
    res.status(200).send("User saved");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving user");
  }
});

// API for adding items
app.post("/api/items", async (req, res) => {
  const item = req.body;
  console.log("Items: ", item);
  try {
    const [value] = await db.query(
      "INSERT INTO user_bids (auth0_id, item_name, description, starting_price, current_price, bid_start_time, bid_end_time) VALUES (?, ?, ?, ?, ?, ?,?)",
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
    res.status(500).send("Error adding item");
  }
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Schedule the cron job
cron.schedule("* * * * *", () => {
  moveItemsToRedisAndNotify();
});
io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Fetch all active bids from Redis
  try {
    const keys = await redisClient.keys("item:*:bids");
    const activeBids = [];

    for (const key of keys) {
      const bidHash = await redisClient.hGetAll(key); // Retrieve the hash data

      if (Object.keys(bidHash).length > 0) {
        const bidData = JSON.parse(bidHash.value); // Parse the stored JSON
        const score = parseFloat(bidHash.score);
        const winnerID = bidHash.winner_id;
        activeBids.push({
          itemID: key.split(":")[1],
          score: score,
          winnerID: winnerID,
          itemName: bidData.itemName,
          description: bidData.description,
          starting_price: bidData.starting_price,
          bid_start_time: bidData.bid_start_time,
          bid_end_time: bidData.bid_end_time,
        });
      }
    }

    socket.emit("activeBids", activeBids);
  } catch (err) {
    console.error("Error retrieving bids:", err);
  }

  socket.on("newBid", async (data) => {
    const { itemID, bidAmount, auth0id } = data;

    try {
      const itemKey = `item:${itemID}:bids`;

      // Retrieve the current item details from the Redis hash
      const existingEntry = await redisClient.hGetAll(itemKey);

      if (!existingEntry || Object.keys(existingEntry).length === 0) {
        socket.emit("bidError", {
          message: "Item not found.",
        });
        return;
      }

      const currentScore = parseFloat(existingEntry.score);

      if (bidAmount <= currentScore) {
        socket.emit("bidError", {
          message: "Bid amount should be greater than the current bid.",
        });
        return;
      }

      // Update the entry with the new bid amount and winner ID
      const updatedValue = JSON.parse(existingEntry.value);
      updatedValue.starting_price = bidAmount; // Update the bid amount
      updatedValue.winner_id = auth0id; // Update the winner ID

      // Save the updated entry back to the Redis hash
      await redisClient.hSet(itemKey, {
        score: bidAmount.toString(),
        value: JSON.stringify(updatedValue),
        winner_id: auth0id,
      });

      console.log(
        `Updated score for item ${itemID} to ${bidAmount} in Redis with ${auth0id}`
      );

      // Notify all users about the new bid
      io.emit("bidScoreUpdated", {
        itemID,
        bidAmount,
        auth0id,
      });
    } catch (err) {
      console.error("Error processing new bid:", err);
      socket.emit("bidError", {
        message:
          "An error occurred while processing the bid. Please try again.",
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, reason: ${reason}`);
  });
});
