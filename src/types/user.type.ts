import { z } from "zod";

// model for the app to use, doesnt require database. 
export const UserSchema = z.object({
    _id: z.string().optional(),
    fullName: z.string(),
    email: z.string().email(),
    password: z.string(),
    confirmPassword: z.string().optional(),
    phoneNumber: z.string(),
    role: z.enum(["user", "admin"]).default("user"),
});

export type User = z.infer<typeof UserSchema>;