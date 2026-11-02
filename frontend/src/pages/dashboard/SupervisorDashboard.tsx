import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserFromToken } from "../../utils/tokenUtils";
import type { Employee } from "../../models/Employee";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid 
} from "recharts";
import { 
  ClipboardList, CheckCircle, FileEdit, AlertCircle, LayoutDashboard 
} from "lucide-react";
import { supervisorService } from "../../services/supervisorService";
import "./dashboard.css";
import "./supervisorDashboard.css";

const SupervisorDashboard: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const navigate = useNavigate();
  const user = getUserFromToken() as Employee;
  
  // State
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    teamCompleted: 0,
    activeDrafts: 0,
    revisionRequired: 0
  });
  const [approvalQueue, setApprovalQueue] = useState([]);
  const [teamWorkload, setTeamWorkload] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [now, setNow] = useState(new Date());

  // Clock Effect
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Data Loading - Logic updated to fetch Global Team Data
  useEffect(() => {
    const loadData = async () => {
      try {
        // We still pass employeeId for authentication/logging, 
        // but backend now returns global internal data
        const [statsRes, queueRes, workloadRes, chartRes] = await Promise.all([
          supervisorService.getDeptStats(employeeId, selectedYear),
          supervisorService.getApprovalQueue(employeeId),
          supervisorService.getTeamWorkload(employeeId),
          supervisorService.getMonthlyApprovalTrend(employeeId, selectedYear)
        ]);
        
        setStats(statsRes);
        setApprovalQueue(queueRes);
        setTeamWorkload(workloadRes);
        setPerformanceData(chartRes);
      } catch (err) {
        console.error("Failed to load Global Supervisor Dashboard:", err);
      }
    };
    if (employeeId) loadData();
  }, [employeeId, selectedYear]);

  const formattedDate = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formattedTime = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="dashboard-page">
      {/* Header - Clean Internal Branding */}
      <div className="dashboard-header-row">
        <div>
          <p className="dashboard-greeting">Internal Quality Assurance</p>
          <h1 className="dashboard-title">Supervisor Dashboard</h1>
          <p className="dashboard-subtitle">Monitoring all internal team reports and approvals</p>
        </div>
        <div className="dashboard-datetime">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="year-select">
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className="dashboard-date viewing-year">Viewing {selectedYear}</span>
          <span className="dashboard-date">{formattedDate}</span>
          <span className="dashboard-time">{formattedTime}</span>
        </div>
      </div>

      {/* KPI Grid - Global Aggregates */}
      <div className="dashboard-kpi-grid">
        <div className="kpi-card kpi-purple">
          <div className="kpi-header">
            <span className="kpi-label">Pending Reviews</span>
            <ClipboardList size={20} />
          </div>
          <div className="kpi-value">{stats.pendingApprovals}</div>
          <div className="kpi-caption warning">Awaiting Approval</div>
        </div>
        <div className="kpi-card kpi-green">
          <div className="kpi-header">
            <span className="kpi-label">Total Finalized</span>
            <CheckCircle size={20} />
          </div>
          <div className="kpi-value">{stats.teamCompleted}</div>
          <div className="kpi-caption positive">Completed in {selectedYear}</div>
        </div>
        <div className="kpi-card kpi-orange">
          <div className="kpi-header">
            <span className="kpi-label">Live Drafts</span>
            <FileEdit size={20} />
          </div>
          <div className="kpi-value">{stats.activeDrafts}</div>
          <div className="kpi-caption neutral">In-progress by staff</div>
        </div>
        <div className="kpi-card kpi-red">
          <div className="kpi-header">
            <span className="kpi-label">Rejected / Revision</span>
            <AlertCircle size={20} />
          </div>
          <div className="kpi-value">{stats.revisionRequired}</div>
          <div className="kpi-caption danger">Requires Inspector correction</div>
        </div>
      </div>

      <div className="dashboard-charts-grid">
        {/* Main Table: Global Approval Queue */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LayoutDashboard size={18} />
              <h2>Master Approval Queue</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="dashboard-table">
              <div className="dashboard-table-header supervisor-table">
                <span>Submitted</span>
                <span>Inspector</span>
                <span>Vessel / Equipment</span>
                <span>Action</span>
              </div>
              <div className="table-scroll-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {approvalQueue.map((item: any) => (
                  <div key={item.reportid} className="dashboard-table-row supervisor-table">
                    <span className="table-date-cell">{new Date(item.reportdate).toLocaleDateString('en-GB')}</span>
                    <span className="table-vessel-cell">{item.employee?.name}</span>
                    <span className="table-title-cell">{item.equipment?.name}</span>
                    <button 
                      className="dashboard-btn small primary"
                      onClick={() => navigate(`/app/inspections`)}
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
              {approvalQueue.length === 0 && <div className="no-data-msg">The queue is empty. No reports submitted.</div>}
            </div>
          </div>
        </div>

        {/* Right Side: Total Staff Workload */}
        <div className="card">
          <div className="card-header">
            <h2>Staff Workload Monitor</h2>
          </div>
          <div className="card-body">
            <ul className="user-list">
              {teamWorkload.map((member: any) => (
                <li key={member.id} className="user-item">
                  <div className="user-info">
                    <span className="user-name">{member.name}</span>
                    <span className={`item-subtitle ${member.overdueCount > 0 ? 'danger-text' : ''}`}>
                      {member.overdueCount > 0 ? `⚠️ ${member.overdueCount} Overdue` : 'Status: Clear'}
                    </span>
                  </div>
                  <div className="workload-indicator">
                    <span className="workload-count">{member.draftCount}</span>
                    <span className="workload-label">Working Inspection</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Global Trend Chart */}
      <div className="dashboard-section mt-24">
        <div className="dashboard-section-header">
          <h2>Total Approval Trend ({selectedYear})</h2>
        </div>
        
        <div className="chart-body" style={{ width: '100%', height: '300px', background: '#fff', borderRadius: '12px', padding: '15px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="approved" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;