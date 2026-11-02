import { Request, Response } from "express";
import * as DashboardService from "../services/dashboardService";

export const getWorkloadDistribution = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const data = await DashboardService.fetchInspectorWorkload(year);

    res.status(200).json({
      year,
      totalStaff: data.length,
      data,
    });
  } catch (error) {
    console.error("Workload Controller Error:", error);
    res.status(500).json({ message: "Failed to fetch workload distribution" });
  }
};


export const getUpcomingScheduledInspections = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const data = await DashboardService.fetchUpcomingScheduledInspections(limit);

    res.status(200).json({ data });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch upcoming inspections" });
  }
};

export const getMonthlyStats = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const data = await DashboardService.fetchMonthlyStats(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStatusDistribution = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const data = await DashboardService.fetchStatusDistribution(year);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getUpcoming = async (req: Request, res: Response) => {
  try {
    const data = await DashboardService.fetchUpcomingInspections();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getReportKPIStats = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const stats = await DashboardService.fetchReportKPIStats(year);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};