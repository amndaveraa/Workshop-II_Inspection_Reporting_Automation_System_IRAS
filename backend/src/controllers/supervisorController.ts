import { Request, Response } from 'express';
import * as SupervisorService from '../services/supervisorService';

export const getStats = async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await SupervisorService.getGlobalStats(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getQueue = async (req: Request, res: Response) => {
  try {
    const data = await SupervisorService.getGlobalApprovalQueue();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkload = async (req: Request, res: Response) => {
  try {
    const data = await SupervisorService.getAllInspectorsWorkload();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTrend = async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await SupervisorService.getGlobalMonthlyTrend(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const assignTask = async (req: Request, res: Response) => {
  try {
    const taskData = req.body; // { title, equipmentid, employeeid, reportdate }
    const result = await SupervisorService.createNewTask(taskData);
    res.status(201).json({ message: "Task assigned successfully", data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInspectorList = async (req: Request, res: Response) => {
  try {
    const data = await SupervisorService.fetchInspector();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getVesselsList = async (req: Request, res: Response) => {
  try {
    const data = await SupervisorService.fetchActiveVessels();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

