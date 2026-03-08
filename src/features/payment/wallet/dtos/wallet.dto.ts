import { z } from "zod";
import { TransactionTypeValues, OwnerTypeValues } from "../types/wallet.type";

export const CreateWalletDTO = z.object({
  ownerId: z.string().min(1, "Owner ID is required"),
  ownerType: z.enum(OwnerTypeValues),
  currency: z.string().default("NPR"),
});

export type CreateWalletDTO = z.infer<typeof CreateWalletDTO>;

export const CreditWalletDTO = z.object({
  ownerId: z.string().min(1, "Owner ID is required"),
  ownerType: z.enum(OwnerTypeValues).default("Business"),
  amount: z.number().positive("Amount must be positive"),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().min(1, "Description is required"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreditWalletDTO = z.infer<typeof CreditWalletDTO>;

export const DebitWalletDTO = z.object({
  ownerId: z.string().min(1, "Owner ID is required"),
  ownerType: z.enum(OwnerTypeValues),
  amount: z.number().positive("Amount must be positive"),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().min(1, "Description is required"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type DebitWalletDTO = z.infer<typeof DebitWalletDTO>;

export const CreateTransactionDTO = z.object({
  wallet: z.string().min(1, "Wallet ID is required"),
  type: z.enum(TransactionTypeValues),
  amount: z.number().positive(),
  balance: z.number(),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().min(1, "Description is required"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateTransactionDTO = z.infer<typeof CreateTransactionDTO>;

export const WalletFilterDTO = z.object({
  page: z.preprocess((val) => Number(val) || 1, z.number().min(1)),
  limit: z.preprocess((val) => Number(val) || 10, z.number().min(1).max(100)),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type WalletFilterDTO = z.infer<typeof WalletFilterDTO>;

export const TransactionResponseDTO = z.object({
  success: z.boolean(),
  message: z.string(),
  transaction: z.any().optional(),
  transactions: z.array(z.any()).optional(),
  balance: z.number().optional(),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
    })
    .optional(),
});

export type TransactionResponseDTO = z.infer<typeof TransactionResponseDTO>;

export const WalletBalanceDTO = z.object({
  balance: z.number(),
  currency: z.string(),
  ownerId: z.string(),
  ownerType: z.enum(OwnerTypeValues),
});

export type WalletBalanceDTO = z.infer<typeof WalletBalanceDTO>;

export const LegacyCreditWalletDTO = z.object({
  userId: z.string().min(1, "User ID is required"),
  amount: z.number().positive("Amount must be positive"),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().min(1, "Description is required"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type LegacyCreditWalletDTO = z.infer<typeof LegacyCreditWalletDTO>;
