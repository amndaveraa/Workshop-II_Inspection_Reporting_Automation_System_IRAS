import express from "express"
import cors from "cors"
import apiRoutes from './routes/index';
import equipmentRoutes from "./routes/equipmentRoutes";

const app = express();
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));



app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/vessels' , equipmentRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api', apiRoutes);

const PORT = 5000;

app.listen(PORT, () =>
{
    console.log(`Backend running on http://localhost:${PORT}`);
});
