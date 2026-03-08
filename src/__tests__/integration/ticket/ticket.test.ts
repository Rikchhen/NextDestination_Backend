import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import app from "../../../app";
import { TicketModel } from "../../../features/ticket/models/ticket.model";

const signToken = (payload: { id: string; role: string }) =>
  jwt.sign(payload, process.env.JWT_SECRET_KEY!, { expiresIn: "1h" });

describe("Ticket Integration Tests", () => {
  const ownerId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const businessId = new mongoose.Types.ObjectId().toString();

  const ownerToken = signToken({ id: ownerId, role: "user" });
  const otherToken = signToken({ id: otherUserId, role: "user" });
  const adminToken = signToken({ id: adminId, role: "admin" });
  const businessToken = signToken({ id: businessId, role: "Business" });

  const bookingId = new mongoose.Types.ObjectId().toString();
  const tripId = new mongoose.Types.ObjectId().toString();

  let issuedTicketId = "";
  let issuedQr = "";

  let usedTicketId = "";
  let usedQr = "";

  let voidTicketId = "";
  let voidQr = "";

  let expiredTicketId = "";
  let expiredQr = "";

  beforeAll(async () => {
    // clean any leftover (safe in test db)
    await TicketModel.deleteMany({ passengerName: /TEST_TICKET/i });

    // Seed 4 tickets (issued, used, void, expired)
    const issued = await TicketModel.create({
      booking: bookingId,
      trip: tripId,
      bookedBy: ownerId,
      passengerName: "TEST_TICKET_ISSUED",
      seatNumber: "A1",
      qrToken: `QR-ISSUED-${new mongoose.Types.ObjectId().toString()}`,
      status: "issued",
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // +1h
    });

    const used = await TicketModel.create({
      booking: bookingId,
      trip: tripId,
      bookedBy: ownerId,
      passengerName: "TEST_TICKET_USED",
      seatNumber: "A2",
      qrToken: `QR-USED-${new mongoose.Types.ObjectId().toString()}`,
      status: "used",
      issuedAt: new Date(),
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const voided = await TicketModel.create({
      booking: bookingId,
      trip: tripId,
      bookedBy: ownerId,
      passengerName: "TEST_TICKET_VOID",
      seatNumber: "A3",
      qrToken: `QR-VOID-${new mongoose.Types.ObjectId().toString()}`,
      status: "void",
      issuedAt: new Date(),
      voidReason: "seed",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const expired = await TicketModel.create({
      booking: bookingId,
      trip: tripId,
      bookedBy: ownerId,
      passengerName: "TEST_TICKET_EXPIRED",
      seatNumber: "A4",
      qrToken: `QR-EXPIRED-${new mongoose.Types.ObjectId().toString()}`,
      status: "issued",
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() - 60 * 1000), // already expired
    });

    issuedTicketId = issued._id.toString();
    issuedQr = issued.qrToken;

    usedTicketId = used._id.toString();
    usedQr = used.qrToken;

    voidTicketId = voided._id.toString();
    voidQr = voided.qrToken;

    expiredTicketId = expired._id.toString();
    expiredQr = expired.qrToken;
  });

  afterAll(async () => {
    await TicketModel.deleteMany({ passengerName: /TEST_TICKET/i });
  });

  // ============================ GET /api/ticket/:id ============================
  test("1) GET /api/ticket/:id -> 401 without token", async () => {
    const res = await request(app).get(`/api/ticket/${issuedTicketId}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("2) GET /api/ticket/:id -> 404 when ticket not found", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/ticket/${fakeId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Ticket not found"
  });

  test("3) GET /api/ticket/:id -> 200 owner can view", async () => {
    const res = await request(app)
      .get(`/api/ticket/${issuedTicketId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("ticket._id", issuedTicketId);
  });

  test("4) GET /api/ticket/:id -> 404 non-owner blocked (service throws)", async () => {
    const res = await request(app)
      .get(`/api/ticket/${issuedTicketId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    // controller returns 404 on any error for getTicketById
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Not allowed to view this ticket"
  });

  test("5) GET /api/ticket/:id -> 200 admin can view", async () => {
    const res = await request(app)
      .get(`/api/ticket/${issuedTicketId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  // ======================== GET /api/ticket/booking/:bookingId ========================
  test("6) GET /api/ticket/booking/:bookingId -> 401 without token", async () => {
    const res = await request(app).get(`/api/ticket/booking/${bookingId}`);
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("7) GET /api/ticket/booking/:bookingId -> 200 owner gets tickets", async () => {
    const res = await request(app)
      .get(`/api/ticket/booking/${bookingId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.tickets)).toBe(true);
    expect(res.body.tickets.length).toBeGreaterThan(0);
  });

  test("8) GET /api/ticket/booking/:bookingId -> 400 non-owner blocked", async () => {
    const res = await request(app)
      .get(`/api/ticket/booking/${bookingId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    // controller returns 400 on error for getTicketsByBooking
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Not allowed to view these tickets"
  });

  test("9) GET /api/ticket/booking/:bookingId -> 200 admin can view", async () => {
    const res = await request(app)
      .get(`/api/ticket/booking/${bookingId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  // ============================ POST /api/ticket/scan ============================
  test("10) POST /api/ticket/scan -> 401 without token", async () => {
    const res = await request(app)
      .post("/api/ticket/scan")
      .send({ qrToken: issuedQr });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("11) POST /api/ticket/scan -> 403 if not Business (businessOnly)", async () => {
    const res = await request(app)
      .post("/api/ticket/scan")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ qrToken: issuedQr });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Only Businesses Can Access"
  });

  test("12) POST /api/ticket/scan -> 400 invalid DTO", async () => {
    const res = await request(app)
      .post("/api/ticket/scan")
      .set("Authorization", `Bearer ${businessToken}`)
      .send({ qrToken: "a" }); // too short

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message", "Invalid input");
  });

  test("13) POST /api/ticket/scan -> 400 QR not found", async () => {
    const res = await request(app)
      .post("/api/ticket/scan")
      .set("Authorization", `Bearer ${businessToken}`)
      .send({ qrToken: "QR-NOT-FOUND-12345" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Invalid ticket (QR not found)"
  });

  test("14) POST /api/ticket/scan -> 200 success marks ticket used", async () => {
    // scan issued ticket -> becomes used
    const res = await request(app)
      .post("/api/ticket/scan")
      .set("Authorization", `Bearer ${businessToken}`)
      .send({ qrToken: issuedQr });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("ticket.status", "used");

    const inDb = await TicketModel.findById(issuedTicketId).exec();
    expect(inDb?.status).toBe("used");
    expect(inDb?.usedAt).toBeTruthy();
  });

  test("15) POST /api/ticket/scan -> 400 already used", async () => {
    const res = await request(app)
      .post("/api/ticket/scan")
      .set("Authorization", `Bearer ${businessToken}`)
      .send({ qrToken: usedQr });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Ticket already used"
  });

  test("16) POST /api/ticket/scan -> 400 expired token path sets status expired", async () => {
    const res = await request(app)
      .post("/api/ticket/scan")
      .set("Authorization", `Bearer ${businessToken}`)
      .send({ qrToken: expiredQr });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Ticket expired"

    const inDb = await TicketModel.findById(expiredTicketId).exec();
    expect(inDb?.status).toBe("expired");
  });

  // ============================ PATCH /api/ticket/void/:id ============================
  test("17) PATCH /api/ticket/void/:id -> 401 without token", async () => {
    const res = await request(app)
      .patch(`/api/ticket/void/${voidTicketId}`)
      .send({});
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("18) PATCH /api/ticket/void/:id -> 400 non-owner blocked", async () => {
    // Use a fresh issued ticket to test
    const fresh = await TicketModel.create({
      booking: bookingId,
      trip: tripId,
      bookedBy: ownerId,
      passengerName: "TEST_TICKET_TO_VOID",
      seatNumber: "A9",
      qrToken: `QR-TO-VOID-${new mongoose.Types.ObjectId().toString()}`,
      status: "issued",
      issuedAt: new Date(),
    });

    const res = await request(app)
      .patch(`/api/ticket/void/${fresh._id.toString()}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ reason: "nope" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Not allowed to void this ticket"

    await TicketModel.findByIdAndDelete(fresh._id).exec();
  });

  test("19) PATCH /api/ticket/void/:id -> 200 owner voids issued ticket", async () => {
    const fresh = await TicketModel.create({
      booking: bookingId,
      trip: tripId,
      bookedBy: ownerId,
      passengerName: "TEST_TICKET_VOID_OK",
      seatNumber: "A10",
      qrToken: `QR-VOID-OK-${new mongoose.Types.ObjectId().toString()}`,
      status: "issued",
      issuedAt: new Date(),
    });

    const res = await request(app)
      .patch(`/api/ticket/void/${fresh._id.toString()}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ reason: "change plan" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("ticket.status", "void");

    const inDb = await TicketModel.findById(fresh._id).exec();
    expect(inDb?.status).toBe("void");
    expect(inDb?.voidReason).toBe("change plan");

    await TicketModel.findByIdAndDelete(fresh._id).exec();
  });

  test("20) PATCH /api/ticket/void/:id -> 400 cannot void used ticket", async () => {
    const res = await request(app)
      .patch(`/api/ticket/void/${usedTicketId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ reason: "try" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Used ticket cannot be voided"
  });

  test("21) PATCH /api/ticket/void/:id -> 400 already void", async () => {
    const res = await request(app)
      .patch(`/api/ticket/void/${voidTicketId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ reason: "again" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message"); // "Ticket already void"
  });
});
