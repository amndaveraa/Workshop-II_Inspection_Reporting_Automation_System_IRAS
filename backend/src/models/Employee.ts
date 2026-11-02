export interface Employee {
  employeeid: string;
  name: string;
  email: string;
  phoneNum: string;
  hashedPassword: string;
  role: string;
  department: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}
