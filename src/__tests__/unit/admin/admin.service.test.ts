// src/__tests__/unit/admin/admin.service.test.ts

const repoMock = {
  getAllUsers: jest.fn(),
  getUserById: jest.fn(),
  getUserByPhoneNumber: jest.fn(),
  getUserByEmail: jest.fn(),
  deleteUser: jest.fn(),
  deleteAllUsers: jest.fn(),
};

jest.mock("../../../features/admin/repository/admin.repository", () => ({
  AdminRepository: jest.fn().mockImplementation(() => repoMock),
}));

import { AdminService } from "../../../features/admin/service/admin.service";

describe("AdminService unit tests", () => {
  let service: AdminService;

  const makeUserDoc = (overrides: any = {}) => {
    const base = {
      _id: overrides._id ?? "u1",
      role: overrides.role ?? "user",
      email: overrides.email ?? "test@example.com",
      phoneNumber: overrides.phoneNumber ?? "9800000000",
      password: overrides.password ?? "hashed",
      __v: 0,
      fullName: overrides.fullName ?? "Test User",
    };

    return {
      ...base,
      toObject: () => ({ ...base, ...overrides }),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService();
  });

  test("getAllUsers: uses skip/limit and sanitizes users", async () => {
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

  test("getUserById: throws if not found", async () => {
    repoMock.getUserById.mockResolvedValue(null);

    await expect(service.getUserById("nope")).rejects.toThrow("User not found");
  });

  test("getUserById: returns sanitized user", async () => {
    repoMock.getUserById.mockResolvedValue(makeUserDoc({ _id: "u1" }));

    const out = await service.getUserById("u1");
    expect((out as any).password).toBeUndefined();
    expect((out as any).__v).toBeUndefined();
  });

  test("getUserByPhoneNumber: throws if not found", async () => {
    repoMock.getUserByPhoneNumber.mockResolvedValue(null);

    await expect(service.getUserByPhoneNumber("999")).rejects.toThrow(
      "User Not Found",
    );
  });

  test("getUserByEmail: throws if not found", async () => {
    repoMock.getUserByEmail.mockResolvedValue(null);

    await expect(service.getUserByEmail("x@x.com")).rejects.toThrow(
      "User not found",
    );
  });

  test("deleteUser: throws if user missing", async () => {
    repoMock.getUserById.mockResolvedValue(null);

    await expect(service.deleteUser("u1")).rejects.toThrow("User not found");
  });

  test("deleteUser: deletes and returns message", async () => {
    repoMock.getUserById.mockResolvedValue(makeUserDoc({ _id: "u1" }));
    repoMock.deleteUser.mockResolvedValue(makeUserDoc({ _id: "u1" }));

    const out = await service.deleteUser("u1");
    expect(repoMock.deleteUser).toHaveBeenCalledWith("u1");
    expect(out).toEqual({ message: "User deleted successfully" });
  });

  test("deleteAllUsers: calls repo and returns message", async () => {
    repoMock.deleteAllUsers.mockResolvedValue({ deletedCount: 3 });

    const out = await service.deleteAllUsers();
    expect(repoMock.deleteAllUsers).toHaveBeenCalled();
    expect(out).toEqual({ mesage: "All Users Deleted" });
  });
});
