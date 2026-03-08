import mongoose from "mongoose";
import { BookingRepository } from "../repositories/booking.repository";
import { CreateBookingDTO } from "../dtos/booking.dto";
import { TripModel } from "../../trip/models/trip.model";
import { TicketRepository } from "../../ticket/repositories/ticket.repository";
import { TicketModel } from "../../ticket/models/ticket.model";

const bookingRepository = new BookingRepository();
const ticketRepository = new TicketRepository();

export class BookingService {
  private sanitize(obj: any) {
    if (!obj) return obj;
    const o = obj.toObject ? obj.toObject() : obj;
    const { __v, ...safe } = o;
    return safe;
  }

  private generateBookingRef() {
    const a = Math.random().toString(36).substring(2, 8).toUpperCase();
    const b = Math.random().toString(36).substring(2, 4).toUpperCase();
    return `ND-${a}${b}`;
  }

  private generateQrToken() {
    return `QR-${new mongoose.Types.ObjectId().toString()}-${Date.now()}`;
  }

  async createBooking(userId: string, data: CreateBookingDTO) {
    // 1) trip must exist + be active
    const trip = await TripModel.findById(data.trip).exec();
    if (!trip) throw new Error("Trip not found");
    if (trip.status !== "active") throw new Error("Trip is not active");

    const requestedCount = data.passengers.length;

    // 2) seat conflict check (best effort)
    const requestedSeats = data.passengers.map((p) =>
      p.seatNumber.trim().toUpperCase(),
    );
    const existingTickets = await TicketModel.find({
      trip: trip._id,
      seatNumber: { $in: requestedSeats },
      status: { $in: ["issued", "used"] },
    }).exec();

    if (existingTickets.length > 0) {
      const taken = existingTickets.map((t) => t.seatNumber);
      throw new Error(`Seats already booked: ${taken.join(", ")}`);
    }

    // 3) atomic seat decrement => prevents overselling
    const updatedTrip = await TripModel.findOneAndUpdate(
      {
        _id: trip._id,
        status: "active",
        availableSeats: { $gte: requestedCount },
      },
      { $inc: { availableSeats: -requestedCount } },
      { new: true },
    ).exec();

    if (!updatedTrip) {
      throw new Error("Not enough seats available");
    }

    // 4) bookingRef (retry to avoid rare collision)
    let bookingRef = this.generateBookingRef();
    for (let i = 0; i < 5; i++) {
      const exists = await bookingRepository.getBookingByRef(bookingRef);
      if (!exists) break;
      bookingRef = this.generateBookingRef();
    }

    const totalAmount = updatedTrip.price * requestedCount;

    // 5) create booking
    const booking = await bookingRepository.createBooking({
      bookedBy: userId as any,
      trip: updatedTrip._id,
      bookingRef,
      status: "confirmed",
      passengers: data.passengers.map((p) => ({
        fullName: p.fullName.trim(),
        age: p.age,
        gender: p.gender,
        seatNumber: p.seatNumber.trim().toUpperCase(),
      })),
      contactEmail: data.contactEmail.toLowerCase(),
      contactPhone: data.contactPhone,
      totalAmount,
    });

    // 6) create tickets
    try {
      const ticketsPayload = data.passengers.map((p) => ({
        booking: booking._id,
        trip: updatedTrip._id,
        bookedBy: userId as any,
        passengerName: p.fullName.trim(),
        seatNumber: p.seatNumber.trim().toUpperCase(),
        qrToken: this.generateQrToken(),
        status: "issued" as const,
        issuedAt: new Date(),
        expiresAt: updatedTrip.departureAt, // optional
      }));

      const tickets = await ticketRepository.createMany(ticketsPayload);

      return {
        booking: this.sanitize(booking),
        tickets: tickets.map((t) => this.sanitize(t)),
      };
    } catch (err: any) {
      // rollback seats + cancel booking (best effort)
      await TripModel.findByIdAndUpdate(updatedTrip._id, {
        $inc: { availableSeats: requestedCount },
      }).exec();

      await bookingRepository.updateBooking(booking._id.toString(), {
        status: "cancelled",
        cancelReason: err?.message || "Ticket creation failed",
      });

      throw new Error(err?.message || "Booking failed (ticket creation)");
    }
  }

  async getBookingById(
    bookingId: string,
    requesterId: string,
    requesterRole?: string,
  ) {
    const booking = await bookingRepository.getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    const isOwner = booking.bookedBy.toString() === requesterId;
    const isPrivileged =
      requesterRole === "admin" || requesterRole === "Business";

    if (!isOwner && !isPrivileged) {
      throw new Error("Not allowed to view this booking");
    }

    const tickets = await ticketRepository.getTicketsByBooking(bookingId);

    return {
      booking: this.sanitize(booking),
      tickets: tickets.map((t) => this.sanitize(t)),
    };
  }

  async getBookingByRef(
    bookingRef: string,
    requesterId: string,
    requesterRole?: string,
  ) {
    const booking = await bookingRepository.getBookingByRef(bookingRef);
    if (!booking) throw new Error("Booking not found");

    const isOwner = booking.bookedBy.toString() === requesterId;
    const isPrivileged =
      requesterRole === "admin" || requesterRole === "Business";

    if (!isOwner && !isPrivileged) {
      throw new Error("Not allowed to view this booking");
    }

    const tickets = await ticketRepository.getTicketsByBooking(
      booking._id.toString(),
    );

    return {
      booking: this.sanitize(booking),
      tickets: tickets.map((t) => this.sanitize(t)),
    };
  }

  async getMyBookings(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const bookings = await bookingRepository.getMyBookings(userId, skip, limit);
    return bookings.map((b) => this.sanitize(b));
  }

  async cancelBooking(userId: string, bookingId: string, reason?: string) {
    const booking = await bookingRepository.getBookingById(bookingId);
    if (!booking) throw new Error("Booking not found");

    if (booking.bookedBy.toString() !== userId) {
      throw new Error("Not allowed to cancel this booking");
    }
    if (booking.status === "cancelled") {
      throw new Error("Booking already cancelled");
    }

    // 1) void tickets
    await TicketModel.updateMany(
      { booking: booking._id, status: { $in: ["issued"] } },
      { status: "void" },
    ).exec();

    // 2) restore seats (counter)
    await TripModel.findByIdAndUpdate(booking.trip, {
      $inc: { availableSeats: booking.passengers.length },
    }).exec();

    // 3) mark booking cancelled
    const updated = await bookingRepository.updateBooking(bookingId, {
      status: "cancelled",
      cancelReason: reason,
    });

    return this.sanitize(updated);
  }
}
