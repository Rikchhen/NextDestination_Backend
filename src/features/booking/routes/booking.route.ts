import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authMiddleware } from "../../../middlewares/auth.middleware";

const bookingRouter = Router();
const bookingController = new BookingController();

bookingRouter.post("/create", authMiddleware, bookingController.createBooking);
bookingRouter.get("/mine", authMiddleware, bookingController.getMyBookings);
bookingRouter.get(
  "/ref/:ref",
  authMiddleware,
  bookingController.getBookingByRef,
);
bookingRouter.get("/:id", authMiddleware, bookingController.getBookingById);
bookingRouter.patch(
  "/cancel/:id",
  authMiddleware,
  bookingController.cancelBooking,
);

export default bookingRouter;
