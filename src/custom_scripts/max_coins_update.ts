import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

import UserStats from "../models/userstats/userstats_model";

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

const AddaUrl =
  "mongodb+srv://luxlive343_db_user:addalive4321@cluster0.9jmdnj9.mongodb.net/addalive?retryWrites=true&w=majority&appName=Cluster0";
const SunMoonUrl =
  "mongodb+srv://luxlive343_db_user:sunmoon4321@cluster0.faoy3f8.mongodb.net/sunmoon?retryWrites=true&w=majority&appName=Cluster0";
const MONGOURL = AddaUrl;
const MAX_COINS = 999999999999999;

async function run() {
  if (!MONGOURL) {
    console.error("Error: MONGO_URL not found in environment variables.");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGOURL);
    console.log("Connected successfully.");

    console.log(
      `Updating all userstats documents to set coins to ${MAX_COINS}...`,
    );
    const result = await UserStats.updateMany(
      {},
      { $set: { coins: MAX_COINS } },
    );

    console.log("Update completed.");
    console.log(`Matched: ${result.matchedCount} documents.`);
    console.log(`Modified: ${result.modifiedCount} documents.`);
  } catch (error) {
    console.error("An error occurred during the update process:");
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

run();
