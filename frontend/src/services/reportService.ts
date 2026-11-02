const API = import.meta.env.VITE_API_URL;

export const reportService = {
  /**
   * Calls the backend to get the PDF URL for a specific report
   */
  getReportPdf: async (reportId: string) => {
    const response = await fetch(`${API}/reports/${reportId}/pdf`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to load PDF");
    }
    
    return response.json();
  }
};