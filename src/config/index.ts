import dotenv from "dotenv";
dotenv.config();

export const PORT: number = process.env.PORT
  ? parseInt(process.env.PORT)
  : 5000;
export const MONGO_DB_URI: string =
  process.env.MONGO_DB_URI ||
  "mongodb://localhost:27017/nextdestination_database";
export const JWT_SECRET: string = process.env.JWT_SECRET || "default_secret";
