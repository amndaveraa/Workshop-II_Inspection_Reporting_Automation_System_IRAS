import supabase from "../config/supabaseClient";

type TrendPoint = { month: string; total: number; pass: number; fail: number };


export type AnalyticsOverview = {
  cards: {
    inspectionRate: number;
    inspectionRateDelta: number;
    failureRate: number;
    failureRateDelta: number;
    overdueVessels: number;
    totalInspectors: number;
    newInspectorsThisMonth: number;
  };
  trends: TrendPoint[];
  distribution: { pass: number; fail: number; pending: number };
  vesselsByType: { label: string; count: number }[];
  stats: {
    totalDataPoints: number;
    passRate: number;
    avgInspectionTimeHours: number | null;
    avgInspectionTimeDeltaPct: number | null;
    benchmarkPassRate: number;
  };
};

const clamp0 = (n: number) => (Number.isFinite(n) ? n : 0);

function toDateOnlyISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, months: number) {
  return new Date(d.getFullYear(), d.getMonth() + months, 1);
}

function monthLabel(d: Date) {
  return d.toLocaleString(undefined, { month: "short" });
}

function classifyStatus(statusRaw: any): "pass" | "fail" | "pending" {
  const s = String(statusRaw ?? "").trim().toLowerCase();
  if (!s) return "pending";

  // Check for pending/draft/in-progress/submitted statuses FIRST
  if (
    s === "pending" || 
    s === "draft" || 
    s === "submitted" ||
    s.includes("in progress") || 
    s.includes("open")
  ) {
    return "pending";
  }

  // Then check for pass (completed and approved mean passed)
  if (
    s === "pass" || 
    s.includes("pass") || 
    s === "approved" || 
    s.includes("approved") || 
    s === "completed" || 
    s.includes("completed")
  ) {
    return "pass";
  }

  // Then check for fail (rejected means failed)
  if (
    s === "fail" || 
    s.includes("fail") || 
    s === "reject" || 
    s.includes("reject") || 
    s.includes("nonconform")
  ) {
    return "fail";
  }

  // Default to pending for unknown statuses
  return "pending";
}

function pct(n: number, d: number) {
  if (!d) return 0;
  return (n / d) * 100;
}

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseInspectionHoursFromReportDescription(desc: any): number | null {
  if (desc == null) return null;

  if (typeof desc === "object") {
    return (
      safeNum(desc.inspectionTimeHours) ??
      safeNum(desc.durationHours) ??
      safeNum(desc.avgInspectionTimeHours) ??
      null
    );
  }

  const s = String(desc);

  try {
    const j = JSON.parse(s);
    if (j && typeof j === "object") {
      return (
        safeNum((j as any).inspectionTimeHours) ??
        safeNum((j as any).durationHours) ??
        safeNum((j as any).avgInspectionTimeHours) ??
        null
      );
    }
  } catch {}

  const m =
    s.match(/(\d+(\.\d+)?)\s*(hrs|hr|hours|h)\b/i) ||
    s.match(/duration\s*[:=]\s*(\d+(\.\d+)?)/i) ||
    s.match(/inspection\s*time\s*[:=]\s*(\d+(\.\d+)?)/i);

  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

async function countComponentDetailsByReportIds(reportIds: string[]) {
  if (reportIds.length === 0) return 0;

  const CHUNK = 800;
  let total = 0;

  for (let i = 0; i < reportIds.length; i += CHUNK) {
    const chunk = reportIds.slice(i, i + CHUNK);

    const { count, error } = await supabase
      .from("componentreportdetails")
      .select("id", { count: "exact", head: true })
      .in("reportid", chunk);

    if (error) throw error;
    total += count ?? 0;
  }

  return total;
}

/**
 * Build comprehensive analytics overview for the dashboard
 * 
 * @param input.months - Number of months to analyze (3-24)
 * @param input.overdueDays - Days threshold for marking vessels as overdue (30-3650)
 * @returns Analytics data or error object
 */
export async function buildAnalyticsOverview(input: {
  months: number;
  overdueDays: number;
}): Promise<{ data?: AnalyticsOverview; error?: any }> {
  try {
    const now = new Date();
    const months = input.months;
    const overdueDays = input.overdueDays;

  const startMonth = addMonths(startOfMonth(now), -(months - 1));
  const startISO = toDateOnlyISO(startMonth);
  

  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + 30);
  const endISO = toDateOnlyISO(futureDate);

  const periodDays = 90;
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - periodDays);

  const prevEnd = new Date(currentStart);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - periodDays);


  const { data: reports, error: repErr } = await supabase
    .from("report")
    .select("reportid,status,reportdate,equipmentid,employeeid")
    .gte("reportdate", startISO)
    .lte("reportdate", endISO);

  if (repErr) {
    console.error("Error fetching reports:", repErr);
    return { error: repErr };
  }

  // Filter out archived reports on the client side to handle any case variations
  const filteredReports = (reports ?? []).filter((r: any) => {
    const status = String(r.status || "").toLowerCase().trim();
    return status !== "archived";
  });

  const reportRows = filteredReports.map((r: any) => ({
    reportid: String(r.reportid),
    status: r.status,
    reportdate: String(r.reportdate ?? ""),
    equipmentid: r.equipmentid ? String(r.equipmentid) : null,
    employeeid: r.employeeid ? String(r.employeeid) : null,
  }));


  const { data: equipment, error: eqErr } = await supabase
    .from("equipment")
    .select("equipmentid,vesseltypeid,lastInspectionDate");

  if (eqErr) {
    console.error("Error fetching equipment:", eqErr);
    return { error: eqErr };
  }

  const { data: vesselTypes, error: vtErr } = await supabase
    .from("vesseltype")
    .select("vesseltypeid,name");

  if (vtErr) {
    console.error("Error fetching vessel types:", vtErr);
    return { error: vtErr };
  }

  const vesselTypeNameById = new Map<string, string>();
  for (const vt of vesselTypes ?? []) {
    vesselTypeNameById.set(String((vt as any).vesseltypeid), String((vt as any).name ?? "Unknown"));
  }

  const equipmentRows = (equipment ?? []).map((e: any) => ({
    equipmentid: String(e.equipmentid),
    vesseltypeid: e.vesseltypeid ? String(e.vesseltypeid) : null,
  }));


  const { data: employees, error: empErr } = await supabase.from("employee").select("*");
  if (empErr) {
    console.error("Error fetching employees:", empErr);
    return { error: empErr };
  }

  const empRows = (employees ?? []) as any[];
  const isInspector = (role: any) => String(role ?? "").toLowerCase().includes("inspector");
  const isActiveEmp = (e: any) => {
    const v = e.isActive ?? e.isactive;
    return v === undefined ? true : Boolean(v);
  };

  const inspectors = empRows.filter((e) => isActiveEmp(e) && isInspector(e.role));
  const totalInspectors = inspectors.length;

  const monthStart = startOfMonth(now);
  const newInspectorsThisMonth = inspectors.filter((e) => {
    const created = e.createdAt ?? e.createdat;
    if (!created) return false;
    const d = new Date(created);
    return d >= monthStart;
  }).length;

  const trendByMonth = new Map<string, TrendPoint>();
  const monthKeys: Date[] = [];
  for (let i = 0; i < months; i++) {
    const d = addMonths(startMonth, i);
    monthKeys.push(d);
    trendByMonth.set(toDateOnlyISO(d).slice(0, 7), {
      month: monthLabel(d),
      total: 0,
      pass: 0,
      fail: 0,
    });
  }

  let distPass = 0, distFail = 0, distPending = 0;
  const timeValsThis: number[] = [];
  const timeValsPrev: number[] = [];
  const reportIds: string[] = [];

  for (const r of reportRows) {
    if (!r.reportdate) continue;

    const ym = r.reportdate.slice(0, 7);
    const st = classifyStatus(r.status);

    if (st === "pass") distPass++;
    else if (st === "fail") distFail++;
    else distPending++;

    reportIds.push(r.reportid);

    const tp = trendByMonth.get(ym);
    if (tp) {
      tp.total++;
      if (st === "pass") tp.pass++;
      if (st === "fail") tp.fail++;
    }

  
  }

  const trends = monthKeys.map((d) => trendByMonth.get(toDateOnlyISO(d).slice(0, 7))!);

  const totalEquipment = equipmentRows.length;

  const inspectedInRange = (start: Date, end: Date) => {
    const set = new Set<string>();
    for (const r of reportRows) {
      if (!r.equipmentid) continue;
      const rd = new Date(r.reportdate);
      if (rd >= start && rd <= end) set.add(r.equipmentid);
    }
    return set.size;
  };

  const currentInspected = inspectedInRange(currentStart, now);
  const prevInspected = inspectedInRange(prevStart, prevEnd);

  const inspectionRate = pct(currentInspected, totalEquipment);
  const prevInspectionRate = pct(prevInspected, totalEquipment);
  const inspectionRateDelta = inspectionRate - prevInspectionRate;

  // Calculate failure rate using the same distribution data as pass rate
  // Total = distPass + distFail + distPending (all reports in the selected time range)
  const totalReports = distPass + distFail + distPending;
  const failureRate = pct(distFail, totalReports);
  const failureRateDelta = 0; // No delta calculation needed

  const lastReportByEquipment = new Map<string, Date>();
  for (const r of reportRows) {
    if (!r.equipmentid) continue;
    const rd = new Date(r.reportdate);
    const prev = lastReportByEquipment.get(r.equipmentid);
    if (!prev || rd > prev) lastReportByEquipment.set(r.equipmentid, rd);
  }

  const overdueCutoff = new Date(now);
  overdueCutoff.setDate(overdueCutoff.getDate() - overdueDays);

  let overdueVessels = 0;
  for (const e of equipmentRows) {
    const last = lastReportByEquipment.get(e.equipmentid);
    if (!last || last < overdueCutoff) overdueVessels++;
  }

  const byType = new Map<string, number>();
  for (const e of equipmentRows) {
    const label = e.vesseltypeid ? vesselTypeNameById.get(e.vesseltypeid) ?? "Unknown" : "Unknown";
    byType.set(label, (byType.get(label) ?? 0) + 1);
  }
  const vesselsByType = Array.from(byType.entries()).map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  let totalDataPoints = 0;
  try {
    totalDataPoints = clamp0(await countComponentDetailsByReportIds(reportIds));
  } catch (e: any) {
    console.error("Error counting component details:", e);
    return { error: e };
  }

  const total = distPass + distFail + distPending;
  const passRate = pct(distPass, total);

 
  const avgThis = null;
  const avgPrev = null;
  const avgInspectionTimeDeltaPct = null;

  const benchmarkPassRate = 78;

  const data: AnalyticsOverview = {
    cards: {
      inspectionRate,
      inspectionRateDelta,
      failureRate,
      failureRateDelta,
      overdueVessels,
      totalInspectors,
      newInspectorsThisMonth,
    },
    trends,
    distribution: { pass: distPass, fail: distFail, pending: distPending },
    vesselsByType,
    stats: {
      totalDataPoints,
      passRate,
      avgInspectionTimeHours: avgThis,
      avgInspectionTimeDeltaPct,
      benchmarkPassRate,
    },
  };

  return { data };
  } catch (error: any) {
    console.error("Unexpected error in buildAnalyticsOverview:", error);
    return { error: { message: "Failed to build analytics overview", details: error.message } };
  }
}
