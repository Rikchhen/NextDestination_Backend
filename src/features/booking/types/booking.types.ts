import { z } from "zod";

export const PassengerSchema = z.object({
  fullName: z.string(),
  age: z.number(),
  gender: z.enum(["male", "female"]),
  seatNumber: z.string(),
});

export const BookingSchema = z.object({
  _id: z.string().optional(),

  bookedBy: z.string(), // userId
  trip: z.string(), // tripId

  bookingRef: z.string().optional(), // generated in service
  status: z.enum(["pending", "confirmed", "cancelled"]).default("pending"),

  passengers: z.array(PassengerSchema).min(1),

  contactEmail: z.string().email(),
  contactPhone: z.string(),

  totalAmount: z.number().optional(), // computed
});

export type Booking = z.infer<typeof BookingSchema>;
export type Passenger = z.infer<typeof PassengerSchema>;
