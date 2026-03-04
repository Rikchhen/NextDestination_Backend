import mongoose, { Document, Schema, Model } from "mongoose";

export interface BusinessDocument extends Document {
  businessName: string;
  email: string;
  phoneNumber: string;
  password: string;
  address?: string;
  role: string;
  profilePicture?: string;
  businessDocument?: string;
  businessVerified: boolean;
  businessStatus: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string;
}

const businessSchema: Schema<BusinessDocument> = new Schema(
  {
    businessName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    password: { type: String, required: true },
    address: { type: String },
    role: { type: String, default: "Business" },
    profilePicture: { type: String },
    businessDocument: { type: String },
    businessVerified: { type: Boolean, default: false },
    businessStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

export const Business: Model<BusinessDocument> =
  mongoose.model<BusinessDocument>("Business", businessSchema);
