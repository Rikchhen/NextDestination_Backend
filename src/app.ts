import bodyParser from "body-parser";
import express, { Application } from "express";
import cors from "cors";
import path from "path";
import adminRouter from "./features/admin/route/admin.route";
import userRouter from "./features/user/routes/user.route";

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

export default app;
