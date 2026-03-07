// src/__tests__/unit/business/business.service.test.ts

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

const repoMock = {
  findByEmail: jest.fn(),
  createBusiness: jest.fn(),
  getBusinessById: jest.fn(),
  save: jest.fn(),
  getAllBusinesses: jest.fn(),
  updateBusiness: jest.fn(),
};

jest.mock(
  "../../../features/business/repositories/business.repository",
  () => ({
    BusinessRepository: jest.fn().mockImplementation(() => repoMock),
  }),
);

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { BusinessService } from "../../../features/business/services/business.service";

const hashMock = bcrypt.hash as unknown as jest.Mock;
const compareMock = bcrypt.compare as unknown as jest.Mock;
const jwtSignMock = jwt.sign as unknown as jest.Mock;

describe("BusinessService unit tests", () => {
  let service: BusinessService;

  const makeBusinessDoc = (overrides: any = {}) => {
    const base = {
      _id: overrides._id ?? "biz1",
      role: overrides.role ?? "Business",
      businessName: overrides.businessName ?? "Test Biz",
      email: overrides.email ?? "biz@test.com",
      phoneNumber: overrides.phoneNumber ?? "9800000000",
      password: overrides.password ?? "hashed_pw",
      confirmPassword: overrides.confirmPassword ?? "hashed_pw",
      address: overrides.address ?? "Kathmandu",
      profilePicture: overrides.profilePicture ?? "profile.png",
      businessStatus: overrides.businessStatus ?? "Pending",
      businessVerified: overrides.businessVerified ?? false,
      businessDocument: overrides.businessDocument,
      rejectionReason: overrides.rejectionReason,
      __v: 0,
    };

    return {
      ...base,
      toObject: () => ({ ...base, ...overrides }),
      ...overrides,
      save: jest.fn().mockResolvedValue({ ...base, ...overrides }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET_KEY = "testsecret";
    service = new BusinessService();
  });

  // ---------- register ----------
  test("register: throws if business already exists", async () => {
    repoMock.findByEmail.mockResolvedValue(makeBusinessDoc());

    await expect(
      service.register({
        businessName: "X",
        email: "biz@test.com",
        phoneNumber: "9800000000",
        password: "pw",
        address: "KTM",
        profilePicture: "pic.png",
      } as any),
    ).rejects.toThrow("Business already exists");
  });

  test("register: hashes password, creates business, returns tempToken + sanitized business", async () => {
    repoMock.findByEmail.mockResolvedValue(null);
    hashMock.mockResolvedValue("hashed_pw");

    const created = makeBusinessDoc({
      _id: "biz1",
      email: "biz@test.com",
      password: "hashed_pw",
      businessStatus: "Pending",
    });
    repoMock.createBusiness.mockResolvedValue(created);
    jwtSignMock.mockReturnValue("temp_token");

    const out = await service.register({
      businessName: "Test Biz",
      email: "biz@test.com",
      phoneNumber: "9800000000",
      password: "pw",
      address: "KTM",
      profilePicture: "pic.png",
    } as any);

    expect(hashMock).toHaveBeenCalledWith("pw", 10);
    expect(repoMock.createBusiness).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: "Test Biz",
        email: "biz@test.com",
        phoneNumber: "9800000000",
        password: "hashed_pw",
        address: "KTM",
        profilePicture: "pic.png",
        businessStatus: "Pending",
      }),
    );

    expect(jwtSignMock).toHaveBeenCalledWith(
      { id: "biz1", role: "Business", temp: true },
      "testsecret",
      { expiresIn: "1h" },
    );

    expect(out).toHaveProperty("tempToken", "temp_token");
    expect(out.business.password).toBeUndefined();
    expect(out.business.__v).toBeUndefined();
  });

  // ---------- login ----------
  test("login: throws if business not found", async () => {
    repoMock.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: "x@x.com", password: "pw" } as any),
    ).rejects.toThrow("Business not found");
  });

  test("login: throws invalid credentials if password mismatch", async () => {
    repoMock.findByEmail.mockResolvedValue(
      makeBusinessDoc({ password: "hashed" }),
    );
    compareMock.mockResolvedValue(false);

    await expect(
      service.login({ email: "biz@test.com", password: "wrong" } as any),
    ).rejects.toThrow("Invalid credentials");
  });

  test("login: blocks when Pending and no document uploaded", async () => {
    repoMock.findByEmail.mockResolvedValue(
      makeBusinessDoc({
        businessStatus: "Pending",
        businessDocument: undefined,
      }),
    );
    compareMock.mockResolvedValue(true);

    await expect(
      service.login({ email: "biz@test.com", password: "pw" } as any),
    ).rejects.toThrow("Please upload document and wait for admin approval");
  });

  test("login: blocks when Rejected", async () => {
    repoMock.findByEmail.mockResolvedValue(
      makeBusinessDoc({
        businessStatus: "Rejected",
        businessDocument: "doc.pdf",
      }),
    );
    compareMock.mockResolvedValue(true);

    await expect(
      service.login({ email: "biz@test.com", password: "pw" } as any),
    ).rejects.toThrow("Business registration rejected by admin");
  });

  test("login: returns token + sanitized business when allowed", async () => {
    const biz = makeBusinessDoc({
      _id: "biz1",
      businessStatus: "Approved",
      businessDocument: "doc.pdf",
      role: "Business",
    });

    repoMock.findByEmail.mockResolvedValue(biz);
    compareMock.mockResolvedValue(true);
    jwtSignMock.mockReturnValue("auth_token");

    const out = await service.login({
      email: "biz@test.com",
      password: "pw",
    } as any);

    expect(jwtSignMock).toHaveBeenCalledWith(
      { id: "biz1", role: "Business" },
      "testsecret",
      { expiresIn: "7d" },
    );

    expect(out.token).toBe("auth_token");
    expect((out.business as any).password).toBeUndefined();
    expect((out.business as any).__v).toBeUndefined();
  });

  // ---------- uploadDocument ----------
  test("uploadDocument: throws if business not found", async () => {
    repoMock.getBusinessById.mockResolvedValue(null);

    await expect(service.uploadDocument("biz1", "/x.pdf")).rejects.toThrow(
      "Business not found",
    );
  });

  test("uploadDocument: sets businessDocument + Pending and saves", async () => {
    const biz = makeBusinessDoc({ businessStatus: "Approved" });
    repoMock.getBusinessById.mockResolvedValue(biz);
    repoMock.save.mockResolvedValue({
      ...biz,
      businessDocument: "/doc.pdf",
      businessStatus: "Pending",
    });

    const out = await service.uploadDocument("biz1", "/doc.pdf");

    expect(repoMock.save).toHaveBeenCalled();
    expect(out.businessDocument).toBe("/doc.pdf");
    expect(out.businessStatus).toBe("Pending");
  });

  // ---------- approveBusiness ----------
  test("approveBusiness: sets Approved + verified true", async () => {
    const biz = makeBusinessDoc({
      businessStatus: "Pending",
      businessVerified: false,
    });
    repoMock.getBusinessById.mockResolvedValue(biz);
    repoMock.save.mockResolvedValue({
      ...biz,
      businessStatus: "Approved",
      businessVerified: true,
    });

    const out = await service.approveBusiness("biz1", {
      action: "Approve",
    } as any);

    expect(out.businessStatus).toBe("Approved");
    expect(out.businessVerified).toBe(true);
  });

  test("approveBusiness: sets Rejected + stores reason (default if none)", async () => {
    const biz = makeBusinessDoc({ businessStatus: "Pending" });
    repoMock.getBusinessById.mockResolvedValue(biz);
    repoMock.save.mockResolvedValue({
      ...biz,
      businessStatus: "Rejected",
      businessVerified: false,
      rejectionReason: "No reason provided",
    });

    const out = await service.approveBusiness("biz1", {
      action: "Reject",
    } as any);
    expect(out.businessStatus).toBe("Rejected");
    expect(out.businessVerified).toBe(false);
    expect(out.rejectionReason).toBe("No reason provided");
  });

  // ---------- getAllBusinesses ----------
  test("getAllBusinesses: uses skip/limit and sanitizes", async () => {
    repoMock.getAllBusinesses.mockResolvedValue([
      makeBusinessDoc({ _id: "b1" }),
      makeBusinessDoc({ _id: "b2" }),
    ]);

    const out = await service.getAllBusinesses(2, 10);
    expect(repoMock.getAllBusinesses).toHaveBeenCalledWith(10, 10);
    expect((out[0] as any).password).toBeUndefined();
    expect((out[0] as any).__v).toBeUndefined();
  });

  // ---------- editBusinessProfile ----------
  test("editBusinessProfile: does not update password/email and returns sanitized output", async () => {
    repoMock.updateBusiness.mockResolvedValue(
      makeBusinessDoc({ _id: "biz1", businessName: "Updated" }),
    );

    const out = await service.editBusinessProfile("biz1", {
      businessName: "Updated",
      email: "should@not-change.com",
      password: "should-not-change",
    } as any);

    expect(repoMock.updateBusiness).toHaveBeenCalledWith(
      "biz1",
      expect.objectContaining({ businessName: "Updated" }),
    );

    // ensure email/password not passed
    const calledData = repoMock.updateBusiness.mock.calls[0][1];
    expect(calledData.email).toBeUndefined();
    expect(calledData.password).toBeUndefined();

    expect(out.message).toBe("Profile updated successfully");
    expect((out.business as any).password).toBeUndefined();
  });
});
