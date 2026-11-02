import { Router } from 'express';
import * as ReportController from '../controllers/reportControllers'
const router = Router();

router.get('/', ReportController.getAllReports);
router.get('/stats', ReportController.getReportStatCounts);
router.get("/stats/monthly-reports", ReportController.getMonthlyReportStats);
router.get("/stats/status-distribution", ReportController.getReportStatusDistribution);
router.get('/:id/pdf', ReportController.getPdfUrl);
router.get('/inspector-list', ReportController.getReports);

export default router;