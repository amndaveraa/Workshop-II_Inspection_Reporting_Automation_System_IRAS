// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Employee } from "../models/Employee"; // Your TS Employee type
import supabase from "../config/supabaseClient";

// Extend Request to include user
export interface AuthenticatedRequest extends Request {
  user: Employee;
}

// Middleware
export const authenticateInspector = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Example: token in Authorization header: "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { employeeid: string; role: string };

    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch user from DB
    const { data: userData, error } = await supabase
      .from("employees")
      .select("*")
      .eq("employeeid", decoded.employeeid)
      .single();

    if (error || !userData) {
      return res.status(401).json({ error: "User not found" });
    }

    // Check role
    if (userData.role !== "inspector") {
      return res.status(403).json({ error: "Forbidden: Not an inspector" });
    }

    // Attach user to req
    req.user = userData as Employee;

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
