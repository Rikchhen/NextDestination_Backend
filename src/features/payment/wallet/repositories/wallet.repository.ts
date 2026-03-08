import mongoose from "mongoose";
import { WalletModel, IWallet } from "../models/wallet.model";

export class WalletRepository {
  async findByOwner(
    ownerId: string,
    ownerType: "User" | "Business",
    session?: mongoose.ClientSession,
  ): Promise<IWallet | null> {
    const query = WalletModel.findOne({ ownerId, ownerType });
    if (session) {
      return await query.session(session).exec();
    }
    return await query.exec();
  }

  async create(
    data: Partial<IWallet>,
    session?: mongoose.ClientSession,
  ): Promise<IWallet> {
    const wallet = new WalletModel(data);
    if (session) {
      return await wallet.save({ session });
    }
    return await wallet.save();
  }

  async incrementBalance(
    walletId: string,
    amount: number,
    session?: mongoose.ClientSession,
  ): Promise<IWallet | null> {
    return await WalletModel.findByIdAndUpdate(
      walletId,
      { $inc: { balance: amount } },
      { new: true, session, runValidators: true },
    ).exec();
  }

  async decrementBalance(
    walletId: string,
    amount: number,
    session?: mongoose.ClientSession,
  ): Promise<IWallet | null> {
    return await WalletModel.findByIdAndUpdate(
      walletId,
      { $inc: { balance: -amount } },
      { new: true, session, runValidators: true },
    ).exec();
  }

  async updateBalance(
    walletId: string,
    balance: number,
    session?: mongoose.ClientSession,
  ): Promise<IWallet | null> {
    return await WalletModel.findByIdAndUpdate(
      walletId,
      { balance },
      { new: true, session, runValidators: true },
    ).exec();
  }
}
