import { z } from "zod";

export const TripSchema = z.object({
  _id: z.string().optional(),

  business: z.string(), // businessId from token / db

  type: z.enum(["bus", "plane"]),

  from: z.string(),
  to: z.string(),

  departureAt: z.coerce.date(),
  arrivalAt: z.coerce.date().optional(),

  price: z.number(),
  totalSeats: z.number(),
  availableSeats: z.number().optional(), // computed in service/model

  status: z.enum(["active", "cancelled", "delayed"]).default("active"),
});

export type Trip = z.infer<typeof TripSchema>;
