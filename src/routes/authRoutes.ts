import { Router } from "express";
import { login } from "../controllers/authControllers"

const router = Router();

router.post("/", login);

export default router;