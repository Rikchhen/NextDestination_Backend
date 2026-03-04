import { TripModel, ITrip } from "../models/trip.model";

export interface TripRepositoryInterface {
  createTrip(trip: Partial<ITrip>): Promise<ITrip>;
  getTripById(tripId: string): Promise<ITrip | null>;
  getTripsByBusiness(
    businessId: string,
    skip?: number,
    limit?: number,
  ): Promise<ITrip[]>;
  searchTrips(filter: any, skip?: number, limit?: number): Promise<ITrip[]>;
  countTrips(filter: any): Promise<number>;
  updateTrip(
    tripId: string,
    updatedData: Partial<ITrip>,
  ): Promise<ITrip | null>;
  deleteTrip(tripId: string): Promise<ITrip | null>;
}

export class TripRepository implements TripRepositoryInterface {
  async createTrip(trip: Partial<ITrip>) {
    const newTrip = new TripModel(trip);
    return newTrip.save();
  }

  async getTripById(tripId: string) {
    return TripModel.findById(tripId).exec();
  }

  async getTripsByBusiness(
    businessId: string,
    skip: number = 0,
    limit: number = 10,
  ) {
    return TripModel.find({ business: businessId })
      .sort({ departureAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async searchTrips(filter: any, skip: number = 0, limit: number = 10) {
    return TripModel.find(filter)
      .sort({ departureAt: 1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countTrips(filter: any) {
    return TripModel.countDocuments(filter).exec();
  }

  async updateTrip(tripId: string, updatedData: Partial<ITrip>) {
    return TripModel.findByIdAndUpdate(tripId, updatedData, {
      new: true,
    }).exec();
  }

  async deleteTrip(tripId: string) {
    return TripModel.findByIdAndDelete(tripId).exec();
  }
}
