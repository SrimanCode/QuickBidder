// cronJobs.js
const cron = require("node-cron");
const mysql = require("mysql2");
const redis = require("redis");
const dotenv = require("dotenv");

dotenv.config();

// Create MySQL connection
const db = mysql
  .createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "realtime_bidding",
  })
  .promise();

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

(async () => {
  try {
    await redisClient.connect();
    console.log("Connected to Redis from cronJobs.js");
  } catch (error) {
    console.error("Failed to connect to Redis:", error);
  }
})();

// Function to move eligible items from MySQL to Redis
async function moveItemsToRedis() {
  console.log("Running cron job to check for active listings...");
  try {
    // Get all items where the start time is less than or equal to the current time and they haven't yet been moved to Redis
    const [rows] = await db.query(
      "SELECT * FROM user_bids WHERE bid_start_time <= NOW() AND status = 'active'"
    );

    for (const item of rows) {
      const itemKey = `item:${item.id}:bids`;

      // Add the item details to Redis
      await redisClient.zAdd(itemKey, {
        score: parseFloat(item.starting_price),
        value: JSON.stringify({
          itemID: item.id,
          itemName: item.item_name,
          description: item.description,
          starting_price: item.starting_price,
          bid_start_time: item.bid_start_time,
          bid_end_time: item.bid_end_time,
          auth0_id: item.auth0_id,
          winner_id: null,
        }),
      });

      // Mark the item as moved to Redis in the MySQL database
      await db.query(
        "UPDATE user_bids SET status = 'processing' WHERE id = ?",
        [item.id]
      );
      console.log(`Item ${item.id} moved to Redis for real-time bidding.`);
    }
  } catch (error) {
    console.error("Error moving items to Redis:", error);
  }
}

// Schedule the cron job to run every minute
cron.schedule("* * * * *", moveItemsToRedis);

module.exports = {
  moveItemsToRedis,
};
