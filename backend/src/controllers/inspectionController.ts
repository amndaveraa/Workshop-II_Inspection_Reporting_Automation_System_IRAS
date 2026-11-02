import { Request, Response } from 'express';
import * as InspectionService from '../services/inspectionService';
import supabase from '../config/supabaseClient';

export const getInspectionStats = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const year = Number(req.query.year) || new Date().getFullYear();
  
  const stats = await InspectionService.getInspectorStats(employeeId, year);
  console.log(stats)
  res.json(stats);
};

export const getUpcomingList = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const data = await InspectionService.getUpcomingInspections(employeeId);
    res.status(200).json(data);

    const debugData = await supabase
    .from('report')
    .select('*')
    .eq('employeeid', employeeId);

console.log("Raw DB Results for this user:", debugData.data);

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingReportsList = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const data = await InspectionService.getPendingReports(employeeId);
    res.status(200).json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getPerformance = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    // Default to current year if not provided in query
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    const monthlyData = await InspectionService.getMonthlyPerformance(employeeId, year);
    
    res.status(200).json(monthlyData);
  } catch (error: any) {
    console.error("Performance Route Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const archiveReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await InspectionService.updateToArchived(id);
    res.status(200).json({ message: "Report successfully archived" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment, newReportDate, newEmployeeId } = req.body;

    // Call your service function (which handles rejection_note logic)
    await InspectionService.updateStatus(id, status, comment, newReportDate, newEmployeeId);

    // Dynamic message based on action
    let message = status === 'approved' && comment === 'Restored from archive' 
      ? "Inspection restored successfully" 
      : status === 'rejected' && newEmployeeId
      ? `Inspection reassigned with new date ${new Date(newReportDate).toLocaleDateString()}. Status changed to 'In Progress' for the new inspector.`
      : status === 'rejected'
      ? `Inspection rejected. New inspection date set to ${new Date(newReportDate).toLocaleDateString()}`
      : `Inspection marked as ${status}`;

    res.json({ success: true, message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMasterList = async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    // Pass 'status' and 'search' directly to your merged service function
    const data = await InspectionService.fetchAllInspections(status as string, search as string);
    
    // Send raw array to match your frontend expectations
    res.json(data); 
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await InspectionService.deleteReport(id);
    res.json({ success: true, message: "Report permanently removed." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getInspectorStatusDistribution = async (req: Request, res: Response) => {
  try {
    const { employeeId, year } = req.query;

    if (!employeeId || !year) {
      return res.status(400).json({ success: false, message: "Missing employeeId or year" });
    }

    const data = await InspectionService.fetchInspectorStatusDistribution(
      String(employeeId),
      Number(year)
    );

    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveInspectionCount = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    
    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Missing employeeId" });
    }

    const count = await InspectionService.getActiveInspectionCount(String(employeeId));
    res.status(200).json({ count });
  } catch (error: any) {
    console.error("Error fetching active inspection count:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};