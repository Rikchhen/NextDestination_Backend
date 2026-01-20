import { UserModel, IUser } from "../models/user.model";


export interface UserRepositoryInterface {
    getAllUsers(skip?: number, limit?: number): Promise<IUser[]>;
    getUserById(userId: string): Promise<IUser | null>;
    getUserByNumber(phoneNumber:String):Promise<IUser | null>;
    getUserWithPassword(userId: string): Promise<IUser | null>;
    createUser(user: Partial<IUser>): Promise<IUser>;
    updateUser(userId: string, updatedData: Partial<IUser>): Promise<IUser | null>;
    deleteUser(userId: string): Promise<IUser | null>;
}

export class UserRepository implements UserRepositoryInterface {

    async getUserByEmail(email: string): Promise<IUser | null> {
        return UserModel.findOne({ email }).exec();
    }
    async getAllUsers(skip: number = 0, limit: number = 10) {
        return UserModel.find().skip(skip).limit(limit).exec();
    }

    async getUserById(userId: string) {
        return UserModel.findById(userId).exec();
    }

    async getUserByNumber(phoneNumber: string) {
        return UserModel.findOne({ phoneNumber }).exec();
    }

    async findByEmailOrUsername(email: string, username: string) {
        return UserModel.findOne({ $or: [{ email }, { username }] }).exec();
    }

    async getUserWithPassword(userId: string) {
        return UserModel.findById(userId).select("+password").exec();
    }


    async createUser(user: Partial<IUser>) {
        const newUser = new UserModel(user);
        return newUser.save();
    }

    async updateUser(userId: string, updatedData: Partial<IUser>) {
        return UserModel.findByIdAndUpdate(userId, updatedData, { new: true }).exec();
    }

    async deleteUser(userId: string) {
        return UserModel.findByIdAndDelete(userId).exec();
    }
}