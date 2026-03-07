import { Request, Response } from "express";
import { WalletService } from "../services/wallet.service";
import { WalletFilterDTO } from "../dtos/wallet.dto";

const walletService = new WalletService();

export class WalletController {
  getWalletBalance = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const balance = await walletService.getBalance(userId, "User");
      return res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch wallet balance",
      });
    }
  };

  getTransactions = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const filterValidation = WalletFilterDTO.safeParse(req.query);
      if (!filterValidation.success) {
        return res.status(400).json({
          success: false,
          errors: filterValidation.error.format(),
        });
      }
      const { page, limit } = filterValidation.data;
      const result = await walletService.getTransactions(userId, "User", {
        page,
        limit,
      });
      return res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch transactions",
      });
    }
  };

  getBusinessWalletBalance = async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).user.id;
      const balance = await walletService.getBalance(businessId, "Business");
      return res.status(200).json({
        success: true,
        data: balance,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch business wallet balance",
      });
    }
  };

  getBusinessTransactions = async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).user.id;
      const filterValidation = WalletFilterDTO.safeParse(req.query);
      if (!filterValidation.success) {
        return res.status(400).json({
          success: false,
          errors: filterValidation.error.format(),
        });
      }
      const { page, limit } = filterValidation.data;
      const result = await walletService.getTransactions(
        businessId,
        "Business",
        {
          page,
          limit,
        },
      );
      return res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to fetch business transactions",
      });
    }
  };
}
