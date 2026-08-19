import { Request, Response } from "express";
import UserMOdel from "../../models/user.model";
import MessageModal from "../../models/message.model";
import { Types } from "mongoose";
import { onlineUsers } from "../../socket";
import { getIO } from "../../socketEmitter";
import mongoose from "mongoose";
import { IMessage } from "../../models/message.model";
import { getChatId } from "../../utils/constants";
import { handleAIBotReply } from "../../libs/aiBot";
import cloudinary from "../../libs/cloudinary";

type PopulatedReplyTo = {
  _id: Types.ObjectId;
   clientId?: string; 
  text?: string;
  senderId: {
    _id: Types.ObjectId;
    username: string;
  };
};

export const getMyFriends = async (req: Request, res: Response) => {
  try {
    const myId = req.user?.userId;

    const me = await UserMOdel.findById(myId).select("friends");
    if (!me) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const friends = await UserMOdel.find({
      _id: { $in: me.friends },
    }).select("-password -refreshToken");

    return res.status(200).json({
      success: true,
      msg: "Fetched friends",
      users: friends,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, msg: "Internal server error" });
  }
};

export const getChatList = async (req: Request, res: Response) => {
  try {
    const myId = new Types.ObjectId(req.user!.userId);

    const chats = await MessageModal.aggregate([
      // 1️⃣ Only messages involving me
      {
        $match: {
          $or: [{ senderId: myId }, { receiverId: myId }],
        },
      },

      // 2️⃣ Determine the other user
      {
        $addFields: {
          otherUser: {
            $cond: [{ $eq: ["$senderId", myId] }, "$receiverId", "$senderId"],
          },
        },
      },

      // 3️⃣ Sort latest messages first
      { $sort: { createdAt: -1 } },

      // 4️⃣ Group by other user
      {
        $group: {
          _id: "$otherUser",

          // latest message
          lastMessage: { $first: "$$ROOT" },

          // 🔥 unread count
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", myId] },
                    { $eq: ["$isRead", false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // 5️⃣ Sort chats by last message time
      {
        $sort: {
          "lastMessage.createdAt": -1,
        },
      },
    ]);

    // 6️⃣ Fetch user details
    const userIds = chats.map((c) => c._id);

    const users = await UserMOdel.find({
      _id: { $in: userIds },
    }).select("username avatar isBot");

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // 7️⃣ Build final response
    const chatList = chats.map((chat) => {
      const user = userMap.get(chat._id.toString());

      return {
        user,
        lastMessage: {
          text: chat.lastMessage.text,
          file: chat.lastMessage.file,
          senderId: chat.lastMessage.senderId,
          createdAt: chat.lastMessage.createdAt,
        },
        unreadCount: chat.unreadCount,
        lastMessageAt: chat.lastMessage.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      chats: chatList,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { sender, receiver } = req.chatUsers!;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;

    const messages = await MessageModal.find({
      $or: [
        { senderId: sender._id, receiverId: receiver._id },
        { senderId: receiver._id, receiverId: sender._id },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("senderId", "username avatar")
      .populate({
  path: "replyTo",
  select: "text senderId",
  populate: {
    path: "senderId",
    select: "username",
  },
})

    const normalizedMessages = messages.reverse().map((m: any) => ({
  ...m.toObject(),
  replyTo: m.replyTo
    ? {
        _id: m.replyTo._id,
      text: m.replyTo.text,
        clientId: m.replyTo.clientId,
        senderId: m.replyTo.senderId._id,
        senderName: m.replyTo.senderId.username,
      }
    : null,
}));

return res.status(200).json({
  success: true,
  messages: normalizedMessages,
});
  } catch {
    return res.status(500).json({ success: false });
  }
};

export const sendMessages = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const { clientId  } = req.body;
    const { sender, receiver } = req.chatUsers!;
   const replyTo =
  typeof req.body.replyTo === "string"
    ? req.body.replyTo
    : undefined;

    const chatId = getChatId(
  sender._id.toString(),
  receiver._id.toString()
);

const allowedMimesTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-matroska",

  // documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // 🎤 ADD AUDIO
  "audio/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg"
];

    let fileUrl: string | undefined;

    if (req.file) {
      if (!allowedMimesTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          msg: "File type not allowed",
        });
      }

      const folder = req.file.mimetype.startsWith("image/")
        ? "chat-images"
        : req.file.mimetype.startsWith("video/")
        ? "chat-video"
        : req.file.mimetype.startsWith("audio/")
        ? "chat-audio"
        : "chat-files";

      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "auto",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file!.buffer);
      });

      fileUrl = result.secure_url;
    }

    if (!text && !fileUrl) {
      return res.status(400).json({
        success: false,
        msg: "Message must contain text or file",
      });
    }

    const message = await new MessageModal({
       chatId,
  senderId: sender._id,
  receiverId: receiver._id,
  text,
      file: fileUrl,
   mimeType: req.file ? req.file.mimetype : undefined, 
      clientId,
  status: "sent",
  ...(replyTo && { replyTo: new Types.ObjectId(replyTo) }),
}).save();

const populatedMessage = await MessageModal.findOne({
  _id: message._id,
})
  .populate({
  path: "replyTo",
  select: "text senderId",
  populate: {
    path: "senderId",
    select: "username",
  },
})
  .lean<IMessage & { replyTo?: PopulatedReplyTo | null }>();
    
    if (!populatedMessage) {
  return res.status(500).json({ success: false });
}
   const msg = {
  ...populatedMessage,
  replyTo: populatedMessage.replyTo
    ? {
        _id: populatedMessage.replyTo._id,
      text: populatedMessage.replyTo.text,
        clientId: populatedMessage.replyTo.clientId, 
        senderId: populatedMessage.replyTo.senderId._id,
        senderName: populatedMessage.replyTo.senderId.username,
      }
    : null,
};

    const receiverIdStr = receiver._id.toString();
    const senderIdStr = sender._id.toString();

    const receiverSocketId = onlineUsers.get(receiverIdStr);
    const io = getIO();

       const senderSocketId = onlineUsers.get(senderIdStr);
      if (senderSocketId) {
  io.to(senderSocketId).emit("new-message", {
    message: msg,
  });
}
    if (receiverSocketId) {
  io.to(receiverSocketId).emit("new-message", {
    message: {
      ...msg,
      clientId,
    },
  });

  io.to(receiverSocketId).emit("unread-update", {
    from: senderIdStr,
  });
    }
    if (receiver.isBot) {
  handleAIBotReply({
    chatId: chatId.toString(),
    userMessage: text || "",
    userId: sender._id.toString(),
  });
}

return res.status(200).json({
  success: true,
  message: {
    ...msg,
    clientId,
  },
});

  } catch (error) {
    return res.status(500).json({
      success: false,
      msg: "Internal server error",
      error: error,
    });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response) => {
  const myId = req.user?.userId;
  const friendId = req.params.id;

  await MessageModal.updateMany(
    {
      senderId: friendId,
      receiverId: myId,
      isRead: false,
    },
    { $set: { isRead: true } }
  );

  const io = getIO();

  const friendSocket = onlineUsers.get(friendId);
  if (friendSocket) {
    io.to(friendSocket).emit("messages-read", {
      by: myId,
    });
  }

  return res.json({ success: true });
};

export const clearChat = async (req: Request, res: Response) => {
  const myId = req.user!.userId;
  const friendId = req.params.id;

  await MessageModal.updateMany(
    {
      $or: [
        { senderId: myId, receiverId: friendId },
        { senderId: friendId, receiverId: myId },
      ],
    },
    {
      $addToSet: { deletedFor: myId },
    }
  );

  return res.json({
    success: true,
    msg: "Chat cleared for you",
  });
};

export const deleteMessageForEveryone = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId.toString();

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({
        msg: "Invalid message id",
      });
    }
    const message = await MessageModal.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    if (message.senderId.toString() !== userId) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    message.isDeleted = true;
    message.text = "";
    message.file = undefined;
    await message.save();

    const io = getIO();

    const receiverSocketId = onlineUsers.get(message.receiverId.toString());
    const senderSocketId = onlineUsers.get(userId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-deleted", {
        messageId,
      });
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit("message-deleted", {
        messageId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ msg: "Server error", error });
  }
};

export const deleteMessageForMe = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const myId = req.user!.userId;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ msg: "Invalid message id" });
    }

    const message = await MessageModal.findById(messageId);
    if (!message) {
      return res.status(404).json({ msg: "Message not found" });
    }

    if (!message.deletedFor.includes(myId)) {
      message.deletedFor.push(myId);
      await message.save();
    }

    return res.json({
      success: true,
      msg: "Message deleted for you",
    });
  } catch (err) {
    return res.status(500).json({ msg: "Server error" });
  }
};
export const reactToMessage = async (req:Request, res:Response) => {
  try {
    const { emoji } = req.body;
    const userId = req.user?.userId;
    const messageId = req.params.messageId;

    const message = await MessageModal.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false });
    }

    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== userId
    );

    message.reactions.push({ emoji, userId: new mongoose.Types.ObjectId(userId) });

    await message.save();

    const io = getIO();

    const senderId = message.senderId.toString();
    const receiverId = message.receiverId.toString();

    const receiverSocketId = onlineUsers.get(receiverId);
    const senderSocketId = onlineUsers.get(senderId);

    const payload = {
      messageId: message._id,
      reactions: message.reactions,
    };

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-reaction", payload);
    }

    if (senderSocketId) {
      io.to(senderSocketId).emit("message-reaction", payload);
    }

    return res.json({
      success: true,
      reactions: message.reactions,
    });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
};