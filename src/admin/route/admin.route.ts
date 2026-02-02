import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { adminOnly } from "../../middlewares/admin.middleware";
import { AdminController } from "../controller/admin.controller";

const adminRouter = Router();
const adminController = new AdminController();

// User Get Routes
adminRouter.get(
  "/users",
  authMiddleware,
  adminOnly,
  adminController.getAllusers,
);

adminRouter.get(
  "/users/id/:userId",
  authMiddleware,
  adminOnly,
  adminController.getUserById,
);

adminRouter.get(
  "/users/phone/:phoneNumber",
  authMiddleware,
  adminOnly,
  adminController.getUserByPhoneNumber,
);

// User Delete Routes
adminRouter.delete(
  "/users/deleteAll",
  authMiddleware,
  adminOnly,
  adminController.deleteAllUsers,
);

adminRouter.delete(
  "/users/delete/:userId",
  authMiddleware,
  adminOnly,
  adminController.deleteUser,
);

export default adminRouter;
