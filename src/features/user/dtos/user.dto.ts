import { z } from "zod";
import { UserSchema } from "../types/user.type";

// The DTO [Data transfer Object] defines what values are needed for certain operations
// For registration the following are necessary
export const RegisterUserDTO = UserSchema.pick({
  fullName: true,
  email: true,
  password: true,
  confirmPassword: true,
  phoneNumber: true,
  role: true,
})
  .extend({
    password: z.string().min(8, "Passwords must be at least 8 characters "),
  }) // ensures paswords are atleast 8 chars long
  .refine((data) => data.password === data.confirmPassword, {
    // ensures password and confirmPasswords match
    message: "Passwords do not match!!",
    path: ["confirmPassword"],
  });
export type RegisterUserDTO = z.infer<typeof RegisterUserDTO>;

export const LoginUserDTO = UserSchema.pick({
  email: true,
  password: true,
});
export type LoginUserDTO = z.infer<typeof LoginUserDTO>;

export const EditUserDTO = UserSchema.pick({
  fullName: true,
  email: true,
  phoneNumber: true,
  profilePicture: true,
  role: true,
}).partial(); // doesnt ask user to insert all field when editing
export type EditUserDTO = z.infer<typeof EditUserDTO>;
