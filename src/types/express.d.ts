import type { Employee } from "../models/Employee";

declare global {
  namespace Express {
    interface Request {
      user: Employee;
    }
  }
}
