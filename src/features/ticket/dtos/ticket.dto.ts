import { z } from "zod";
import { TicketSchema } from "../types/ticket.types";

/**
 * Business scans a ticket (QR token)
 */
export const ScanTicketDTO = z.object({
  qrToken: z.string().min(5, "qrToken is required"),
});
export type ScanTicketDTO = z.infer<typeof ScanTicketDTO>;

/**
 * Voiding a ticket (optional reason)
 */
export const VoidTicketDTO = z.object({
  reason: z.string().max(200).optional(),
});
export type VoidTicketDTO = z.infer<typeof VoidTicketDTO>;

/**
 * (Optional) Expire ticket manually
 */
export const ExpireTicketDTO = z.object({
  reason: z.string().max(200).optional(),
});
export type ExpireTicketDTO = z.infer<typeof ExpireTicketDTO>;

/**
 * Ticket query params for "my tickets"
 */
export const MyTicketsQueryDTO = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  status: z.enum(["issued", "used", "void", "expired"]).optional(),
});
export type MyTicketsQueryDTO = z.infer<typeof MyTicketsQueryDTO>;

/**
 * Ticket id param (optional helper)
 */
export const TicketIdParamDTO = TicketSchema.pick({
  _id: true,
}).extend({
  _id: z.string().min(1, "Ticket id is required"),
});
export type TicketIdParamDTO = z.infer<typeof TicketIdParamDTO>;
