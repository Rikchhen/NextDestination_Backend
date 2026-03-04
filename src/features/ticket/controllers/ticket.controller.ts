import { Request, Response } from "express";
import { TicketService } from "../services/ticket.service";
import { ScanTicketDTO } from "../dtos/ticket.dto";

const ticketService = new TicketService();

export class TicketController {
  getTicketById = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      const ticket = await ticketService.getTicketById(
        req.params.id,
        userId,
        role,
      );
      return res.status(200).json({ success: true, ticket });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "Ticket not found",
      });
    }
  };

  getTicketsByBooking = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      const tickets = await ticketService.getTicketsByBooking(
        req.params.bookingId,
        userId,
        role,
      );

      return res.status(200).json({ success: true, tickets });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch tickets",
      });
    }
  };

  scanTicket = async (req: Request, res: Response) => {
    try {
      const parsed = ScanTicketDTO.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: parsed.error.format(),
        });
      }

      const scanned = await ticketService.scanTicket(parsed.data.qrToken);

      return res.status(200).json({
        success: true,
        message: "Ticket validated (check-in successful)",
        ticket: scanned,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Ticket scan failed",
      });
    }
  };

  voidTicket = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const role = (req as any).user.role;

      const reason = req.body?.reason;
      const ticket = await ticketService.voidTicket(
        req.params.id,
        userId,
        role,
        reason,
      );

      return res.status(200).json({
        success: true,
        message: "Ticket voided successfully",
        ticket,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to void ticket",
      });
    }
  };
}
