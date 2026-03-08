import mongoose, { Document, Schema } from "mongoose";

export interface IWallet extends Document {
  ownerId: mongoose.Types.ObjectId;
  ownerType: "User" | "Business";
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransaction extends Document {
  wallet: mongoose.Types.ObjectId;
  type: "credit" | "debit";
  amount: number;
  balance: number;
  reference: string;
  description: string;
  metadata?: Record<string, any>;
  ownerId: string;
  ownerType: "User" | "Business";
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "ownerType",
    },
    ownerType: {
      type: String,
      required: true,
      enum: ["User", "Business"],
    },
    balance: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "NPR" },
  },
  { timestamps: true },
);

WalletSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });

const TransactionSchema = new Schema(
  {
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    balance: { type: Number, required: true },
    reference: { type: String, required: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    ownerId: { type: String, required: true },
    ownerType: { type: String, enum: ["User", "Business"], required: true },
  },
  { timestamps: true },
);

TransactionSchema.index({ ownerId: 1, ownerType: 1, createdAt: -1 });
TransactionSchema.index({ ownerId: 1, reference: 1 });

export const WalletModel = mongoose.model<IWallet>("Wallet", WalletSchema);
export const TransactionModel = mongoose.model<ITransaction>(
  "Transaction",
  TransactionSchema,
);
