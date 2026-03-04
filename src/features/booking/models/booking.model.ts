import mongoose, { Schema, Document } from "mongoose";

export interface IPassenger {
  fullName: string;
  age: number;
  gender: "male" | "female";
  seatNumber: string;
}

export interface IBooking extends Document {
  bookedBy: mongoose.Types.ObjectId;
  trip: mongoose.Types.ObjectId;

  bookingRef: string;
  status: "pending" | "confirmed" | "cancelled";

  passengers: IPassenger[];

  contactEmail: string;
  contactPhone: string;

  totalAmount: number;
  cancelReason?: string;
}

const PassengerSchema = new Schema<IPassenger>(
  {
    fullName: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0 },
    gender: { type: String, enum: ["male", "female"], required: true },
    seatNumber: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const BookingSchema: Schema<IBooking> = new mongoose.Schema(
  {
    bookedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trip: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },

    bookingRef: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },

    passengers: { type: [PassengerSchema], required: true },

    contactEmail: { type: String, required: true, lowercase: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },

    totalAmount: { type: Number, required: true, min: 0 },

    cancelReason: { type: String },
  },
  { timestamps: true },
);

BookingSchema.index({ bookedBy: 1, createdAt: -1 });

export const BookingModel = mongoose.model<IBooking>("Booking", BookingSchema);
