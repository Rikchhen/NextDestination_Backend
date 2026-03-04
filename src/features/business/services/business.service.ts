import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { BusinessRepository } from "../repositories/business.repository";
import { BusinessDocument } from "../models/business.model";
import {
  RegisterBusinessDto,
  LoginBusinessDto,
  ApproveBusinessDto,
} from "../dtos/business.dto";

dotenv.config();

const businessRepository = new BusinessRepository();

export class BusinessService {
  private sanitizeBusiness(business: any) {
    const businessObj = business.toObject ? business.toObject() : business;
    const { password, confirmPassword, __v, ...safeBusiness } = businessObj;
    return safeBusiness;
  }

  public getSanitizedBusiness(business: any) {
    return this.sanitizeBusiness(business);
  }

  register = async (dto: RegisterBusinessDto) => {
    const {
      businessName,
      email,
      phoneNumber,
      password,
      address,
      profilePicture,
    } = dto;

    const existing = await businessRepository.findByEmail(email);
    if (existing) throw new Error("Business already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const createdBusiness = await businessRepository.createBusiness({
      businessName,
      email,
      phoneNumber,
      password: hashedPassword,
      address,
      profilePicture,
      businessStatus: "Pending",
    });

    const tempToken = jwt.sign(
      { id: createdBusiness._id, role: "Business", temp: true },
      process.env.JWT_SECRET_KEY!,
      { expiresIn: "1h" },
    );

    return {
      message: "Business registered successfully. Please upload your document.",
      tempToken,
      business: this.sanitizeBusiness(createdBusiness),
    };
  };

  login = async (dto: LoginBusinessDto) => {
    const { email, password } = dto;
    console.log(process.env.JWT_SECRET_KEY);

    const business = await businessRepository.findByEmail(email);
    if (!business) throw new Error("Business not found");

    const isMatch = await bcrypt.compare(password, business.password);
    if (!isMatch) throw new Error("Invalid credentials");

    if (business.businessStatus === "Pending" && !business.businessDocument)
      throw new Error("Please upload document and wait for admin approval");

    if (business.businessStatus === "Rejected")
      throw new Error("Business registration rejected by admin");

    const token = jwt.sign(
      {
        id: business._id,
        role: business.role,
      },
      process.env.JWT_SECRET_KEY!,
      { expiresIn: "7d" },
    );

    console.log("🎯 Raw business from DB:", {
      _id: business._id,
      id: (business as any).id,
      role: business.role,
      businessName: business.businessName,
    });

    return {
      business: this.sanitizeBusiness(business),
      token,
      message: "Business logged in successfully",
    };
  };

  uploadDocument = async (
    businessId: string,
    documentPath: string,
  ): Promise<BusinessDocument> => {
    const business = await businessRepository.getBusinessById(businessId);
    if (!business) throw new Error("Business not found");

    business.businessDocument = documentPath;
    business.businessStatus = "Pending";

    return await businessRepository.save(business);
  };

  approveBusiness = async (
    businessId: string,
    dto: ApproveBusinessDto,
  ): Promise<BusinessDocument> => {
    const business = await businessRepository.getBusinessById(businessId);
    if (!business) throw new Error("Business not found");

    if (dto.action === "Approve") {
      business.businessVerified = true;
      business.businessStatus = "Approved";
      business.rejectionReason = undefined;
    } else {
      business.businessVerified = false;
      business.businessStatus = "Rejected";
      business.rejectionReason = dto.reason || "No reason provided";
    }

    return await businessRepository.save(business);
  };

  getAllBusinesses = async (page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;
    const businesses = await businessRepository.getAllBusinesses(skip, limit);
    return businesses.map((b) => this.sanitizeBusiness(b));
  };

  getBusinessRawByEmail = async (email: string) => {
    const business = await businessRepository.findByEmail(email);
    if (!business) throw new Error("Business not found");
    return business;
  };

  getBusinessProfile = async (businessId: string) => {
    const business = await businessRepository.getBusinessById(businessId);
    if (!business) throw new Error("Business not found");

    return this.sanitizeBusiness(business);
  };

  editBusinessProfile = async (
    businessId: string,
    updateData: Partial<RegisterBusinessDto>,
  ) => {
    const { password, email, ...allowedUpdates } = updateData;

    const updatedBusiness = await businessRepository.updateBusiness(
      businessId,
      allowedUpdates,
    );

    if (!updatedBusiness)
      throw new Error("Business not found or update failed");

    return {
      message: "Profile updated successfully",
      business: this.sanitizeBusiness(updatedBusiness),
    };
  };
}
