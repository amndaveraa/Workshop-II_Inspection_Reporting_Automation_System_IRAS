import { Router } from "express";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  deactivateUser,
  restoreUser,
  changeUserPassword,
} from "../controllers/userController";

const router = Router();


router.get("/", getUsers);

router.post("/", createUser);
router.put("/:id", updateUser);


router.patch("/:id/deactivate", deactivateUser);
router.patch("/:id/restore", restoreUser);
router.patch("/:id/change-password", changeUserPassword);


router.delete("/:id", deleteUser);

export default router;
