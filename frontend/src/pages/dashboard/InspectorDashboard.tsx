import React, { useEffect, useState } from "react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { getUserFromToken } from "../../utils/tokenUtils";
import type { Employee } from "../../models/Employee";
import { inspectionService } from "../../services/inspectionService";
import type { DashboardStats, UpcomingInspection, PendingReport,  } from "../../services/inspectionService";
import "./dashboard.css";
import "./inspectorDashboard.css"

interface InspectorDashboardProps {
  employeeId: string;
}


const InspectorDashboard: React.FC<InspectorDashboardProps> = ({ employeeId }) => {
    const navigate = useNavigate();
    const user = getUserFromToken() as Employee;
    const [upcoming, setUpcoming] = useState<UpcomingInspection[]>([]);
    const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
    const [monthlyData, setMonthlyData] = useState<number[]>(Array(12).fill(0));
    const [stats, setStats] = useState<DashboardStats>({ 
    pendingCount: 0, 
    approvedCount: 0,
    total: 0,
    overdueCount: 0 
    });

    console.log(stats)

  const [now, setNow] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear()
  );

  const inspectorName = user?.name ?? "Inspector";

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

  const [statusDistribution, setStatusDistribution] = useState<any[]>([]);

    const STATUS_COLORS: Record<string, string> = {
    pending: "#FFB020",
    approved: "#22C55E",
    completed: "#22C55E", // Add this
    rejected: "#EF4444",
    fail: "#EF4444",      // Add this
    };
    console.log("Current Employee ID:", employeeId);

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
    const loadPerformance = async () => {
        try {
        const data = await inspectionService.getMonthlyPerformance(employeeId, selectedYear);
        setMonthlyData(data);
        } catch (err) { console.error(err); }
    };
    if (employeeId) loadPerformance();
    }, [employeeId, selectedYear]);

    useEffect(() => {
        const loadPending = async () => {
            try {
            const data = await inspectionService.getPendingReports(employeeId);
            setPendingReports(data);
            } catch (err) {
            console.error(err);
            }
        };
        if (employeeId) loadPending();
    }, [employeeId]);

    useEffect(() => {
        const loadStats = async () => {
            try {
            // Pass both employeeId and selectedYear
            const data = await inspectionService.getDashboardStats(employeeId, selectedYear);
            console.log(selectedYear)
            setStats(data);
            } catch (error) {
            console.error("Dashboard error:", error);
            }
        };

        if (employeeId) {
            loadStats();
        }
        }, [employeeId, selectedYear]);

        useEffect(() => {
            const loadStatusDist = async () => {
                try {
                    const data = await inspectionService.getInspectorStatusDistribution(employeeId, selectedYear);
                    console.log("PIE DATA FOR INSPECTOR:", data); // Check this in F12 Console
                    setStatusDistribution(data);
                } catch (err) {
                    console.error("Error loading status distribution:", err);
                }
            };
            if (employeeId) loadStatusDist();
        }, [employeeId, selectedYear]);

    useEffect(() => {
    const loadDashboardData = async () => {
        try {
        // 1. Fetch Stats (Depends on Year)
        const statsData = await inspectionService.getDashboardStats(employeeId, selectedYear);
        console.log(statsData); 
        setStats(statsData);

        // 2. Fetch Upcoming (Usually independent of selected year filter as it's "future" tasks)
        const upcomingData = await inspectionService.getUpcomingInspections(employeeId);
        setUpcoming(upcomingData);
        } catch (error) {
        console.error("Dashboard refresh failed:", error);
        }
    };

    if (employeeId) loadDashboardData();
    }, [employeeId, selectedYear]); // Re-runs when year changes


    const getStatusClass = (status: string) => {
        const s = status?.toLowerCase();
        if (s === 'draft') return 'status-badge draft';
        if (s === 'pending') return 'status-badge warning';
        return 'status-badge info';
    };

  const handleCreateReport = () => {
    navigate("/app/pending");
  };

  const handleViewEquipment = () => {
    navigate("/app/vessels");
  };

    const maxVal = Math.max(...monthlyData, 1); // Avoid division by zero
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header-row">
        <div>
          <p className="dashboard-greeting">
            Good day{inspectorName ? `, ${inspectorName}` : ""}
          </p>
          <h1 className="dashboard-title">Inspector Dashboard</h1>
          <p className="dashboard-subtitle">
            Your inspections, reports, and upcoming tasks
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

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <span className="quick-actions-label">Quick Actions</span>

        <button className="dashboard-btn primary" onClick={handleCreateReport}>
          + Submit Inspection Report
        </button>

        <button
          className="dashboard-btn secondary"
          onClick={handleViewEquipment}
        >
          View Assigned Equipment
        </button>
      </div>

      {/* KPI Grid */}
        <div className="dashboard-kpi-grid">
            {/* Orange Card: Pending */}
            <div className="kpi-card kpi-orange">
                <div className="kpi-label">Pending Inspections</div>
                <div className="kpi-value">{stats.pendingCount}</div>
                <div className="kpi-caption warning">Due soon</div>
            </div>

            {/* Green Card: Completed */}
            <div className="kpi-card kpi-green">
                <div className="kpi-label">Approved Inspections</div>
                <div className="kpi-value">{stats.approvedCount}</div>
                <div className="kpi-caption positive">This year</div>
            </div>

            {/* Blue Card: Total Reports */}
            <div className="kpi-card kpi-blue">
                <div className="kpi-label">Total Report</div>
                <div className="kpi-value">{stats.total}</div>
                <div className="kpi-caption neutral">Total {stats.total} for {selectedYear}</div>
            </div>

            {/* Red Card: Overdue */}
            <div className="kpi-card kpi-red">
                <div className="kpi-label">Overdue Inspections</div>
                <div className="kpi-value">{stats.overdueCount}</div>
                <div className="kpi-caption danger">Immediate action required</div>
            </div>
        </div>
        

        {/* Upcoming Inspections */}
        <div className="dashboard-section">
            <div className="dashboard-section-header">
            <h2>Upcoming Inspections</h2>
            <button
                className="dashboard-link"
                onClick={() => navigate("/app/pending")}
            >
                View all
            </button>
            </div>

            <div className="dashboard-table">
                <div className="dashboard-table-header">
                    <span>Date</span>
                    <span>Vessel / Location</span>
                    <span>Report Title</span>
                    <span>Status</span>
                </div>

                {upcoming.length > 0 ? (
                    upcoming.map((item) => (
                    <div key={item.reportid} className="dashboard-table-row">
                        {/* Date column with secondary text color */}
                        <span className="table-date-cell">
                        {new Date(item.reportdate).toLocaleDateString('en-GB', { 
                            day: '2-digit', month: 'short', year: 'numeric' 
                        })}
                        </span>
                        
                        {/* Vessel Name: Bold and primary color */}
                        <span className="table-vessel-cell">
                        {item.equipment?.name || "Unassigned Vessel"}
                        </span>
                        
                        {/* Report Title */}
                        <span className="table-title-cell">{item.title}</span>
                        
                        {/* Status Badge */}
                        <span className="status-badge-container">
                        <span className={getStatusClass(item.status)}>
                            {item.status}
                        </span>
                        </span>
                    </div>
                    ))
                ) : (
                    <div className="no-data-msg">No upcoming inspections found.</div>
                )}

            </div>
        </div>

            {/* <div className="dashboard-section">
                <div className="card">
                    <div className="card-header">
                        <h2>Upcoming Scheduled Inspections</h2>
                    </div>

                    <div className="card-body">
                        {upcoming.length === 0 ? (
                        <div className="empty-state">
                            No upcoming inspections scheduled.
                        </div>
                        ) : (
                        <ul className="inspection-list">
                            {upcoming.map((ins) => {
                            // Format date for the date-box
                            const dateObj = new Date(ins.reportdate);
                            const month = dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase();
                            const day = dateObj.getDate();

                            // Simple logic to determine urgency class
                            const isOverdue = new Date(ins.reportdate) < new Date();
                            const urgencyClass = isOverdue ? "urgency-high" : "urgency-low";

                            return (
                                <li
                                key={ins.reportid} // FIXED: Changed 'item' to 'ins'
                                className={`inspection-item ${urgencyClass}`}
                                onClick={() => navigate(`/app/reports/edit/${ins.reportid}`)}
                                style={{ cursor: 'pointer' }}
                                >
                                <div className="inspection-date-box">
                                    <div className="idb-month">{month}</div>
                                    <div className="idb-day">{day}</div>
                                </div>

                                <div className="inspection-info">
                                    <div className="inspection-title">
                                    {ins.equipment?.name || "Unassigned Vessel"}
                                    </div>

                                    <div className="inspection-meta">
                                    Title: {ins.title}
                                    </div>

                                    <div className="inspection-meta">
                                    {isOverdue ? (
                                        <span className="badge badge-danger">Overdue</span>
                                    ) : (
                                        <span className="badge badge-neutral">
                                        Status: {ins.status}
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
            </div> */}


        {/* Charts */}
        <div className="dashboard-section">
            <div className="dashboard-section-header">
                <h2>Inspection Performance</h2>
            </div>

            <div className="chart-container">
                <div className="bar-chart">
                    {monthlyData.map((count, index) => (
                        <div key={index} className="bar-wrapper">
                            <div 
                                className="bar" 
                                style={{ height: `${(count / maxVal) * 100}%` }}
                                title={`${count} Inspections`}
                            >
                                {count > 0 && <span className="bar-value">{count}</span>}
                            </div>
                            <span className="bar-label">{months[index]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default InspectorDashboard;
