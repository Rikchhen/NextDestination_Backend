import { z } from "zod";
import { BusinessSchema } from "../types/business.types";

export const RegisterBusinessDto = BusinessSchema.pick({
  businessName: true,
  email: true,
  phoneNumber: true,
  password: true,
  address: true,
  profilePicture: true,
});

export type RegisterBusinessDto = z.infer<typeof RegisterBusinessDto>;

export const LoginBusinessDto = BusinessSchema.pick({
  email: true,
  password: true,
});

export type LoginBusinessDto = z.infer<typeof LoginBusinessDto>;

export const EditBusinessDto = BusinessSchema.pick({
  businessName: true,
  email: true,
  phoneNumber: true,
  address: true,
  profilePicture: true,
}).partial();

export type EditBusinessDto = z.infer<typeof EditBusinessDto>;

export const ApproveBusinessDto = z.object({
  action: z.enum(["Approve", "Reject"]),
  reason: z.string().optional(),
});

export type ApproveBusinessDto = z.infer<typeof ApproveBusinessDto>;
