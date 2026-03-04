import { NextFunction, Request, Response } from "express";

export const businessOnly = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const user = (req as any).user;

  if (!user || user.role !== "Business") {
    return res.status(403).json({
      success: false,
      message: "Only Businesses Can Access",
    });
  }

  next();
};
