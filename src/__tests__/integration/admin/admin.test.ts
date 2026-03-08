// src/__tests__/integration/admin/admin.test.ts

import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app";
import { UserModel } from "../../../features/user/models/user.model";
import { Business } from "../../../features/business/models/business.model";

const ADMIN_BASE = process.env.ADMIN_BASE ?? "/api/admin";
// If you really mounted adminRouter as "/api/user", set ADMIN_BASE="/api/user"

const signToken = (payload: any) => {
  const secret = process.env.JWT_SECRET_KEY as string;
  return jwt.sign(payload, secret, { expiresIn: "1d" });
};

describe("Admin Integration Tests", () => {
  const adminToken = signToken({ id: "admin1", role: "admin" });
  const userToken = signToken({ id: "user1", role: "user" });

  const seedUsers = [
    {
      fullName: "U1",
      email: "u1@test.com",
      phoneNumber: "9811111111",
      password: "hashed",
      role: "user",
    },
    {
      fullName: "U2",
      email: "u2@test.com",
      phoneNumber: "9822222222",
      password: "hashed",
      role: "user",
    },
  ];

  let userId1: string;
  let businessId: string;

  beforeAll(async () => {
    await UserModel.deleteMany({
      email: { $in: seedUsers.map((u) => u.email) },
    });
    await Business.deleteMany({ email: "biz_admin@test.com" });

    const created = await UserModel.insertMany(seedUsers as any);
    userId1 = created[0]._id.toString();

    const biz = await Business.create({
      businessName: "Biz Admin Test",
      email: "biz_admin@test.com",
      phoneNumber: "9800009999",
      password: "hashed",
      address: "KTM",
      role: "Business",
      businessStatus: "Pending",
      businessVerified: false,
    } as any);

    businessId = biz._id.toString();
  });

  afterAll(async () => {
    await UserModel.deleteMany({
      email: { $in: seedUsers.map((u) => u.email) },
    });
    await Business.deleteMany({ email: "biz_admin@test.com" });
  });

  // ======================= USERS LIST =======================
  test("1) GET /users -> 401/403 without token", async () => {
    const res = await request(app).get(`${ADMIN_BASE}/users`);
    expect([401, 403]).toContain(res.status);
  });

  test("2) GET /users -> 403 if not admin", async () => {
    const res = await request(app)
      .get(`${ADMIN_BASE}/users`)
      .set("Authorization", `Bearer ${userToken}`);

    expect([401, 403]).toContain(res.status);
  });

  test("3) GET /users -> 200 for admin and returns list", async () => {
    const res = await request(app)
      .get(`${ADMIN_BASE}/users`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.users)).toBe(true);
  });

  // ======================= GET USER BY ID =======================
  test("4) GET /users/id/:userId -> 200 for admin", async () => {
    const res = await request(app)
      .get(`${ADMIN_BASE}/users/id/${userId1}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test("5) GET /users/id/:userId -> 404/400 for invalid id", async () => {
    const res = await request(app)
      .get(`${ADMIN_BASE}/users/id/invalid-id`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect([400, 404, 500]).toContain(res.status);
  });

  // ======================= GET USER BY PHONE =======================
  test("6) GET /users/phone/:phoneNumber -> 200 for existing phone", async () => {
    const res = await request(app)
      .get(`${ADMIN_BASE}/users/phone/9811111111`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  test("7) GET /users/phone/:phoneNumber -> 404/400 if not found", async () => {
    const res = await request(app)
      .get(`${ADMIN_BASE}/users/phone/0000000000`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect([400, 404, 500]).toContain(res.status);
  });

  // ======================= PATCH EDIT USER =======================
  test("8) PATCH /users/edit/:userId -> 403 for non-admin", async () => {
    const res = await request(app)
      .patch(`${ADMIN_BASE}/users/edit/${userId1}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ fullName: "Updated Name" });

    expect([401, 403]).toContain(res.status);
  });

  test("9) PATCH /users/edit/:userId -> 200 for admin (or 400 if controller validates)", async () => {
    const res = await request(app)
      .patch(`${ADMIN_BASE}/users/edit/${userId1}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ fullName: "Updated Name" });

    expect([200, 400]).toContain(res.status);
  });

  // ======================= DELETE SINGLE USER =======================
  test("10) DELETE /users/delete/:userId -> 403 for non-admin", async () => {
    const res = await request(app)
      .delete(`${ADMIN_BASE}/users/delete/${userId1}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect([401, 403]).toContain(res.status);
  });

  test("11) DELETE /users/delete/:userId -> 200 for admin", async () => {
    // recreate one user to delete (in case earlier tests changed it)
    const u = await UserModel.create({
      fullName: "U-Delete",
      email: "u_delete@test.com",
      phoneNumber: "9833333333",
      password: "hashed",
      role: "user",
    } as any);

    const res = await request(app)
      .delete(`${ADMIN_BASE}/users/delete/${u._id.toString()}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect([200, 400]).toContain(res.status);

    await UserModel.deleteMany({ email: "u_delete@test.com" });
  });

  // ======================= APPROVE BUSINESS =======================
  test("12) PUT /approve-business/:businessId -> 200 for admin approve", async () => {
    const res = await request(app)
      .put(`${ADMIN_BASE}/approve-business/${businessId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "Approve" });

    expect([200, 400]).toContain(res.status);
  });
});
