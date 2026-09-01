import { IUser, User } from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken"

export interface AuthRequest extends Request {
    user?: IUser
}


export const verifyJWT = asyncHandler( async (req: AuthRequest, _: Response, next: NextFunction) => {

    const token = 
    req.cookies?.accessToken || 
    req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken =  jwt.verify(
        token, 
        process.env.ACCESS_TOKEN_SECRET as string
    ) as JwtPayload & { _id: string }

    const user = await User.findById(decodedToken._id).select("-password -refreshToken")

    if (!user) {
        console.log("verifyJWT - User not found for token id:", decodedToken._id);
        throw new ApiError(401, "Invalid Access Token")
    }

    req.user = user

    next()
    
})

export const verifyAdmin = asyncHandler( async (req: AuthRequest, _: Response, next: NextFunction) => {
    if (req.user?.role !== "admin") {
        throw new ApiError(403, "Access denied. Admin only.");
    }
    next();
})