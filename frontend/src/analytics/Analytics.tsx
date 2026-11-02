import React, { useEffect, useMemo, useState } from "react";
import "./analytics.css";
import { ArrowUpRight, TrendingDown, AlertTriangle, Users, RefreshCw, ShieldCheck } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";
import { getAnalyticsOverview, type AnalyticsOverview } from "../../services/analyticsService";

const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmt1 = (n: number) => n.toFixed(1);

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b"]; // pass, fail, pending

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [months, setMonths] = useState(6);
  const [overdueDays, setOverdueDays] = useState(365);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await getAnalyticsOverview(months, overdueDays);
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [months, overdueDays]);

  const totals = useMemo(() => {
    if (!data) {
      return {
        totalInspections: 0,
        totalVessels: 0,
        avgDataPointsPerInspection: null as number | null,
      };
    }

    const totalInspections = data.trends.reduce((sum, m) => sum + (m.total ?? 0), 0);
    const totalVessels = data.vesselsByType.reduce((sum, v) => sum + (v.count ?? 0), 0);

    const avgDataPointsPerInspection =
      totalInspections > 0 ? data.stats.totalDataPoints / totalInspections : null;

    return { totalInspections, totalVessels, avgDataPointsPerInspection };
  }, [data]);

  const pieData = useMemo(() => {
    if (!data) return [];
    const total = data.distribution.pass + data.distribution.fail + data.distribution.pending;
    const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);

    return [
      { key: "pass", name: `Pass: ${pct(data.distribution.pass)}%`, value: data.distribution.pass },
      { key: "fail", name: `Fail: ${pct(data.distribution.fail)}%`, value: data.distribution.fail },
      {
        key: "pending",
        name: `Pending: ${pct(data.distribution.pending)}%`,
        value: data.distribution.pending,
      },
    ];
  }, [data]);

 
  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, outerRadius, fill, name, value } = props;
    if (!value || value <= 0) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 14; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={fill}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        style={{ fontSize: 13, fontWeight: 700 }}
      >
        {name}
      </text>
    );
  };

  const overduePct = useMemo(() => {
    if (!data) return null;
    if (!totals.totalVessels) return null;
    return (data.cards.overdueVessels / totals.totalVessels) * 100;
  }, [data, totals.totalVessels]);

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <div className="analytics-title-row">
            <h1>Analytics</h1>
            <span className="supervisor-badge">
              <ShieldCheck size={14} />
              Management Only
            </span>
          </div>
          <p>Industrial inspection analytics and performance insights</p>
        </div>

        <div className="analytics-controls">
          <div className="control-group">
            <label htmlFor="months-select">Time Range</label>
            <select
              id="months-select"
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              disabled={loading}
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
              <option value={24}>Last 24 Months</option>
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="overdue-select">Overdue Threshold</label>
            <select
              id="overdue-select"
              value={overdueDays}
              onChange={(e) => setOverdueDays(Number(e.target.value))}
              disabled={loading}
            >
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
              <option value={365}>1 Year</option>
              <option value={730}>2 Years</option>
            </select>
          </div>

          <button className="analytics-refresh" onClick={load} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="analytics-error">
          {err} <button onClick={load}>Retry</button>
        </div>
      )}


      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-left">
            <div className="stat-title">Inspection Rate</div>
            <div className="stat-value">{data ? fmtPct(data.cards.inspectionRate) : "—"}</div>
            <div className={`stat-sub ${data && data.cards.inspectionRateDelta >= 0 ? "good" : "bad"}`}>
              ↑ {data ? fmtPct(Math.abs(data.cards.inspectionRateDelta)) : "—"} from last quarter
            </div>
          </div>
          <div className="stat-icon blue">
            <ArrowUpRight size={18} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-left">
            <div className="stat-title">Failure Rate</div>
            <div className="stat-value">{data ? fmtPct(data.cards.failureRate) : "—"}</div>
            <div className={`stat-sub ${data && data.cards.failureRateDelta >= 0 ? "good" : "bad"}`}>
              {data && data.cards.failureRateDelta >= 0 ? "↓" : "↑"}{" "}
              {data ? fmtPct(Math.abs(data.cards.failureRateDelta)) : "—"}{" "}
              {data && data.cards.failureRateDelta >= 0 ? "improvement" : "worse"}
            </div>
          </div>
          <div className="stat-icon red">
            <TrendingDown size={18} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-left">
            <div className="stat-title">Overdue Vessels</div>
            <div className="stat-value">{data ? data.cards.overdueVessels : "—"}</div>
            <div className="stat-sub warn">
              {overduePct != null ? `${Math.round(overduePct)}% of vessels overdue` : "Requires immediate attention"}
            </div>
          </div>
          <div className="stat-icon amber">
            <AlertTriangle size={18} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-left">
            <div className="stat-title">Total Inspectors</div>
            <div className="stat-value">{data ? data.cards.totalInspectors : "—"}</div>
            <div className="stat-sub good">↑ {data ? data.cards.newInspectorsThisMonth : "—"} new this month</div>
          </div>
          <div className="stat-icon purple">
            <Users size={18} />
          </div>
        </div>
      </div>


      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Inspection Trends ({months} Months)</div>
          <div className="chart-body">
            {loading && <div className="chart-loading">Loading…</div>}
            {!loading && data && (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="fail" name="Fail" stroke="#ef4444" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="pass" name="Pass" stroke="#16a34a" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="total" name="Total Inspections" stroke="#2563eb" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Result Distribution</div>
          <div className="chart-body chart-body-pie">
            {loading && <div className="chart-loading">Loading…</div>}
            {!loading && data && (
              <>
              
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart margin={{ top: 8, right: 40, left: 40, bottom: 8 }}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={renderPieLabel}
                      labelLine
                      minAngle={2}
                      isAnimationActive
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="pie-legend">
                  <div className="pie-item">
                    <span className="dot" style={{ background: PIE_COLORS[0] }} />
                    <div>
                      <div className="pie-name">Pass</div>
                      <div className="pie-count">{data.distribution.pass}</div>
                    </div>
                  </div>
                  <div className="pie-item">
                    <span className="dot" style={{ background: PIE_COLORS[1] }} />
                    <div>
                      <div className="pie-name">Fail</div>
                      <div className="pie-count">{data.distribution.fail}</div>
                    </div>
                  </div>
                  <div className="pie-item">
                    <span className="dot" style={{ background: PIE_COLORS[2] }} />
                    <div>
                      <div className="pie-name">Pending</div>
                      <div className="pie-count">{data.distribution.pending}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      <div className="chart-card full">
        <div className="chart-title">Vessels by Type</div>
        <div className="chart-body">
          {loading && <div className="chart-loading">Loading…</div>}
          {!loading && data && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.vesselsByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    
      <div className="bottom-stats">
        <div className="big-stat blue">
          <div className="big-title">Total Data Points</div>
          <div className="big-value">{data ? data.stats.totalDataPoints.toLocaleString() : "—"}</div>
          <div className="big-sub">Across all inspections</div>
        </div>

        <div className="big-stat green">
          <div className="big-title">Pass Rate</div>
          <div className="big-value">{data ? fmtPct(data.stats.passRate) : "—"}</div>
          <div className="big-sub">Industry benchmark: {data ? fmtPct(data.stats.benchmarkPassRate) : "—"}</div>
        </div>

        <div className="big-stat orange">
          <div className="big-title">Avg Data Points / Inspection</div>
          <div className="big-value">
            {totals.avgDataPointsPerInspection != null ? fmt1(totals.avgDataPointsPerInspection) : "—"}
          </div>
          <div className="big-sub">
            {totals.totalInspections ? `${totals.totalInspections} inspections in last ${months} months` : "No inspections found"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
