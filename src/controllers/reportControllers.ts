import { Request, Response } from "express";
import * as ReportService from '../services/reportService';

export const getAllReports = async (req: Request, res: Response) => {
  try {
    const reports = await ReportService.getAllReports();
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    console.error("Get All Reports Controller Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getReportStatCounts = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year);

    if (!year) {
      return res.status(400).json({ message: "Year is required" });
    }

    const stats = await ReportService.fetchReportStatsCounts(year);

    res.status(200).json(stats);
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getMonthlyReportStats = async (
  req: Request,
  res: Response
) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const data = await ReportService.fetchMonthlyReportCounts(year);

    res.status(200).json({
      year,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Monthly Report Controller Error:", error);
    res.status(500).json({
      message: error?.message || "Failed to fetch monthly report stats",
    });
  }
};

export const getReportStatusDistribution = async (
  req: Request,
  res: Response
) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const data = await ReportService.fetchReportStatusDistribution(year);

    res.status(200).json({
      year,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Status Distribution Controller Error:", error);
    res.status(500).json({
      message: error?.message || "Failed to fetch report status distribution",
    });
  }
};

export const getPdfUrl = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reportData = await ReportService.getReportPdfById(id);
    
    res.status(200).json(reportData);
  } catch (error: any) {
    const statusCode = error.message.includes("not found") ? 404 : 500;
    res.status(statusCode).json({ error: error.message });
  }
};


export const getReports = async (req: Request, res: Response) => {
  try {
    const { employeeid, status } = req.query;

    if (!employeeid || !status) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing employeeid or status query parameters" 
      });
    }

    const data = await ReportService.getInspectorReportsByStatus(
      employeeid as string, 
      status as string
    );

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};