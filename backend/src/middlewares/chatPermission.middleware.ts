import { Request, Response, NextFunction } from "express";
import UserMOdel from "../models/user.model";
import { Types } from "mongoose";

import { IUser } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      chatUsers?: {
        sender: IUser;
        receiver: IUser;
      };
    }
  }
}

export const chatPermissionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const senderId = req.user?.userId;
    const receiverId = req.params.id;

    if (!senderId || !receiverId) {
      return res.status(400).json({
        success: false,
        msg: "Invalid sender or receiver",
      });
    }

    const sender = await UserMOdel.findById(senderId);
    const receiver = await UserMOdel.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({
        success: false,
        msg: "User not found",
      });
    }

    const senderBlockedReceiver = sender.blockedUsers?.some(
      (id: Types.ObjectId) => id.toString() === receiverId
    );
    if (!receiver.isBot) {
      if (senderBlockedReceiver) {
        return res.status(403).json({
          success: false,
          msg: "You have blocked this user",
        });
      }
    }

    const receiverBlockedSender = receiver.blockedUsers?.some(
      (id: Types.ObjectId) => id.toString() === senderId
    );
    if (receiverBlockedSender) {
      if (receiverBlockedSender) {
        return res.status(403).json({
          success: false,
          msg: "You are blocked by this user",
        });
      }
    }

    const isFriend = sender.friends.some(
      (id: Types.ObjectId) => id.toString() === receiverId
    );
    if (!receiver.isBot) {
      if (!isFriend) {
        return res.status(403).json({
          success: false,
          msg: "You can only chat with friends",
        });
      }
    }

    req.chatUsers = {
      sender,
      receiver,
    };

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
};
