/* eslint-disable @typescript-eslint/no-explicit-any */

type RepoMock = {
  createTrip: jest.Mock;
  getTripById: jest.Mock;
  getTripsByBusiness: jest.Mock;
  searchTrips: jest.Mock;
  countTrips: jest.Mock;
  updateTrip: jest.Mock;
  deleteTrip: jest.Mock;
};

const makeRepoMock = (): RepoMock => ({
  createTrip: jest.fn(),
  getTripById: jest.fn(),
  getTripsByBusiness: jest.fn(),
  searchTrips: jest.fn(),
  countTrips: jest.fn(),
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
});

const makeDoc = (data: any) => ({
  ...data,
  toObject: () => ({ ...data }), // IMPORTANT: TripService.sanitizeTrip calls toObject()
});

describe("TripService Unit Tests", () => {
  let repoMock: RepoMock;
  let TripServiceClass: any;
  let BusinessMock: any;
  let service: any;

  beforeEach(async () => {
    jest.resetModules(); // IMPORTANT: because tripRepository is created at module import time
    repoMock = makeRepoMock();

    // Mock Business model (used inside TripService.createTrip)
    jest.doMock("../../../features/business/models/business.model", () => ({
      Business: {
        findById: jest.fn(),
      },
    }));

    // Mock TripRepository (used at import time inside TripService module)
    jest.doMock("../../../features/trip/repositories/trip.repository", () => ({
      TripRepository: jest.fn().mockImplementation(() => repoMock),
    }));

    // Re-import AFTER mocks are registered
    const serviceMod =
      await import("../../../features/trip/services/trip.service");
    TripServiceClass = serviceMod.TripService;

    const bizMod =
      await import("../../../features/business/models/business.model");
    BusinessMock = bizMod.Business;

    service = new TripServiceClass();
  });

  // ===================== createTrip =====================
  test("1) createTrip -> throws if business not found", async () => {
    BusinessMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.createTrip("biz1", {
        type: "bus",
        from: "A",
        to: "B",
        departureAt: new Date("2030-01-01"),
        arrivalAt: undefined,
        price: 100,
        totalSeats: 10,
        status: "active",
      }),
    ).rejects.toThrow("Business not found");
  });

  test("2) createTrip -> throws if business not approved/verified", async () => {
    BusinessMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: "biz1",
        businessStatus: "Pending",
        businessVerified: false,
      }),
    });

    await expect(
      service.createTrip("biz1", {
        type: "bus",
        from: "A",
        to: "B",
        departureAt: new Date("2030-01-01"),
        arrivalAt: undefined,
        price: 100,
        totalSeats: 10,
        status: "active",
      }),
    ).rejects.toThrow("Business is not approved by admin yet");
  });

  test("3) createTrip -> success sets availableSeats = totalSeats and trims from/to", async () => {
    BusinessMock.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: "biz1",
        businessStatus: "Approved",
        businessVerified: true,
      }),
    });

    repoMock.createTrip.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: "biz1",
        type: "bus",
        from: "Kathmandu",
        to: "Pokhara",
        departureAt: new Date("2030-01-01"),
        arrivalAt: undefined,
        price: 1000,
        totalSeats: 20,
        availableSeats: 20,
        status: "active",
        __v: 0,
      }),
    );

    const result = await service.createTrip("biz1", {
      type: "bus",
      from: "  Kathmandu ",
      to: " Pokhara  ",
      departureAt: new Date("2030-01-01"),
      arrivalAt: undefined,
      price: 1000,
      totalSeats: 20,
      status: "active",
    });

    expect(repoMock.createTrip).toHaveBeenCalledWith(
      expect.objectContaining({
        business: "biz1",
        from: "Kathmandu",
        to: "Pokhara",
        totalSeats: 20,
        availableSeats: 20,
      }),
    );

    expect(result).toHaveProperty("availableSeats", 20);
    expect(result).not.toHaveProperty("__v");
  });

  // ===================== getTripById =====================
  test("4) getTripById -> throws if not found", async () => {
    repoMock.getTripById.mockResolvedValue(null);
    await expect(service.getTripById("trip404")).rejects.toThrow(
      "Trip not found",
    );
  });

  test("5) getTripById -> returns sanitized trip", async () => {
    repoMock.getTripById.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: "biz1",
        type: "bus",
        from: "A",
        to: "B",
        departureAt: new Date("2030-01-01"),
        price: 100,
        totalSeats: 10,
        availableSeats: 10,
        status: "active",
        __v: 0,
      }),
    );

    const trip = await service.getTripById("trip1");
    expect(trip).toHaveProperty("_id", "trip1");
    expect(trip).not.toHaveProperty("__v");
  });

  // ===================== getTripsByBusiness =====================
  test("6) getTripsByBusiness -> calls repo with correct skip/limit and returns sanitized array", async () => {
    repoMock.getTripsByBusiness.mockResolvedValue([
      makeDoc({ _id: "t1", __v: 0 }),
      makeDoc({ _id: "t2", __v: 0 }),
    ]);

    const trips = await service.getTripsByBusiness("biz1", 2, 10);
    expect(repoMock.getTripsByBusiness).toHaveBeenCalledWith("biz1", 10, 10); // page2 => skip10

    expect(trips).toHaveLength(2);
    expect(trips[0]).not.toHaveProperty("__v");
  });

  // ===================== searchTrips =====================
  test("7) searchTrips -> builds filter and returns pagination fields", async () => {
    repoMock.searchTrips.mockResolvedValue([
      makeDoc({ _id: "t1", __v: 0, from: "Kathmandu", to: "Pokhara" }),
    ]);
    repoMock.countTrips.mockResolvedValue(1);

    const res = await service.searchTrips({
      type: "bus",
      from: "Kathmandu",
      to: "Pokhara",
      status: "active",
      page: 1,
      limit: 10,
    });

    expect(repoMock.searchTrips).toHaveBeenCalled();
    const [filter, skip, limit] = repoMock.searchTrips.mock.calls[0];

    expect(filter).toHaveProperty("type", "bus");
    expect(filter).toHaveProperty("status", "active");
    expect(skip).toBe(0);
    expect(limit).toBe(10);

    expect(res).toHaveProperty("items");
    expect(res).toHaveProperty("total", 1);
    expect(res).toHaveProperty("pages", 1);
    expect(res.items[0]).not.toHaveProperty("__v");
  });

  // ===================== updateTrip =====================
  test("8) updateTrip -> throws if trip not found", async () => {
    repoMock.getTripById.mockResolvedValue(null);

    await expect(
      service.updateTrip("trip1", "biz1", { price: 999 }),
    ).rejects.toThrow("Trip not found");
  });

  test("9) updateTrip -> throws if business is not owner", async () => {
    repoMock.getTripById.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: { toString: () => "otherBiz" },
        totalSeats: 10,
        availableSeats: 10,
        __v: 0,
      }),
    );

    await expect(
      service.updateTrip("trip1", "biz1", { price: 999 }),
    ).rejects.toThrow("Not allowed to update this trip");
  });

  test("10) updateTrip -> recalculates availableSeats if totalSeats changes", async () => {
    // totalSeats=10, availableSeats=6 => bookedSeats=4
    repoMock.getTripById.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: { toString: () => "biz1" },
        totalSeats: 10,
        availableSeats: 6,
        __v: 0,
      }),
    );

    repoMock.updateTrip.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: "biz1",
        totalSeats: 12,
        availableSeats: 8, // 12 - booked(4)
        __v: 0,
      }),
    );

    const updated = await service.updateTrip("trip1", "biz1", {
      totalSeats: 12,
    });

    expect(repoMock.updateTrip).toHaveBeenCalledWith(
      "trip1",
      expect.objectContaining({
        totalSeats: 12,
        availableSeats: 8,
      }),
    );
    expect(updated).toHaveProperty("availableSeats", 8);
  });

  test("11) updateTrip -> throws if totalSeats < bookedSeats", async () => {
    // bookedSeats = 10 - 6 = 4
    repoMock.getTripById.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: { toString: () => "biz1" },
        totalSeats: 10,
        availableSeats: 6,
        __v: 0,
      }),
    );

    await expect(
      service.updateTrip("trip1", "biz1", { totalSeats: 3 }),
    ).rejects.toThrow(
      "totalSeats cannot be less than already booked seats (4)",
    );
  });

  test("12) updateTrip -> throws if update failed (repo returns null)", async () => {
    repoMock.getTripById.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: { toString: () => "biz1" },
        totalSeats: 10,
        availableSeats: 10,
        __v: 0,
      }),
    );

    repoMock.updateTrip.mockResolvedValue(null);

    await expect(
      service.updateTrip("trip1", "biz1", { price: 777 }),
    ).rejects.toThrow("Failed to update trip");
  });

  // ===================== deleteTrip =====================
  test("13) deleteTrip -> throws if trip not found", async () => {
    repoMock.getTripById.mockResolvedValue(null);
    await expect(service.deleteTrip("trip1", "biz1")).rejects.toThrow(
      "Trip not found",
    );
  });

  test("14) deleteTrip -> throws if not owner", async () => {
    repoMock.getTripById.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: { toString: () => "otherBiz" },
        __v: 0,
      }),
    );

    await expect(service.deleteTrip("trip1", "biz1")).rejects.toThrow(
      "Not allowed to delete this trip",
    );
  });

  test("15) deleteTrip -> success deletes and returns message", async () => {
    repoMock.getTripById.mockResolvedValue(
      makeDoc({
        _id: "trip1",
        business: { toString: () => "biz1" },
        __v: 0,
      }),
    );

    repoMock.deleteTrip.mockResolvedValue(makeDoc({ _id: "trip1" }));

    const res = await service.deleteTrip("trip1", "biz1");
    expect(repoMock.deleteTrip).toHaveBeenCalledWith("trip1");
    expect(res).toEqual({ message: "Trip deleted successfully" });
  });
});
