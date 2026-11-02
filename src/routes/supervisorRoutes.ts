import { Router } from 'express';
import * as SupervisorController from '../controllers/supervisorController';

const router = Router();

// Matches: ${API}/supervisor/stats/:supervisorId?year=...
router.get('/stats/:supervisorId', SupervisorController.getStats);

// Matches: ${API}/supervisor/queue/:supervisorId
router.get('/queue/:supervisorId', SupervisorController.getQueue);

// Matches: ${API}/supervisor/workload/:supervisorId
router.get('/workload/:supervisorId', SupervisorController.getWorkload);

// Matches: ${API}/supervisor/trend/:supervisorId?year=...
router.get('/trend/:supervisorId', SupervisorController.getTrend);

router.post('/assign-task', SupervisorController.assignTask);

router.get('/inspectors', SupervisorController.getInspectorList);
router.get('/vessels', SupervisorController.getVesselsList);
router.post('/assign-task', SupervisorController.assignTask);

export default router;