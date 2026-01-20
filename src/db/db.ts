import mongoose from 'mongoose';
import dotenv from "dotenv";

dotenv.config();

const connectDB = async (): Promise<void> => {
    const dbUri = process.env.MONGO_DB_URI;

    if (!dbUri) {
        console.error('FATAL ERROR: DB_URL is not defined.');
        process.exit(1); 
    }

    try {
        await mongoose.connect(dbUri);
        
        console.log('Connected to Database');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1); 
    }
};

export default connectDB;