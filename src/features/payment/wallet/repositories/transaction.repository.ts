import mongoose from "mongoose";
import { ITransaction, TransactionModel } from "../models/wallet.model";

export class TransactionRepository {
  async createTransaction(
    data: Partial<ITransaction>,
    session?: mongoose.ClientSession,
  ): Promise<ITransaction> {
    const transaction = new TransactionModel(data);
    if (session) {
      return await transaction.save({ session });
    }
    return await transaction.save();
  }

  async findByOwner(
    ownerId: string,
    ownerType: "User" | "Business",
    skip: number = 0,
    limit: number = 10,
  ): Promise<ITransaction[]> {
    return await TransactionModel.find({ ownerId, ownerType })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countByOwner(
    ownerId: string,
    ownerType: "User" | "Business",
  ): Promise<number> {
    return await TransactionModel.countDocuments({ ownerId, ownerType }).exec();
  }

  async findByReference(
    ownerId: string,
    reference: string,
    session?: mongoose.ClientSession,
  ): Promise<ITransaction | null> {
    const query = TransactionModel.findOne({ ownerId, reference });
    if (session) {
      return await query.session(session).exec();
    }
    return await query.exec();
  }
}
