import request from "supertest";
import bcrypt from "bcrypt";
import { UserModel } from "../../features/user/models/user.model";
import app from "../../app";
import { email } from "zod";

// Dummy User For Auth Tests
const testUser = {
  phoneNumber: "9876543210",
  email: "test@example.com",
  password: "test@1234",
  confirmPassword: "test@1234",
  fullName: "Test User",
};

describe("User Login Integration Tests", () => {
  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await UserModel.create({
      phoneNumber: testUser.phoneNumber,
      fullName: testUser.fullName,
      email: testUser.email,
      password: hashedPassword,
    });
  });
  afterAll(async () => {
    await UserModel.deleteMany({ phoneNumber: testUser.phoneNumber });
  });

  describe("/POST /api/user/login", () => {
    const testCredentials = {
      phoneNumber: testUser.phoneNumber,
      password: testUser.password,
    };
    test("should log in the user successfully", async () => {
      const response = await request(app)
        .post("/api/user/login")
        .send(testCredentials);

      // Validation
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Login Successful");
    });
    test("should fail for non-existent user", async () => {
      const response = await request(app).post("/api/user/login").send({
        phoneNumber: "0987654321",
        password: "whatever",
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });
    test("should fail to login user when password is empty", async () => {
      const response = await request(app)
        .post("/api/user/login")
        .send({ phoneNumber: testUser.phoneNumber });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid Credentials");
    });
    test("should fail to login user when phoneNumber is empty", async () => {
      const response = await request(app)
        .post("/api/user/login")
        .send({ password: testUser.password });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid Credentials");
    });

    test("should fail for wrong password", async () => {
      const response = await request(app).post("/api/user/login").send({
        phoneNumber: testUser.phoneNumber,
        password: "wrongpassword",
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("message", "Invalid credentials");
    });
    test("should fail for invalid email", async () => {
      const response = await request(app).post("/api/user/login").send({
        email: "test.gmail.com",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Invalid Credentials");
    });
    test("should return token after login successful", async () => {
      const response = await request(app)
        .post("/api/user/login")
        .send(testCredentials);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Login Successful");
      expect(response.body).toHaveProperty("token");
    });
  });
});
