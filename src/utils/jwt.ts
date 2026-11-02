import jwt from "jsonwebtoken";
import type { Employee } from "../models/Employee";

const JWT_SECRET = process.env.JWT_SECRET as string;

export function verifyToken(token: string): Employee {
  return jwt.verify(token, JWT_SECRET) as Employee;
}
