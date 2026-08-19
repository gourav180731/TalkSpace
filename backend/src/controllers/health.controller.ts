import { Request, Response } from "express";
import mongoose from "mongoose";

export const healthCheck = async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;

  const states: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const status = {
    server: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",

    database: {
      status: states[mongoState],
      readyState: mongoState,
    },
  };

  if (mongoState !== 1) {
    return res.status(503).json({
      success: false,
      msg: "Service unhealthy",
      ...status,
    });
  }

  return res.status(200).json({
    success: true,
    msg: "Service healthy",
    ...status,
  });
};
