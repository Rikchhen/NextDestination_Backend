// src/__tests__/unit/user/user.service.test.ts

// ---- Mocks ----
jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

jest.mock("../../../config/email", () => ({
  sendEmail: jest.fn(),
}));

// Service creates repo via: const userRepository = new UserRepository();
// so we mock the class constructor to return our repoMock instance
const repoMock = {
  getUserByNumber: jest.fn(),
  createUser: jest.fn(),

  getUserByEmail: jest.fn(),
  getUserWithPassword: jest.fn(),

  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),

  getAllUsers: jest.fn(),
};

jest.mock("../../../features/user/repositories/user.repository", () => ({
  UserRepository: jest.fn().mockImplementation(() => repoMock),
}));

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendEmail } from "../../../config/email";
import { UserService } from "../../../features/user/services/user.service";
import { HttpError } from "../../../errorrs/error";

const hashMock = bcrypt.hash as unknown as jest.Mock;
const compareMock = bcrypt.compare as unknown as jest.Mock;
const jwtSignMock = jwt.sign as unknown as jest.Mock;
const jwtVerifyMock = jwt.verify as unknown as jest.Mock;
const sendEmailMock = sendEmail as unknown as jest.Mock;

describe("UserService unit tests", () => {
  let service: UserService;

  const makeUserDoc = (overrides: any = {}) => {
    const base = {
      _id: overrides._id ?? "userId123",
      role: overrides.role ?? "user",
      email: overrides.email ?? "test@example.com",
      fullName: overrides.fullName ?? "Test User",
      phoneNumber: overrides.phoneNumber ?? "9876543210",
      password: overrides.password ?? "hashed_pw",
      __v: 0,
    };

    return {
      ...base,
      toObject: () => ({ ...base, ...overrides }),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET_KEY = "testsecret";
    process.env.CLIENT_URL = "http://localhost:3000";
    service = new UserService();
  });

  // ---------------- createUser ----------------

  test("createUser: throws if phoneNumber already exists", async () => {
    repoMock.getUserByNumber.mockResolvedValue(makeUserDoc());

    await expect(
      service.createUser({
        fullName: "A",
        email: "a@a.com",
        password: "p",
        phoneNumber: "9876543210",
      } as any),
    ).rejects.toThrow("User with this email or username already exists");

    expect(repoMock.getUserByNumber).toHaveBeenCalledWith("9876543210");
  });

  test("createUser: hashes password, lowercases email, returns sanitized user", async () => {
    repoMock.getUserByNumber.mockResolvedValue(null);
    hashMock.mockResolvedValue("hashed_pw");

    const createdUser = makeUserDoc({
      email: "a@a.com",
      password: "hashed_pw",
      __v: 0,
    });
    repoMock.createUser.mockResolvedValue(createdUser);

    const out = await service.createUser({
      fullName: "A",
      email: "A@A.COM",
      password: "plain_pw",
      phoneNumber: "9876543210",
    } as any);

    expect(hashMock).toHaveBeenCalledWith("plain_pw", 10);
    expect(repoMock.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "a@a.com",
        password: "hashed_pw",
        fullName: "A",
        phoneNumber: "9876543210",
      }),
    );

    // sanitize removes password and __v
    expect((out as any).password).toBeUndefined();
    expect((out as any).__v).toBeUndefined();
    expect((out as any).email).toBe("a@a.com");
  });

  // ---------------- loginUser ----------------

  test("loginUser: throws Invalid credentials if user not found by email", async () => {
    repoMock.getUserByEmail.mockResolvedValue(null);

    await expect(service.loginUser("x@x.com", "pw")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  test("loginUser: throws Authentication failed if getUserWithPassword returns null", async () => {
    repoMock.getUserByEmail.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    repoMock.getUserWithPassword.mockResolvedValue(null);

    await expect(service.loginUser("x@x.com", "pw")).rejects.toThrow(
      "Authentication failed",
    );
  });

  test("loginUser: throws Invalid credentials when password mismatch", async () => {
    repoMock.getUserByEmail.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    repoMock.getUserWithPassword.mockResolvedValue(
      makeUserDoc({ _id: "u1", password: "hashed_pw" }),
    );
    compareMock.mockResolvedValue(false);

    await expect(service.loginUser("x@x.com", "pw")).rejects.toThrow(
      "Invalid credentials",
    );

    expect(compareMock).toHaveBeenCalledWith("pw", "hashed_pw");
  });

  test("loginUser: returns token and sanitized user on success", async () => {
    const user = makeUserDoc({ _id: "u1", role: "user" });

    repoMock.getUserByEmail.mockResolvedValue(user);
    repoMock.getUserWithPassword.mockResolvedValue(
      makeUserDoc({ _id: "u1", password: "hashed_pw" }),
    );
    compareMock.mockResolvedValue(true);
    jwtSignMock.mockReturnValue("jwt_token");

    const out = await service.loginUser("x@x.com", "pw");

    expect(jwtSignMock).toHaveBeenCalledWith(
      { id: "u1", role: "user" },
      "testsecret",
      { expiresIn: "10d" },
    );

    expect(out.token).toBe("jwt_token");
    expect((out.user as any).password).toBeUndefined();
    expect((out.user as any).__v).toBeUndefined();
  });

  // ---------------- updateUser ----------------

  test("updateUser: throws User not found when user doesn't exist", async () => {
    repoMock.getUserById.mockResolvedValue(null);

    await expect(
      service.updateUser("u1", { fullName: "X" } as any),
    ).rejects.toThrow("User not found");
  });

  test("updateUser: throws collision error when phoneNumber is used by another user", async () => {
    repoMock.getUserById.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    repoMock.getUserByNumber.mockResolvedValue(makeUserDoc({ _id: "u2" }));

    await expect(
      service.updateUser("u1", { phoneNumber: "9999999999" } as any),
    ).rejects.toThrow("Email or username already in use");
  });

  test("updateUser: throws if repository update returns null", async () => {
    repoMock.getUserById.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    repoMock.getUserByNumber.mockResolvedValue(null);
    repoMock.updateUser.mockResolvedValue(null);

    await expect(
      service.updateUser("u1", { fullName: "New" } as any),
    ).rejects.toThrow("Failed to update user");
  });

  test("updateUser: returns sanitized updated user on success", async () => {
    repoMock.getUserById.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    repoMock.getUserByNumber.mockResolvedValue(null);

    const updated = makeUserDoc({ _id: "u1", fullName: "New Name" });
    repoMock.updateUser.mockResolvedValue(updated);

    const out = await service.updateUser("u1", { fullName: "New Name" } as any);

    expect(repoMock.updateUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ fullName: "New Name" }),
    );
    expect((out as any).password).toBeUndefined();
    expect((out as any).__v).toBeUndefined();
    expect((out as any).fullName).toBe("New Name");
  });

  // ---------------- getAllUsers / getUserById ----------------

  test("getAllUsers: calls repo with skip/limit and sanitizes results", async () => {
    repoMock.getAllUsers.mockResolvedValue([
      makeUserDoc({ _id: "u1" }),
      makeUserDoc({ _id: "u2" }),
    ]);

    const out = await service.getAllUsers(2, 10); // page 2 => skip 10
    expect(repoMock.getAllUsers).toHaveBeenCalledWith(10, 10);

    expect(out).toHaveLength(2);
    expect((out[0] as any).password).toBeUndefined();
    expect((out[0] as any).__v).toBeUndefined();
  });

  test("getUserById: throws User not found if repo returns null", async () => {
    repoMock.getUserById.mockResolvedValue(null);
    await expect(service.getUserById("u1")).rejects.toThrow("User not found");
  });

  // ---------------- deleteUser ----------------

  test("deleteUser: throws User not found if user does not exist", async () => {
    repoMock.getUserById.mockResolvedValue(null);
    await expect(service.deleteUser("u1")).rejects.toThrow("User not found");
  });

  test("deleteUser: calls repo.deleteUser on success", async () => {
    repoMock.getUserById.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    repoMock.deleteUser.mockResolvedValue(makeUserDoc({ _id: "u1" }));

    const out = await service.deleteUser("u1");
    expect(repoMock.deleteUser).toHaveBeenCalledWith("u1");
    expect(out).toEqual({ message: "User deleted successfully" });
  });

  // ---------------- sendResetPasswordEmail ----------------

  test("sendResetPasswordEmail: throws HttpError 400 when email missing", async () => {
    await expect(
      service.sendResetPasswordEmail(undefined),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Email is required",
    });
  });

  test("sendResetPasswordEmail: throws HttpError 404 when user not found", async () => {
    repoMock.getUserByEmail.mockResolvedValue(null);

    await expect(
      service.sendResetPasswordEmail("x@x.com"),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "User not found",
    });
  });

  test("sendResetPasswordEmail: sends email with reset link", async () => {
    const user = makeUserDoc({ _id: "u1", email: "test@example.com" });
    repoMock.getUserByEmail.mockResolvedValue(user);
    jwtSignMock.mockReturnValue("reset_token");

    const result = await service.sendResetPasswordEmail("test@example.com");

    expect(jwtSignMock).toHaveBeenCalledWith({ id: "u1" }, "testsecret", {
      expiresIn: "1h",
    });

    expect(sendEmailMock).toHaveBeenCalledWith(
      "test@example.com",
      "Password Reset",
      expect.stringContaining("token=reset_token"),
    );

    expect(result).toBe(user);
  });

  // ---------------- resetPassword ----------------

  test("resetPassword: throws HttpError(400) when token or password missing", async () => {
    await expect(
      service.resetPassword(undefined, "newpw"),
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      service.resetPassword("token", undefined),
    ).rejects.toBeInstanceOf(HttpError);
  });

  test("resetPassword: throws HttpError(400) Invalid or expired token when jwt.verify fails", async () => {
    jwtVerifyMock.mockImplementation(() => {
      throw new Error("bad token");
    });

    await expect(service.resetPassword("bad", "newpw")).rejects.toMatchObject({
      statusCode: 400,
      message: "Invalid or expired token",
    });
  });

  test("resetPassword: updates password when token valid", async () => {
    jwtVerifyMock.mockReturnValue({ id: "u1" });
    repoMock.getUserById.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    hashMock.mockResolvedValue("hashed_new");
    repoMock.updateUser.mockResolvedValue(makeUserDoc({ _id: "u1" }));

    const out = await service.resetPassword("good", "newpw");
    expect(hashMock).toHaveBeenCalledWith("newpw", 10);
    expect(repoMock.updateUser).toHaveBeenCalledWith("u1", {
      password: "hashed_new",
    });
    expect(out).toBeTruthy();
  });
});
