// ---- Mock repository ----
const repoMock = {
  getTicketById: jest.fn(),
  getTicketByQrToken: jest.fn(),
  getTicketsByBooking: jest.fn(),
  updateTicket: jest.fn(),
};

jest.mock("../../../features/ticket/repositories/ticket.repository", () => ({
  TicketRepository: jest.fn().mockImplementation(() => repoMock),
}));

import { TicketService } from "../../../features/ticket/services/ticket.service";

describe("TicketService Unit Tests", () => {
  let service: TicketService;

  const makeTicketDoc = (overrides: any = {}) => {
    const base = {
      _id: overrides._id ?? "ticketId123",
      booking: overrides.booking ?? "bookingId123",
      trip: overrides.trip ?? "tripId123",
      bookedBy: overrides.bookedBy ?? "ownerId123",
      passengerName: overrides.passengerName ?? "P",
      seatNumber: overrides.seatNumber ?? "A1",
      qrToken: overrides.qrToken ?? "QR-12345",
      status: overrides.status ?? "issued",
      issuedAt: overrides.issuedAt ?? new Date(),
      expiresAt: overrides.expiresAt,
      usedAt: overrides.usedAt,
      voidReason: overrides.voidReason,
      __v: 0,
    };

    return {
      ...base,
      toObject: () => ({ ...base }),
      ...overrides,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TicketService();
  });

  // ===== getTicketById =====
  test("getTicketById: throws if ticket not found", async () => {
    repoMock.getTicketById.mockResolvedValue(null);

    await expect(service.getTicketById("x", "u", "user")).rejects.toThrow(
      "Ticket not found",
    );
  });

  test("getTicketById: throws if not owner and not privileged", async () => {
    repoMock.getTicketById.mockResolvedValue(
      makeTicketDoc({ bookedBy: "ownerId" }),
    );

    await expect(
      service.getTicketById("t1", "otherId", "user"),
    ).rejects.toThrow("Not allowed to view this ticket");
  });

  test("getTicketById: returns sanitized ticket for owner", async () => {
    repoMock.getTicketById.mockResolvedValue(
      makeTicketDoc({ bookedBy: "ownerId" }),
    );

    const out = await service.getTicketById("t1", "ownerId", "user");
    expect((out as any).__v).toBeUndefined();
  });

  test("getTicketById: admin can view", async () => {
    repoMock.getTicketById.mockResolvedValue(
      makeTicketDoc({ bookedBy: "ownerId" }),
    );

    const out = await service.getTicketById("t1", "adminId", "admin");
    expect(out).toBeTruthy();
  });

  // ===== getTicketsByBooking =====
  test("getTicketsByBooking: returns [] if none", async () => {
    repoMock.getTicketsByBooking.mockResolvedValue([]);

    const out = await service.getTicketsByBooking("b1", "u1", "user");
    expect(out).toEqual([]);
  });

  test("getTicketsByBooking: throws if not allowed", async () => {
    repoMock.getTicketsByBooking.mockResolvedValue([
      makeTicketDoc({ bookedBy: "ownerId" }),
    ]);

    await expect(
      service.getTicketsByBooking("b1", "otherId", "user"),
    ).rejects.toThrow("Not allowed to view these tickets");
  });

  test("getTicketsByBooking: returns sanitized for owner", async () => {
    repoMock.getTicketsByBooking.mockResolvedValue([
      makeTicketDoc({ bookedBy: "ownerId" }),
      makeTicketDoc({ _id: "t2", bookedBy: "ownerId" }),
    ]);

    const out = await service.getTicketsByBooking("b1", "ownerId", "user");
    expect(out).toHaveLength(2);
    expect((out[0] as any).__v).toBeUndefined();
  });

  // ===== scanTicket =====
  test("scanTicket: throws if qr not found", async () => {
    repoMock.getTicketByQrToken.mockResolvedValue(null);

    await expect(service.scanTicket("QR")).rejects.toThrow(
      "Invalid ticket (QR not found)",
    );
  });

  test("scanTicket: throws if already used", async () => {
    repoMock.getTicketByQrToken.mockResolvedValue(
      makeTicketDoc({ status: "used" }),
    );

    await expect(service.scanTicket("QR")).rejects.toThrow(
      "Ticket already used",
    );
  });

  test("scanTicket: expires if expiresAt passed (updates status expired)", async () => {
    const t = makeTicketDoc({
      _id: "t1",
      status: "issued",
      expiresAt: new Date(Date.now() - 1000),
    });
    repoMock.getTicketByQrToken.mockResolvedValue(t);
    repoMock.updateTicket.mockResolvedValue(
      makeTicketDoc({ status: "expired" }),
    );

    await expect(service.scanTicket("QR")).rejects.toThrow("Ticket expired");
    expect(repoMock.updateTicket).toHaveBeenCalledWith("t1", {
      status: "expired",
    });
  });

  test("scanTicket: marks ticket used", async () => {
    const t = makeTicketDoc({ _id: "t1", status: "issued" });
    repoMock.getTicketByQrToken.mockResolvedValue(t);
    repoMock.updateTicket.mockResolvedValue(
      makeTicketDoc({ _id: "t1", status: "used", usedAt: new Date() }),
    );

    const out = await service.scanTicket("QR");
    expect((out as any).status).toBe("used");
    expect(repoMock.updateTicket).toHaveBeenCalled();
  });

  // ===== voidTicket =====
  test("voidTicket: throws if not found", async () => {
    repoMock.getTicketById.mockResolvedValue(null);

    await expect(service.voidTicket("t1", "u1", "user")).rejects.toThrow(
      "Ticket not found",
    );
  });

  test("voidTicket: throws if not allowed", async () => {
    repoMock.getTicketById.mockResolvedValue(
      makeTicketDoc({ bookedBy: "ownerId", status: "issued" }),
    );

    await expect(service.voidTicket("t1", "otherId", "user")).rejects.toThrow(
      "Not allowed to void this ticket",
    );
  });

  test("voidTicket: cannot void used", async () => {
    repoMock.getTicketById.mockResolvedValue(
      makeTicketDoc({ bookedBy: "ownerId", status: "used" }),
    );

    await expect(service.voidTicket("t1", "ownerId", "user")).rejects.toThrow(
      "Used ticket cannot be voided",
    );
  });

  test("voidTicket: owner voids issued", async () => {
    repoMock.getTicketById.mockResolvedValue(
      makeTicketDoc({ _id: "t1", bookedBy: "ownerId", status: "issued" }),
    );

    repoMock.updateTicket.mockResolvedValue(
      makeTicketDoc({ _id: "t1", status: "void", voidReason: "x" }),
    );

    const out = await service.voidTicket("t1", "ownerId", "user", "x");
    expect((out as any).status).toBe("void");
    expect(repoMock.updateTicket).toHaveBeenCalledWith("t1", {
      status: "void",
      voidReason: "x",
    });
  });
});
