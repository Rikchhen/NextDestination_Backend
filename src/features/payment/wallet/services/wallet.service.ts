import mongoose from "mongoose";
import { HttpError } from "../../../../errorrs/error";
import { CreditWalletDTO, DebitWalletDTO } from "../dtos/wallet.dto";
import { TransactionRepository } from "../repositories/transaction.repository";
import { WalletRepository } from "../repositories/wallet.repository";

export class WalletService {
  private walletRepository: WalletRepository;
  private transactionRepository: TransactionRepository;

  constructor() {
    this.walletRepository = new WalletRepository();
    this.transactionRepository = new TransactionRepository();
  }

  async getOrCreateWallet(
    ownerId: string,
    ownerType: "User" | "Business",
    session?: mongoose.ClientSession,
  ) {
    let wallet = await this.walletRepository.findByOwner(
      ownerId,
      ownerType,
      session,
    );

    if (!wallet) {
      wallet = await this.walletRepository.create(
        {
          ownerId: new mongoose.Types.ObjectId(ownerId),
          ownerType,
          balance: 0,
          currency: "NPR",
        },
        session,
      );
    }

    return wallet;
  }

  async creditUser(data: CreditWalletDTO, session?: mongoose.ClientSession) {
    if (session) {
      const wallet = await this.getOrCreateWallet(
        data.ownerId,
        data.ownerType,
        session,
      );

      const updatedWallet = await this.walletRepository.incrementBalance(
        wallet._id!.toString(),
        data.amount,
        session,
      );

      if (!updatedWallet) {
        throw new Error("Failed to update wallet balance");
      }

      const transaction = await this.transactionRepository.createTransaction(
        {
          wallet: wallet._id,
          type: "credit",
          amount: data.amount,
          balance: updatedWallet.balance,
          description: data.description,
          reference: data.reference,
          metadata: data.metadata,
          ownerId: data.ownerId,
          ownerType: data.ownerType,
        },
        session,
      );

      return { wallet: updatedWallet, transaction };
    }

    const wallet = await this.getOrCreateWallet(data.ownerId, data.ownerType);

    const updatedWallet = await this.walletRepository.incrementBalance(
      wallet._id!.toString(),
      data.amount,
    );

    if (!updatedWallet) {
      throw new Error("Failed to update wallet balance");
    }

    const transaction = await this.transactionRepository.createTransaction({
      wallet: wallet._id,
      type: "credit",
      amount: data.amount,
      balance: updatedWallet.balance,
      description: data.description,
      reference: data.reference,
      metadata: data.metadata,
      ownerId: data.ownerId,
      ownerType: data.ownerType,
    });

    return { wallet: updatedWallet, transaction };
  }

  async debitUser(data: DebitWalletDTO, session?: mongoose.ClientSession) {
    if (session) {
      const wallet = await this.getOrCreateWallet(
        data.ownerId,
        data.ownerType,
        session,
      );

      if (wallet.balance < data.amount) {
        throw new HttpError(400, "Insufficient balance");
      }

      const updatedWallet = await this.walletRepository.decrementBalance(
        wallet._id!.toString(),
        data.amount,
        session,
      );

      if (!updatedWallet) {
        throw new Error("Failed to update wallet balance");
      }

      const transaction = await this.transactionRepository.createTransaction(
        {
          wallet: wallet._id,
          type: "debit",
          amount: data.amount,
          balance: updatedWallet.balance,
          description: data.description,
          reference: data.reference,
          metadata: data.metadata,
          ownerId: data.ownerId,
          ownerType: data.ownerType,
        },
        session,
      );

      return { wallet: updatedWallet, transaction };
    }

    const wallet = await this.getOrCreateWallet(data.ownerId, data.ownerType);

    if (wallet.balance < data.amount) {
      throw new HttpError(400, "Insufficient balance");
    }

    const updatedWallet = await this.walletRepository.decrementBalance(
      wallet._id!.toString(),
      data.amount,
    );

    if (!updatedWallet) {
      throw new Error("Failed to update wallet balance");
    }

    const transaction = await this.transactionRepository.createTransaction({
      wallet: wallet._id,
      type: "debit",
      amount: data.amount,
      balance: updatedWallet.balance,
      description: data.description,
      reference: data.reference,
      metadata: data.metadata,
      ownerId: data.ownerId,
      ownerType: data.ownerType,
    });

    return { wallet: updatedWallet, transaction };
  }

  async getBalance(ownerId: string, ownerType: "User" | "Business") {
    const wallet = await this.walletRepository.findByOwner(ownerId, ownerType);
    if (!wallet) {
      return { balance: 0, currency: "NPR" };
    }
    return { balance: wallet.balance, currency: wallet.currency };
  }

  async getTransactions(
    ownerId: string,
    ownerType: "User" | "Business",
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const transactions = await this.transactionRepository.findByOwner(
      ownerId,
      ownerType,
      skip,
      limit,
    );

    const total = await this.transactionRepository.countByOwner(
      ownerId,
      ownerType,
    );

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async checkTransactionExists(
    ownerId: string,
    reference: string,
    session?: mongoose.ClientSession,
  ): Promise<boolean> {
    const transaction = await this.transactionRepository.findByReference(
      ownerId,
      reference,
      session,
    );
    return !!transaction;
  }
}
