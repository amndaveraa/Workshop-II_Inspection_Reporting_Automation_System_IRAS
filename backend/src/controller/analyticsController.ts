import { Request, Response } from "express";
import { buildAnalyticsOverview } from "../services/analyticsService";

const statusFromError = (err: any) => Number(err?.status) || 500;
const messageFromError = (err: any) =>
  (typeof err?.message === "string" && err.message.trim()) || "Internal server error";

const validatePositiveInteger = (value: any, defaultValue: number, min: number, max: number): number => {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num < min || num > max) {
    return defaultValue;
  }
  return num;
};

export const getAnalyticsOverview = async (req: Request, res: Response) => {
  try {
    // Validate and sanitize query parameters
    const months = validatePositiveInteger(req.query.months, 6, 3, 24);
    const overdueDays = validatePositiveInteger(req.query.overdueDays, 365, 30, 3650);

    const result = await buildAnalyticsOverview({ months, overdueDays });

    if (result.error) {
      return res.status(statusFromError(result.error)).json({ message: messageFromError(result.error) });
    }

    return res.status(200).json(result.data);
  } catch (error: any) {
    console.error("Analytics overview error:", error);
    return res.status(500).json({ message: messageFromError(error) });
  }
};
