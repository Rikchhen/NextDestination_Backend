import { Document } from "mongoose";
import { ITicket, TicketModel } from "../models/ticket.model";

export type CreateTicketInput = Omit<
  ITicket,
  keyof Document | "_id" | "createdAt" | "updatedAt" | "__v"
>;

export interface TicketRepositoryInterface {
  createMany(tickets: CreateTicketInput[]): Promise<ITicket[]>;
  getTicketById(ticketId: string): Promise<ITicket | null>;
  getTicketByQrToken(qrToken: string): Promise<ITicket | null>;
  getTicketsByBooking(bookingId: string): Promise<ITicket[]>;
  updateTicket(
    ticketId: string,
    updatedData: Partial<ITicket>,
  ): Promise<ITicket | null>;
  updateTicketByQrToken(
    qrToken: string,
    updatedData: Partial<ITicket>,
  ): Promise<ITicket | null>;
}

export class TicketRepository implements TicketRepositoryInterface {
  async createMany(tickets: CreateTicketInput[]): Promise<ITicket[]> {
    const docs = await TicketModel.insertMany(tickets);
    return docs as unknown as ITicket[];
  }

  async getTicketById(ticketId: string) {
    return TicketModel.findById(ticketId).exec();
  }

  async getTicketByQrToken(qrToken: string) {
    return TicketModel.findOne({ qrToken }).exec();
  }

  async getTicketsByBooking(bookingId: string) {
    return TicketModel.find({ booking: bookingId }).exec();
  }

  async updateTicket(ticketId: string, updatedData: Partial<ITicket>) {
    return TicketModel.findByIdAndUpdate(ticketId, updatedData, {
      new: true,
    }).exec();
  }

  async updateTicketByQrToken(qrToken: string, updatedData: Partial<ITicket>) {
    return TicketModel.findOneAndUpdate({ qrToken }, updatedData, {
      new: true,
    }).exec();
  }
}
