import mongoose, { Types, Document } from "mongoose";

export interface IChatCustomization {
  chatId: string;
  wallpaper?: {
    type: "preset" | "custom";
    value: string; // preset name or Cloudinary URL
  };
  theme?: {
    bubbleColorSent: string;
    bubbleColorReceived: string;
    textColorSent: string;
    textColorReceived: string;
  };
}

export interface IUserSettings extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  
  // Notification settings
  pushNotificationsEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  
  // Chat settings
  enterToSend: boolean;
  fontSize: "small" | "medium" | "large";
  autoDownloadMedia: {
    photos: boolean;
    videos: boolean;
    documents: boolean;
  };
  
  // Appearance
  theme: "light" | "dark" | "auto";
  glassmorphicIntensity: number; // 0-100
  
  // Call settings
  audioQuality: "low" | "medium" | "high";
  videoQuality: "low" | "medium" | "high";
  
  // Chat customization
  chatCustomizations: IChatCustomization[];
  
  // Storage
  mediaCacheSize: number; // bytes
  lastCacheClear?: Date;

  // Additional chat settings
  keepChatsArchived: boolean;
  mediaVisibility: boolean;
  stickerSuggestions: boolean;
  voiceTranscriptEnabled: boolean;

  // Account / security
  securityNotifications: boolean;
  twoStepEnabled: boolean;

  // Language
  language: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new mongoose.Schema<IUserSettings>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    pushNotificationsEnabled: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    vibrationEnabled: { type: Boolean, default: true },
    enterToSend: { type: Boolean, default: true },
    fontSize: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },
    autoDownloadMedia: {
      photos: { type: Boolean, default: true },
      videos: { type: Boolean, default: false },
      documents: { type: Boolean, default: false },
    },
    theme: {
      type: String,
      enum: ["light", "dark", "auto"],
      default: "auto",
    },
    glassmorphicIntensity: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    audioQuality: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    videoQuality: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    keepChatsArchived: { type: Boolean, default: false },
    mediaVisibility: { type: Boolean, default: true },
    stickerSuggestions: { type: Boolean, default: true },
    voiceTranscriptEnabled: { type: Boolean, default: false },
    securityNotifications: { type: Boolean, default: true },
    twoStepEnabled: { type: Boolean, default: false },
    language: { type: String, default: "en" },
    chatCustomizations: [
      {
        chatId: { type: String, required: true },
        wallpaper: {
          type: {
            type: String,
            enum: ["preset", "custom"],
          },
          value: String,
        },
        theme: {
          bubbleColorSent: String,
          bubbleColorReceived: String,
          textColorSent: String,
          textColorReceived: String,
        },
      },
    ],
    mediaCacheSize: { type: Number, default: 0 },
    lastCacheClear: { type: Date },
  },
  { timestamps: true }
);

const UserSettings = mongoose.model<IUserSettings>("UserSettings", userSettingsSchema);

export default UserSettings;
