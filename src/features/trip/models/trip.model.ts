import mongoose, { Schema, Document } from "mongoose";

export interface ITrip extends Document {
  business: mongoose.Types.ObjectId;
  type: "bus" | "plane";
  from: string;
  to: string;
  departureAt: Date;
  arrivalAt?: Date;
  price: number;
  totalSeats: number;
  availableSeats: number;
  status: "active" | "cancelled" | "delayed";
}

const TripSchema: Schema<ITrip> = new mongoose.Schema(
  {
    business: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    type: { type: String, enum: ["bus", "plane"], required: true },

    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },

    departureAt: { type: Date, required: true, index: true },
    arrivalAt: { type: Date },

    price: { type: Number, required: true, min: 0 },

    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["active", "cancelled", "delayed"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

TripSchema.index({ type: 1, from: 1, to: 1, departureAt: 1 });

export const TripModel = mongoose.model<ITrip>("Trip", TripSchema);
