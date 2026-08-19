import dotenv from "dotenv";
dotenv.config();

import express, { Application, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/authRoute";
import meRoutes from "./routes/meRoutes";
import messageRoute from "./routes/messageRoute";
import friendRoute from "./routes/friendRoute";
import { healthCheck } from "./controllers/health.controller";
import notificationRoutes from "./routes/notificationRoute";
import { globalLimiter } from "./middlewares/rateLimiter";
const app: Application = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== "production" && origin.startsWith("http://localhost:")) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(globalLimiter);

app.get("/api/health", healthCheck);

app.get("/api", (req: Request, res: Response) => {
  res.send("Server is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/message", messageRoute);
app.use("/api/friends", friendRoute);
app.use("/api/notifications", notificationRoutes);

export default app;
