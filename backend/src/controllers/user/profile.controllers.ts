import { Request, Response } from "express";
import UserMOdel from "../../models/user.model";
import { sanitizeUser } from "../../utils/sanitizeUser";
import path from "path";
import cloudinary from "../../libs/cloudinary";



export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, dob, gender, bio } = req.body;
    const userID = req.user?.userId;

    if (!userID) {
      return res.status(401).json({ success: false, msg: "unauthorised" });
    }

    const user = await UserMOdel.findById(userID);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const updateData: any = {
      firstName,
      lastName,
      dob,
      bio,
    };


    if (gender) {
      const genderKey = gender.toLowerCase();
      updateData.gender = genderKey;

       if (user.avatarSource !== "user") {
        const avatarColors = ["6366f1", "ec4899", "8b5cf6", "f59e0b", "10b981", "3b82f6", "ef4444", "14b8a6"];
        const index = Array.from(userID.toString()).reduce(
          (sum, c) => sum + c.charCodeAt(0), 0
        ) % avatarColors.length;
        updateData.avatar = `https://ui-avatars.com/api/?name=U&background=${avatarColors[index]}&color=fff&size=128`;
      }
    }


    await UserMOdel.findByIdAndUpdate(userID, updateData, {
      new: true,
    }).select("-password -refreshToken");

    return res
      .status(200)
      .json({ success: true, msg: "Profile updated successfully" });

  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, msg: "Internal server error" });
  }
};


 export const uploadProfilePhoto = async (req: Request, res: Response) => {
  try {
    const userID = req.user?.userId;
       if (!userID) {
            return res.status(401).json({ success: false, msg: "unauthorised" })
      };
      if (!req.file) {
        return res.status(400).json({success:false,msg:"No image uploaded"})
      };

    const allowedMimeTypes =[
      "image/jpeg",
      "image/png",
      "image/svg"
    ];

if (!allowedMimeTypes.includes(req.file.mimetype)){
 return res.status(400).json({message:"only image is used as profile photo"});
};

    const fileExt = path.extname(req.file.originalname);
    const publicId = `profile-images/${userID}/profile-${Date.now()}`;

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "profile-images",
          public_id: `${userID}/profile-${Date.now()}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file!.buffer);
    });

    const photoUrl = result.secure_url;

    const updatedUser = await UserMOdel.findByIdAndUpdate(
      userID,
      {
    avatar: photoUrl,
    avatarSource: "user", 
  },
      { new: true }
      ).select("-password -refreshToken");
      
      updatedUser?.save();

      res.status(200).json({
      success: true,
      msg: "Profile photo uploaded successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({success: false,msg: "Image upload failed"});
  }
};

export const getprofile = async (req: Request, res: Response) => {
  try {
    const userID = req.user?.userId;
    if (!userID) {
      return res.status(401).json({ success: false, msg: "unauthorised" });
    }

    let user = await UserMOdel.findById(userID);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    // AUTO ASSIGN AVATAR
    if (!user.avatar) {
      const avatarColors = ["6366f1", "ec4899", "8b5cf6", "f59e0b", "10b981", "3b82f6", "ef4444", "14b8a6"];
      const index = Array.from(userID.toString()).reduce(
        (sum, c) => sum + c.charCodeAt(0), 0
      ) % avatarColors.length;
      user.avatar = `https://ui-avatars.com/api/?name=U&background=${avatarColors[index]}&color=fff&size=128`;
      user.avatarSource = "auto";
      await user.save();
    }

    const safeUser = sanitizeUser(user);

    return res.status(200).json({
      success: true,
      msg: "User info",
      safeUser,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, msg: "Internal server error" });
  }
};
