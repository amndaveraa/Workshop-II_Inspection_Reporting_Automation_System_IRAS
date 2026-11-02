

import { Router } from 'express';
import {
    addVessel,
    getAllVessels,
    getVesselFormMetadata,
    updateVessel,
    deleteVessel,
    getVesselStatCounts,
    addNewPlant
} from '../controllers/equipmentController';


const router = Router();

router.use((req, res, next) => {
    console.log(`[EquipmentRoutes] ${req.method} ${req.url}`);
    next();
});

router.get('/all', getAllVessels);
router.get('/metadata', getVesselFormMetadata);
router.post('/plant', addNewPlant); // Simplified path
router.get('/stats', getVesselStatCounts);
router.post('/add', addVessel);
router.put('/update/:id', updateVessel);
router.delete('/delete/:id', deleteVessel);

export default router;