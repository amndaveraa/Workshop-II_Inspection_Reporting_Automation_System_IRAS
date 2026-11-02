import { Request, Response } from "express";
import bcrypt from "bcrypt";
import * as EmployeeService from "../services/employeeService";
import * as AuthService from "../services/authService"

export const updateProfile = async (req: Request, res: Response) => {
    console.log("Headers:", req.headers['content-type']); // application/json
    console.log("Full Body:", req.body); // If this is {} or undefined, the parser failed
    try {
        const { employeeid, name, phoneNum } = req.body;

        if (!employeeid || !name) {
            return res.status(400).json({ error: "Employee ID and Name are required." });
        }

        const updatedEmployee = await EmployeeService.updateEmployeeProfile(
            employeeid, 
            name, 
            phoneNum
        );

        const newToken = AuthService.generateToken(updatedEmployee);

        res.json({ 
        message: "Profile updated successfully", 
        token: newToken, 
        employee: updatedEmployee 
        });

        return res.status(200).json({
            message: "Profile updated successfully",
            user: updatedEmployee
        });

    } catch (error: any) {
        console.error("Controller Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { employeeid, currentPassword, newPassword } = req.body;

        // 1. Fetch user from DB
        const user = await EmployeeService.getEmployeeById(employeeid); 
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        
        // 2. Compare passwords (The most important security step)
        const isMatch = await bcrypt.compare(currentPassword, user.hashedPassword);
        if (!isMatch) {
            // We use status 401 (Unauthorized) or 400
            return res.status(400).json({ message: "The current password you entered is incorrect." });
        }

        // 3. Hash the new password
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(newPassword, salt);

        // 4. Update in Database
        await EmployeeService.updateEmployeePassword(employeeid, newHash);

        res.status(200).json({ message: "Password changed successfully!" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateAvatar = async (req: Request, res: Response) => {
    try {
        const { employeeid } = req.body;
        const file = req.file; // Provided by Multer

        if (!employeeid || !file) {
            return res.status(400).json({ error: "Employee ID and Image are required." });
        }

        // Call Service
        const updatedEmployee = await EmployeeService.updateEmployeeAvatar(employeeid, file);

        // Generate new token with updated avatarUrl
        const newToken = AuthService.generateToken(updatedEmployee);

        return res.status(200).json({
            message: "Avatar updated successfully",
            token: newToken,
            employee: updatedEmployee,
            avatarUrl: updatedEmployee.avatarUrl
        });

    } catch (error: any) {
        console.error("Controller Error:", error.message);
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};