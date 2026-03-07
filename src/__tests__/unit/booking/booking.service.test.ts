// src/__tests__/unit/booking/booking.service.test.ts

const bookingRepoMock = {
  getBookingByRef: jest.fn(),
  createBooking: jest.fn(),
  getBookingById: jest.fn(),
  getMyBookings: jest.fn(),
  updateBooking: jest.fn(),
};

jest.mock("../../../features/booking/repositories/booking.repository", () => ({
  BookingRepository: jest.fn().mockImplementation(() => bookingRepoMock),
}));

const ticketRepoMock = {
  createMany: jest.fn(),
  getTicketsByBooking: jest.fn(),
};

jest.mock("../../../features/ticket/repositories/ticket.repository", () => ({
  TicketRepository: jest.fn().mockImplementation(() => ticketRepoMock),
}));

// Mock TripModel + TicketModel static calls
jest.mock("../../../features/trip/models/trip.model", () => ({
  TripModel: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../../../features/ticket/models/ticket.model", () => ({
  TicketModel: {
    find: jest.fn(),
    updateMany: jest.fn(),
  },
}));

import mongoose from "mongoose";
import { BookingService } from "../../../features/booking/services/booking.service";
import { TripModel } from "../../../features/trip/models/trip.model";
import { TicketModel } from "../../../features/ticket/models/ticket.model";

describe("BookingService unit tests", () => {
  let service: BookingService;

  const makeTrip = (overrides: any = {}) => {
    const base = {
      _id: overrides._id ?? new mongoose.Types.ObjectId(),
      status: overrides.status ?? "active",
      price: overrides.price ?? 1000,
      availableSeats: overrides.availableSeats ?? 10,
      departureAt: overrides.departureAt ?? new Date(),
      toObject: () => ({ ...base, ...overrides }),
      ...overrides,
    };
    return base;
  };

  const makeBooking = (overrides: any = {}) => {
    const base = {
      _id: overrides._id ?? new mongoose.Types.ObjectId(),
      bookedBy: overrides.bookedBy ?? new mongoose.Types.ObjectId(),
      trip: overrides.trip ?? new mongoose.Types.ObjectId(),
      passengers: overrides.passengers ?? [{ seatNumber: "A1" }],
      status: overrides.status ?? "confirmed",
      bookingRef: overrides.bookingRef ?? "ND-ABC123XY",
      toObject: () => ({ ...base, ...overrides }),
      ...overrides,
    };
    return base;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BookingService();
  });

  test("createBooking: throws Trip not found", async () => {
    (TripModel.findById as any).mockReturnValue({ exec: async () => null });

    await expect(
      service.createBooking("u1", {
        trip: "t1",
        passengers: [],
        contactEmail: "a@a.com",
        contactPhone: "9",
      } as any),
    ).rejects.toThrow("Trip not found");
  });

  test("createBooking: throws Trip is not active", async () => {
    (TripModel.findById as any).mockReturnValue({
      exec: async () => makeTrip({ status: "inactive" }),
    });

    await expect(
      service.createBooking("u1", {
        trip: "t1",
        passengers: [
          { fullName: "A", age: 1, gender: "Male", seatNumber: "A1" },
        ],
        contactEmail: "a@a.com",
        contactPhone: "9",
      } as any),
    ).rejects.toThrow("Trip is not active");
  });

  test("createBooking: throws Seats already booked", async () => {
    const trip = makeTrip();
    (TripModel.findById as any).mockReturnValue({ exec: async () => trip });

    (TicketModel.find as any).mockReturnValue({
      exec: async () => [{ seatNumber: "A1" }],
    });

    await expect(
      service.createBooking("u1", {
        trip: trip._id.toString(),
        passengers: [
          { fullName: "A", age: 1, gender: "Male", seatNumber: "A1" },
        ],
        contactEmail: "a@a.com",
        contactPhone: "9",
      } as any),
    ).rejects.toThrow("Seats already booked: A1");
  });

  test("createBooking: throws Not enough seats available when atomic update fails", async () => {
    const trip = makeTrip({ availableSeats: 1 });
    (TripModel.findById as any).mockReturnValue({ exec: async () => trip });

    (TicketModel.find as any).mockReturnValue({ exec: async () => [] });

    (TripModel.findOneAndUpdate as any).mockReturnValue({
      exec: async () => null,
    });

    await expect(
      service.createBooking("u1", {
        trip: trip._id.toString(),
        passengers: [
          { fullName: "A", age: 1, gender: "Male", seatNumber: "A1" },
          { fullName: "B", age: 2, gender: "Male", seatNumber: "A2" },
        ],
        contactEmail: "a@a.com",
        contactPhone: "9",
      } as any),
    ).rejects.toThrow("Not enough seats available");
  });

  test("createBooking: success creates booking and tickets", async () => {
    const trip = makeTrip({ price: 1000, availableSeats: 10 });
    (TripModel.findById as any).mockReturnValue({ exec: async () => trip });

    (TicketModel.find as any).mockReturnValue({ exec: async () => [] });

    const updatedTrip = makeTrip({ _id: trip._id, availableSeats: 8 });
    (TripModel.findOneAndUpdate as any).mockReturnValue({
      exec: async () => updatedTrip,
    });

    bookingRepoMock.getBookingByRef.mockResolvedValue(null);
    const createdBooking = makeBooking({
      trip: updatedTrip._id,
      passengers: [{ seatNumber: "A1" }, { seatNumber: "A2" }],
    });
    bookingRepoMock.createBooking.mockResolvedValue(createdBooking);

    ticketRepoMock.createMany.mockResolvedValue([
      { toObject: () => ({ _id: "t1" }) },
      { toObject: () => ({ _id: "t2" }) },
    ]);

    const out = await service.createBooking("u1", {
      trip: updatedTrip._id.toString(),
      passengers: [
        { fullName: "A", age: 1, gender: "Male", seatNumber: "a1" },
        { fullName: "B", age: 2, gender: "Male", seatNumber: "a2" },
      ],
      contactEmail: "A@A.COM",
      contactPhone: "9",
    } as any);

    expect(out.booking).toBeTruthy();
    expect(out.tickets).toHaveLength(2);
    expect(bookingRepoMock.createBooking).toHaveBeenCalled();
    expect(ticketRepoMock.createMany).toHaveBeenCalled();
  });

  test("createBooking: ticket creation failure rolls back seats and cancels booking", async () => {
    const trip = makeTrip();
    (TripModel.findById as any).mockReturnValue({ exec: async () => trip });

    (TicketModel.find as any).mockReturnValue({ exec: async () => [] });

    (TripModel.findOneAndUpdate as any).mockReturnValue({
      exec: async () => trip,
    });

    bookingRepoMock.getBookingByRef.mockResolvedValue(null);

    const booking = makeBooking({ trip: trip._id });
    bookingRepoMock.createBooking.mockResolvedValue(booking);

    ticketRepoMock.createMany.mockRejectedValue(
      new Error("Ticket creation failed"),
    );

    (TripModel.findByIdAndUpdate as any).mockReturnValue({
      exec: async () => ({}),
    });
    bookingRepoMock.updateBooking.mockResolvedValue(
      makeBooking({ status: "cancelled" }),
    );

    await expect(
      service.createBooking("u1", {
        trip: trip._id.toString(),
        passengers: [
          { fullName: "A", age: 1, gender: "Male", seatNumber: "A1" },
        ],
        contactEmail: "a@a.com",
        contactPhone: "9",
      } as any),
    ).rejects.toThrow("Ticket creation failed");

    expect(TripModel.findByIdAndUpdate).toHaveBeenCalled();
    expect(bookingRepoMock.updateBooking).toHaveBeenCalled();
  });

  test("getBookingById: blocks non-owner non-privileged", async () => {
    const booking = makeBooking({ bookedBy: "owner123" });
    bookingRepoMock.getBookingById.mockResolvedValue(booking);

    await expect(
      service.getBookingById("b1", "someoneElse", "user"),
    ).rejects.toThrow("Not allowed to view this booking");
  });

  test("cancelBooking: throws if already cancelled", async () => {
    const booking = makeBooking({ bookedBy: "u1", status: "cancelled" });
    bookingRepoMock.getBookingById.mockResolvedValue(booking);

    await expect(service.cancelBooking("u1", "b1")).rejects.toThrow(
      "Booking already cancelled",
    );
  });
});
