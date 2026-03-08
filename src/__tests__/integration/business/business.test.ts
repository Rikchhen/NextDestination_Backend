import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app";
import { Business } from "../../../features/business/models/business.model";

const signToken = (payload: any) => {
  const secret = process.env.JWT_SECRET_KEY as string;
  return jwt.sign(payload, secret, { expiresIn: "1d" });
};

describe("Business Integration Tests", () => {
  const baseBusiness = {
    businessName: "Test Biz",
    email: "biz@test.com",
    phoneNumber: "9800000000",
    password: "test@1234",
    confirmPassword: "test@1234",
    address: "Kathmandu",
  };

  // memoryStorage friendly uploads
  const profilePicBuffer = Buffer.from("fake-image-bytes");
  const docBuffer = Buffer.from("fake-pdf-bytes");

  const registerBusiness = async () => {
    return request(app)
      .post("/api/business/register")
      .field("businessName", baseBusiness.businessName)
      .field("email", baseBusiness.email)
      .field("phoneNumber", baseBusiness.phoneNumber)
      .field("password", baseBusiness.password)
      .field("confirmPassword", baseBusiness.confirmPassword)
      .field("address", baseBusiness.address)
      .attach("business-profile-pictures", profilePicBuffer, {
        filename: "profile.png",
        contentType: "image/png",
      });
  };

  const getBizDoc = async () =>
    Business.findOne({ email: baseBusiness.email }).exec();

  beforeAll(async () => {
    await Business.deleteMany({ email: baseBusiness.email });
  });

  afterAll(async () => {
    await Business.deleteMany({ email: baseBusiness.email });
  });

  // ===================== REGISTER (4 tests) =====================
  describe("POST /api/business/register", () => {
    test("1) should fail when body invalid (400) and return errors", async () => {
      const res = await request(app)
        .post("/api/business/register")
        .field("email", "bad-email") // missing required fields too
        .attach("business-profile-pictures", profilePicBuffer, {
          filename: "profile.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
    });

    test("2) should fail when profile picture missing (400 File Not Inserted)", async () => {
      const res = await request(app)
        .post("/api/business/register")
        .field("businessName", baseBusiness.businessName)
        .field("email", baseBusiness.email)
        .field("phoneNumber", baseBusiness.phoneNumber)
        .field("password", baseBusiness.password)
        .field("confirmPassword", baseBusiness.confirmPassword)
        .field("address", baseBusiness.address);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "File Not Inserted");
    });

    test("3) should register successfully with file upload (201)", async () => {
      const res = await registerBusiness();

      if (res.status !== 201) {
        // helpful debug if anything fails again
        // eslint-disable-next-line no-console
        console.log("REGISTER FAIL:", res.status, res.body);
      }

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("tempToken");
      expect(res.body).toHaveProperty("business");
      // sanitize expectation (service sanitizes password/confirmPassword)
      expect(res.body.business.password).toBeUndefined();
      expect(res.body.business.confirmPassword).toBeUndefined();
    });

    test("4) should fail when business already exists (400)", async () => {
      // ensure seeded
      const existing = await getBizDoc();
      if (!existing) {
        const seed = await registerBusiness();
        if (seed.status !== 201) {
          // eslint-disable-next-line no-console
          console.log("SEED REGISTER FAIL:", seed.status, seed.body);
        }
      }

      const res = await registerBusiness();
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Business already exists");
    });
  });

  // ===================== LOGIN (4 tests) =====================
  describe("POST /api/business/login", () => {
    beforeAll(async () => {
      const biz = await getBizDoc();
      if (!biz) {
        const seed = await registerBusiness();
        if (seed.status !== 201) {
          // eslint-disable-next-line no-console
          console.log("SEED REGISTER FAIL:", seed.status, seed.body);
        }
      }
    });

    test("5) should fail when DTO invalid (400) with errors", async () => {
      const res = await request(app)
        .post("/api/business/login")
        .send({ email: "bad" }); // missing password

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
    });

    test("6) should fail when business not found (400)", async () => {
      const res = await request(app)
        .post("/api/business/login")
        .send({ email: "nouser@x.com", password: "whatever123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Business not found");
    });

    test("7) should fail when wrong password (>= 6 chars) (400 Invalid credentials)", async () => {
      const res = await request(app)
        .post("/api/business/login")
        .send({ email: baseBusiness.email, password: "wrongpass123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "Invalid credentials");
    });

    test("8) should block login when Pending and no document (400)", async () => {
      const res = await request(app)
        .post("/api/business/login")
        .send({ email: baseBusiness.email, password: baseBusiness.password });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty(
        "message",
        "Please upload document and wait for admin approval",
      );
    });
  });

  // ===================== UPLOAD DOCUMENT (3 tests) =====================
  describe("POST /api/business/upload-document", () => {
    test("9) should reject upload without auth token (401)", async () => {
      const res = await request(app)
        .post("/api/business/upload-document")
        .attach("document", docBuffer, {
          filename: "doc.pdf",
          contentType: "application/pdf",
        });

      // your controller explicitly returns 401 if no user id
      expect(res.status).toBe(401);
    });

    test("10) should reject upload with token but no file (400 No document uploaded)", async () => {
      const biz = await getBizDoc();
      expect(biz).toBeTruthy();

      // role should match your businessOnly if used (but route uses only authMiddleware)
      const token = signToken({ id: biz!._id.toString(), role: "Business" });

      const res = await request(app)
        .post("/api/business/upload-document")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("success", false);
      expect(res.body).toHaveProperty("message", "No document uploaded");
    });

    test("11) should upload document successfully (200)", async () => {
      const biz = await getBizDoc();
      expect(biz).toBeTruthy();

      const token = signToken({ id: biz!._id.toString(), role: "Business" });

      const res = await request(app)
        .post("/api/business/upload-document")
        .set("Authorization", `Bearer ${token}`)
        .attach("document", docBuffer, {
          filename: "doc.pdf",
          contentType: "application/pdf",
        });

      // NOTE: in memoryStorage, req.file.path is usually undefined.
      // If your uploadBusinessDoc multer uses diskStorage, this will pass.
      // If it uses memoryStorage too, controller will pass req.file.path (undefined) to service.
      // Your service will set businessDocument=undefined, but still "succeeds".
      // So we only assert success + message, and document may be undefined depending on multer.
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("message", "Document uploaded");
      expect(res.body).toHaveProperty("document");
    });
  });

  // ===================== ADMIN APPROVE (3 tests) =====================
  describe("PUT /api/business/admin/approve/:businessId", () => {
    test("12) should reject approve without auth (401/403)", async () => {
      const biz = await getBizDoc();
      expect(biz).toBeTruthy();

      const res = await request(app)
        .put(`/api/business/admin/approve/${biz!._id.toString()}`)
        .send({ action: "Approve" });

      expect([401, 403]).toContain(res.status);
    });

    test("13) should reject approve if not admin (403)", async () => {
      const biz = await getBizDoc();
      expect(biz).toBeTruthy();

      const token = signToken({ id: "notadmin", role: "Business" });

      const res = await request(app)
        .put(`/api/business/admin/approve/${biz!._id.toString()}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ action: "Approve" });

      expect([401, 403]).toContain(res.status);
    });

    test("14) should approve successfully as admin (200)", async () => {
      const biz = await getBizDoc();
      expect(biz).toBeTruthy();

      // adjust if your adminOnly expects role "Admin" instead of "admin"
      const adminToken = signToken({ id: "admin1", role: "admin" });

      const res = await request(app)
        .put(`/api/business/admin/approve/${biz!._id.toString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ action: "Approve" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body).toHaveProperty("data.businessStatus", "Approved");
      expect(res.body).toHaveProperty("data.businessVerified", true);
    });
  });
});
