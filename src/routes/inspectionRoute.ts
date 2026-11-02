import { Router } from 'express';
import * as InspectionController from '../controllers/inspectionController';

const router = Router();

router.get('/stats/:employeeId', InspectionController.getInspectionStats);
router.get('/upcoming/:employeeId', InspectionController.getUpcomingList);
router.get('/pending-list/:employeeId', InspectionController.getPendingReportsList);
router.get('/performance/:employeeId', InspectionController.getPerformance);
router.get('/active-count/:employeeId', InspectionController.getActiveInspectionCount);

router.get('/master-list', InspectionController.getMasterList);
router.patch('/:id/archive', InspectionController.archiveReport);
router.delete('/:id', InspectionController.deleteReport);
router.put('/update/:id', InspectionController.updateReportStatus);
router.get("/status-distribution", InspectionController.getInspectorStatusDistribution);

export default router;