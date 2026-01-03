import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { LoginUserDTO, RegisterUserDTO, EditUserDTO } from "../dtos/user.dto";

const userService = new UserService();


export class UserController {
    registerUser = async (req: Request, res: Response) => {
        try {
            const registerDetailsParsed = RegisterUserDTO.safeParse(req.body);

            if (!registerDetailsParsed.success) {
                return res.status(400).json({ messaeg: "Registration Failed" })
            }

            const user = await userService.createUser(registerDetailsParsed.data);

            return res.status(200).json({ message: "User registration Successful", user });
        }
        catch (error: any) { // Handling unknown errors
            return res.status(500).json({ message: error.message || "User Registration Failed" })
        }

    };

    loginUser = async (req: Request, res: Response) => {
        const loginDetailsParsed = LoginUserDTO.safeParse(req.body);

        try {

            if (!loginDetailsParsed.success) {
                return res.status(401).json({ message: "Invalid Credentials" });
            }

            const { phoneNumber, password } = loginDetailsParsed.data;

            const loginResult = await userService.loginUser(phoneNumber, password);

            return res.status(201).json({ message: "Login Successful", token: loginResult.token, user: loginResult.user })
        } catch (error: any) {

            return res.status(500).json({ message: error.message || "User Login Failed" })
        }
    };

    getProfile = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user.id;

            const user = await userService.getUserById(userId);

            return res.status(200).json({
                user,
            });

        } catch (error: any) {
            return res.status(404).json({
                message: error.message || "User not found",
            });
        }
    };

    editProfile = async (req: Request, res: Response) => {
        try {
            const editDetailsParsed = EditUserDTO.safeParse(req.body);

            if (!editDetailsParsed.success) {
                return res.status(400).json({
                    message: "Invalid input",
                    errors: editDetailsParsed.error.format(),
                });
            }
            const userId = (req as any).user.id;

            const updatedUser = await userService.updateUser(
                userId,
                editDetailsParsed.data
            );
            return res.status(200).json({
                message: "Profile updated successfully",
                user: updatedUser,
            });
        } catch (error: any) {
            return res.status(400).json({
                message: error.message || "Something went wrong",
            });
        }
    };

    deleteUser = async (req: Request, res: Response) => {
        try {
            const userId = await (req as any).user.id;
            if(!userId){
                return res.status(401).json({message: "User Doesnt Exist"});
            }
            userService.deleteUser(userId);
            return res.status(200).json({message:"User Deleted Successfully"});
        } catch (error: any) {
                return res.status(401).json({message:"User Delete Failed"});
        }
    };

}