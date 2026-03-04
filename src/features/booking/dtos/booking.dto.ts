import { z } from "zod";
import { BookingSchema, PassengerSchema } from "../types/booking.types";

export const CreateBookingDTO = BookingSchema.pick({
  trip: true,
  passengers: true,
  contactEmail: true,
  contactPhone: true,
})
  .extend({
    trip: z.string().min(1, "Trip is required"),
    passengers: z
      .array(
        PassengerSchema.extend({
          fullName: z.string().min(2, "Passenger name required"),
          age: z.coerce.number().min(0, "Age must be >= 0"),
          seatNumber: z.string().min(1, "Seat number required"),
        }),
      )
      .min(1, "At least 1 passenger required"),
    contactEmail: z.string().email("Valid email required"),
    contactPhone: z.string().min(6, "Valid phone required"),
  })
  .refine(
    (data) => {
      // ensure seat numbers in request are unique
      const seats = data.passengers.map((p) =>
        p.seatNumber.trim().toLowerCase(),
      );
      return new Set(seats).size === seats.length;
    },
    { message: "Duplicate seat numbers in passengers", path: ["passengers"] },
  );

export type CreateBookingDTO = z.infer<typeof CreateBookingDTO>;

export const CancelBookingDTO = z
  .object({
    reason: z.string().optional(),
  })
  .optional();

export type CancelBookingDTO = z.infer<typeof CancelBookingDTO>;
