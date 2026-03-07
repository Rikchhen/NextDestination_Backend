import { Request, Response } from "express";
import { PaymentService } from "../services/payment.service";
import {
  InitiateKhaltiPaymentDTO,
  VerifyKhaltiPaymentDTO,
  PaymentFilterDTO,
  KhaltiWebhookDTO,
} from "../dtos/payment.dto";

const paymentService = new PaymentService();

export class PaymentController {
  initiateKhaltiPayment = async (req: Request, res: Response) => {
    try {
      const validation = InitiateKhaltiPaymentDTO.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          errors: validation.error.format(),
        });
      }

      const userId = (req as any).user.id;
      const { bookingId, returnUrl } = validation.data;

      const result = await paymentService.initiateKhaltiPayment(
        userId,
        bookingId,
        returnUrl,
      );

      return res.status(200).json({
        success: true,
        message: "Payment initiated successfully",
        data: result,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to initiate payment",
      });
    }
  };

  verifyKhaltiPayment = async (req: Request, res: Response) => {
    try {
      const validation = VerifyKhaltiPaymentDTO.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          errors: validation.error.format(),
        });
      }

      const { pidx, bookingId } = validation.data;

      const result = await paymentService.verifyKhaltiPayment(pidx, bookingId);

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: result,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to verify payment",
      });
    }
  };

  getPaymentByBookingId = async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.params;

      if (!bookingId) {
        return res.status(400).json({
          success: false,
          message: "Booking ID is required",
        });
      }

      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      const payment = await paymentService.getPaymentByBookingId(
        bookingId,
        userId,
        role,
      );

      return res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 404).json({
        success: false,
        message: error.message || "Payment not found",
      });
    }
  };

  getUserPayments = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const filterValidation = PaymentFilterDTO.safeParse(req.query);
      if (!filterValidation.success) {
        return res.status(400).json({
          success: false,
          errors: filterValidation.error.format(),
        });
      }

      const { page, limit, status } = filterValidation.data;

      const payments = await paymentService.getUserPayments(
        userId,
        page,
        limit,
        status,
      );

      return res.status(200).json({
        success: true,
        page,
        limit,
        count: payments.length,
        data: payments,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch payments",
      });
    }
  };

  getAllPayments = async (req: Request, res: Response) => {
    try {
      const filterValidation = PaymentFilterDTO.safeParse(req.query);
      if (!filterValidation.success) {
        return res.status(400).json({
          success: false,
          errors: filterValidation.error.format(),
        });
      }

      const { page, limit, status } = filterValidation.data;

      const payments = await paymentService.getAllPayments(page, limit, status);

      return res.status(200).json({
        success: true,
        page,
        limit,
        count: payments.length,
        data: payments,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch payments",
      });
    }
  };

  khaltiWebhook = async (req: Request, res: Response) => {
    try {
      const validation = KhaltiWebhookDTO.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid webhook data",
          errors: validation.error.format(),
        });
      }

      const { pidx, purchase_order_id } = validation.data;

      const result = await paymentService.verifyKhaltiPayment(
        pidx,
        purchase_order_id,
      );

      return res.status(200).json({
        success: true,
        message: "Webhook processed successfully",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to process webhook",
      });
    }
  };
}
