import supabase from "../config/supabaseClient";

export const getGlobalStats = async (year: number) => {
  const startYear = `${year}-01-01`;
  const endYear = `${year}-12-31`;

  // Fetch ALL reports for the given year across the whole company
  const { data: reports, error } = await supabase
    .from('report')
    .select('status')
    .gte('reportdate', startYear)
    .lte('reportdate', endYear);

  if (error) throw error;

  return {
    pendingApprovals: reports?.filter(r => r.status === 'submitted').length || 0,
    teamCompleted: reports?.filter(r => r.status === 'approved').length || 0,
    activeDrafts: reports?.filter(r => r.status === 'draft').length || 0,
    revisionRequired: reports?.filter(r => r.status === 'rejected').length || 0,
  };
};

export const getGlobalApprovalQueue = async () => {
  const { data, error } = await supabase
    .from('report')
    .select(`
      reportid, 
      title, 
      reportdate, 
      status,
      employee:employeeid ( name ),
      equipment:equipmentid ( name )
    `)
    .eq('status', 'submitted') // All reports waiting for any supervisor
    .order('reportdate', { ascending: true });

  if (error) throw error;
  return data;
};

export const getAllInspectorsWorkload = async () => {
  // 1. Get all employees with role 'inspector'
  const { data: inspectors, error: insError } = await supabase
    .from('employee')
    .select('employeeid, name')
    .eq('role', 'inspector');

  if (insError || !inspectors) return [];

  // 2. Map counts for each inspector
  return await Promise.all(inspectors.map(async (ins) => {
    const { count: draftCount } = await supabase
      .from('report')
      .select('*', { count: 'exact', head: true })
      .eq('employeeid', ins.employeeid)
      .in('status', ['draft', 'pending']);

    const { count: overdueCount } = await supabase
      .from('report')
      .select('*', { count: 'exact', head: true })
      .eq('employeeid', ins.employeeid)
      .lt('reportdate', new Date().toISOString())
      .not('status', 'in', '("submitted","approved","archived")');

    return {
      id: ins.employeeid,
      name: ins.name,
      draftCount: draftCount || 0,
      overdueCount: overdueCount || 0
    };
  }));
};

export const getGlobalMonthlyTrend = async (year: number) => {
  const { data, error } = await supabase
    .from('report')
    .select('reportdate')
    .eq('status', 'approved')
    .gte('reportdate', `${year}-01-01`)
    .lte('reportdate', `${year}-12-31`);

  if (error) throw error;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const chartData = months.map(m => ({ month: m, approved: 0 }));

  data?.forEach(r => {
    const monthIndex = new Date(r.reportdate).getMonth();
    chartData[monthIndex].approved++;
  });

  return chartData;
};

export const createNewTask = async (taskData: { 
  title: string, 
  equipmentid: string, 
  employeeid: string, 
  reportdate: string 
}) => {
  // Check if inspector already has 3 or more active inspections (strict count)
  const { count, error: countError } = await supabase
    .from('report')
    .select('*', { count: 'exact', head: true })
    .eq('employeeid', taskData.employeeid)
    .in('status', ['pending', 'draft', 'submitted', 'rejected']);

  if (countError) {
    console.error("Error checking inspector workload:", countError);
    throw new Error("Failed to check inspector workload");
  }

  if (count !== null && count >= 3) {
    throw new Error(`Inspector has reached the maximum limit of 3 active inspections (currently has ${count}). Please select another inspector with available capacity.`);
  }

  const { data, error } = await supabase
    .from('report')
    .insert([
      {
        title: taskData.title,
        equipmentid: taskData.equipmentid,
        employeeid: taskData.employeeid,
        reportdate: taskData.reportdate,
        status: 'pending' 
      }
    ])
    .select();

  if (error) {
    console.error("Supabase Error Details:", error);
    throw error;
  }
  return data;
};

export const fetchInspector = async () => {
  const { data, error } = await supabase
    .from("employee")
    .select("employeeid, name")
    .eq("role", "inspector")
    .eq("isActive", true); // Optional: ensure they are active

  if (error) throw error;
  return data;
};

export const fetchActiveVessels = async () => {
  const { data, error } = await supabase
    .from("equipment")
    .select("equipmentid, name")
    .eq("status", "active");

  if (error) throw error;
  return data;
};

