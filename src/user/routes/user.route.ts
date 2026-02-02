import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { uploads } from "../../middlewares/upload.middleware";

const userRouter = Router();
const userController = new UserController();

// Public routes

userRouter.post("/register", userController.registerUser);

userRouter.post("/login", userController.loginUser);

// Protected Routes
userRouter.get("/me", authMiddleware, userController.getProfile);

userRouter.patch(
  "/me",
  authMiddleware,
  uploads.single("profile-pictures"),
  userController.editProfile,
);

userRouter.delete("/me", authMiddleware, userController.deleteUser);

export default userRouter;
