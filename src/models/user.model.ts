import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
    fullName: string;
    email: string;
    password: string;
    phoneNumber?: string;
    role: "user" | "admin";
}

const UserSchema: Schema<IUser> = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase:true, index:true },
        password: { type: String, required: true, select:false },
        phoneNumber: { type: String },
        role: { type: String, enum:["user", "admin"], default:"user"},  
    },
    { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("User", UserSchema);