import { Router } from "express";
import { TripController } from "../controllers/trip.controller";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { businessOnly } from "../../../middlewares/business.middleware";

const tripRouter = Router();
const tripController = new TripController();

// Public
tripRouter.get("/search", tripController.searchTrips);
tripRouter.get("/:id", tripController.getTripById);

// Business protected
tripRouter.post(
  "/create",
  authMiddleware,
  businessOnly,
  tripController.createTrip,
);
tripRouter.get(
  "/business/mine",
  authMiddleware,
  businessOnly,
  tripController.getTripsByBusiness,
);

tripRouter.post(
  "/create",
  authMiddleware,
  businessOnly,
  tripController.createTrip,
);
tripRouter.patch(
  "/edit/:id",
  authMiddleware,
  businessOnly,
  tripController.updateTrip,
);
tripRouter.delete(
  "/delete/:id",
  authMiddleware,
  businessOnly,
  tripController.deleteTrip,
);

export default tripRouter;
