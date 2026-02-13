import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { UserModel } from "../../features/user/models/user.model";
import app from "../../app";

dotenv.config({ path: ".env.test" });
// Dummy User For Auth Tests
const testUser = {
  phoneNumber: "9876543210",
  email: "test@example.com",
  password: "test@1234",
  confirmPassword: "test@1234",
  fullName: "Test User",
};
describe("Auth-Token Expiry", () => {
  let userId: string;
  let expiredToken: string;

  beforeAll(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    const user = await UserModel.create(testUser);

    userId = user._id.toString();

    // We create an already-expired JWT token
    expiredToken = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
      expiresIn: "-10s", // expired
    });
  });

  afterAll(async () => {
    await UserModel.deleteMany({});
  });

  test("should reject requests with an expired token", async () => {
    const response = await request(app)
      .get("/api/user/me") // any protected route
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message", "Invalid or expired token");
  });

  test("should fail if token is invalid or malformed", async () => {
    const response = await request(app)
      .get("/api/user/me")
      .set("Authorization", "Bearer this.is.not.a.valid.token");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });
});
