import { Router } from "express";
import * as DashboardController from "../controllers/dashboardController";

const router = Router();

router.get("/workload", DashboardController.getWorkloadDistribution);
router.get("/upcoming-inspections", DashboardController.getUpcomingScheduledInspections);

router.get('/monthly-reports', DashboardController.getMonthlyStats);
router.get('/status-distribution', DashboardController.getStatusDistribution);
router.get('/upcoming', DashboardController.getUpcoming);
router.get('/report-kpi', DashboardController.getReportKPIStats);

export default router;
