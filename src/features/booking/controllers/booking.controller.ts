import { Request, Response } from "express";

import { CreateBookingDTO } from "../dtos/booking.dto";
import { BookingService } from "../services/booking.service";

const bookingService = new BookingService();

export class BookingController {
  createBooking = async (req: Request, res: Response) => {
    try {
      const parsed = CreateBookingDTO.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Booking failed",
          errors: parsed.error.format(),
        });
      }

      const userId = (req as any).user.id;
      const result = await bookingService.createBooking(userId, parsed.data);

      return res.status(201).json({
        success: true,
        message: "Booking created successfully",
        booking: result.booking,
        tickets: result.tickets,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Booking failed",
      });
    }
  };

  getBookingById = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      const result = await bookingService.getBookingById(
        req.params.id,
        userId,
        role,
      );
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "Booking not found",
      });
    }
  };

  getBookingByRef = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;
      const result = await bookingService.getBookingByRef(
        req.params.ref,
        userId,
        role,
      );
      return res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "Booking not found",
      });
    }
  };

  getMyBookings = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);

      const bookings = await bookingService.getMyBookings(userId, page, limit);

      return res.status(200).json({
        success: true,
        bookings,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch bookings",
      });
    }
  };

  cancelBooking = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const reason = req.body?.reason;

      const booking = await bookingService.cancelBooking(
        userId,
        req.params.id,
        reason,
      );

      return res.status(200).json({
        success: true,
        message: "Booking cancelled",
        booking,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Cancellation failed",
      });
    }
  };
}
