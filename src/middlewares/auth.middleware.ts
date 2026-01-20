import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import dotenv from "dotenv"

// if app-lication is a club
// A middleware acts as a bouncer between requests and controller
// meaning only authorized requests are sent to the controller to get response
// unauthorixed requests are those which dont have a valid auuth header attached to it

dotenv.config();

interface JwtPayload{
    id: string;
    role: string;
};

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
)=>{
    const authHeader = req.headers.authorization; // gets the token from the headers
    if (!authHeader || !authHeader.startsWith("Bearer ")) { // validates if auth header exists 
        return res.status(401).json({message: "No Token Provided"})
    };

    const token = authHeader.split(" ")[1];

    try {
        const decoded =jwt.verify( // this is the verification bit
            token,
            process.env.JWT_SECRET_KEY!
        )as JwtPayload;

        (req as any).user = decoded;

        next(); // if verified , goes to the next step [getting the response through the controller]
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}