import supabase from "../config/supabaseClient";

export const fetchInspectorWorkload = async (year: number) => {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  // 1. Fetch inspectors & supervisors
  const { data: employees, error: empError } = await supabase
    .from("employee")
    .select("employeeid, name, role, isActive")
    .in("role", ["inspector", "supervisor"])
    .eq("isActive", true);

  if (empError) throw empError;

  // 2. Fetch pending reports grouped by employee
  const { data: reports, error: rptError } = await supabase
    .from("report")
    .select("employeeid, status")
    .gte("reportdate", start)
    .lte("reportdate", end);

  if (rptError) throw rptError;

  // 3. Build workload map
  const workloadMap: Record<string, number> = {};

  reports.forEach((r: any) => {
    const status = String(r.status).toLowerCase();
    if (status === "pending" || status === "draft") {
      workloadMap[r.employeeid] =
        (workloadMap[r.employeeid] || 0) + 1;
    }
  });

  // 4. Merge employees + workload
  return employees.map((emp) => ({
    id: emp.employeeid,
    name: emp.name,
    role: emp.role,
    pendingCount: workloadMap[emp.employeeid] || 0,
  }))
  .sort((a, b) => b.pendingCount - a.pendingCount);
};


export const fetchUpcomingScheduledInspections = async (limit = 5) => {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("report")
    .select(`
      reportid,
      reportdate,
      status,
      equipment:equipmentid (
        equipmentid,
        name,
        tagno
      ),
      inspector:employeeid (
        name
      )
    `)
    .gte("reportdate", today)
    .in("status", ["draft", "pending"])
    .order("reportdate", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const now = new Date();

  return data.map((row: any) => {
    const inspectionDate = new Date(row.reportdate);
    const daysUntil = Math.ceil(
      (inspectionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let urgency: "high" | "medium" | "low" = "low";
    if (daysUntil < 0) urgency = "high";       // overdue
    else if (daysUntil <= 3) urgency = "high";
    else if (daysUntil <= 7) urgency = "medium";

    return {
      id: row.reportid,
      date: row.reportdate,
      equipmentName: row.equipment?.name ?? "Unknown Equipment",
      tagNo: row.equipment?.tagno ?? "—",
      inspector: row.inspector?.name ?? "Unassigned",
      daysUntil,
      isOverdue: daysUntil < 0,
      urgency,
    };
  });
};

export const fetchMonthlyStats = async (year: number) => {
  const { data, error } = await supabase
    .from('report')
    .select('reportdate')
    .gte('reportdate', `${year}-01-01`)
    .lte('reportdate', `${year}-12-31`);

  if (error) throw error;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyData = months.map(m => ({ month: m, count: 0 }));

  data.forEach(r => {
    const monthIndex = new Date(r.reportdate).getMonth();
    monthlyData[monthIndex].count++;
  });
  return monthlyData;
};

export const fetchStatusDistribution = async (year: number) => {
  const { data, error } = await supabase
    .from('report')
    .select('status')
    .gte('reportdate', `${year}-01-01`)
    .lte('reportdate', `${year}-12-31`);

  if (error) throw error;

  return [
    { key: "pending", name: "Pending", value: data.filter(r => r.status === 'pending' || r.status === 'submitted').length },
    { key: "completed", name: "Completed", value: data.filter(r => r.status === 'approved' || r.status === 'completed').length },
    { key: "fail", name: "Rejected", value: data.filter(r => r.status === 'rejected').length }
  ];
};

export const fetchUpcomingInspections = async () => {
  const today = new Date();
  const { data, error } = await supabase
    .from('report')
    .select(`
      reportid, reportdate, title, status,
      equipment:equipmentid (name, tagno),
      employee:employeeid (name)
    `)
    .neq('status', 'completed')
    .neq('status', 'approved')
    .gte('reportdate', today.toISOString())
    .order('reportdate', { ascending: true })
    .limit(5);

  if (error) throw error;

  return data.map(item => {
    // FIX: Handling Supabase join arrays to prevent "Property name does not exist" error
    const equip = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
    const emp = Array.isArray(item.employee) ? item.employee[0] : item.employee;
    
    const diff = new Date(item.reportdate).getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return {
      id: item.reportid,
      date: item.reportdate,
      equipmentName: equip?.name || "Unknown Vessel",
      tagNo: equip?.tagno || "N/A",
      inspector: emp?.name || "Unassigned",
      daysUntil: days,
      isOverdue: days < 0,
      urgency: days <= 3 ? "high" : days <= 7 ? "medium" : "low"
    };
  });
};

export const fetchReportKPIStats = async (year: number) => {
  const { data, error } = await supabase
    .from('report')
    .select('status')
    .gte('reportdate', `${year}-01-01`)
    .lte('reportdate', `${year}-12-31`);

  if (error) throw error;

  const total = data.length;
  const completed = data.filter(r => r.status === 'completed' || r.status === 'approved').length;
  const pending = data.filter(r => r.status === 'pending' || r.status === 'submitted' || r.status === 'draft').length;

  return {
    total,
    completed,
    pending
  };
};