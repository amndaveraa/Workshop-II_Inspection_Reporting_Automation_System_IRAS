export interface Employee {
  employeeid: string;
  name: string;
  email: string;
  hashedPassword: string;
  role: "administrator" | "inspector" | "supervisor" | "demo";
  department: string;
  phoneNum: string;
  avatar: string;
  isActive: boolean;
  lastLogin?: Date;
}