import { z } from "zod";

export const BookingPaymentStatusValues = [
  "pending",
  "completed",
  "failed",
  "refunded",
] as const;

export const BookingPaymentMethodValues = ["khalti"] as const;

export const BookingPaymentSchema = z.object({
  _id: z.string().optional(),
  userId: z.string(),
  bookingId: z.string(),
  amount: z.number(),
  status: z.enum(BookingPaymentStatusValues),
  paymentMethod: z.enum(BookingPaymentMethodValues),
  transactionId: z.string().optional(),
  pidx: z.string().optional(),
  paymentUrl: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type BookingPayment = z.infer<typeof BookingPaymentSchema>;
