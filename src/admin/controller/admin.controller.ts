import { Request, Response } from "express";
import { AdminService } from "../service/admin.service";
import { success } from "zod";
import { AdminRepository } from "../repository/admin.repository";

const adminService = new AdminService();
export class AdminController {
  // User Operations
  getAllusers = async (req: Request, res: Response) => {
    try {
      const users = await adminService.getAllUsers();
      return res.status(200).json({
        success: true,
        message: "Users Fetched Successfully",
        users: users,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  getUserById = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "user not found",
        });
      }
      const user = await adminService.getUserById(userId);
      return res.status(200).json({
        success: true,
        message: "user fetched successfully",
        user: user,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  getUserByPhoneNumber = async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.params;
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: "Phone Number not passed",
        });
      }
      const user = await adminService.getUserByPhoneNumber(phoneNumber);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "A user with this phone number doesnt exist",
        });
      }
      return res
        .status(200)
        .json({ success: true, message: "User Found", user: user });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(404).json({
          success: false,
          message: "user not found",
        });
      }
      await adminService.deleteUser(userId);
      return res
        .status(200)
        .json({ success: true, message: "User Deleted", user: userId });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };

  deleteAllUsers = async (req: Request, res: Response) => {
    try {
      await adminService.deleteAllUsers();
      return res
        .status(200)
        .json({ success: true, message: "All users deleted" });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error",
      });
    }
  };
}
