import { Router } from "express";
import { BusinessController } from "../controllers/business.controller";
import { uploads } from "../../../middlewares/upload.middleware";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import uploadBusinessDoc from "../../../multer/business.multer";
import { adminOnly } from "../../../middlewares/admin.middleware";

const businessRouter = Router();
const businessController = new BusinessController();

businessRouter.post(
  "/register",
  uploads.single("business-profile-pictures"),
  businessController.register,
);

businessRouter.post("/login", businessController.login);

businessRouter.post(
  "/upload-document",
  authMiddleware,
  uploadBusinessDoc.single("document"),
  businessController.uploadDocument,
);

businessRouter.put(
  "/admin/approve/:businessId",
  authMiddleware,
  adminOnly,
  businessController.approve,
);

businessRouter.get(
  "/admin/all",
  authMiddleware,
  adminOnly,
  businessController.getAll,
);

businessRouter.get(
  "/profile",
  authMiddleware,
  (req, res, next) => {
    console.log("✅ GET /api/business/profile route hit!");
    next();
  },
  businessController.getProfile,
);

businessRouter.put(
  "/profile/edit",
  authMiddleware,
  businessController.editProfile,
);

export default businessRouter;
