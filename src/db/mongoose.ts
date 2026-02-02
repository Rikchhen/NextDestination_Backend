import mongoose from "mongoose";
import { MONGO_DB_URI } from "../config";

export async function connectDatabase() {
  try {
    const uri = MONGO_DB_URI
      ? MONGO_DB_URI.includes("localhost")
        ? MONGO_DB_URI.replace("localhost", "127.0.0.1")
        : MONGO_DB_URI
      : MONGO_DB_URI;

    await mongoose.connect(uri as string);
    console.log("Database connected Successfully");
  } catch (error) {
    console.log("Database error: ", error);
    process.exit(1);
  }
}
