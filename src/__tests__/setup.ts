import mongoose from "mongoose";
import dotenv from "dotenv";
jest.setTimeout(30000);
dotenv.config({ path: ".env.test" });
beforeAll(async () => {
  console.log("TEST MONGO_URI:", process.env.MONGO_URI);

  await mongoose.connect(process.env.MONGO_URI as string, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
});
