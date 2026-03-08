import { z } from "zod";

export const TransactionTypeValues = ["credit", "debit"] as const;
export const OwnerTypeValues = ["User", "Business"] as const;

export const WalletSchema = z.object({
  _id: z.string().optional(),
  ownerId: z.string(),
  ownerType: z.enum(OwnerTypeValues),
  balance: z.number().min(0),
  currency: z.string().default("NPR"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const TransactionSchema = z.object({
  _id: z.string().optional(),
  wallet: z.string(),
  type: z.enum(TransactionTypeValues),
  amount: z.number().positive(),
  balance: z.number(),
  reference: z.string(),
  description: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date().optional(),
});

export type Wallet = z.infer<typeof WalletSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
