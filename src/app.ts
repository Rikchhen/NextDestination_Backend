import bodyParser from "body-parser";
import express, { Application } from "express";
import cors from "cors";
import path from "path";
import adminRouter from "./features/admin/routes/admin.route";
import userRouter from "./features/user/routes/user.route";
import businessRouter from "./features/business/routes/business.routes";
import tripRouter from "./features/trip/routes/trip.route";
import bookingRouter from "./features/booking/routes/booking.route";
import ticketRouter from "./features/ticket/routes/ticket.routes";
import paymentRouter from "./features/payment/routes/payment.route";
import walletRouter from "./features/payment/wallet/routes/wallet.route";

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

// business routes
app.use("/api/business", businessRouter);
//Trip routes
app.use("/api/trip", tripRouter);

app.use("/api/booking", bookingRouter);

app.use("/api/ticket", ticketRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/wallet", walletRouter);
export default app;
