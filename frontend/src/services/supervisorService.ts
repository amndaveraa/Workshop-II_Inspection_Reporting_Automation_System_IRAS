// frontend/src/services/supervisorService.ts

const API = import.meta.env.VITE_API_URL;

export const supervisorService = {
  /**
   * Fetches global KPI stats (Pending, Completed, Drafts, Rejected)
   * Matches: GET /api/supervisor/stats/:id?year=2026
   */
  getDeptStats: async (supervisorId: string, year: number) => {
    const response = await fetch(`${API}/supervisor/stats/${supervisorId}?year=${year}`);
    if (!response.ok) throw new Error("Failed to fetch global stats");
    return response.json();
  },

  /**
   * Fetches every report currently in 'submitted' status
   * Matches: GET /api/supervisor/queue/:id
   */
  getApprovalQueue: async (supervisorId: string) => {
    const response = await fetch(`${API}/supervisor/queue/${supervisorId}`);
    if (!response.ok) throw new Error("Failed to fetch approval queue");
    return response.json();
  },

  /**
   * Fetches workload for ALL internal inspectors
   * Matches: GET /api/supervisor/workload/:id
   */
  getTeamWorkload: async (supervisorId: string) => {
    const response = await fetch(`${API}/supervisor/workload/${supervisorId}`);
    if (!response.ok) throw new Error("Failed to fetch staff workload");
    return response.json();
  },

  /**
   * Fetches monthly approval counts for the chart
   * Matches: GET /api/supervisor/trend/:id?year=2026
   */
  getMonthlyApprovalTrend: async (supervisorId: string, year: number) => {
    const response = await fetch(`${API}/supervisor/trend/${supervisorId}?year=${year}`);
    if (!response.ok) throw new Error("Failed to fetch performance trend");
    return response.json();
  },

  /**
   * ACTION: Approve or Reject a report
   * This is used when the supervisor clicks Approve/Reject in the review page
   */
  updateReportStatus: async (reportId: string, status: 'completed' | 'rejected', comments: string) => {
    const response = await fetch(`${API}/supervisor/review/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comments })
    });
    if (!response.ok) throw new Error("Failed to update report status");
    return response.json();
  },

  getInspectors: async () => {
    const response = await fetch(`${API}/supervisor/inspectors`);
    if (!response.ok) throw new Error("Failed to fetch inspectors");
    return response.json();
  },

  // Fetch all active vessels for the dropdown
  getActiveVessels: async () => {
    const response = await fetch(`${API}/supervisor/vessels`);
    if (!response.ok) throw new Error("Failed to fetch vessels");
    return response.json();
  },

  // Task Assignment
  assignTask: async (taskData: any) => {
    const response = await fetch(`${API}/supervisor/assign-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
    if (!response.ok) throw new Error("Failed to assign task");
    return response.json();
  }
};