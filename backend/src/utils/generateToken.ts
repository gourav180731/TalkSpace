import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { Response } from "express";

export const generateToken = (
  userId: Types.ObjectId,
  email: string,
  res: Response
) => {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: "30m" }
  );
  const refreshToken = jwt.sign(
    { userId, email },
    process.env.REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
};

export const generateAccessToken = (
  userId: Types.ObjectId,
  email: string
) => {
  return jwt.sign(
    { userId, email },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: "30m" }
  );
};
