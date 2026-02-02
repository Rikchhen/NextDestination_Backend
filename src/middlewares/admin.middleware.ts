import { NextFunction, Request, Response } from "express";

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Only Admins Can Access" });
  }
  next();
};
