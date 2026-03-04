import { z } from "zod";

export const BusinessStatusSchema = z.enum(["Pending", "Approved", "Rejected"]);

export const BusinessSchema = z.object({
  _id: z.string().optional(),
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().optional(),
  role: z.string().default("Seller"),
  profilePicture: z.string().optional(),
  businessDocument: z.string().optional(),
  businessVerified: z.boolean().default(false),
  businessStatus: BusinessStatusSchema.default("Pending"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type IBusiness = z.infer<typeof BusinessSchema>;
export type BusinessStatus = z.infer<typeof BusinessStatusSchema>;
