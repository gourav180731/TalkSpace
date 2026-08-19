import UserMOdel from "../../models/user.model";
import {generateCode } from "../../utils/otp";
import { forgetPasswordOtpMail, sendVerificationMail, welcomeEmail } from "../../utils/email";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { error } from "console";
import { generateAccessToken, generateToken } from "../../utils/generateToken";
import { AccessOptions, logoutOptions, RefreshOptions } from "../../utils/cookie";
import  jwt from "jsonwebtoken";

export const getTestOTP = async (req: Request, res: Response) => {
  // DEVELOPMENT ONLY - Remove in production
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ success: false, msg: "Not available in production" });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, msg: "Email is required" });
  }

  try {
    const user = await UserMOdel.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (!user.verificationCode) {
      return res.status(400).json({ success: false, msg: "No verification code generated" });
    }

    return res.status(200).json({
      success: true,
      msg: "OTP retrieved",
      otp: user.verificationCode,
      email: user.email,
      expiresAt: user.verificationCodeExpires,
    });
  } catch (error) {
    return res.status(500).json({ success: false, msg: "Server error" });
  }
};


export const register = async (req: Request, res: Response) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
     return res.status(400).json({ success: false, msg: "All fields are required" });
    };
    try {
        const conflict = await UserMOdel.findOne({
            isVerified: true,
            $or: [
                { email: email },
                { username: username },
            ]
        }).select('email username');

        if (conflict) {
            if (conflict.email === email) {
                return res.status(400).json({ success: false, msg: 'email already exists' })
            }
            if (conflict.username === username) {
                return res.status(400).json({ success: false, msg: "username already exists" })
            }
        }
      
    } catch (error) {
        console.error("Register conflict check error:", error);
        return res.status(500).json({ success: false, msg: "server error" })
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationCode = generateCode(6);
    const verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
        
    let user;
    try {
        user = await UserMOdel.findOne({ email: email, isVerified: false });
    } catch (error) {
        console.error("Register findOne error:", error);
        return res.status(500).json({ success: false, msg: "server error" })
    }
        
    if (user) {
        try {
            const usernameConflict = await UserMOdel.findOne({
                username: username,
                _id: { $ne: user._id }
            }).select('_id');
            if (usernameConflict) {
                return res.status(400).json({ success: false, msg: "username already exists" })
            }
        } catch (error) {
            console.error("Register username conflict error:", error);
            return res.status(500).json({ success: false, msg: "server error" })
        }
        user.username = username;
        user.email = email;
        user.password = hashedPassword;
        user.verificationCode = verificationCode;
        user.verificationCodeExpires = verificationCodeExpires;
        user.updatedAt = new Date();
    } else {
        user = new UserMOdel({
            email,
            username,
            password: hashedPassword,
            isVerified: false,
            verificationCode,
            verificationCodeExpires,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    try {
        await user?.save();
        try {
          await sendVerificationMail(email, verificationCode);
        } catch (error) {
            console.error("Email sending failed, OTP:", verificationCode);
        }
        return res.status(200).json({ success: true, msg: "check your email for verification code" })

    } catch (error) {
        console.error("Register save error:", error);
        return res.status(500).json({ success: false, msg: "server error" })
    }

};
 
export const resendVerificationCode= async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({success:false,msg:"email required"})
    };
        const user = await UserMOdel.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, msg: "User not found" })
        };
        if (user.isVerified === true) {
            return res.status(400).json({ success: false, msg: "User already verified" })
        };
        const code = generateCode(6);
        user.verificationCode = code;
        user.verificationCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
        user.updatedAt = new Date();
    try {
        await user.save();
        await sendVerificationMail(user.email, code);

        return res.status(200).json({ success: true, msg: "verification code send successfully" });
    } catch (error) {
        return res.status(400).json({ success: false, msg: "failed to send verification code" });
    };
    
}

export const verifyEmail = async (req: Request, res: Response) => {
  const { verificationCode, email } = req.body;

  if (!verificationCode) {
    return res.status(400).json({ success: false, msg: "verification code is required" });
  }

  try {
    const user = await UserMOdel.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, msg: "User not found" });
    }

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ success: false, msg: "invalid verification code" });
    }

    if (user.verificationCodeExpires && user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ success: false, msg: "verification code expired" });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    user.updatedAt = new Date();
    await user.save();

    welcomeEmail(user.email, user.username).catch((err) =>
      console.error("failed to send welcome email", err)
    );

    return res.status(200).json({
      success: true,
      msg: "Email verified successfully",
    });

  } catch (error: any) {
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};


export const login = async (req: Request, res: Response) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
        return res.status(400).json({ success: false, msg: "both field are required" })
    }
    try {
        const user = await UserMOdel.findOne({ $or: [{ email: identifier }, { username: identifier }] });
        if (!user) {
            return res.status(404).json({ success: false, msg: "User not found" })
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, msg: "wrong password" });

        if (user.isVerified === false) {
            return res.status(403).json({ success: false, msg: "email not verified yet" });
        };

        const { accessToken, refreshToken } = generateToken(user._id, user.email, res);
        user.refreshToken = refreshToken;
        await user.save();

      return res.status(200).cookie("accessToken", accessToken, AccessOptions).cookie("refreshToken", refreshToken, RefreshOptions).json({ success: true, msg: "login successfull" });

    } catch (error) {
        console.error("❌ Login error:", error);
        return res.status(500).json({ success: false, msg: "server error", error: String(error) })
    };
};
export const forgetPassword = async (req: Request, res: Response) => {
    const { identifier } = req.body;
    if (!identifier) {
        return res.status(400).json({ success: false, msg: "email or username is required field" });
    };
   
    const user = await UserMOdel.findOne({ $or: [{ email: identifier }, { username: identifier }] });
     
    if (!user) {
        return res.status(400).json({ success: false, msg: "User not found" });
    };
        
    const code = generateCode(6);
    user.resetPasswordOtp = code;
    user.resetPasswordOtpexpires = new Date(Date.now() + 5 * 60 * 60 * 1000);
    user.updatedAt = new Date();

    try {
        await user.save();
        forgetPasswordOtpMail(user.email, code);
        return res.status(200).json({ success: true, msg: "check your mail for forget password otp" });

    } catch (error) {
        return res.status(500).json({ success: false, msg: "Internal server error" });
    }
};

export const updatePassword = async (req: Request, res: Response) => {
  const { resetPasswordOtp, identifier, newPassword } = req.body;

  if (!identifier || !newPassword || !resetPasswordOtp) {
    return res.status(400).json({ success: false, msg: "All fields are required" });
  }

  const user = await UserMOdel.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });

  if (!user) {
    return res.status(400).json({ success: false, msg: "User not found" });
  }

  if (user.resetPasswordOtp !== resetPasswordOtp) {
    return res.status(400).json({ success: false, msg: "Invalid OTP" });
  }

  if (user.resetPasswordOtpexpires && user.resetPasswordOtpexpires < new Date()) {
    return res.status(400).json({ success: false, msg: "OTP expired" });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordOtpexpires = undefined;
  user.updatedAt = new Date();

  try {
    await user.save();
    return res.status(200).json({ success: true, msg: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response) => {
    
    try {
        await UserMOdel.findByIdAndUpdate(req.user?.userId, {
            refreshToken: undefined,
            refreshTokenExpires: undefined,
            updatedAt: new Date(),
        })
         res.clearCookie("accessToken", logoutOptions);
        res.clearCookie("refreshToken", logoutOptions);

        return res.status(200).json({
            success: true, msg: "Logged out successfully"});

    } catch (error) {
        return res.status(500).json({ success: false, msg: "Logout failed"});
           
    }
};

export const checkAuth = (req: Request, res: Response) => {

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (!req.user) {
    return res.status(401).json({ authenticated: false });
  }

  return res.status(200).json({
    authenticated: true,
    user: req.user 
  });
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(200).json({ authenticated: false });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET!
    ) as { userId: string };

    const user = await UserMOdel.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(200).json({ authenticated: false });
    }

    const newAccessToken = generateAccessToken(user._id, user.email);

    res.cookie("accessToken", newAccessToken, AccessOptions);

    const safeUser = {
  _id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
};

return res.status(200).json({
  authenticated: true,
  user: safeUser,
});
  } catch {
    return res.status(200).json({ authenticated: false });
  }
};

