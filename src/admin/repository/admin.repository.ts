import { IUser, UserModel } from "../../user/models/user.model";

export interface IAdminRepository {
  // Admin-User Operations
  getAllUsers(skip?: number, limit?: number): Promise<IUser[]>;
  getUserById(userId: string): Promise<IUser | null>;
  getUserByEmail(email: string): Promise<IUser | null>;
  getUserByPhoneNumber(phoneNumber: string): Promise<IUser | null>;
  deleteUser(userId: string): Promise<IUser | null>;
  deleteAllUsers(): Promise<{ deletedCount: number }>; // returns how many users deleted , thats it
}
export class AdminRepository implements IAdminRepository {
  // User
  async getAllUsers(skip: number = 0, limit: number = 10): Promise<IUser[]> {
    return UserModel.find({ role: { $ne: "admin" } })
      .skip(skip)
      .limit(limit)
      .exec();
  }
  async getUserByPhoneNumber(phoneNumber: string): Promise<IUser | null> {
    return UserModel.findOne({ phoneNumber }).exec();
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return UserModel.findById(userId).exec();
  }
  async getUserByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ username: email }).exec();
  }
  async deleteUser(userId: string): Promise<IUser | null> {
    return UserModel.findByIdAndDelete(userId).exec();
  }
  async deleteAllUsers(): Promise<{ deletedCount: number }> {
    return UserModel.deleteMany({ role: { $ne: "admin" } }).exec();
  }
}
