import bcrypt from "bcrypt";
import {
  UserRepository,
  UserRepositoryInterface,
} from "../repositories/user.repository";
import { RegisterUserDTO, LoginUserDTO, EditUserDTO } from "../dtos/user.dto";
import { IUser } from "../models/user.model";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { HttpError } from "../../../errorrs/error";
import { sendEmail } from "../../../config/email";

const userRepository = new UserRepository();
dotenv.config();
const CLIENT_URL = process.env.CLIENT_URL as string;

export class UserService {
  //    helper function: Filter user object to exclude password and the version key that mongoose creates

  // doing this because we dont want password going everywhere
  private sanitizeUser(user: IUser) {
    const userObj = user.toObject();
    const { password, __v, ...safeUser } = userObj; // here __v is version key [mongoose generates it automatically]
    return safeUser;
  }

  // create user  [for registration]

  async createUser(data: RegisterUserDTO) {
    const existingUser = await userRepository.getUserByNumber(data.phoneNumber);

    if (existingUser) {
      throw new Error("User with this email or username already exists");
    }

    // Hash password for security reasons
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const userToCreate = {
      fullName: data.fullName,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      phoneNumber: data.phoneNumber,
    };

    const user = await userRepository.createUser(userToCreate);
    return this.sanitizeUser(user);
  }

  //  login function [jwt token is created here and not in controller because its easier that way]

  async loginUser(email: string, password: string) {
    // console.log("Service received:", phoneNumber, password);
    const user = await userRepository.getUserByEmail(email);

    console.log("User found:", user);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Because password has select:false [done in model || cant access directly], we must explicitly select it
    const userWithPassword = await userRepository.getUserWithPassword(
      user._id.toString(),
    );
    // console.log("User with password:", userWithPassword);
    // console.log("Password field:", userWithPassword?.password);
    if (!userWithPassword) {
      throw new Error("Authentication failed");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      userWithPassword.password,
    );
    // console.log("Is password valid?", isPasswordValid);

    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }
    console.log("JWT SECRET KEY:", process.env.JWT_SECRET_KEY);
    // token geneation after login
    const token = jwt.sign(
      {
        id: user._id.toString(), // .toString() done because JWT payload should be JSON-serializable
        role: user.role,
      },
      process.env.JWT_SECRET_KEY!,
      { expiresIn: "10d" },
    );

    // console.log("Before sanitise:", user);
    const safeUser = this.sanitizeUser(user);
    // console.log("after sanitise:", safeUser);
    return { token, user: safeUser };
  }

  // update user logic

  async updateUser(userId: string, data: EditUserDTO) {
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("User not found");

    // Prevent email / username collisions
    if (data.phoneNumber) {
      const existingUser = await userRepository.getUserByNumber(
        data.phoneNumber ?? "",
      );

      if (existingUser && existingUser._id.toString() !== userId) {
        throw new Error("Email or username already in use");
      }
    }

    const updatedUser = await userRepository.updateUser(userId, data);
    if (!updatedUser) throw new Error("Failed to update user");

    return this.sanitizeUser(updatedUser);
  }

  //  Below functions all are used for "get" operations, basically get from db and show type shi

  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const users = await userRepository.getAllUsers(skip, limit);
    return users.map((user) => this.sanitizeUser(user));
  }

  async getUserById(userId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("User not found");
    return this.sanitizeUser(user);
  }

  async getUserByNumber(phoneNumber: string) {
    const user = await userRepository.getUserByNumber(phoneNumber);
    if (!user) throw new Error("User not found");
    return this.sanitizeUser(user);
  }

  // Delete user logic

  async deleteUser(userId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) throw new Error("User not found");

    await userRepository.deleteUser(userId);
    return { message: "User deleted successfully" };
  }

  // Request Password Reset logic
  async sendResetPasswordEmail(email?: string) {
    if (!email) {
      throw new HttpError(400, "Email is required");
    }
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY!, {
      expiresIn: "1h",
    }); // 1 hour expiry
    const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;
    const html = `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`;
    await sendEmail(user.email, "Password Reset", html);
    return user;
  }

  async resetPassword(token?: string, newPassword?: string) {
    try {
      if (!token || !newPassword) {
        throw new HttpError(400, "Token and new password are required");
      }
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET_KEY!);
      const userId = decoded.id;
      const user = await userRepository.getUserById(userId);
      if (!user) {
        throw new HttpError(404, "User not found");
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await userRepository.updateUser(userId, { password: hashedPassword });
      return user;
    } catch (error) {
      throw new HttpError(400, "Invalid or expired token");
    }
  }
}
