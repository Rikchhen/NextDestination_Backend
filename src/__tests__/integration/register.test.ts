import request from "supertest";
import bcrypt from "bcrypt";
import { UserModel } from "../../features/user/models/user.model";
import app from "../../app";

// Dummy User For Auth Tests
const testUser = {
  phoneNumber: "9876543210",
  email: "test@example.com",
  password: "test@1234",
  confirmPassword: "test@1234",
  fullName: "Test User",
};

// ================================= REGISTRATION TEST CASES ============================================

describe("User Registration Integration Tests", () => {
  beforeAll(async () => {
    // Ensure test user does not exist before tests
    await UserModel.deleteMany({ email: testUser.email });
  });
  afterAll(async () => {
    // Clean up test user after tests
    await UserModel.deleteMany({ email: testUser.email });
  });

  describe("/POST /api/user/register", () => {
    test("should register a new user successfully", async () => {
      //Test Name
      const response = await request(app)
        .post("/api/user/register")
        .send(testUser);

      // Validate response structure
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        "User registration Successful",
      );
      expect(response.body).toHaveProperty("user");
    });

    test("should fail to register user with empty fields", async () => {
      const response = await request(app).post("/api/user/register");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Registration Failed");
    });

    test("should fail to register user with invalid email", async () => {
      const response = await request(app)
        .post("/api/user/register")
        .send({ ...testUser, email: "testuser" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Registration Failed");
    });

    test("should fail to regsiter a user with existing email", async () => {
      const response = await request(app)
        .post("/api/user/register")
        .send(testUser);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty(
        "message",
        "User with this email or username already exists",
      );
    });

    test("should fail to register a user with existing username", async () => {
      const response = await request(app)
        .post("/api/user/register")
        .send(testUser);

      // Validate
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty(
        "message",
        "User with this email or username already exists",
      );
    });

    test("should fail to register user if password is less than 8 characters", async () => {
      const userWithBadPass = {
        email: "test@example.com",
        password: "test",
        confirmPassword: "test@123",
        username: "testUser",
        fullName: "Test User",
        phoneNumber: "9876543210",
        address: "Kathmandu",
      };
      const response = await request(app)
        .post("/api/user/register")
        .send(userWithBadPass);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Registration Failed");
    });

    test("should fail to register user if password and confirmPassword dont match", async () => {
      const userWithBadPass = {
        email: "test@example.com",
        password: "test@1234",
        confirmPassword: "test@123",
        username: "testUser",
        fullName: "Test User",
        phoneNumber: "9876543210",
        address: "Kathmandu",
      };
      const response = await request(app)
        .post("/api/user/register")
        .send(userWithBadPass);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Registration Failed");
    });
    test("should fail to register when phoneNumber is missing", async () => {
      const { phoneNumber, ...withoutPhone } = testUser as any;

      const res = await request(app)
        .post("/api/user/register")
        .send(withoutPhone);

      // depending on your validation layer it might be 400
      expect([400, 500]).toContain(res.status);
    });

    test("should fail to register when phoneNumber is invalid (non-numeric)", async () => {
      const res = await request(app)
        .post("/api/user/register")
        .send({ ...testUser, phoneNumber: "98ABCD" });

      expect([400, 500]).toContain(res.status);
    });

    test("should fail to register when email is empty string", async () => {
      const res = await request(app)
        .post("/api/user/register")
        .send({ ...testUser, email: "" });

      expect([400, 500]).toContain(res.status);
    });

    test("should fail to register when password is missing", async () => {
      const { password, ...withoutPassword } = testUser as any;

      const res = await request(app)
        .post("/api/user/register")
        .send(withoutPassword);

      expect([400, 500]).toContain(res.status);
    });
  });
});
