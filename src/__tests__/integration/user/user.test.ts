// src/__tests__/integration/user/user.test.ts

import request from "supertest";
import bcrypt from "bcrypt";
import { UserModel } from "../../../features/user/models/user.model";
import app from "../../../app";

describe("User Integration Tests", () => {
  const testUser = {
    phoneNumber: "9876543210",
    email: "test@example.com",
    password: "test@1234",
    confirmPassword: "test@1234",
    fullName: "Test User",
  };

  beforeAll(async () => {
    // clean any previous runs
    await UserModel.deleteMany({ phoneNumber: testUser.phoneNumber });
    await UserModel.deleteMany({ email: testUser.email });
  });

  afterAll(async () => {
    await UserModel.deleteMany({ phoneNumber: testUser.phoneNumber });
    await UserModel.deleteMany({ email: testUser.email });
  });

  describe("POST /api/user/register", () => {
    test("registers a user successfully (200)", async () => {
      const res = await request(app).post("/api/user/register").send(testUser);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty(
        "message",
        "User registration Successful",
      );
      expect(res.body).toHaveProperty("user");
      // password must not leak (sanitized)
      expect(res.body.user.password).toBeUndefined();
    });

    test("fails registration when body invalid (400)", async () => {
      const res = await request(app).post("/api/user/register").send({
        email: "not-an-email",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
    });

    test("fails registration when phoneNumber already exists (500)", async () => {
      const res = await request(app).post("/api/user/register").send(testUser);

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "User with this email or username already exists",
      );
    });
  });

  describe("POST /api/user/login", () => {
    test("fails login when DTO invalid (401)", async () => {
      const res = await request(app).post("/api/user/login").send({
        email: "bad",
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Invalid Credentials");
    });

    test("logs in successfully (201) and returns token", async () => {
      const res = await request(app).post("/api/user/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Login Successful");
      expect(res.body).toHaveProperty("token");
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.password).toBeUndefined();
    });

    test("fails login when password is wrong (500 in current controller)", async () => {
      const res = await request(app).post("/api/user/login").send({
        email: testUser.email,
        password: "wrong_password",
      });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Invalid credentials");
    });

    test("fails login when user doesn't exist (500 in current controller)", async () => {
      const res = await request(app).post("/api/user/login").send({
        email: "nouser@example.com",
        password: "whatever123",
      });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Invalid credentials");
    });
  });

  describe("GET /api/user/me", () => {
    test("rejects request without auth token (401)", async () => {
      const res = await request(app).get("/api/user/me");
      // your authMiddleware likely returns 401
      expect([401, 403]).toContain(res.status);
    });

    test("returns profile with valid token (200)", async () => {
      // login to get token
      const login = await request(app).post("/api/user/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      const token = login.body.token;
      expect(token).toBeTruthy();

      const res = await request(app)
        .get("/api/user/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("user");
      expect(res.body.user.password).toBeUndefined();
    });
  });
});
