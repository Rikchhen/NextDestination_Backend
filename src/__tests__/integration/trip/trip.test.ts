import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// ✅ IMPORTANT: change this import if your app export path is different
// Example possibilities:
// import app from "../../../app";
// import app from "../../../index";
// import { app } from "../../../index";
import app from "../../../app";

import { TripModel } from "../../../features/trip/models/trip.model";
import { Business } from "../../../features/business/models/business.model";

const signToken = (payload: { id: string; role: string }) => {
  return jwt.sign(payload, process.env.JWT_SECRET_KEY!, { expiresIn: "1h" });
};

describe("Trip Integration Tests", () => {
  let approvedBiz: any;
  let pendingBiz: any;
  let otherBiz: any;

  let approvedToken: string;
  let pendingToken: string;
  let otherToken: string;
  let userToken: string;

  let createdTripId: string;
  let bookedTripId: string;

  beforeAll(async () => {
    // Ensure DB connected (your setup.ts likely does it, but safe)
    expect(mongoose.connection.readyState).toBeTruthy();
  });

  beforeEach(async () => {
    // clean
    await TripModel.deleteMany({});
    await Business.deleteMany({});

    // Seed businesses (✅ only valid fields)
    approvedBiz = await Business.create({
      businessName: "Trip Approved Biz",
      email: "approved_trip@test.com",
      phoneNumber: "9800000001",
      password: "hashed_pw",
      address: "Kathmandu",
      profilePicture: "pp.png",
      role: "Business",
      businessStatus: "Approved",
      businessVerified: true,
    });

    pendingBiz = await Business.create({
      businessName: "Trip Pending Biz",
      email: "pending_trip@test.com",
      phoneNumber: "9800000002",
      password: "hashed_pw",
      address: "Kathmandu",
      profilePicture: "pp.png",
      role: "Business",
      businessStatus: "Pending",
      businessVerified: false,
    });

    otherBiz = await Business.create({
      businessName: "Trip Other Biz",
      email: "other_trip@test.com",
      phoneNumber: "9800000003",
      password: "hashed_pw",
      address: "Lalitpur",
      profilePicture: "pp.png",
      role: "Business",
      businessStatus: "Approved",
      businessVerified: true,
    });

    approvedToken = signToken({
      id: approvedBiz._id.toString(),
      role: "Business",
    });

    pendingToken = signToken({
      id: pendingBiz._id.toString(),
      role: "Business",
    });

    otherToken = signToken({
      id: otherBiz._id.toString(),
      role: "Business",
    });

    // Token that is NOT Business
    userToken = signToken({ id: "user1", role: "User" });

    // Seed one trip for GET / search / list tests
    const seededTrip = await TripModel.create({
      business: approvedBiz._id,
      type: "bus",
      from: "KTM",
      to: "PKR",
      departureAt: new Date("2030-01-01T10:00:00.000Z"),
      arrivalAt: new Date("2030-01-01T12:00:00.000Z"),
      price: 1000,
      totalSeats: 10,
      availableSeats: 10,
      status: "active",
    });
    createdTripId = seededTrip._id.toString();

    // Seed a trip with booked seats scenario: total=10, available=6 => bookedSeats=4
    const bookedTrip = await TripModel.create({
      business: approvedBiz._id,
      type: "bus",
      from: "KTM",
      to: "BRT",
      departureAt: new Date("2030-02-01T10:00:00.000Z"),
      arrivalAt: new Date("2030-02-01T12:00:00.000Z"),
      price: 1200,
      totalSeats: 10,
      availableSeats: 6,
      status: "active",
    });
    bookedTripId = bookedTrip._id.toString();
  });

  // ========================= CREATE =========================

  test("1) POST /api/trip/create -> 401 without token", async () => {
    const res = await request(app)
      .post("/api/trip/create")
      .send({
        type: "bus",
        from: "KTM",
        to: "PKR",
        departureAt: new Date().toISOString(),
        arrivalAt: new Date(Date.now() + 3600000).toISOString(),
        price: 1000,
        totalSeats: 10,
        status: "active",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  test("2) POST /api/trip/create -> 403 if role is not Business (businessOnly)", async () => {
    const res = await request(app)
      .post("/api/trip/create")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        type: "bus",
        from: "KTM",
        to: "PKR",
        departureAt: new Date().toISOString(),
        arrivalAt: new Date(Date.now() + 3600000).toISOString(),
        price: 1000,
        totalSeats: 10,
        status: "active",
      });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty("message", "Only Businesses Can Access");
  });

  test("3) POST /api/trip/create -> 400 invalid DTO", async () => {
    const res = await request(app)
      .post("/api/trip/create")
      .set("Authorization", `Bearer ${approvedToken}`)
      .send({
        // missing required fields like from/to/type etc
        price: -1,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message", "Trip creation failed");
  });

  test("4) POST /api/trip/create -> 500 Business not found (token id not in DB)", async () => {
    const fakeBizToken = signToken({
      id: new mongoose.Types.ObjectId().toString(),
      role: "Business",
    });

    const res = await request(app)
      .post("/api/trip/create")
      .set("Authorization", `Bearer ${fakeBizToken}`)
      .send({
        type: "bus",
        from: "KTM",
        to: "PKR",
        departureAt: new Date().toISOString(),
        arrivalAt: new Date(Date.now() + 3600000).toISOString(),
        price: 1000,
        totalSeats: 10,
        status: "active",
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain("Business not found");
  });

  test("5) POST /api/trip/create -> 500 business not approved yet", async () => {
    const res = await request(app)
      .post("/api/trip/create")
      .set("Authorization", `Bearer ${pendingToken}`)
      .send({
        type: "bus",
        from: "KTM",
        to: "PKR",
        departureAt: new Date().toISOString(),
        arrivalAt: new Date(Date.now() + 3600000).toISOString(),
        price: 1000,
        totalSeats: 10,
        status: "active",
      });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain("Business is not approved by admin yet");
  });

  test("6) POST /api/trip/create -> 201 success", async () => {
    const res = await request(app)
      .post("/api/trip/create")
      .set("Authorization", `Bearer ${approvedToken}`)
      .send({
        type: "plane",
        from: "KTM",
        to: "DEL",
        departureAt: new Date("2031-01-01T10:00:00.000Z").toISOString(),
        arrivalAt: new Date("2031-01-01T13:00:00.000Z").toISOString(),
        price: 5000,
        totalSeats: 50,
        status: "active",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("trip");
    expect(res.body.trip).toHaveProperty("availableSeats", 50);
  });

  // ========================= GET =========================

  test("7) GET /api/trip/:id -> 200 returns trip", async () => {
    const res = await request(app).get(`/api/trip/${createdTripId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.trip).toHaveProperty("_id", createdTripId);
  });

  test("8) GET /api/trip/:id -> 404 not found", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/trip/${id}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body).toHaveProperty("message");
  });

  // ========================= BUSINESS LIST =========================

  test("9) GET /api/trip/business/mine -> 200 returns trips for business", async () => {
    const res = await request(app)
      .get("/api/trip/business/mine?page=1&limit=10")
      .set("Authorization", `Bearer ${approvedToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.trips)).toBe(true);
  });

  // ========================= UPDATE =========================

  test("10) PATCH /api/trip/edit/:id -> 400 if not owner business", async () => {
    const res = await request(app)
      .patch(`/api/trip/edit/${createdTripId}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ price: 9999 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toContain("Not allowed to update this trip");
  });

  test("11) PATCH /api/trip/edit/:id -> 400 totalSeats cannot be less than booked seats", async () => {
    const res = await request(app)
      .patch(`/api/trip/edit/${bookedTripId}`)
      .set("Authorization", `Bearer ${approvedToken}`)
      .send({ totalSeats: 3 }); // bookedSeats = 4

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toContain(
      "totalSeats cannot be less than already booked seats (4)",
    );
  });

  test("12) PATCH /api/trip/edit/:id -> 200 success updates trip", async () => {
    const res = await request(app)
      .patch(`/api/trip/edit/${createdTripId}`)
      .set("Authorization", `Bearer ${approvedToken}`)
      .send({ price: 1500 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.trip).toHaveProperty("price", 1500);
  });

  // ========================= DELETE =========================

  test("13) DELETE /api/trip/delete/:id -> 400 not owner", async () => {
    const res = await request(app)
      .delete(`/api/trip/delete/${createdTripId}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.message).toContain("Not allowed to delete this trip");
  });

  test("14) DELETE /api/trip/delete/:id -> 200 success deletes", async () => {
    const res = await request(app)
      .delete(`/api/trip/delete/${createdTripId}`)
      .set("Authorization", `Bearer ${approvedToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("message", "Trip deleted successfully");

    const stillThere = await TripModel.findById(createdTripId).exec();
    expect(stillThere).toBeNull();
  });

  // ========================= SEARCH =========================

  test("15) GET /api/trip/search -> 200 returns paginated search results", async () => {
    const res = await request(app).get(
      "/api/trip/search?type=bus&from=KTM&to=PKR&status=active&page=1&limit=10",
    );

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("pages");
  });
});
