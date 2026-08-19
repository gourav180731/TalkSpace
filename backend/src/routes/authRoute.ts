import express from "express";
import {
  forgetPassword,
  login,
  logout,
  register,
  resendVerificationCode,
  updatePassword,
  verifyEmail,
  checkAuth,
  refreshAccessToken,
  getTestOTP
} from "../controllers/user/auth.controllers";

import { authMiddleware } from "../middlewares/auth.middleware";
import { authLimiter, strictLimiter, mediumLimiter } from "../middlewares/rateLimiter";

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/verifyEmail", mediumLimiter, verifyEmail);

router.post("/login", authLimiter, login);

router.post("/resendverificationcode", strictLimiter, resendVerificationCode);
router.post("/forgotPassword", strictLimiter, forgetPassword);

router.post("/updatepassword", mediumLimiter, updatePassword);
router.post("/refresh", mediumLimiter, refreshAccessToken);

router.post("/logout", authMiddleware, logout);
router.get("/check", authMiddleware, checkAuth);

// Development only - Get test OTP
router.post("/test-otp", getTestOTP);

export default router;