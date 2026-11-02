import { Request, Response } from "express";
import {
  getAllUsers,
  createNewUser,
  updateExistingUser,
  deleteExistingUser,
  setUserActive,
  changeUserPasswordByAdmin,
} from "../services/userService";

const statusFromError = (err: any) => Number(err?.status) || 500;
const messageFromError = (err: any) =>
  (typeof err?.message === "string" && err.message.trim()) || "Internal server error";


export const getUsers = async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status ?? "").toLowerCase();
    const result = await getAllUsers(status);
    if (result.error) {
      return res
        .status(statusFromError(result.error))
        .json({ message: messageFromError(result.error) });
    }
    return res.status(200).json(result.data ?? []);
  } catch (error: any) {
    return res.status(500).json({ message: messageFromError(error) });
  }
};


export const createUser = async (req: Request, res: Response) => {
  const { name, email, role, status, department, phoneNum } = req.body ?? {};
  if (!name || !email) return res.status(400).json({ message: "Name and email are required" });

  try {
    const result = await createNewUser({ name, email, role, status, department, phoneNum });
    if (result.error) {
      return res
        .status(statusFromError(result.error))
        .json({ message: messageFromError(result.error) });
    }
    return res.status(201).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ message: messageFromError(error) });
  }
};


export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "User ID is required" });

  try {
    const result = await updateExistingUser(id, req.body ?? {});
    if (result.error) {
      return res
        .status(statusFromError(result.error))
        .json({ message: messageFromError(result.error) });
    }
    return res.status(200).json(result.data);
  } catch (error: any) {
    return res.status(500).json({ message: messageFromError(error) });
  }
};


export const deactivateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "User ID is required" });

  try {
    const result = await setUserActive(id, false);
    if (result.error) {
      return res
        .status(statusFromError(result.error))
        .json({ message: messageFromError(result.error) });
    }
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: messageFromError(error) });
  }
};


export const restoreUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "User ID is required" });

  try {
    const result = await setUserActive(id, true);
    if (result.error) {
      return res
        .status(statusFromError(result.error))
        .json({ message: messageFromError(result.error) });
    }
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: messageFromError(error) });
  }
};


export const deleteUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "User ID is required" });

  try {
    const result = await deleteExistingUser(id);
    if (result.error) {
      return res
        .status(statusFromError(result.error))
        .json({ message: messageFromError(result.error) });
    }
    return res.status(204).send();
  } catch (error: any) {
    return res.status(500).json({ message: messageFromError(error) });
  }
};

export const changeUserPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!id) return res.status(400).json({ message: "User ID is required" });
  if (!password) return res.status(400).json({ message: "New password is required" });

  try {
    const result = await changeUserPasswordByAdmin(id, password);
    if (result.error) {
      return res
        .status(statusFromError(result.error))
        .json({ message: messageFromError(result.error) });
    }
    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error: any) {
    return res.status(500).json({ message: messageFromError(error) });
  }
};
