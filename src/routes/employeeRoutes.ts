import { Router } from "express";
import multer from "multer";
import { SupabaseAuthClient } from "@supabase/supabase-js/dist/module/lib/SupabaseAuthClient";
import * as EmployeeController from "../controllers/employeeControllers"

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.put("/update-profile", EmployeeController.updateProfile);
router.post("/change-password", EmployeeController.changePassword)
router.post("/update-avatar", upload.single("avatar"), EmployeeController.updateAvatar);
export default router;