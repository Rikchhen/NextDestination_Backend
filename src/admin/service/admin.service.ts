import { IUser } from "../../user/models/user.model";
import { UserRepository } from "../../user/repositories/user.repository";
import { AdminRepository } from "../repository/admin.repository";

const adminRepository = new AdminRepository();
const userRepository = new UserRepository();

export class AdminService {
  // Helper Function || even Admin Doesnt get to see passwords
  private sanitizeUser(user: IUser) {
    const userObj = user.toObject();
    const { password, __v, ...safeUser } = userObj;
    return safeUser;
  }
  //   User Get Logics
  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const users = await adminRepository.getAllUsers(skip, limit);
    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(userId: string) {
    const user = await adminRepository.getUserById(userId);
    if (!user) throw new Error("User not found");
    return this.sanitizeUser(user);
  }

  async getUserByPhoneNumber(phoneNumber: string) {
    const user = await adminRepository.getUserByPhoneNumber(phoneNumber);
    if (!user) throw new Error("User Not Found");
    return this.sanitizeUser(user);
  }

  async getUserByEmail(email: string) {
    const user = await adminRepository.getUserByEmail(email);
    if (!user) throw new Error("User not found");
    return this.sanitizeUser(user);
  }

  //User Delete logic

  async deleteUser(userId: string) {
    const user = await adminRepository.getUserById(userId);
    if (!user) throw new Error("User not found");

    await adminRepository.deleteUser(userId);
    return { message: "User deleted successfully" };
  }

  async deleteAllUsers() {
    await adminRepository.deleteAllUsers();
    return { mesage: "All Users Deleted" };
  }
}
