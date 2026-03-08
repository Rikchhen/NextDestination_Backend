import mongoose, { Document, Schema } from "mongoose";

export interface IBookingPayment extends Document {
  userId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod: "khalti";
  transactionId?: string;
  pidx?: string;
  paymentUrl?: string;
  metadata?: Record<string, any>;
}

const BookingPaymentSchema: Schema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Booking",
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
      required: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["khalti"],
      default: "khalti",
      required: true,
    },
    transactionId: {
      type: String,
    },
    pidx: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    paymentUrl: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

BookingPaymentSchema.index({ userId: 1, createdAt: -1 });

export const BookingPaymentModel = mongoose.model<IBookingPayment>(
  "BookingPayment",
  BookingPaymentSchema,
);
