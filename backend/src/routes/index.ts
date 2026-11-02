import { Router } from 'express';
import employeeRoutes from './employeeRoutes';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import reportRoutes from './reportRoutes'
import dashboardRoutes from './dashboardRoutes'
import analyticsRoutes from "./analyticsRoutes";
import aiRoutes from './aiRoutes';
import inspectionRoute from './inspectionRoute'
import supervisorRoute from './supervisorRoutes'
import equipmentRoutes from './equipmentRoutes';

const router = Router();

router.use('/employee', employeeRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/reports', reportRoutes);
router.use('/vessels', equipmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/inspection', inspectionRoute);
router.use("/analytics", analyticsRoutes);
router.use('/ai', aiRoutes);
router.use('/supervisor', supervisorRoute);

export default router;