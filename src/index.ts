import express, { Application } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import connectDB from './db/db';
import userRouter from './routes/user.route';



dotenv.config();

const app: Application = express();
const PORT = process.env.PORT;

//database connection
connectDB();

// Middleware
app.use(bodyParser.json());

// Register Routes
app.use('/api/user', userRouter); 

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
});