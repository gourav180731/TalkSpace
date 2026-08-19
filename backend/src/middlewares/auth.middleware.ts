import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { decode } from "punycode";

interface TokenPayload{
    userId: string,
    email:string,
}

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.status(401).json({ success: false, msg: "Unauthorised. No access token provided" });
        };

        const decoded = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_SECRET as string,
        ) as TokenPayload;

        req.user = decoded;
        next();


    } catch (error :any) {
    
        return res.status(401).json({ success: false, msg: "accessToken expired" });
       
    };
};