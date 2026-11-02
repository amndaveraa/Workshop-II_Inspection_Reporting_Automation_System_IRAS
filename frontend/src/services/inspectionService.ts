const API = import.meta.env.VITE_API_URL;

export interface DashboardStats {
  pendingCount: number;
  approvedCount: number;
  total: number;
  overdueCount: number;
}

export interface UpcomingInspection {
  reportid: string;
  reportdate: string;
  status: string;
  title: string;
  equipment: { name: string } | null;
}

export interface PendingReport {
  reportid: string;
  title: string;
  reportdate: string;
  equipment: { name: string } | null;
}

export const inspectionService = {
  getDashboardStats: async (employeeId: string, year: number): Promise<DashboardStats> => {
    const response = await fetch(`${API}/inspection/stats/${employeeId}?year=${year}`);
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
  },

  getUpcomingInspections: async (employeeId: string): Promise<UpcomingInspection[]> => {
    const response = await fetch(`${API}/inspection/upcoming/${employeeId}`);
    if (!response.ok) throw new Error("Failed to fetch upcoming inspections");
    return response.json();
  },

  getPendingReports: async (employeeId: string): Promise<PendingReport[]> => {
    const response = await fetch(`${API}/inspection/pending-list/${employeeId}`);
    if (!response.ok) throw new Error("Failed to fetch pending reports");
    return response.json();
  },

  getMonthlyPerformance: async (employeeId: string, year: number): Promise<number[]> => {
    const response = await fetch(`${API}/inspection/performance/${employeeId}?year=${year}`);
    if (!response.ok) throw new Error("Failed to fetch performance data");
    return response.json();
  },

  /**
   * Fetches the master list (Active or Archived)
   * used by both Master Log and Archive Page
   */
  getMasterList: async (status: string = 'all', search: string = '') => {
    // Note: ensure this path matches your backend route prefix
    const response = await fetch(`${API}/inspection/master-list?status=${status}&search=${search}`);
    if (!response.ok) throw new Error("Failed to fetch reports");
    return await response.json(); 
  },

  /**
   * Update Status: Used for Approving, Rejecting, and Restoring
   */
  updateStatus: async (id: string, status: string, comment: string = "", newReportDate?: string, newEmployeeId?: string) => {
    const response = await fetch(`${API}/inspection/update/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comment, newReportDate, newEmployeeId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update report status");
    }
    return await response.json();
  },

  /**
   * Permanent Physical Delete
   */
  deleteReport: async (id: string) => {
    const response = await fetch(`${API}/inspection/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error("Failed to delete report");
    return await response.json();
  },

  getInspectorStatusDistribution: async (employeeId: string, year: number) => {
    const response = await fetch(
      `${API}/inspection/status-distribution?employeeId=${employeeId}&year=${year}`
    );
    if (!response.ok) throw new Error("Failed to fetch distribution data");
    return response.json(); // Returns the array of 3 objects
  },
};