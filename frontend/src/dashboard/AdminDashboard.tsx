import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Package,
  CheckCircle2,
  Power,
  FileClock,
  ClipboardCheck,
} from "lucide-react";
import "./dashboard.css";
import { getUserFromToken } from "../../utils/tokenUtils";
import type { Employee } from "../../models/Employee";
import * as DashboardService from "../../services/dashboardService"


const user = getUserFromToken() as Employee;

type WorkloadItem = {
  id: string;
  name: string;
  role: "inspector" | "supervisor";
  pendingCount: number;
};


type UpcomingInspection = {
  id: string;
  date: string;
  equipmentName: string;
  tagNo: string;
  inspector: string;
  daysUntil: number;
  isOverdue: boolean;
  urgency: "high" | "medium" | "low";
};

  type StatusDistributionItem = {
    key: ReportStatusKey;
    name: string;
    value: number;
  };

export type ReportStatusKey = "pending" | "completed" | "fail";

export const STATUS_COLORS: Record<ReportStatusKey, string> = {
  pending: "#FFB020",
  completed: "#22C55E",
  fail: "#EF4444",
};


function getGreeting(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [now, setNow] = useState<Date>(new Date());
  const [userName, setUserName] = useState<string>(user.name);

  const [VesselStats, setVesselStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [ReportStats, setReportStats] = useState({ total: 0, approved: 0, pending: 0 });
  const currentYear = new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyReportData, setMonthlyReportData] = useState<
    { month: string; count: number }[]
  >([]);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [inspectorWorkload, setInspectorWorkload] = useState<WorkloadItem[]>([]);
  const [isLoadingWorkload, setIsLoadingWorkload] = useState(false);

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const [upcomingInspections, setUpcomingInspections] =
  useState<UpcomingInspection[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);


  useEffect(() => {
    const loadWorkload = async () => {
      try {
        setIsLoadingWorkload(true);
        const res = await DashboardService.getWorkloadDistribution(selectedYear);
        setInspectorWorkload(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingWorkload(false);
      }
    };

    loadWorkload();
  }, [selectedYear]); 

  useEffect(() => {
    const loadMonthlyStats = async () => {
      try {
        setIsLoadingMonthly(true);
        const data = await DashboardService.getMonthlyReportStats(selectedYear);
        setMonthlyReportData(data);
      } catch (error) {
        console.error("Monthly report stats error:", error);
      } finally {
        setIsLoadingMonthly(false);
      }
    };

    loadMonthlyStats();
  }, [selectedYear]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  
  useEffect(() => {
    try {
      const raw = localStorage.getItem("settings_profile");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { fullName?: string };
      if (parsed?.fullName) setUserName(parsed.fullName);
    } catch {
     
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingUpcoming(true);
        const res = await DashboardService.fetchUpcomingScheduledInspections();
        setUpcomingInspections(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUpcoming(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        const vesselData = await DashboardService.getVesselStatsCount();
        const reportData = await DashboardService.getReportStatsCount(selectedYear);

        setVesselStats(vesselData);
        setReportStats(reportData);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

      fetchStats();
  }, [selectedYear]);

  const [statusDistribution, setStatusDistribution] = useState<
    StatusDistributionItem[]
  >([]);


  useEffect(() => {
    const loadStatusDistribution = async () => {
      try {
        const data = await DashboardService.getReportStatusDistribution(selectedYear);
        console.log(data);
        setStatusDistribution(data);
      } catch (error) {
        console.error("Status distribution error:", error);
      }
    };

    loadStatusDistribution();
  }, [selectedYear]);


 
    const handleCreateReport = () => {
        navigate("/app/reports");
    };

    const handleAddPressureVessel = () => {
        navigate("/app/vessels/new");
    };

    const totalReports = statusDistribution.reduce(
      (sum, item) => sum + item.value,
      0
    );

    const totalInspections = useMemo(
      () => statusDistribution.reduce((sum, d) => sum + d.value, 0),
      [statusDistribution]
    );

    const formatDateParts = (dateStr: string) => {
      const d = new Date(dateStr);
      return {
        month: d.toLocaleString("en-US", { month: "short" }),
        day: d.getDate(),
      };
    };
        
  return (
    <div className="dashboard-page">
    
      <div className="dashboard-header-row">
        <div>
          <p className="dashboard-greeting">
            {getGreeting(now)}
            {userName ? `, ${userName}` : ""}
          </p>
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Overview of pressure vessel inspections
          </p>
        </div>
        <div className="dashboard-datetime">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="year-select"
          >
            {[2024, 2025, 2026].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <span className="dashboard-date viewing-year">
            Viewing data for {selectedYear}
          </span>

          <span className="dashboard-date">{formattedDate}</span>
          <span className="dashboard-time">{formattedTime}</span>
        </div>
      </div>

      
      <div className="dashboard-quick-actions">
        <span className="quick-actions-label">Quick Actions</span>
        <button
          className="dashboard-btn primary"
          onClick={handleAddPressureVessel}
        >
          + Add New Pressure Vessel
        </button>
      </div>

     
      <div className="dashboard-kpi-grid">
     
        <div className="kpi-card kpi-blue">
          <div className="kpi-header">
            <div className="kpi-label">Total Vessels</div>
            <div className="kpi-icon-wrapper">
              <Package size={18} />
            </div>
          </div>
          <div className="kpi-value">{isLoading ? "..." : VesselStats.total}</div>
          <div className="kpi-caption neutral">
            Includes active & deactivated vessels
          </div>
        </div>

       
        <div className="kpi-card kpi-green">
          <div className="kpi-header">
            <div className="kpi-label">Active Vessels</div>
            <div className="kpi-icon-wrapper">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="kpi-value">{isLoading ? "..." : VesselStats.active}</div>
          <div className="kpi-caption positive">
            {VesselStats.active} of {VesselStats.total} currently in service
          </div>
        </div>

        
        <div className="kpi-card kpi-gray">
          <div className="kpi-header">
            <div className="kpi-label">Deactivated and Archieved Vessels</div>
            <div className="kpi-icon-wrapper">
              <Power size={18} />
            </div>
          </div>
          <div className="kpi-value">{isLoading ? "..." : VesselStats.inactive}</div>
          <div className="kpi-caption neutral">
            Temporarily offline / decommissioned
          </div>
        </div>

       
        <div className="kpi-card kpi-orange">
          <div className="kpi-header">
            <div className="kpi-label">Pending Reports</div>
            <div className="kpi-icon-wrapper">
              <FileClock size={18} />
            </div>
          </div>
          <div className="kpi-value">{ReportStats.pending}</div>
          <div className="kpi-caption warning">
            {ReportStats.pending} inspections waiting for submitting
          </div>
        </div>

       
        <div className="kpi-card kpi-purple">
          <div className="kpi-header">
            <div className="kpi-label">Approved Reports</div>
            <div className="kpi-icon-wrapper">
              <ClipboardCheck size={18} />
            </div>
          </div>
          <div className="kpi-value">{ReportStats.approved}</div>
          <div className="kpi-caption positive">
            Out of {ReportStats.total} total inspections
          </div>
        </div>
      </div>

     
      <div className="dashboard-charts-grid">
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between" }}>
            <h2>Monthly Report Count</h2>
          </div>

          <div className="card-body chart-body">
            {isLoadingMonthly ? (
              <div className="empty-state">Loading data...</div>
            ) : monthlyReportData.length === 0 ? (
              <div className="empty-state">No report data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyReportData}>
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value} reports`, ""]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h2>Inspection Status Distribution</h2>
          </div>

          <div className="card-body chart-body">
            {totalReports === 0 ? (
              <div className="empty-state">No status data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {statusDistribution.map((entry, index) => {
                      // FIX: Force key to lowercase and cast to the union type
                      const colorKey = entry.key.toLowerCase() as ReportStatusKey;
                      const fillColor = STATUS_COLORS[colorKey] || "#64748b";
                      
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={fillColor}
                        />
                      );
                    })}
                  </Pie>

                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} reports`,
                      name, // Will display "Approved" instead of "Completed"
                    ]}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

  
      <div className="dashboard-bottom-grid">
        <div className="card">
          <div
            className="card-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <h2>Workload Distribution</h2>
            <button className="btn-small" onClick={() => navigate("/app/users")}>
              Manage Team
            </button>
          </div>

          <div className="card-body">
            {isLoadingWorkload ? (
              <div className="empty-state">Loading workload...</div>
            ) : inspectorWorkload.length === 0 ? (
              <div className="empty-state">No inspection staff found.</div>
            ) : (
              <ul className="user-list">
                {inspectorWorkload.map((staff) => {
                  const severity =
                    staff.pendingCount >= 5
                      ? "high"
                      : staff.pendingCount >= 2
                      ? "medium"
                      : "low";

                  return (
                    <li key={staff.id} className="user-item">
                      <div className="user-info">
                        <span className="user-name">{staff.name}</span>
                        <span className={`role-badge role-${staff.role}`}>
                          {staff.role}
                        </span>
                      </div>

                      <div className={`workload-indicator ${severity}`}>
                        <span className="workload-count">
                          {staff.pendingCount}
                        </span>
                        <span className="workload-label">Pending</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
                
        <div className="card">
          <div className="card-header">
            <h2>Upcoming Scheduled Inspections</h2>
          </div>

          <div className="card-body">
            {upcomingInspections.length === 0 ? (
              <div className="empty-state">
                No upcoming inspections scheduled.
              </div>
            ) : (
              <ul className="inspection-list">
                {upcomingInspections.map((ins) => {
                  const { month, day } = formatDateParts(ins.date);

                  return (
                    <li
                      key={ins.id}
                      className={`inspection-item urgency-${ins.urgency}`}
                    >
                      <div className="inspection-date-box">
                        <div className="idb-month">{month}</div>
                        <div className="idb-day">{day}</div>
                      </div>

                      <div className="inspection-info">
                        <div className="inspection-title">
                          {ins.equipmentName} ({ins.tagNo})
                        </div>

                        <div className="inspection-meta">
                          Inspector: {ins.inspector}
                        </div>

                        <div className="inspection-meta">
                          {ins.isOverdue ? (
                            <span className="badge badge-danger">Overdue</span>
                          ) : (
                            <span className="badge badge-neutral">
                              Due in {ins.daysUntil} day(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
