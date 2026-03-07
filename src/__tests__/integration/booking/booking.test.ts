import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import app from "../../../app";

import { TripModel } from "../../../features/trip/models/trip.model";
import { TicketModel } from "../../../features/ticket/models/ticket.model";
import { BookingModel } from "../../../features/booking/models/booking.model";

const signToken = (payload: { id: string; role: string }) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY as string, {
    expiresIn: "1d",
  });
};

const makePayload = (
  tripId: string,
  seats: string[] = ["A1"],
  overrides: Partial<any> = {},
) => {
  return {
    trip: tripId,
    passengers: seats.map((s, i) => ({
      fullName: `Passenger ${i + 1}`,
      age: 20 + i,
      gender: i % 2 === 0 ? "male" : "female",
      seatNumber: s,
    })),
    contactEmail: "owner@test.com",
    contactPhone: "9800000000",
    ...overrides,
  };
};

describe("Booking Integration Tests", () => {
  // REAL ObjectIds (very important, because bookedBy is ObjectId in DB)
  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const businessId = new mongoose.Types.ObjectId().toString();

  const tokenA = signToken({ id: userAId, role: "user" });
  const tokenB = signToken({ id: userBId, role: "user" });
  const tokenAdmin = signToken({ id: adminId, role: "admin" });
  const tokenBusiness = signToken({ id: businessId, role: "Business" });

  // Trips
  let activeTripId = "";
  let cancelledTripId = "";
  let smallTripId = "";

  // Seed booking used by multiple tests
  let seedBookingId = "";
  let seedBookingRef = "";
  let seedSeat = "B1";

  beforeAll(async () => {
    // Clean only what we touch
    await Promise.all([
      TripModel.deleteMany({}),
      TicketModel.deleteMany({}),
      BookingModel.deleteMany({}),
    ]);

    const bizObjId = new mongoose.Types.ObjectId();

    const now = new Date();
    const dep = new Date(now.getTime() + 60 * 60 * 1000);
    const arr = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const activeTrip = await TripModel.create({
      business: bizObjId,
      type: "bus",
      from: "Kathmandu",
      to: "Pokhara",
      departureAt: dep,
      arrivalAt: arr,
      price: 1000,
      totalSeats: 40,
      availableSeats: 40,
      status: "active",
    });

    const cancelledTrip = await TripModel.create({
      business: bizObjId,
      type: "bus",
      from: "Kathmandu",
      to: "Chitwan",
      departureAt: dep,
      arrivalAt: arr,
      price: 900,
      totalSeats: 10,
      availableSeats: 10,
      status: "cancelled",
    });

    const smallTrip = await TripModel.create({
      business: bizObjId,
      type: "bus",
      from: "Kathmandu",
      to: "Dhulikhel",
      departureAt: dep,
      arrivalAt: arr,
      price: 500,
      totalSeats: 1,
      availableSeats: 1,
      status: "active",
    });

    activeTripId = activeTrip._id.toString();
    cancelledTripId = cancelledTrip._id.toString();
    smallTripId = smallTrip._id.toString();

    // Seed one successful booking (creates issued tickets too)
    const res = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(makePayload(activeTripId, [seedSeat]));

    if (res.status !== 201) {
      // If this fails, we print response so you see the real reason.
      // eslint-disable-next-line no-console
      console.log("SEED CREATE BOOKING FAILED:", res.status, res.body);
      throw new Error("Seed booking creation failed.");
    }

    seedBookingId = res.body.booking?._id;
    seedBookingRef = res.body.booking?.bookingRef;

    if (!seedBookingId || !seedBookingRef) {
      // eslint-disable-next-line no-console
      console.log("SEED RESPONSE (missing booking/_id/ref):", res.body);
      throw new Error("Seed booking missing id/ref.");
    }
  });

  afterAll(async () => {
    await Promise.all([
      TripModel.deleteMany({}),
      TicketModel.deleteMany({}),
      BookingModel.deleteMany({}),
    ]);
  });

  test("1) POST /create -> 401 without token", async () => {
    const res = await request(app)
      .post("/api/booking/create")
      .send(makePayload(activeTripId, ["A1"]));

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message"); // "No Token Provided"
  });

  test("2) POST /create -> 400 invalid DTO", async () => {
    const res = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    // your controller returns "Booking failed" for DTO errors
    expect(res.body).toHaveProperty("message");
  });

  test("3) POST /create -> 400 Trip not found", async () => {
    const fakeTripId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(makePayload(fakeTripId, ["A2"]));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // likely "Trip not found"
  });

  test("4) POST /create -> 400 Trip is not active (cancelled)", async () => {
    const res = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(makePayload(cancelledTripId, ["A3"]));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // likely "Trip is not active"
  });

  test("5) POST /create -> 400 seat already booked", async () => {
    // seed booking already booked seat B1 as issued ticket
    const res = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(makePayload(activeTripId, [seedSeat]));

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // should include "Seats already booked"
  });

  test("6) POST /create -> 400 Not enough seats available", async () => {
    const res = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(makePayload(smallTripId, ["S1", "S2"])); // 2 passengers but only 1 seat

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // should be "Not enough seats available"
  });

  test("7) GET /:id -> 200 owner can view", async () => {
    const res = await request(app)
      .get(`/api/booking/${seedBookingId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("booking");
    expect(res.body).toHaveProperty("tickets");
  });

  test("8) GET /:id -> 404 for non-owner (Not allowed)", async () => {
    const res = await request(app)
      .get(`/api/booking/${seedBookingId}`)
      .set("Authorization", `Bearer ${tokenB}`);

    // your controller returns 404 for thrown errors in getBookingById
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
  });

  test("9) GET /:id -> 200 admin can view", async () => {
    const res = await request(app)
      .get(`/api/booking/${seedBookingId}`)
      .set("Authorization", `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  test("10) GET /ref/:ref -> 200 business can view", async () => {
    const res = await request(app)
      .get(`/api/booking/ref/${seedBookingRef}`)
      .set("Authorization", `Bearer ${tokenBusiness}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("booking");
    expect(res.body.booking).toHaveProperty("bookingRef", seedBookingRef);
  });

  test("11) PATCH /cancel/:id -> 200 owner cancels, tickets void, seats restored", async () => {
    // Create a fresh booking for cancel flow (don’t cancel the seeded one)
    const tripBefore = await TripModel.findById(activeTripId).exec();
    expect(tripBefore).toBeTruthy();

    const beforeSeats = tripBefore!.availableSeats;

    const createRes = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(makePayload(activeTripId, ["C1"]));

    expect(createRes.status).toBe(201);

    const bookingId = createRes.body.booking?._id;
    expect(bookingId).toBeTruthy();

    const tripAfterCreate = await TripModel.findById(activeTripId).exec();
    expect(tripAfterCreate!.availableSeats).toBe(beforeSeats - 1);

    // Cancel it
    const cancelRes = await request(app)
      .patch(`/api/booking/cancel/${bookingId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ reason: "Change of plan" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body).toHaveProperty("success", true);
    expect(cancelRes.body).toHaveProperty("booking.status", "cancelled");

    // Tickets for that booking should be void
    const tickets = await TicketModel.find({ booking: bookingId }).exec();
    expect(tickets.length).toBeGreaterThan(0);
    tickets.forEach((t) => {
      expect(t.status).toBe("void");
    });

    // Seats restored
    const tripAfterCancel = await TripModel.findById(activeTripId).exec();
    expect(tripAfterCancel!.availableSeats).toBe(beforeSeats);
  });

  test("12) POST /create -> 400 duplicate seat numbers in same request (DTO refine)", async () => {
    const res = await request(app)
      .post("/api/booking/create")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(makePayload(activeTripId, ["D1", "D1"])); // duplicate seats

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Booking failed"
    expect(res.body).toHaveProperty("errors"); // refine error shows here
  });
});
