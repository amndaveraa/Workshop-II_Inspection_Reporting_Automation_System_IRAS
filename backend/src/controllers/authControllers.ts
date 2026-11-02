import { Request, Response } from "express";
import * as AuthService from "../services/authService";
import { Employee } from "../models/Employee";

export const login = async (req: Request, res: Response) => {
  if (!req.body) return res.status(400).json({ message: "Request body is missing" });

  const { email, password, rememberMe } = req.body;
  
  // 1. Fetch user (Ensure the service below is updated to select avatar_url)
  const result = await AuthService.findUserByEmail(email);
  const employee: Employee = result.data!;

  if (!employee) {
    return res.status(404).json({ message: "User not found" });
  }

if (!employee.isActive) {
  return res.status(403).json({ message: "Your account is inactive. Contact administrator." });
}

  // 2. Validate password
  const isValid: boolean = await AuthService.validatePassword(password, employee.hashedPassword);

  if (!isValid) {
    return res.status(401).json({ message: "Invalid Password" }); // Use 401 for wrong password
  }

  // 3. Update login timestamp
  try {
    await AuthService.updateLoginTimestamp(employee.employeeid);
  } catch (err) {
    console.warn("Failed to update lastLogin:", err);
  }

  // 4. Generate Token (This employee object must have avatar_url now)
  const token = AuthService.generateToken(employee, rememberMe);
  
  // Return the data
  res.json({ token, employee });
};
