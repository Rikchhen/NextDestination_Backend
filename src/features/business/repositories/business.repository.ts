import { Business, BusinessDocument } from "../models/business.model";
import { IBusiness } from "../types/business.types";

export interface IBusinessRepository {
  getAllBusinesses(skip?: number, limit?: number): Promise<BusinessDocument[]>;
  getBusinessById(id: string): Promise<BusinessDocument | null>;
  getBusinessByEmail(email: string): Promise<BusinessDocument | null>;
  findByEmail(email: string): Promise<BusinessDocument | null>;
  createBusiness(
    business: Partial<BusinessDocument>,
  ): Promise<BusinessDocument>;
  updateBusiness(
    id: string,
    updatedData: Partial<BusinessDocument>,
  ): Promise<BusinessDocument | null>;
  deleteBusiness(id: string): Promise<BusinessDocument | null>;
  save(business: BusinessDocument): Promise<BusinessDocument>;
}

export class BusinessRepository implements IBusinessRepository {
  async getAllBusinesses(
    skip: number = 0,
    limit: number = 10,
  ): Promise<BusinessDocument[]> {
    return Business.find().skip(skip).limit(limit).exec();
  }

  async getBusinessById(id: string) {
    return Business.findById(id).exec();
  }

  async getBusinessByEmail(email: string) {
    return Business.findOne({ email }).exec();
  }

  async findByEmail(email: string) {
    return Business.findOne({ email }).exec();
  }

  async createBusiness(business: Partial<BusinessDocument>) {
    const newBusiness = new Business(business);
    return newBusiness.save();
  }

  async updateBusiness(
    id: string,
    data: Partial<BusinessDocument>,
  ): Promise<BusinessDocument | null> {
    return await Business.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    ).exec();
  }

  async deleteBusiness(id: string) {
    return Business.findByIdAndDelete(id).exec();
  }

  async save(business: BusinessDocument) {
    return business.save();
  }
}
