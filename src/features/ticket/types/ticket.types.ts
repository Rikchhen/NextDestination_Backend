import { z } from "zod";

export const TicketSchema = z.object({
  _id: z.string().optional(),

  booking: z.string(),
  trip: z.string(),
  bookedBy: z.string(),

  passengerName: z.string(),
  seatNumber: z.string(),

  qrToken: z.string(),

  status: z.enum(["issued", "used", "void", "expired"]).default("issued"),

  issuedAt: z.coerce.date().optional(),
  usedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export type Ticket = z.infer<typeof TicketSchema>;
