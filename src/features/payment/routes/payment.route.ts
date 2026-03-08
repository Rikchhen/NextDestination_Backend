import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { adminOnly } from "../../../middlewares/admin.middleware";

const paymentRouter = Router();
const paymentController = new PaymentController();

paymentRouter.post(
  "/khalti/initiate",
  authMiddleware,
  paymentController.initiateKhaltiPayment,
);
paymentRouter.post(
  "/khalti/verify",
  authMiddleware,
  paymentController.verifyKhaltiPayment,
);
paymentRouter.get("/mine", authMiddleware, paymentController.getUserPayments);
paymentRouter.get(
  "/booking/:bookingId",
  authMiddleware,
  paymentController.getPaymentByBookingId,
);

paymentRouter.get(
  "/admin/all",
  authMiddleware,
  adminOnly,
  paymentController.getAllPayments,
);

paymentRouter.post("/khalti/webhook", paymentController.khaltiWebhook);

export default paymentRouter;
