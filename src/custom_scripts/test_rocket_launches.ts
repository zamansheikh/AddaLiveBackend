
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import dns from "dns";
import http from "http";
import RedisConfig from "../core/config/redis_config";
import RocketService from "../services/audio_room/rocket_service";
import AudioRoomModel from "../models/audio_room/audio_room_model";
import SingletonSocketServer from "../core/sockets/singleton_socket_server";
import User from "../models/user/user_model";
import UserStats from "../models/userstats/userstats_model";
import StoreCategoryModel from "../models/store/store_category_model";
import StoreItemModel from "../models/store/store_item_model";
import { DatabaseNames, UserActiveStatus, UserRoles } from "../core/Utils/enums";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function seedData() {
  console.log("--- Seeding Local Database ---");

  // 1. Create a Store Category (Non-premium for rewards)
  let category = await StoreCategoryModel.findOne({ title: "Test Category" });
  if (!category) {
    category = (await StoreCategoryModel.create({
      title: "Test Category",
      isPremium: false
    })) as any;
    console.log("Created Store Category.");
  }

  // 2. Create a Store Item
  let item = await StoreItemModel.findOne({ name: "Test Rocket Gift" });
  if (!item) {
    item = (await StoreItemModel.create({
      name: "Test Rocket Gift",
      categoryId: (category as any)._id,
      logo: "https://example.com/logo.png",
      previewFile: "https://example.com/preview.svga",
      isPremium: false,
      prices: [{ validity: 7, price: 100 }]
    })) as any;
    console.log("Created Store Item.");
  }

  // 3. Create a few Test Users
  const users = [];
  for (let i = 0; i < 5; i++) {
    const uid = `test_user_${i}`;
    let user = await User.findOne({ uid });
    if (!user) {
      user = (await User.create({
        uid,
        name: `User ${i}`,
        email: `user${i}@test.com`,
        userId: 200000 + i,
        avatar: `https://avatar.com/${i}.png`,
        userRole: UserRoles.User,
        userStateInApp: UserActiveStatus.online
      })) as any;
      
      await UserStats.create({
        userId: (user as any)._id,
        coins: 1000,
        stars: 0,
        diamonds: 0
      });
      console.log(`Created User ${i}.`);
    }
    users.push(user);
  }

  // 4. Create an Audio Room
  let room = await AudioRoomModel.findOne({ roomId: "test_room_101" });
  if (!room) {
    room = (await AudioRoomModel.create({
      title: "Test Rocket Room",
      roomId: "test_room_101",
      numberOfSeats: 10,
      hostId: (users[0] as any)._id,
      membersArray: users.map((u: any) => u._id),
      members: new Map(users.map((u: any) => [u._id.toString(), true])),
      isHostPresent: true,
      isLocked: false
    })) as any;
    console.log("Created Audio Room.");
  }

  console.log("--- Seeding Completed ---\n");
  return (room as any).roomId;
}

async function testRocketLaunches() {
  const mongoUrl = "mongodb://127.0.0.1:27017/livestreaming";
  
  try {
    console.log("--- Starting Rocket Launch Test ---");
    
    // 1. Setup Connections
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB.");

    console.log("Connecting to Redis...");
    await RedisConfig.connect();
    console.log("Connected to Redis.");

    // 2. Seed Data
    const roomId = await seedData();

    // 3. Initialize Socket Server (dummy http server)
    const dummyServer = http.createServer();
    SingletonSocketServer.initialize(dummyServer);
    console.log("Socket Server initialized (dummy).");

    const rocketService = RocketService.getInstance();

    // 4. Reset fuel for a clean test
    console.log("Resetting rocket state for test...");
    // Key format: rocket_service:fuel:roomId
    const fuelKey = `rocket_service:fuel:${roomId}`;
    const levelKey = `rocket_service:level:${roomId}`;
    const milestoneKey = `rocket_service:milestone:${roomId}`;
    await RedisConfig.getInstance().set(fuelKey, "0");
    await RedisConfig.getInstance().set(levelKey, "1");
    await RedisConfig.getInstance().set(milestoneKey, "30000000");

    // 5. Simulate multiple rockets
    // ROCKET_MILESTONES = [30M, 50M, 80M, 120M, 150M]
    // Adding 100,000,000 fuel should trigger Level 1 and Level 2 recursively
    const bigFuelAmount = 800000000;
    console.log(`\nAdding ${bigFuelAmount} fuel to trigger multiple launches...`);
    
    await rocketService.addFuel(roomId, bigFuelAmount);

    console.log("\n--- Initial Fuel addition call completed. ---");
    console.log("Monitoring recursive launches (45s delays) and rewards (10s delays)...");
    
    // Keep alive to see logs from timeouts
    // 45s + 45s + padding
    await new Promise(resolve => setTimeout(resolve, 120000));

  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    console.log("\nTest script finished execution. Use Ctrl+C to exit.");
  }
}

testRocketLaunches();
