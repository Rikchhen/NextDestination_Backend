import { Request, Response } from "express";
import { TripService } from "../services/trip.service";
import { CreateTripDTO, EditTripDTO, SearchTripDTO } from "../dtos/trip.dto";

const tripService = new TripService();

export class TripController {
  createTrip = async (req: Request, res: Response) => {
    try {
      const parsed = CreateTripDTO.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Trip creation failed",
          errors: parsed.error.format(),
        });
      }

      const businessId = (req as any).user.id; // your auth puts id here
      const trip = await tripService.createTrip(businessId, parsed.data);

      return res.status(201).json({
        success: true,
        message: "Trip created successfully",
        trip,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Trip creation failed",
      });
    }
  };

  getTripById = async (req: Request, res: Response) => {
    try {
      const trip = await tripService.getTripById(req.params.id);
      return res.status(200).json({ success: true, trip });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message: error.message || "Trip not found",
      });
    }
  };

  getTripsByBusiness = async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).user.id;
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 10);

      const trips = await tripService.getTripsByBusiness(
        businessId,
        page,
        limit,
      );

      return res.status(200).json({
        success: true,
        trips,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch trips",
      });
    }
  };

  searchTrips = async (req: Request, res: Response) => {
    try {
      const parsed = SearchTripDTO.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid search query",
          errors: parsed.error.format(),
        });
      }

      const result = await tripService.searchTrips(parsed.data);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Trip search failed",
      });
    }
  };

  updateTrip = async (req: Request, res: Response) => {
    try {
      const parsed = EditTripDTO.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid input",
          errors: parsed.error.format(),
        });
      }

      const businessId = (req as any).user.id;
      const updated = await tripService.updateTrip(
        req.params.id,
        businessId,
        parsed.data,
      );

      return res.status(200).json({
        success: true,
        message: "Trip updated successfully",
        trip: updated,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Trip update failed",
      });
    }
  };

  deleteTrip = async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).user.id;
      const result = await tripService.deleteTrip(req.params.id, businessId);

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Trip delete failed",
      });
    }
  };
}
