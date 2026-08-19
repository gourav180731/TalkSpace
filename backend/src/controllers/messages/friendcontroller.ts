import User from "../../models/user.model";
import FriendRequest from "../../models/friendRequest.model";
import { Request, Response } from "express";
import UserMOdel from "../../models/user.model";
import { Types } from "mongoose";
import Notification from "../../models/notification.modal";

type UserListItem = {
  _id: Types.ObjectId;
  username: string;
  avatar?: string;
  isFriend: boolean;
  requestStatus: "none" | "sent" | "received";
  isBot?: boolean;
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const myId = new Types.ObjectId(req.user!.userId);

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limitRaw = parseInt(req.query.limit as string) || 10;
    const limit = Math.min(Math.max(limitRaw, 1), 50);
    const skip = (page - 1) * limit;

    const q = (req.query.q as string | undefined)?.trim();

    const me = await UserMOdel.findById(myId).select("friends blockedUsers");
    if (!me) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const excludedIds = [
      myId,
      ...(me.blockedUsers ?? []), 
    ];

    const filter: any = {
      _id: { $nin: excludedIds },
    };

    if (q) {
      filter.$or = [
        { username: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      UserMOdel.find(filter)
        .select("username email avatar")
        .sort({ username: 1 })
        .skip(skip)
        .limit(limit),
      UserMOdel.countDocuments(filter),
    ]);

    const requests = await FriendRequest.find({
      status: "pending",
      $or: [{ from: myId }, { to: myId }],
    }).select("from to");

    const sentRequests = new Set(
      requests
        .filter((r) => r.from.toString() === myId.toString())
        .map((r) => r.to.toString())
    );

    const receivedRequests = new Set(
      requests
        .filter((r) => r.to.toString() === myId.toString())
        .map((r) => r.from.toString())
    );

    const friendsSet = new Set((me.friends ?? []).map((id) => id.toString()));

    const enrichedUsers: UserListItem[] = users.map((user) => {
      const userId = user._id.toString();

      let requestStatus: "none" | "sent" | "received" = "none";

      if (sentRequests.has(userId)) requestStatus = "sent";
      else if (receivedRequests.has(userId)) requestStatus = "received";

      return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        isFriend: friendsSet.has(userId),
        requestStatus,
      };
    });
    const botUser = await UserMOdel.findOne({ isBot: true })
  .select("username avatar");

if (botUser) {
  enrichedUsers.unshift({
    _id: botUser._id,
    username: botUser.username,
    avatar: botUser.avatar,
    isFriend: true,        
    requestStatus: "none",
    isBot: true,
  });
}


    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      users: enrichedUsers,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      msg: "Internal server error",
      error,
    });
  }
};

export const getMyFriends = async (req: Request, res: Response) => {
  try {
    const myId = req.user?.userId;

    const me = await UserMOdel.findById(myId).select("friends")
    if (!me) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

   const friends = await UserMOdel.find({
  $or: [
    { _id: { $in: me.friends } },
    { isBot: true }, 
  ],
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

export const sendFriendRequest = async (req: Request, res: Response) => {
  const { userId } = req.body;
  const fromUserId = req.user!.userId;

  if (!userId) {
    return res.status(400).json({ msg: "UserId is required" });
  }

  if (userId === fromUserId) {
    return res.status(400).json({ msg: "You cannot add yourself" });
  }

  const toUser = await User.findById(userId);
  if (!toUser) {
    return res.status(404).json({ msg: "User not found" });
  }

  const fromUser = await User.findById(fromUserId);
  if (fromUser?.friends.includes(toUser._id)) {
    return res.status(400).json({ msg: "Already friends" });
  }

  // KEY FIX: find ANY existing request (any status)
  const existingRequest = await FriendRequest.findOne({
    from: fromUserId,
    to: toUser._id,
  });

  if (existingRequest) {
    if (existingRequest.status === "pending") {
      return res.status(400).json({
        msg: "Friend request already sent",
      });
    }

    //  revive old request instead of creating new
    existingRequest.status = "pending";
    await existingRequest.save();
    
await Notification.findOneAndUpdate(
  {
    user: toUser._id,
    type: "FRIEND_REQUEST_INCOMING",
    referenceId: existingRequest._id,
  },
  {
    user: toUser._id,
    actor: fromUserId,
    type: "FRIEND_REQUEST_INCOMING",
    referenceId: existingRequest._id,
    read: false,
  },
  { upsert: true }
);

    return res.status(200).json({
      msg: "Friend request re-sent",
      requestId: existingRequest._id,
    });
  }

  const request = await FriendRequest.create({
    from: fromUserId,
    to: toUser._id,
    status: "pending",
  });

  await Notification.findOneAndUpdate(
  {
    user: toUser._id,
    type: "FRIEND_REQUEST_INCOMING",
    referenceId: request._id,
  },
  {
    user: toUser._id,
    actor: fromUserId,
    type: "FRIEND_REQUEST_INCOMING",
    referenceId: request._id,
    read: false,
  },
  { upsert: true }
);


  return res.status(201).json({
    msg: "Friend request sent",
    requestId: request._id,
  });
};

export const acceptFriendRequest = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const userId = req.user?.userId as string;

  const request = await FriendRequest.findById(requestId);

  if (!request) {
    return res.status(404).json({ msg: "Request not found" });
  }

  if (!request.to.equals(userId)) {
    return res.status(403).json({ msg: "Not authorized" });
  }

  if (request.status !== "pending") {
    return res.status(400).json({ msg: "Request already handled" });
  }

  request.status = "accepted";
  await request.save();

  await Notification.create({
  user: request.from,
  actor: request.to,
  type: "FRIEND_REQUEST_ACCEPTED",
  referenceId: request._id,
  read: false,
});


  await User.findByIdAndUpdate(request.from, {
    $addToSet: { friends: request.to },
  });

  await User.findByIdAndUpdate(request.to, {
    $addToSet: { friends: request.from },
  });

  return res.json({ msg: "Friend request accepted" });
};

export const rejectFriendRequest = async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const userId = req.user?.userId as string;

  const request = await FriendRequest.findById(requestId);

  if (!request || !request.to.equals(userId)) {
    return res.status(403).json({ msg: "Not authorized" });
  }

  request.status = "rejected";
  await request.save();

  await Notification.create({
  user: request.from,
  actor: request.to,
  type: "FRIEND_REQUEST_REJECTED",
  referenceId: request._id,
  read: false,
});


  res.json({ msg: "Friend request rejected" });
};

export const getFriendRequests = async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;

  const requests = await FriendRequest.find({
    to: userId,
    status: "pending",
  }).populate("from", "username email avatar");

  res.json(requests);
};

export const blockUser = async (req: Request, res: Response) => {
  try {
    const myId = req.user?.userId;
    const blockUserId = req.params.id;

    if (myId === blockUserId) {
      return res.status(400).json({ msg: "You cannot block yourself" });
    }

    await UserMOdel.findByIdAndUpdate(myId, {
      $pull: { friends: blockUserId },
      $addToSet: { blockedUsers: blockUserId },
    });

    await UserMOdel.findByIdAndUpdate(blockUserId, {
      $pull: { friends: myId },
    });

    return res.status(200).json({
      success: true,
      msg: "User blocked successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, msg: "Internal server error" });
  }
};

export const unfriendUser = async (req: Request, res: Response) => {
  try {
    const myId = req.user!.userId;
    const friendId = req.params.id;

    if (!myId || !friendId) {
      return res.status(400).json({
        success: false,
        msg: "Invalid request",
      });
    }

    // 1️⃣ Check if they are actually friends
    const me = await UserMOdel.findById(myId).select("friends");

    if (!me || !me.friends.includes(friendId as any)) {
      return res.status(400).json({
        success: false,
        msg: "You are not friends",
      });
    }

    // 2️⃣ Remove friendship (both sides)
    await UserMOdel.findByIdAndUpdate(myId, {
      $pull: { friends: friendId },
    });

    await UserMOdel.findByIdAndUpdate(friendId, {
      $pull: { friends: myId },
    });

    // 3️⃣ Create SYSTEM notification for the OTHER user
    await Notification.create({
      user: friendId,      // receiver
      actor: myId,         // who unfriended
      type: "UNFRIENDED",
      read: false,
    });

    return res.status(200).json({
      success: true,
      msg: "User unfriended successfully",
    });
  } catch (error) {
    console.error("UNFRIEND ERROR:", error);
    return res.status(500).json({
      success: false,
      msg: "Internal server error",
    });
  }
};

export const cancelFriendRequest = async (req: Request, res: Response) => {
  const myId = req.user!.userId;
  const requestId = req.params.requestId;

  const request = await FriendRequest.findOne({
    _id: requestId,
    from: myId,
    status: "pending",
  });

  if (!request) {
    return res.status(404).json({ msg: "Request not found" });
  }

  request.status = "cancelled";
await request.save();

  await Notification.create({
  user: request.to,
  actor: myId,
  type: "FRIEND_REQUEST_CANCELLED",
  referenceId: request._id,
  read: false,
});


  return res.json({
    success: true,
    msg: "Friend request cancelled",
  });
};
