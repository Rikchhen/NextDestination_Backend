import { BookingModel, IBooking } from "../models/booking.model";

export interface BookingRepositoryInterface {
  createBooking(data: Partial<IBooking>): Promise<IBooking>;
  getBookingById(id: string): Promise<IBooking | null>;
  getBookingByRef(ref: string): Promise<IBooking | null>;
  getMyBookings(
    userId: string,
    skip?: number,
    limit?: number,
  ): Promise<IBooking[]>;
  updateBooking(
    id: string,
    updatedData: Partial<IBooking>,
  ): Promise<IBooking | null>;
}

export class BookingRepository implements BookingRepositoryInterface {
  async createBooking(data: Partial<IBooking>) {
    const booking = new BookingModel(data);
    return booking.save();
  }

  async getBookingById(id: string) {
    return BookingModel.findById(id).exec();
  }

  async getBookingByRef(ref: string) {
    return BookingModel.findOne({ bookingRef: ref }).exec();
  }

  async getMyBookings(userId: string, skip: number = 0, limit: number = 10) {
    return BookingModel.find({ bookedBy: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async updateBooking(id: string, updatedData: Partial<IBooking>) {
    return BookingModel.findByIdAndUpdate(id, updatedData, {
      new: true,
    }).exec();
  }
}
