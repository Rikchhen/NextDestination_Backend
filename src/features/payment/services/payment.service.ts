import {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
} from "../../../config/khalti";
import { HttpError } from "../../../errorrs/error";
import { BookingRepository } from "../../booking/repositories/booking.repository";
import { TripModel } from "../../trip/models/trip.model";
import {
  CreatePaymentDTO,
  UpdatePaymentDTO,
} from "../dtos/payment.dto";
import { WalletService } from "../wallet/services/wallet.service";
import {
  IPaymentRepository,
  PaymentRepository,
} from "../repositories/payment.repository";

export class PaymentService {
  private paymentRepository: IPaymentRepository;
  private bookingRepository: BookingRepository;
  private walletService: WalletService;

  constructor() {
    this.paymentRepository = new PaymentRepository();
    this.bookingRepository = new BookingRepository();
    this.walletService = new WalletService();
  }

  private sanitizePayment(payment: any) {
    const paymentObj = payment.toObject ? payment.toObject() : payment;
    const { __v, ...safePayment } = paymentObj;
    return safePayment;
  }

  private settleBusinessWallet = async (bookingId: string, payment: any) => {
    const booking = await this.bookingRepository.getBookingById(bookingId);
    if (!booking) {
      throw new HttpError(404, "Booking not found for wallet settlement");
    }

    const trip = await TripModel.findById(booking.trip).exec();
    if (!trip) {
      throw new HttpError(404, "Trip not found for wallet settlement");
    }

    const businessId = trip.business.toString();
    const alreadyCredited = await this.walletService.checkTransactionExists(
      businessId,
      bookingId,
    );

    if (alreadyCredited) {
      return;
    }

    await this.walletService.creditUser({
      ownerId: businessId,
      ownerType: "Business",
      amount: payment.amount,
      reference: bookingId,
      description: `Earnings from booking ${booking.bookingRef}`,
      metadata: {
        bookingId,
        paymentId: payment._id?.toString?.() ?? payment._id,
        tripId: booking.trip.toString(),
      },
    });
  };

  initiateKhaltiPayment = async (
    userId: string,
    bookingId: string,
    returnUrl: string,
  ) => {
    const booking = await this.bookingRepository.getBookingById(bookingId);
    if (!booking) {
      throw new HttpError(404, "Booking not found");
    }

    if (booking.bookedBy.toString() !== userId) {
      throw new HttpError(403, "Not allowed to pay for this booking");
    }

    if (booking.status === "cancelled") {
      throw new HttpError(400, "Cancelled booking cannot be paid");
    }

    const existingPayment =
      await this.paymentRepository.getPaymentByBookingId(bookingId);

    if (existingPayment) {
      if (existingPayment.status === "completed") {
        throw new HttpError(400, "Booking has already been paid");
      }
      return {
        payment: this.sanitizePayment(existingPayment),
        paymentUrl: existingPayment.paymentUrl,
        pidx: existingPayment.pidx,
      };
    }

    const amountInPaisa = Math.round(booking.totalAmount * 100);
    if (amountInPaisa <= 0) {
      throw new HttpError(400, "Invalid booking amount");
    }

    const paymentData = await initiateKhaltiPayment({
      return_url: returnUrl,
      website_url: process.env.CLIENT_URL || "http://localhost:3000",
      amount: amountInPaisa,
      purchase_order_id: booking._id.toString(),
      purchase_order_name: `Booking ${booking.bookingRef}`,
      customer_info: {
        name: "NextDestination User",
        email: booking.contactEmail,
        phone: booking.contactPhone,
      },
    });

    const createPaymentData: CreatePaymentDTO = {
      userId,
      bookingId,
      amount: booking.totalAmount,
      status: "pending",
      paymentMethod: "khalti",
      pidx: paymentData.pidx,
      paymentUrl: paymentData.payment_url,
      metadata: paymentData,
    };

    const payment =
      await this.paymentRepository.createPayment(createPaymentData as any);

    return {
      payment: this.sanitizePayment(payment),
      paymentUrl: paymentData.payment_url,
      pidx: paymentData.pidx,
    };
  };

  verifyKhaltiPayment = async (pidx: string, bookingId: string) => {
    const payment = await this.paymentRepository.getPaymentByPidx(pidx);
    if (!payment) {
      throw new HttpError(404, "Payment record not found");
    }

    if (payment.bookingId.toString() !== bookingId) {
      throw new HttpError(400, "Booking ID mismatch");
    }

    if (payment.status === "completed") {
      await this.settleBusinessWallet(bookingId, payment);
      return {
        success: true,
        message: "Payment already verified",
        payment: this.sanitizePayment(payment),
      };
    }

    const verificationData = await verifyKhaltiPayment(pidx);

    if (verificationData.status === "Completed") {
      const updateData: UpdatePaymentDTO = {
        status: "completed",
        transactionId: verificationData.transaction_id,
        metadata: verificationData,
      };

      const updatedPayment = await this.paymentRepository.updatePayment(
        payment._id.toString(),
        updateData as any,
      );

      await this.bookingRepository.updateBooking(bookingId, {
        status: "confirmed",
      } as any);

      await this.settleBusinessWallet(bookingId, updatedPayment || payment);

      return {
        success: true,
        message: "Payment verified successfully",
        payment: this.sanitizePayment(updatedPayment),
      };
    }

    const failedData: UpdatePaymentDTO = {
      status: "failed",
      metadata: verificationData,
    };

    await this.paymentRepository.updatePayment(
      payment._id.toString(),
      failedData as any,
    );

    throw new HttpError(400, `Payment status: ${verificationData.status}`);
  };

  getPaymentByBookingId = async (
    bookingId: string,
    requesterId: string,
    requesterRole?: string,
  ) => {
    const payment = await this.paymentRepository.getPaymentByBookingId(bookingId);
    if (!payment) {
      throw new HttpError(404, "Payment not found");
    }

    const isOwner = payment.userId.toString() === requesterId;
    const isAdmin = requesterRole === "admin";

    if (!isOwner && !isAdmin) {
      throw new HttpError(403, "Not allowed to view this payment");
    }

    return this.sanitizePayment(payment);
  };

  getUserPayments = async (
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) => {
    const skip = (page - 1) * limit;
    const payments = await this.paymentRepository.getPaymentsByUser(
      userId,
      skip,
      limit,
      status,
    );
    return payments.map((p) => this.sanitizePayment(p));
  };

  getAllPayments = async (
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) => {
    const skip = (page - 1) * limit;
    const payments = await this.paymentRepository.getAllPayments(
      skip,
      limit,
      status,
    );
    return payments.map((p) => this.sanitizePayment(p));
  };
}
