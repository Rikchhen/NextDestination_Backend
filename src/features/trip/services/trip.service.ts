import {
  TripRepository,
  TripRepositoryInterface,
} from "../repositories/trip.repository";
import { CreateTripDTO, EditTripDTO, SearchTripDTO } from "../dtos/trip.dto";
import { ITrip } from "../models/trip.model";
import { Business } from "../../business/models/business.model";

const tripRepository = new TripRepository();

export class TripService {
  // helper: sanitize (remove __v if you want)
  private sanitizeTrip(trip: ITrip) {
    const obj = trip.toObject();
    const { __v, ...safe } = obj;
    return safe;
  }

  async createTrip(businessId: string, data: CreateTripDTO) {
    const tripToCreate: Partial<ITrip> = {
      business: businessId as any,
      type: data.type,
      from: data.from.trim(),
      to: data.to.trim(),
      departureAt: data.departureAt,
      arrivalAt: data.arrivalAt,
      price: data.price,
      totalSeats: data.totalSeats,
      availableSeats: data.totalSeats, // key
      status: data.status ?? "active",
    };
    const business = await Business.findById(businessId).exec();
    if (!business) throw new Error("Business not found");

    if (
      business.businessStatus !== "Approved" ||
      business.businessVerified !== true
    ) {
      throw new Error("Business is not approved by admin yet");
    }
    const trip = await tripRepository.createTrip(tripToCreate);
    return this.sanitizeTrip(trip);
  }

  async getTripById(tripId: string) {
    const trip = await tripRepository.getTripById(tripId);
    if (!trip) throw new Error("Trip not found");
    return this.sanitizeTrip(trip);
  }

  async getTripsByBusiness(
    businessId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const trips = await tripRepository.getTripsByBusiness(
      businessId,
      skip,
      limit,
    );
    return trips.map((t) => this.sanitizeTrip(t));
  }

  async searchTrips(query: SearchTripDTO) {
    const filter: any = {};

    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;

    if (query.from)
      filter.from = new RegExp(`^${escapeRegExp(query.from.trim())}$`, "i");
    if (query.to)
      filter.to = new RegExp(`^${escapeRegExp(query.to.trim())}$`, "i");

    if (query.departureFrom || query.departureTo) {
      filter.departureAt = {};
      if (query.departureFrom) filter.departureAt.$gte = query.departureFrom;
      if (query.departureTo) filter.departureAt.$lte = query.departureTo;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      tripRepository.searchTrips(filter, skip, limit),
      tripRepository.countTrips(filter),
    ]);

    return {
      items: items.map((t) => this.sanitizeTrip(t)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async updateTrip(tripId: string, businessId: string, data: EditTripDTO) {
    const trip = await tripRepository.getTripById(tripId);
    if (!trip) throw new Error("Trip not found");

    if (trip.business.toString() !== businessId) {
      throw new Error("Not allowed to update this trip");
    }

    // handle totalSeats update safely
    if (data.totalSeats !== undefined) {
      const bookedSeats = trip.totalSeats - trip.availableSeats;
      if (data.totalSeats < bookedSeats) {
        throw new Error(
          `totalSeats cannot be less than already booked seats (${bookedSeats})`,
        );
      }
      const newAvailableSeats = data.totalSeats - bookedSeats;
      (data as any).availableSeats = newAvailableSeats;
    }

    const updated = await tripRepository.updateTrip(tripId, {
      ...data,
      from: data.from?.trim(),
      to: data.to?.trim(),
    });

    if (!updated) throw new Error("Failed to update trip");
    return this.sanitizeTrip(updated);
  }

  async deleteTrip(tripId: string, businessId: string) {
    const trip = await tripRepository.getTripById(tripId);
    if (!trip) throw new Error("Trip not found");

    if (trip.business.toString() !== businessId) {
      throw new Error("Not allowed to delete this trip");
    }

    await tripRepository.deleteTrip(tripId);
    return { message: "Trip deleted successfully" };
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
