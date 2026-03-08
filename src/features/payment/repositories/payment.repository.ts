import {
  BookingPaymentModel,
  IBookingPayment,
} from "../models/payment.model";

export interface IPaymentRepository {
  createPayment(payment: Partial<IBookingPayment>): Promise<IBookingPayment>;
  getPaymentById(paymentId: string): Promise<IBookingPayment | null>;
  getPaymentByPidx(pidx: string): Promise<IBookingPayment | null>;
  getPaymentByBookingId(bookingId: string): Promise<IBookingPayment | null>;
  getPaymentsByUser(
    userId: string,
    skip?: number,
    limit?: number,
    status?: string,
  ): Promise<IBookingPayment[]>;
  getAllPayments(
    skip?: number,
    limit?: number,
    status?: string,
  ): Promise<IBookingPayment[]>;
  updatePayment(
    paymentId: string,
    data: Partial<IBookingPayment>,
  ): Promise<IBookingPayment | null>;
}

export class PaymentRepository implements IPaymentRepository {
  async createPayment(payment: Partial<IBookingPayment>): Promise<IBookingPayment> {
    const newPayment = new BookingPaymentModel(payment);
    return await newPayment.save();
  }

  async getPaymentById(paymentId: string): Promise<IBookingPayment | null> {
    return await BookingPaymentModel.findById(paymentId).exec();
  }

  async getPaymentByPidx(pidx: string): Promise<IBookingPayment | null> {
    return await BookingPaymentModel.findOne({ pidx }).exec();
  }

  async getPaymentByBookingId(bookingId: string): Promise<IBookingPayment | null> {
    return await BookingPaymentModel.findOne({ bookingId }).exec();
  }

  async getPaymentsByUser(
    userId: string,
    skip: number = 0,
    limit: number = 10,
    status?: string,
  ): Promise<IBookingPayment[]> {
    const query: any = { userId };

    if (status) {
      query.status = status;
    }

    return await BookingPaymentModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async getAllPayments(
    skip: number = 0,
    limit: number = 10,
    status?: string,
  ): Promise<IBookingPayment[]> {
    const query: any = {};

    if (status) {
      query.status = status;
    }

    return await BookingPaymentModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async updatePayment(
    paymentId: string,
    data: Partial<IBookingPayment>,
  ): Promise<IBookingPayment | null> {
    return await BookingPaymentModel.findByIdAndUpdate(
      paymentId,
      { $set: data },
      { new: true },
    ).exec();
  }
}
