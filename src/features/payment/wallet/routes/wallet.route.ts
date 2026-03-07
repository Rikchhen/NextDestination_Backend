import { Router } from "express";
import { WalletController } from "../controllers/wallet.controller";
import { authMiddleware } from "../../../../middlewares/auth.middleware";
import { businessOnly } from "../../../../middlewares/business.middleware";

const walletRouter = Router();
const walletController = new WalletController();

walletRouter.get("/balance", authMiddleware, walletController.getWalletBalance);
walletRouter.get(
  "/transactions",
  authMiddleware,
  walletController.getTransactions,
);

walletRouter.get(
  "/business/balance",
  authMiddleware,
  businessOnly,
  walletController.getBusinessWalletBalance,
);

walletRouter.get(
  "/business/transactions",
  authMiddleware,
  businessOnly,
  walletController.getBusinessTransactions,
);

export default walletRouter;
