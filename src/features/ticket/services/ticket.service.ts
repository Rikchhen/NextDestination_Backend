import { TicketRepository } from "../repositories/ticket.repository";
import { ITicket } from "../models/ticket.model";

const ticketRepository = new TicketRepository();

export class TicketService {
  private sanitizeTicket(ticket: ITicket) {
    const obj = ticket.toObject();
    const { __v, ...safe } = obj;
    return safe;
  }

  async getTicketById(
    ticketId: string,
    requesterId: string,
    requesterRole?: string,
  ) {
    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const isOwner = ticket.bookedBy.toString() === requesterId;
    const isPrivileged =
      requesterRole === "admin" || requesterRole === "Business";

    if (!isOwner && !isPrivileged) {
      throw new Error("Not allowed to view this ticket");
    }

    return this.sanitizeTicket(ticket);
  }

  async getTicketsByBooking(
    bookingId: string,
    requesterId: string,
    requesterRole?: string,
  ) {
    const tickets = await ticketRepository.getTicketsByBooking(bookingId);

    // If no tickets, just return empty (or throw if you want)
    if (tickets.length === 0) return [];

    // ownership check based on the tickets
    const isOwner = tickets[0].bookedBy.toString() === requesterId;
    const isPrivileged =
      requesterRole === "admin" || requesterRole === "Business";

    if (!isOwner && !isPrivileged) {
      throw new Error("Not allowed to view these tickets");
    }

    return tickets.map((t) => this.sanitizeTicket(t));
  }

  // business scan (scan route should be protected by businessOnly)
  async scanTicket(qrToken: string) {
    const ticket = await ticketRepository.getTicketByQrToken(qrToken);
    if (!ticket) throw new Error("Invalid ticket (QR not found)");

    if (ticket.status === "void") throw new Error("Ticket is void");
    if (ticket.status === "expired") throw new Error("Ticket is expired");
    if (ticket.status === "used") throw new Error("Ticket already used");

    if (ticket.expiresAt && new Date() > ticket.expiresAt) {
      await ticketRepository.updateTicket(ticket._id.toString(), {
        status: "expired",
      });
      throw new Error("Ticket expired");
    }

    const updated = await ticketRepository.updateTicket(ticket._id.toString(), {
      status: "used",
      usedAt: new Date(),
    });

    if (!updated) throw new Error("Failed to update ticket");
    return this.sanitizeTicket(updated);
  }

  async voidTicket(
    ticketId: string,
    requesterId: string,
    requesterRole?: string,
    reason?: string,
  ) {
    const ticket = await ticketRepository.getTicketById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const isOwner = ticket.bookedBy.toString() === requesterId;
    const isPrivileged =
      requesterRole === "admin" || requesterRole === "Business";

    if (!isOwner && !isPrivileged) {
      throw new Error("Not allowed to void this ticket");
    }

    if (ticket.status === "used")
      throw new Error("Used ticket cannot be voided");
    if (ticket.status === "void") throw new Error("Ticket already void");

    const updated = await ticketRepository.updateTicket(ticketId, {
      status: "void",
      voidReason: reason,
    });

    if (!updated) throw new Error("Failed to void ticket");
    return this.sanitizeTicket(updated);
  }
}
