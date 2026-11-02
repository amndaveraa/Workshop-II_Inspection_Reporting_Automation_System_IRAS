import supabase from "../config/supabaseClient";

export const getInspectorStats = async (employeeId: string, year: number) => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;
  const today = new Date().toLocaleDateString('en-CA');

  // 1. Pending (Drafts/Pending within the selected year)
  const { count: pending } = await supabase
    .from('report')
    .select('*', { count: 'exact', head: true })
    .eq('employeeid', employeeId)
    .not('status', 'in', '("approved","submitted","archived")')
    .gte('reportdate', startDate)
    .lte('reportdate', endDate);

  // 2. Completed (Successfully finished within the selected year)
  const { count: approved } = await supabase
    .from('report')
    .select('*', { count: 'exact', head: true })
    .eq('employeeid', employeeId)
    .eq('status', 'approved')
    .gte('reportdate', startDate)
    .lte('reportdate', endDate);

  // 3. Total Submitted (All reports created by the user for that year)
  const { count: total } = await supabase
    .from('report')
    .select('*', { count: 'exact', head: true })
    .eq('employeeid', employeeId)
    .gte('reportdate', startDate)
    .lte('reportdate', endDate);

  // 4. Overdue (Not completed AND date is earlier than today)
  // Note: This filters within the selected year context
  const { count: overdue } = await supabase
    .from('report')
    .select('*', { count: 'exact', head: true })
    .eq('employeeid', employeeId)
    .neq('status', ['approved', 'submitted', 'archived'])
    .lt('reportdate', today) 
    .gte('reportdate', startDate);

  return {
    pendingCount: pending || 0,
    approvedCount: approved || 0,
    total: total || 0,
    overdueCount: overdue || 0
  };
};

export const getUpcomingInspections = async (employeeId: string) => {
  // Use local date to avoid timezone issues with 'upcoming' logic
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - (offset * 60 * 1000));
  const today = localDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from('report')
    .select(`
      reportid,
      title,
      status,
      reportdate,
      equipment:equipmentid (
        name
      )
    `)
    .eq('employeeid', employeeId)
    .not('status', 'in', '("approved","submitted","archived","completed")')
    .gte('reportdate', today)
    .order('reportdate', { ascending: true })
    .limit(5);

  if (error) {
    console.error("Join Error:", error.message);
    throw new Error(error.message);
  }
  return data;
};

export const getPendingReports = async (employeeId: string) => {
  const { data, error } = await supabase
    .from('report')
    .select(`
      reportid,
      title,
      reportdate,
      status,
      equipment:equipmentid (name)
    `)
    .eq('employeeid', employeeId)
    .eq('status', 'draft') // Only unfinished drafts
    .order('reportdate', { ascending: true });

  if (error) throw error;
  return data;
};

export const getMonthlyPerformance = async (employeeId: string, year: number) => {
  const { data, error } = await supabase
    .from('report')
    .select('reportdate')
    .eq('employeeid', employeeId)
    .eq('status', 'approved')
    .gte('reportdate', `${year}-01-01`)
    .lte('reportdate', `${year}-12-31`);

  if (error) throw error;

  // Initialize array with 12 months (count 0)
  const monthlyCounts = Array(12).fill(0);

  // Group by month index
  data.forEach(report => {
    const month = new Date(report.reportdate).getMonth(); // 0-11
    monthlyCounts[month]++;
  });

  return monthlyCounts; // Returns [5, 2, 0, 10, ...]
};

export const fetchAllInspections = async (status?: string, search?: string) => {
  let query = supabase
    .from('report') 
    .select(`
      reportid,
      title,
      status,
      reportdate,
      pdf_url,
      employee:employeeid (name),
      equipment:equipmentid (name, tagno)
    `)
    .order('reportdate', { ascending: false });

  /** * SMART FILTERING:
   * 1. If the Archive module asks for 'archived', give it only archived.
   * 2. If another module asks for 'all' or specific statuses (like 'pending'),
   * we ensure 'archived' reports are HIDDEN to maintain current behavior.
   */
  if (status === 'archived') {
    query = query.eq('status', 'archived');
  } else if (status && status !== 'all') {
    // Other modules asking for a specific status (e.g., 'submitted')
    query = query.eq('status', status).neq('status', 'archived');
  } else {
    // Other modules calling without a status or with 'all'
    // This maintains the original behavior for your existing modules
    query = query.neq('status', 'archived');
  }

  const { data, error } = await query;
  if (error) throw error;

  // Search logic remains compatible with all modules
  if (search) {
    const s = search.toLowerCase();
    return data.filter((item: any) => {
      const equip = Array.isArray(item.equipment) ? item.equipment[0] : item.equipment;
      const emp = Array.isArray(item.employee) ? item.employee[0] : item.employee;

      return (
        item.title?.toLowerCase().includes(s) || 
        equip?.name?.toLowerCase().includes(s) ||
        equip?.tagno?.toLowerCase().includes(s) ||
        emp?.name?.toLowerCase().includes(s)
      );
    });
  }

  return data;
};

export const deleteReport = async (reportId: string) => {
  const { data, error } = await supabase
    .from('report')
    .delete()
    .eq('reportid', reportId);
  if (error) throw error;
  return data;
};

export const updateToArchived = async (reportId: string) => {
  const { data, error } = await supabase
    .from('report')
    .update({ status: 'archived' })
    .eq('reportid', reportId)
    .eq('status', 'approved'); // Logic gate: Only allow archiving of approved reports

  if (error) throw error;
  return data;
};

export const updateStatus = async (id: string, newStatus: string, comment?: string, newReportDate?: string, newEmployeeId?: string) => {
  const updateData: any = { status: newStatus };
  
  // Store the comment if the report is being rejected
  if (newStatus === 'rejected') {
    updateData.rejection_note = comment || "";
    
    // Validate and update report date if provided
    if (newReportDate) {
      const newDate = new Date(newReportDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      newDate.setHours(0, 0, 0, 0);
      
      // Calculate 2 weeks from today
      const twoWeeksFromNow = new Date(today);
      twoWeeksFromNow.setDate(today.getDate() + 14);
      
      // Validate date is within 2 weeks
      if (newDate < today) {
        throw new Error("New inspection date cannot be in the past");
      }
      if (newDate > twoWeeksFromNow) {
        throw new Error("New inspection date must be within 2 weeks from today");
      }
      
      updateData.reportdate = newReportDate;
    } else {
      throw new Error("New report date is required when rejecting an inspection");
    }
    
    // If reassigned to a different inspector, change status to 'draft' (in progress) instead of 'rejected'
    if (newEmployeeId) {
      // Get the current inspector's ID from the report
      const { data: currentReport, error: fetchError } = await supabase
        .from('report')
        .select('employeeid')
        .eq('reportid', id)
        .single();

      if (fetchError) {
        console.error("Error fetching current report:", fetchError);
        throw new Error("Failed to fetch current report details");
      }

      const currentInspectorId = currentReport?.employeeid;

      // Only check workload if assigning to a DIFFERENT inspector
      if (newEmployeeId !== currentInspectorId) {
        // Check if the new inspector already has 3 or more active inspections (strict limit)
        const { count, error: countError } = await supabase
          .from('report')
          .select('*', { count: 'exact', head: true })
          .eq('employeeid', newEmployeeId)
          .in('status', ['pending', 'draft', 'submitted', 'rejected']);

        if (countError) {
          console.error("Error checking inspector workload:", countError);
          throw new Error("Failed to check inspector workload");
        }

        if (count !== null && count >= 3) {
          // New inspector is at capacity - keep with current inspector to redo
          console.warn(`Cannot reassign: New inspector has ${count}/3 active inspections. Keeping with current inspector.`);
          updateData.status = 'draft'; // Current inspector must redo
          // Don't update employeeid - stays with same inspector
        } else {
          // New inspector has capacity - reassign to them
          updateData.employeeid = newEmployeeId;
          updateData.status = 'draft';
        }
      } else {
        // Same inspector - just update to draft status
        updateData.status = 'draft';
      }
    }
  } 
  // Clear the note if it's being approved or resubmitted
  else if (newStatus === 'approved' || newStatus === 'submitted') {
    updateData.rejection_note = null; 
  }

  const { data, error } = await supabase
    .from('report')
    .update(updateData)
    .eq('reportid', id);

  if (error) throw error;
  return data;
};

export const fetchInspectorStatusDistribution = async (employeeId: string, year: number) => {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await supabase
    .from("report")
    .select("status")
    .eq("employeeid", employeeId)
    .gte("reportdate", start)
    .lte("reportdate", end);

  if (error) throw error;

  const counts = { pending: 0, approved: 0, rejected: 0 };

  data?.forEach((row: any) => {
    const status = row.status?.toLowerCase().trim();

    if (status === "approved" || status === "completed") {
      counts.approved++;
    } else if (status === "rejected" || status === "fail") {
      counts.rejected++;
    } else {
      // Catch-all for draft, pending, submitted
      counts.pending++;
    }
  });

  return [
    { key: "pending", name: "Pending/Draft", value: counts.pending },
    { key: "approved", name: "Approved", value: counts.approved },
    { key: "rejected", name: "Rejected", value: counts.rejected },
  ];
};

export const getActiveInspectionCount = async (employeeId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('report')
    .select('*', { count: 'exact', head: true })
    .eq('employeeid', employeeId)
    .in('status', ['pending', 'draft', 'submitted', 'rejected']);

  if (error) {
    console.error("Error fetching active inspection count:", error);
    throw new Error("Failed to fetch active inspection count");
  }

  return count || 0;
};