import supabase from '../config/supabaseClient';

export const fetchReportStatsCounts = async (year: number) => {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const total = await supabase
    .from("report")
    .select("*", { count: "exact", head: true })
    .gte("reportdate", start)
    .lte("reportdate", end);

  const approved = await supabase
    .from("report")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")
    .gte("reportdate", start)
    .lte("reportdate", end);

  const pending = await supabase
    .from("report")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending", "draft"])
    .gte("reportdate", start)
    .lte("reportdate", end);

  return {
    total: total.count ?? 0,
    approved: approved.count ?? 0,
    pending: pending.count ?? 0,
  };
};

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export const fetchMonthlyReportCounts = async (year: number) => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data, error } = await supabase
    .from("report")
    .select("reportdate")
    .gte("reportdate", startDate)
    .lte("reportdate", endDate);

  if (error) throw error;

  const counts = new Array(12).fill(0);

  data.forEach((row: any) => {
    if (!row.reportdate) return;
    const monthIndex = new Date(row.reportdate).getMonth();
    counts[monthIndex]++;
  });

  return MONTH_LABELS.map((month, index) => ({
    month,
    count: counts[index],
  }));
};

export const fetchReportStatusDistribution = async (year: number) => {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await supabase
    .from("report")
    .select("status")
    .gte("reportdate", start)
    .lte("reportdate", end);

  if (error) throw error;

  const counts = {
    pending: 0,
    completed: 0,
    fail: 0,
  };

  data.forEach((row: any) => {
    const status = row.status?.toLowerCase();

    if (status === "pending" || status === "draft") {
      counts.pending++;
    } else if (status === "completed") {
      counts.completed++;
    } else if (status === "fail") {
      counts.fail++;
    }
  });

  return [
    { key: "pending", name: "Pending", value: counts.pending },
    { key: "completed", name: "Completed", value: counts.completed },
    { key: "fail", name: "Fail", value: counts.fail },
  ];
};

export const getAllReports = async () => {
  const { data, error } = await supabase
    .from('report')
    .select(`
      reportid,
      title,
      equipmentid,
      status,
      reportdate,
      employee:employeeid (
        name
      )
    `)
    .order('reportdate', { ascending: false });

  if (error) {
    console.error("Error fetching reports:", error.message);
    throw error;
  }

  return data || [];
};

export const getReportPdfById = async (reportId: string) => {
  const { data, error } = await supabase
    .from('report')
    .select('reportid, title, pdf_url')
    .eq('reportid', reportId)
    .single(); // We only expect one result

  if (error) {
    console.error("Error fetching PDF URL:", error.message);
    throw error;
  }

  if (!data.pdf_url) {
    throw new Error("This report does not have an associated PDF file.");
  }

  return data;
};


export const getInspectorReportsByStatus = async (employeeId: string, status: string) => {
  const { data, error } = await supabase
    .from('report')
    .select(`
      reportid,
      title,
      status,
      reportdate,
      rejection_note,
      equipment (
        tagno,
        doshregno,
        plant (name)
      )
    `)
    .eq('employeeid', employeeId)
    .eq('status', status)
    .order('reportdate', { ascending: false });

  if (error) throw error;
  return data;
}