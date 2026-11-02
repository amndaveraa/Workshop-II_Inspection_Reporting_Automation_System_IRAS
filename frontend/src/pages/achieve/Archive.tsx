import React, { useEffect, useMemo, useState } from "react";
import {
  Info, Search, Package, FileText, 
  RotateCcw, Trash2, Calendar, Users
} from "lucide-react";
import "./archive.css";

import type { ManagedUser } from "../../services/userService";
import {
  fetchInactiveUsers,
  restoreUser,
  permanentlyDeleteUser,
} from "../../services/userService";
import { inspectionService } from "../../services/inspectionService";

type TabKey = "users" | "vessels" | "reports";

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-GB');
  } catch {
    return String(iso);
  }
}

const Archive: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("users");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [workingId, setWorkingId] = useState<string | null>(null);

  // --- API LOADERS ---

  const loadInactiveUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchInactiveUsers();
      setUsers(data ?? []);
    } catch (e: any) {
      setApiError("Failed to load archived users.");
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedVessels = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/vessels/all');
      const result = await response.json();
      if (result.success && result.data) {
        const archived = result.data.filter((item: any) => 
            item.status === 'archived' || item.status === 'deactivated'
        );
        setVessels(archived.map((v: any) => ({
          archiveId: v.equipmentid, // UI key
          equipmentid: v.equipmentid, // Backend key
          id: v.tagno,
          name: v.name,
          vesselType: v.vesseltype?.name ?? "Unknown",
          archivedAt: v.updated_at,
          reason: v.status
        })));
      }
    } catch (e) {
      setApiError("Failed to load archived vessels.");
    } finally {
      setLoading(false);
    }
  };

  const loadArchivedReports = async () => {
    setLoading(true);
    try {
      const data = await inspectionService.getMasterList('archived', '');
      setReports(data || []);
    } catch (e) {
      setApiError("Failed to load archived reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setApiError(null);
    if (tab === "users") loadInactiveUsers();
    else if (tab === "vessels") loadArchivedVessels();
    else if (tab === "reports") loadArchivedReports();
  }, [tab]);

  // --- HANDLERS ---

  const handleRestoreUser = async (id: string) => {
    if (workingId) return;
    setWorkingId(id);
    try {
      await restoreUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      window.dispatchEvent(new CustomEvent("iras:users-updated"));
    } catch (e: any) {
      setApiError("Failed to restore user.");
    } finally {
      setWorkingId(null);
    }
  };

  const handlePermanentDeleteUser = async (id: string) => {
    if (workingId) return;
    if (!window.confirm("Delete user permanently? This cannot be undone.")) return;
    setWorkingId(id);
    try {
      await permanentlyDeleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e: any) {
      setApiError("Failed to delete user.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleRestoreVessel = async (vessel: any) => {
    if (workingId) return;
    setWorkingId(vessel.archiveId);
    try {
      // Resolved Conflict: Using equipmentid to match backend API
      const response = await fetch(`http://localhost:5000/api/vessels/update/${vessel.equipmentid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to restore vessel");
      }

      setVessels(prev => prev.filter(v => v.archiveId !== vessel.archiveId));
      window.dispatchEvent(new CustomEvent("iras:vessels-updated"));
    } catch (e) {
      setApiError("Failed to restore vessel.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDeleteVessel = async (archiveId: string) => {
    if (workingId) return;
    if (!window.confirm("Delete vessel permanently?")) return;
    setWorkingId(archiveId);
    try {
      await fetch(`http://localhost:5000/api/vessels/delete/${archiveId}`, { method: 'DELETE' });
      setVessels(prev => prev.filter(v => v.archiveId !== archiveId));
    } catch (e) {
      setApiError("Delete failed.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleRestoreReport = async (id: string) => {
    if (workingId) return; // Prevent double-clicks
    setWorkingId(id);
    
    try {
      // CHANGE: Set status to 'pending' instead of 'approved'
      // This makes it a "Draft" again for the inspector
      await inspectionService.updateStatus(id, 'pending', "Restored from archive to Draft");
      
      // Remove from the current archived list view
      setReports(prev => prev.filter(r => r.reportid !== id));
      
      // Notify other components to refresh
      window.dispatchEvent(new CustomEvent("iras:reports-updated"));
      
      alert("Report restored to Draft status successfully.");
    } catch (e) {
      setApiError("Failed to restore report.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm("Delete report permanently?")) return;
    setWorkingId(id);
    try {
      await inspectionService.deleteReport(id);
      setReports(prev => prev.filter(r => r.reportid !== id));
    } catch (e) {
      setApiError("Failed to delete report.");
    } finally {
      setWorkingId(null);
    }
  };

  // --- FILTER LOGIC ---
  const filteredUsers = useMemo(() => users.filter(u => u.name.toLowerCase().includes(query.toLowerCase())), [users, query]);
  const filteredVessels = useMemo(() => vessels.filter(v => v.name.toLowerCase().includes(query.toLowerCase())), [vessels, query]);
  const filteredReports = useMemo(() => reports.filter(r => r.title.toLowerCase().includes(query.toLowerCase())), [reports, query]);

  const counts = {
    users: users.length,
    vessels: vessels.length,
    reports: reports.length,
  };

  return (
    <div className="archive-page">
      <div className="archive-header">
        <h1>Archive</h1>
        <p>View and manage archived items</p>
      </div>

      <div className="archive-info">
        <div className="archive-info-icon"><Info size={18} /></div>
        <div className="archive-info-content">
          <div className="archive-info-title">Archived Items</div>
          <div className="archive-info-text">Restoring an item moves it back to active status.</div>
        </div>
      </div>

      <div className="archive-search-card">
        <div className="archive-search">
          <Search size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search archived ${tab}...`} />
        </div>
      </div>

      <div className="archive-table-card">
        <div className="archive-tabs">
          <TabButton id="users" label="Users" count={counts.users} icon={<Users size={18}/>} activeTab={tab} setTab={setTab} />
          <TabButton id="vessels" label="Vessels" count={counts.vessels} icon={<Package size={18}/>} activeTab={tab} setTab={setTab} />
          <TabButton id="reports" label="Reports" count={counts.reports} icon={<FileText size={18}/>} activeTab={tab} setTab={setTab} />
        </div>

        <div className="archive-table-wrap">
          {tab === "users" && <UserTable data={filteredUsers} workingId={workingId} onRestore={handleRestoreUser} onDelete={handlePermanentDeleteUser} />}
          {tab === "vessels" && <VesselTable data={filteredVessels} workingId={workingId} onRestore={handleRestoreVessel} onDelete={handleDeleteVessel} />}
          {tab === "reports" && <ReportTable data={filteredReports} workingId={workingId} onRestore={handleRestoreReport} onDelete={handleDeleteReport} />}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const TabButton = ({ id, label, count, icon, activeTab, setTab }: any) => (
  <button className={`archive-tab ${activeTab === id ? "active" : ""}`} onClick={() => setTab(id)}>
    {icon} <span>{label} ({count})</span>
  </button>
);

const UserTable = ({ data, workingId, onRestore, onDelete }: any) => (
  <table className="archive-table">
    <thead><tr><th>Name</th><th>Email</th><th>Last Login</th><th className="col-actions">Actions</th></tr></thead>
    <tbody>
      {data.length === 0 ? <tr><td colSpan={4} className="archive-empty">No users.</td></tr> : 
      data.map((u: any) => (
        <tr key={u.id}>
          <td>{u.name}</td><td>{u.email}</td>
          <td><span className="date-cell"><Calendar size={14} /> {formatDate(u.lastLogin)}</span></td>
          <td className="actions">
            <button className="icon-btn restore" onClick={() => onRestore(u.id)} disabled={workingId === u.id}><RotateCcw size={18} /></button>
            <button className="icon-btn danger" onClick={() => onDelete(u.id)} disabled={workingId === u.id}><Trash2 size={18} /></button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const VesselTable = ({ data, workingId, onRestore, onDelete }: any) => (
  <table className="archive-table">
    <thead><tr><th>Vessel Name</th><th>Type</th><th className="col-actions">Actions</th></tr></thead>
    <tbody>
      {data.length === 0 ? <tr><td colSpan={4} className="archive-empty">No vessels.</td></tr> :
      data.map((v: any) => (
        <tr key={v.archiveId}>
          <td>{v.name} <span className="muted">({v.id})</span></td><td>{v.vesselType}</td>
          <td className="actions">
            <button className="icon-btn restore" onClick={() => onRestore(v)} disabled={workingId === v.archiveId}><RotateCcw size={18} /></button>
            <button className="icon-btn danger" onClick={() => onDelete(v.archiveId)} disabled={workingId === v.archiveId}><Trash2 size={18} /></button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ReportTable = ({ data, workingId, onRestore, onDelete }: any) => (
  <table className="archive-table">
    <thead><tr><th>Report Title</th><th>Report ID</th><th>Date</th><th className="col-actions">Actions</th></tr></thead>
    <tbody>
      {data.length === 0 ? <tr><td colSpan={4} className="archive-empty">No reports.</td></tr> :
      data.map((r: any) => (
        <tr key={r.reportid}>
          <td>{r.title}</td><td>{r.reportid.substring(0,8)}</td>
          <td><span className="date-cell"><Calendar size={14} /> {formatDate(r.reportdate)}</span></td>
          <td className="actions">
            <button className="icon-btn restore" onClick={() => onRestore(r.reportid)} disabled={workingId === r.reportid}><RotateCcw size={18} /></button>
            <button className="icon-btn danger" onClick={() => onDelete(r.reportid)} disabled={workingId === r.reportid}><Trash2 size={18} /></button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default Archive;