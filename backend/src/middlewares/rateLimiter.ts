import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 300, // Development: very high, Production: 300 requests per IP
  message: {
    success: false,
    msg: "Too many requests, please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 10, // Development: 1000, Production: 10 attempts per 15 min
  message: {
    success: false,
    msg: "Too many login attempts. Try again later."
  }
});

export const messageLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: isDev ? 1000 : 30, // Development: 1000, Production: 30 messages per 10 seconds
  message: {
    success: false,
    msg: "You're sending messages too fast."
  }
});

export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 5, // Development: 500, Production: 5 requests per 15 min
  message: {
    success: false,
    msg: "Too many attempts. Try again later.",
  },
});

export const mediumLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 500 : 20, // Development: 500, Production: 20 per 10 min
  message: {
    success: false,
    msg: "Too many requests. Slow down.",
  },
});

export const contactSyncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 3,
  message: { success: false, msg: "Too many contact sync attempts. Try again later." },
});

export const statusRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: isDev ? 100 : 10,
  message: { success: false, msg: "Too many statuses. Try again later." },
});

export const groupCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: isDev ? 100 : 5,
  message: { success: false, msg: "Group creation limit reached. Try tomorrow." },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 30,
  message: { success: false, msg: "Too many search requests." },
});