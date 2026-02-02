import express, { Application } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { connectDatabase } from "./db/mongoose";
import { PORT } from "./config";
import userRouter from "./user/routes/user.route";
import adminRouter from "./admin/route/admin.route";
import path from "path";
import cors from "cors";

dotenv.config();
console.log(process.env.PORT);

const app: Application = express();

let corsOptions = {
  credentials: true,
  origin: ["http://localhost:5000", "http://localhost:3000"],
  // which url can access backend
  // put your frontend domain/url here
};
// origin: "*", // yo sabai url lai access dinxa
app.use(cors(corsOptions));

app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); // static file serving

// Middleware
app.use(bodyParser.json());

// Protected Admin Routes
app.use("/api/admin", adminRouter);
//User Routes
app.use("/api/user", userRouter);

// Start Server
async function start() {
  // database connection
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
  });
}
start().catch((error) => console.log(error));
