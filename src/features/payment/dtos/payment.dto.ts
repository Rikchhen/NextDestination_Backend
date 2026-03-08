import { z } from "zod";
import {
  BookingPaymentSchema,
  BookingPaymentStatusValues,
} from "../types/payment.types";

export const CreatePaymentDTO = BookingPaymentSchema.pick({
  userId: true,
  bookingId: true,
  amount: true,
  status: true,
  paymentMethod: true,
  transactionId: true,
  pidx: true,
  paymentUrl: true,
  metadata: true,
});

export type CreatePaymentDTO = z.infer<typeof CreatePaymentDTO>;

export const UpdatePaymentDTO = BookingPaymentSchema.pick({
  status: true,
  transactionId: true,
  metadata: true,
}).partial();

export type UpdatePaymentDTO = z.infer<typeof UpdatePaymentDTO>;

export const InitiateKhaltiPaymentDTO = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  returnUrl: z.url("Valid return URL is required"),
});

export type InitiateKhaltiPaymentDTO = z.infer<typeof InitiateKhaltiPaymentDTO>;

export const VerifyKhaltiPaymentDTO = z.object({
  pidx: z.string().min(1, "pidx is required"),
  bookingId: z.string().min(1, "Booking ID is required"),
});

export type VerifyKhaltiPaymentDTO = z.infer<typeof VerifyKhaltiPaymentDTO>;

export const PaymentFilterDTO = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.enum(BookingPaymentStatusValues).optional(),
});

export type PaymentFilterDTO = z.infer<typeof PaymentFilterDTO>;

export const KhaltiWebhookDTO = z.object({
  pidx: z.string().min(1),
  purchase_order_id: z.string().min(1),
});

export type KhaltiWebhookDTO = z.infer<typeof KhaltiWebhookDTO>;
