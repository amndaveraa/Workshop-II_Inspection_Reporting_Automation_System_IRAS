const API = import.meta.env.VITE_API_URL;

export const getVesselStatsCount = async (): Promise<any> => {
  try {
    const token = localStorage.getItem("token"); 

    const response = await fetch(`${API}/vessels/stats`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch vessel totals");
    }

    return data;
  } catch (error) {
    console.error("Fetch vessel total error:", error);
    throw error;
  }
};


export const getWorkloadDistribution = async (year: number) => {
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${API}/dashboard/workload?year=${year}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load workload distribution");
  }

  return res.json();
};

export const getMonthlyReportStats = async (year: number) => {
  const res = await fetch(`${API}/dashboard/monthly-reports?year=${year}`);
  if (!res.ok) throw new Error("Backend route missing: /api/dashboard/monthly-reports");
  return res.json();
};

export const getReportStatusDistribution = async (year: number) => {
  const res = await fetch(`${API}/dashboard/status-distribution?year=${year}`);
  if (!res.ok) throw new Error("Backend route missing: /api/dashboard/status-distribution");
  return res.json();
};

export const fetchUpcomingScheduledInspections = async () => {
  const res = await fetch(`${API}/dashboard/upcoming`);
  if (!res.ok) throw new Error("Backend route missing: /api/dashboard/upcoming");
  return res.json();
};

export const getReportStatsCount = async (year: number) => {
  const res = await fetch(`${API}/reports/stats?year=${year}`);
  return res.json();
};