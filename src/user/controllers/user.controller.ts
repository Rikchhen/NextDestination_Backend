import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { LoginUserDTO, RegisterUserDTO, EditUserDTO } from "../dtos/user.dto";
import { success } from "zod";

const userService = new UserService();

export class UserController {
  registerUser = async (req: Request, res: Response) => {
    try {
      const registerDetailsParsed = RegisterUserDTO.safeParse(req.body);

      if (!registerDetailsParsed.success) {
        return res
          .status(400)
          .json({ success: false, message: "Registration Failed" });
      }

      const user = await userService.createUser(registerDetailsParsed.data);

      return res
        .status(200)
        .json({ success: true, message: "User registration Successful", user });
    } catch (error: any) {
      // Handling unknown errors
      return res.status(500).json({
        success: false,
        message: error.message || "User Registration Failed",
      });
    }
  };

  loginUser = async (req: Request, res: Response) => {
    const loginDetailsParsed = LoginUserDTO.safeParse(req.body);
    // console.log("suru waal adetails", loginDetailsParsed);
    try {
      if (!loginDetailsParsed.success) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid Credentials" });
      }

      const { phoneNumber, password } = loginDetailsParsed.data;
      // console.log("Parse bahyera aako",loginDetailsParsed.data);
      const loginResult = await userService.loginUser(phoneNumber, password);
      console.log(loginResult);
      return res.status(201).json({
        success: true,
        message: "Login Successful",
        token: loginResult.token,
        user: loginResult.user,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "User Login Failed",
      });
    }
  };

  getProfile = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const user = await userService.getUserById(userId);

      return res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "User not found",
      });
    }
  };

  editProfile = async (req: Request, res: Response) => {
    console.log("Controller chhai chalyo hai");
    console.log("User le pathaako data", req.body);
    try {
      const editDetailsParsed = EditUserDTO.safeParse(req.body);
      console.log("Details aayo hai:", editDetailsParsed);
      if (!editDetailsParsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: editDetailsParsed.error.format(),
        });
      }
      const userId = (req as any).user.id;
      console.log("user id", userId);
      const profilePictureFileName = req.file?.filename;
      console.log("File Aayo hai:", profilePictureFileName);

      const updatedUser = await userService.updateUser(userId, {
        ...editDetailsParsed.data,
        profilePicture: profilePictureFileName,
      });
      console.log("Update bhayera aako data", updatedUser);
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Something went wrong",
      });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const userId = await (req as any).user.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "User Doesnt Exist" });
      }
      userService.deleteUser(userId);
      return res
        .status(200)
        .json({ success: true, message: "User Deleted Successfully" });
    } catch (error: any) {
      return res
        .status(401)
        .json({ success: false, message: "User Delete Failed" });
    }
  };
}
