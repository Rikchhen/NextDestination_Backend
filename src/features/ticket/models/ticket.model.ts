import mongoose, { Schema, Document } from "mongoose";

export interface ITicket extends Document {
  booking: mongoose.Types.ObjectId;
  trip: mongoose.Types.ObjectId;
  bookedBy: mongoose.Types.ObjectId;

  passengerName: string;
  seatNumber: string;

  qrToken: string;
  status: "issued" | "used" | "void" | "expired";

  issuedAt: Date;
  usedAt?: Date;
  expiresAt?: Date;

  voidReason?: string;
}

const TicketSchema: Schema<ITicket> = new mongoose.Schema(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },
    trip: {
      type: Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    bookedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    passengerName: { type: String, required: true, trim: true },
    seatNumber: { type: String, required: true, trim: true },

    qrToken: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: ["issued", "used", "void", "expired"],
      default: "issued",
      index: true,
    },

    issuedAt: { type: Date, required: true, default: () => new Date() },
    usedAt: { type: Date },
    expiresAt: { type: Date },

    voidReason: { type: String },
  },
  { timestamps: true },
);

TicketSchema.index({ bookedBy: 1, createdAt: -1 });

export const TicketModel = mongoose.model<ITicket>("Ticket", TicketSchema);
