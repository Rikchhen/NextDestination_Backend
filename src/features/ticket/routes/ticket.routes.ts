import { Router } from "express";
import { TicketController } from "../controllers/ticket.controller";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { businessOnly } from "../../../middlewares/business.middleware";

const ticketRouter = Router();
const ticketController = new TicketController();

// User protected (view) - put specific routes FIRST
ticketRouter.get(
  "/booking/:bookingId",
  authMiddleware,
  ticketController.getTicketsByBooking,
);

ticketRouter.get("/:id", authMiddleware, ticketController.getTicketById);

// Business protected (scan/check-in)
ticketRouter.post(
  "/scan",
  authMiddleware,
  businessOnly,
  ticketController.scanTicket,
);

// Optional: void
ticketRouter.patch("/void/:id", authMiddleware, ticketController.voidTicket);

export default ticketRouter;
