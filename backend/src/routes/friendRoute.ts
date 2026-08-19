import  express  from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { acceptFriendRequest, blockUser, getAllUsers, getFriendRequests, rejectFriendRequest, sendFriendRequest, getMyFriends, unfriendUser, cancelFriendRequest } from "../controllers/messages/friendcontroller";

const router = express.Router();

router.get("/allusers", authMiddleware, getAllUsers);
router.get("/", authMiddleware, getMyFriends);
router.post("/request", authMiddleware, sendFriendRequest);
router.post("/accept/:requestId", authMiddleware, acceptFriendRequest);
router.post("/reject/:requestId", authMiddleware, rejectFriendRequest);
router.get("/requests", authMiddleware, getFriendRequests);
router.post("/block/:id", authMiddleware, blockUser);
router.post("/unfriend/:id", authMiddleware, unfriendUser);
router.delete("/request/:id", authMiddleware, cancelFriendRequest);

export default router;