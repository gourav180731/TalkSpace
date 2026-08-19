import express from "express";
import { getprofile, updateProfile, uploadProfilePhoto } from "../controllers/user/profile.controllers";
import { authMiddleware } from "../middlewares/auth.middleware";
import { upload } from "../libs/multer";

const router = express.Router();

router.post("/updateprofile", authMiddleware, updateProfile);
router.get("/getuser", authMiddleware, getprofile);
router.post("/uploadprofilephoto", authMiddleware,upload.single("avatar"),uploadProfilePhoto);


export default router;