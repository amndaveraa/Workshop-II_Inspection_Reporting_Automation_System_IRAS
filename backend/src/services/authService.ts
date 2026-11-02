import supabase from '../config/supabaseClient';
import { Employee } from '../models/Employee'
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken"

export const findUserByEmail = async (email: string): Promise<{ data?: Employee; error?: any }> => {
    const { data, error } = await supabase
        .from('employee')
        .select("*")
        .eq('email', email)
        .single();

    if (error) {
        console.log(error);
        return { error };
    }

    return { data };
};

export const validatePassword = async (password: string, inputHashedPass: string): Promise<boolean> => {
    if (!inputHashedPass) throw new Error('No hash provided');
    return bcrypt.compare(password, inputHashedPass);
};

export const updateLoginTimestamp = async (id: string): Promise<void> => {
    if (!id || id === "undefined") {
        console.error("Update aborted: Provided ID is null or undefined");
        return;
    }
    const now = new Date().toISOString();
    console.log(`Updating ID: ${id} at ${now}`);

    const { error } = await supabase
        .from('employee')
        .update({ lastLogin: now })
        .eq('employeeid', id)
        .single();

    if (error) {
        console.warn("Unable to update lastLogin:", error);
    }
};

export const generateToken = (employee: Employee, rememberMe: boolean = false): string => {
  const expiresIn = rememberMe ? "7d" : "1h";
  
  return jwt.sign(
    { 
      employeeid: employee.employeeid, 
      name: employee.name, 
      email: employee.email, 
      phoneNum: employee.phoneNum, 
      role: employee.role, 
      department: employee.department, 
      isActive: employee.isActive, 
      lastLogin: employee.lastLogin,
      avatar: employee.avatarUrl,
    }, 
    process.env.JWT_SECRET!, 
    { expiresIn }
  );
};