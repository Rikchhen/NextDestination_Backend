import { z } from "zod";
import { TripSchema } from "../types/trip.type";

export const CreateTripDTO = TripSchema.pick({
  type: true,
  from: true,
  to: true,
  departureAt: true,
  arrivalAt: true,
  price: true,
  totalSeats: true,
  status: true,
})
  .extend({
    from: z.string().min(2, "From location is required"),
    to: z.string().min(2, "To location is required"),
    price: z.number().min(0, "Price must be >= 0"),
    totalSeats: z.number().int().min(1, "Total seats must be at least 1"),
  })
  .refine(
    (data) => data.from.trim().toLowerCase() !== data.to.trim().toLowerCase(),
    {
      message: "`from` and `to` cannot be same",
      path: ["to"],
    },
  )
  .refine(
    (data) => (data.arrivalAt ? data.arrivalAt > data.departureAt : true),
    {
      message: "`arrivalAt` must be after `departureAt`",
      path: ["arrivalAt"],
    },
  );

export type CreateTripDTO = z.infer<typeof CreateTripDTO>;

export const EditTripDTO = TripSchema.pick({
  from: true,
  to: true,
  departureAt: true,
  arrivalAt: true,
  price: true,
  totalSeats: true,
  status: true,
})
  .partial()
  .refine(
    (data) =>
      !(
        data.from &&
        data.to &&
        data.from.trim().toLowerCase() === data.to.trim().toLowerCase()
      ),
    {
      message: "`from` and `to` cannot be same",
      path: ["to"],
    },
  );

export type EditTripDTO = z.infer<typeof EditTripDTO>;

export const SearchTripDTO = z.object({
  type: z.enum(["bus", "plane"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.enum(["active", "cancelled", "delayed"]).optional(),

  // date range search
  departureFrom: z.coerce.date().optional(),
  departureTo: z.coerce.date().optional(),

  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type SearchTripDTO = z.infer<typeof SearchTripDTO>;
