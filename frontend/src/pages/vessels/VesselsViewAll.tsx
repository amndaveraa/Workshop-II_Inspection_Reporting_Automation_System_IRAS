import React, { useEffect, useMemo, useState } from "react";
import { 
  Search, Eye, Pencil, Archive, Plus, X, 
  ArrowUp, ArrowDown, History
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUserFromToken } from "../../utils/tokenUtils";
import supabase from "../../config/supabaseClient";
import { vesselService } from "../../services/equipmentService";
import "./VesselsViewAll.css";

type VesselStatus = "Active" | "Deactivated" | "Archived";
type InspectionStatus = "Completed" | "Pending" | "On Inspection" | "Archived";
type VesselType = string;

interface InspectionRecord {
  reportid: string;
  title: string;
  reportdate: string;
  status: string;
  inspectorName: string;
}

interface Vessel {
  equipmentid: string;
  id: string;
  name: string;
  type: VesselType;
  capacity: number;
  installationDate: string;
  location: string;
  lastInspection: string;
  status: VesselStatus;
  inspectionStatus: InspectionStatus;
  image: string;
  components?: string[];
  doshregno: string;
  plantid?: string;
  vesseltypeid?: string;
  latestInspectionDate?: string;
  latestInspectionBy?: string;
}

const PAGE_SIZE = 5;

const VesselsViewAll: React.FC = () => {
  const navigate = useNavigate();
  const user = getUserFromToken();
  const isAdmin = user?.role === "administrator";

  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [inspectionFilter, setInspectionFilter] = useState<"all" | InspectionStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | VesselType>("all");
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Vessel; direction: 'asc' | 'desc' | null }>({
    key: 'id',
    direction: null,
  });

  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [plants, setPlants] = useState<{ plantid: string; name: string }[]>([]);
  const [vesselTypes, setVesselTypes] = useState<{ vesseltypeid: string; name: string }[]>([]);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
  const [newPlantName, setNewPlantName] = useState("");
  const [isAddingPlant, setIsAddingPlant] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyVessel, setHistoryVessel] = useState<Vessel | null>(null);
  const [inspectionHistory, setInspectionHistory] = useState<InspectionRecord[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);

  const [editForm, setEditForm] = useState({
    name: "",
    tagno: "",
    doshregno: "",
    plantid: "",
    vesseltypeid: "",
    status: ""
  });

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;
      if (!supabase) throw new Error("Supabase client not initialized");

      const { error: uploadError } = await supabase.storage
        .from('vessel-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('vessel-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert("Failed to upload image");
      return null;
    }
  };

  const fetchVessels = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/vessels/all');
      const result = await response.json();

      if (result.success && result.data) {
        const reportsResponse = await fetch('http://localhost:5000/api/reports');
        const reportsResult = await reportsResponse.json();
        const reports = reportsResult.data || [];

        const formattedData = result.data.map((item: any) => {
          const equipmentReports = reports.filter((r: any) => r.equipmentid === item.equipmentid);
          
          const actualInspections = equipmentReports.filter((r: any) => {
            const status = String(r.status || "").toLowerCase().trim();
            return status !== "pending" && status !== "draft";
          });
          
          actualInspections.sort((a: any, b: any) => {
            const dateA = new Date(a.reportdate || 0).getTime();
            const dateB = new Date(b.reportdate || 0).getTime();
            return dateB - dateA;
          });

          const latestReport = actualInspections[0];
          
          let inspectionStatus: InspectionStatus = "Pending";
          let lastInspection = "N/A";
          let latestInspectionBy = "N/A";
          
          if (latestReport) {
            const status = String(latestReport.status || "").toLowerCase().trim();
            
            if (status === "archived") {
              inspectionStatus = "Archived";
            } else if (status === "approved" || status === "completed") {
              inspectionStatus = "Completed";
            } else if (status === "submitted") {
              inspectionStatus = "On Inspection";
            } else if (status === "rejected") {
              inspectionStatus = "Pending";
            } else {
              inspectionStatus = "Pending";
            }
            
            if (latestReport.reportdate) {
              const date = new Date(latestReport.reportdate);
              lastInspection = date.toLocaleDateString();
            }
            
            if (latestReport.employee?.name) {
              latestInspectionBy = latestReport.employee.name;
            }
          }

          return {
            equipmentid: item.equipmentid,
            id: item.tagno,
            name: item.name,
            doshregno: item.doshregno || "N/A",
            type: item.vesseltype?.name ?? "Unknown",
            vesseltypeid: item.vesseltypeid,
            location: item.plant?.name ?? "Unknown",
            plantid: item.plantid,
            capacity: item.capacity || 0,
            installationDate: item.installationdate || "N/A",
            lastInspection,
            status: item.status?.toLowerCase().trim() === "active" ? "Active" : "Deactivated",
            inspectionStatus,
            image: item.image || "",
            components: item.component?.map((c: any) => c.name) || [],
            latestInspectionDate: lastInspection,
            latestInspectionBy
          };
        });

        setAllReports(reports);
        setVessels(formattedData);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (vessel: Vessel) => {
    setHistoryVessel(vessel);
    
    const vesselReports = allReports
      .filter((r: any) => r.equipmentid === vessel.equipmentid)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.reportdate || 0).getTime();
        const dateB = new Date(b.reportdate || 0).getTime();
        return dateA - dateB;
      })
      .map((r: any) => ({
        reportid: r.reportid,
        title: r.title || "Inspection",
        reportdate: r.reportdate,
        status: r.status,
        inspectorName: r.employee?.name || "Unknown"
      }));
    
    setInspectionHistory(vesselReports);
    setIsHistoryOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === "approved" || s === "completed") return "v-history-badge--completed";
    if (s === "submitted") return "v-history-badge--oninspection";
    if (s === "archived") return "v-history-badge--archived";
    if (s === "rejected") return "v-history-badge--rejected";
    return "v-history-badge--pending";
  };

  useEffect(() => {
    fetchVessels();
    const fetchMetadata = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/vessels/metadata');
        const result = await response.json();
        setPlants(result.plants || []);
        setVesselTypes(result.vesselTypes || []);
      } catch (err) { 
        console.error("Metadata Error:", err); 
      }
    };
    fetchMetadata();
  }, []);

  const requestSort = (key: keyof Vessel) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    else if (sortConfig.key === key && sortConfig.direction === 'desc') direction = null;
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = vessels.filter((v) => {
      if (v.status === "Archived") return false;
      const matchesSearch = term === "" || v.id.toLowerCase().includes(term) || v.name.toLowerCase().includes(term);
      const matchesInspection = inspectionFilter === "all" ? true : v.inspectionStatus === inspectionFilter;
      const matchesType = typeFilter === "all" ? true : v.type === typeFilter;
      return matchesSearch && matchesInspection && matchesType;
    });

    if (sortConfig.direction !== null) {
      result.sort((a, b) => {
        const aValue = (a[sortConfig.key] || "").toString().toLowerCase();
        const bValue = (b[sortConfig.key] || "").toString().toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [vessels, searchTerm, inspectionFilter, typeFilter, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const currentItems = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleEditOpen = (v: Vessel) => {
    setEditForm({
      name: v.name,
      tagno: v.id,
      doshregno: v.doshregno,
      plantid: v.plantid || "",
      vesseltypeid: v.vesseltypeid || "",
      status: v.status.toLowerCase()
    });
    setSelectedVessel(v);
    setEditImagePreview(v.image || null);
    setEditImageFile(null);
    setIsEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVessel) return;

    if (!editForm.name.trim() || !editForm.tagno.trim() || !editForm.plantid || !editForm.vesseltypeid) {
      alert("Please fill in all required fields (Name, Tag No, Type, Location).");
      return;
    }

    try {
      let imageUrl = selectedVessel.image;
      if (editImageFile) {
        const uploadedUrl = await uploadImage(editImageFile);
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const finalPayload = {
        name: editForm.name,
        tagno: editForm.tagno,
        doshregno: editForm.doshregno,
        plantid: editForm.plantid,
        vesseltypeid: editForm.vesseltypeid,
        image: imageUrl,
        status: editForm.status.toLowerCase()
      };

      const result = await vesselService.updateVessel(selectedVessel.equipmentid, finalPayload);

      if (result.success) {
        setIsEditOpen(false);
        fetchVessels();
      } else {
        alert("Update failed: " + (result.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to communicate with server.");
    }
  };

  const handleArchiveClick = async (v: Vessel) => {
    const reason = window.prompt("Enter reason for archiving:", "");
    if (!reason?.trim()) return;
    try {
      await vesselService.updateVessel(v.equipmentid, { status: 'archived', reason: reason.trim() });
      fetchVessels();
      navigate("/app/archive");
    } catch (err) { 
      alert("Failed to archive vessel."); 
    }
  };

  const handleAddPlant = async () => {
    const trimmedName = newPlantName.trim();
    if (!trimmedName) {
      alert("Please enter a location name.");
      return;
    }

    setIsAddingPlant(true);
    try {
      const result = await vesselService.addPlant(trimmedName);
      
      if (result.success && result.data) {
        const newPlant = result.data;
        setPlants(prev => [...prev, newPlant]);
        setEditForm(prev => ({ ...prev, plantid: newPlant.plantid }));
        setIsPlantModalOpen(false);
        setNewPlantName("");
        alert(`Location "${newPlant.name}" added successfully!`);
      } else {
        alert("Failed to add location: " + (result.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Error adding location:", err);
      alert("Error adding location: " + (err.message || "Network error"));
    } finally {
      setIsAddingPlant(false);
    }
  };

  const inspectionBadgeClass = (status: InspectionStatus) => {
    const maps: Record<InspectionStatus, string> = {
      "Completed": "v-badge--completed",
      "Pending": "v-badge--pending",
      "On Inspection": "v-badge--oninspection",
      "Archived": "v-badge--archived"
    };
    return `v-badge ${maps[status] || "v-badge--pending"}`;
  };

  return (
    <div className="v-page">
      <div className="v-header">
        <div>
          <h1 className="v-title">Pressure Vessels</h1>
          <p className="v-subtitle">Manage assets currently in service</p>
        </div>
        {isAdmin && (
          <button className="v-add-button" onClick={() => navigate("/app/vessels/new")}>
            <Plus size={18} /> <span>Add New Vessel</span>
          </button>
        )}
      </div>

      <div className="v-filters-card">
        <div className="v-filters-row">
          <div className="v-search-wrapper">
            <Search className="v-search-icon" size={20} />
            <input
              type="text"
              className="v-search-input"
              placeholder="Search Tag No or Name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          <select className="v-select" value={inspectionFilter} onChange={(e) => setInspectionFilter(e.target.value as any)}>
            <option value="all">All Inspections</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="On Inspection">On Inspection</option>
          </select>

          <select className="v-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {vesselTypes.map(t => (
              <option key={t.vesseltypeid} value={t.name}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="v-table-card">
        <div className="v-table-scroll">
          <table className="v-table">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th onClick={() => requestSort('id')} className="v-sortable">
                  Tag No {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : sortConfig.direction === 'desc' ? <ArrowDown size={14}/> : null)}
                </th>
                <th onClick={() => requestSort('name')} className="v-sortable">
                  Vessel Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : sortConfig.direction === 'desc' ? <ArrowDown size={14}/> : null)}
                </th>
                <th>Type</th>
                <th>Location</th>
                <th>Status</th>
                <th>Inspection Status</th>
                <th>Last Inspection</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="v-empty">Syncing with database...</td></tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((v) => (
                  <tr key={v.equipmentid}>
                    <td><div className="v-thumb">{v.image ? <img src={v.image} className="v-thumb-img" alt="" /> : <div className="v-thumb-placeholder" />}</div></td>
                    <td className="v-link">{v.id}</td>
                    <td>{v.name}</td>
                    <td>{v.type}</td>
                    <td>{v.location}</td>
                    <td>
                      <span className={`v-badge v-badge--${v.status.toLowerCase()}`}>
                        {v.status}
                      </span>
                    </td>
                    <td><span className={inspectionBadgeClass(v.inspectionStatus)}>{v.inspectionStatus}</span></td>
                    <td>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ fontWeight: '500', color: '#334155' }}>{v.latestInspectionDate || 'N/A'}</div>
                        {v.latestInspectionBy && v.latestInspectionBy !== 'N/A' && (
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>by {v.latestInspectionBy}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="v-actions-wrapper">
                        <button 
                          className="v-action-btn v-view" 
                          onClick={() => { setSelectedVessel(v); setIsViewOpen(true); }} 
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>

                        <button 
                          className="v-action-btn v-history" 
                          onClick={() => handleViewHistory(v)} 
                          title="View Inspection History"
                        >
                          <History size={18} />
                        </button>

                        {isAdmin && (
                          <>
                            <button className="v-action-btn v-edit" onClick={() => handleEditOpen(v)} title="Edit Vessel">
                              <Pencil size={18} />
                            </button>
                            <button className="v-action-btn v-delete" onClick={() => handleArchiveClick(v)} title="Archive">
                              <Archive size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="v-empty">No vessels found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="v-pagination">
          <button className="v-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="v-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>

      {/* VIEW MODAL */}
      {isViewOpen && selectedVessel && (
        <div className="v-modal-backdrop">
          <div className="v-modal v-modal--wide">
            <div className="v-modal-header">
              <div className="v-modal-header-left">
                <span className="v-tag-badge">{selectedVessel.id}</span>
                <h2>Asset Specifications</h2>
              </div>
              <button className="v-close-x" onClick={() => setIsViewOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="v-modal-body">
              <div className="v-modal-grid">
                <div className="v-modal-sidebar">
                  <div className="v-modal-image-container">
                    {selectedVessel.image ? (
                      <img src={selectedVessel.image} className="v-modal-img" alt="Vessel" />
                    ) : (
                      <div className="v-image-placeholder">No Image Available</div>
                    )}
                  </div>
                  <div className="v-status-group">
                    <label>Operating Status</label>
                    <span className={`v-status-indicator v-status--${selectedVessel.status.toLowerCase()}`}>
                      {selectedVessel.status}
                    </span>
                  </div>
                </div>

                <div className="v-modal-content">
                  <section className="v-data-section">
                    <h3>General Information</h3>
                    <div className="v-details-grid">
                      <div className="v-detail-item">
                        <span className="v-label">Vessel Name</span>
                        <span className="v-value">{selectedVessel.name}</span>
                      </div>
                      <div className="v-detail-item">
                        <span className="v-label">Vessel Type</span>
                        <span className="v-value">{selectedVessel.type}</span>
                      </div>
                      <div className="v-detail-item">
                        <span className="v-label">Location (Plant)</span>
                        <span className="v-value">{selectedVessel.location}</span>
                      </div>
                    </div>
                  </section>

                  <section className="v-data-section">
                    <h3>Technical Specifications</h3>
                    <div className="v-details-grid">
                      <div className="v-detail-item">
                        <span className="v-label">Capacity</span>
                        <span className="v-value">{selectedVessel.capacity} Liters</span>
                      </div>
                      <div className="v-detail-item">
                        <span className="v-label">Installation Date</span>
                        <span className="v-value">{new Date(selectedVessel.installationDate).toLocaleDateString()}</span>
                      </div>
                      <div className="v-detail-item">
                        <span className="v-label">Components</span>
                        <span className="v-value">{selectedVessel.components?.join(", ") || "None recorded"}</span>
                      </div>
                    </div>
                  </section>

                  <section className="v-data-section">
                    <h3>Compliance & Maintenance</h3>
                    <div className="v-details-grid">
                      <div className="v-detail-item">
                        <span className="v-label">DOSH Registration</span>
                        <span className="v-value font-mono">{selectedVessel.doshregno}</span>
                      </div>
                      <div className="v-detail-item">
                        <span className="v-label">Last Inspection Date</span>
                        <span className="v-value">{selectedVessel.lastInspection}</span>
                      </div>
                      <div className="v-detail-item">
                        <span className="v-label">Inspection Status</span>
                        <span className={inspectionBadgeClass(selectedVessel.inspectionStatus)}>
                          {selectedVessel.inspectionStatus}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>

            <div className="v-modal-footer">
              <div className="v-footer-actions">
                <button className="v-primary-btn" onClick={() => window.print()}>Print Specs</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedVessel && (
        <div className="v-modal-backdrop">
          <div className="v-modal">
            <div className="v-modal-header">
              <h2>Edit Vessel</h2>
              <button onClick={() => setIsEditOpen(false)}><X /></button>
            </div>
            <form className="v-modal-body" onSubmit={handleEditSave}>
              <div className="va-field" style={{ marginBottom: '20px' }}>
                <label className="va-label">Vessel Image</label>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div className="v-thumb" style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="v-thumb-placeholder" style={{ width: '100%', height: '100%' }} />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditImageFile(file);
                        setEditImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="v-file-input"
                  />
                </div>
              </div>

              <div className="va-field">
                <label className="va-label">Vessel Name</label>
                <input className="va-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="va-grid va-grid-2">
                <div className="va-field">
                  <label className="va-label">Tag No</label>
                  <input className="va-input" value={editForm.tagno} onChange={e => setEditForm({ ...editForm, tagno: e.target.value })} />
                </div>
                <div className="va-field">
                  <label className="va-label">DOSH Reg No</label>
                  <input className="va-input" value={editForm.doshregno} onChange={e => setEditForm({ ...editForm, doshregno: e.target.value })} />
                </div>
              </div>
              <div className="va-grid va-grid-2">
                <div className="va-field">
                  <label className="va-label">Vessel Type</label>
                  <select className="va-input" value={editForm.vesseltypeid} onChange={e => setEditForm({ ...editForm, vesseltypeid: e.target.value })}>
                    <option value="">Select type</option>
                    {vesselTypes.map(t => <option key={t.vesseltypeid} value={t.vesseltypeid}>{t.name}</option>)}
                  </select>
                </div>
                <div className="va-field">
                  <label className="va-label">Location (Plant)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="va-input" style={{ flex: 1 }} value={editForm.plantid} onChange={e => setEditForm({ ...editForm, plantid: e.target.value })}>
                      <option value="">Select location</option>
                      {plants.map(p => <option key={p.plantid} value={p.plantid}>{p.name}</option>)}
                    </select>
                    <button
                      type="button"
                      className="v-add-button"
                      onClick={() => setIsPlantModalOpen(true)}
                      style={{ padding: '8px 16px', minWidth: 'auto' }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="va-field">
                <label className="va-label">Operational Status</label>
                <select 
                  className="va-input" 
                  value={editForm.status} 
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
              <div className="v-modal-footer">
                <button type="button" className="v-page-btn" onClick={() => setIsEditOpen(false)}>Cancel</button>
                <button type="submit" className="v-add-button">Update Vessel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PLANT MODAL */}
      {isPlantModalOpen && (
        <div className="v-modal-backdrop" style={{ zIndex: 10001 }}>
          <div className="v-modal" style={{ maxWidth: '400px' }}>
            <div className="v-modal-header">
              <h3 className="v-modal-title">Add New Location</h3>
            </div>
            <div className="v-modal-body">
              <div className="va-field">
                <label className="va-label">Location Name *</label>
                <input
                  className="va-input"
                  value={newPlantName}
                  onChange={e => setNewPlantName(e.target.value)}
                  placeholder="e.g., Plant C"
                  autoFocus
                />
              </div>
            </div>
            <div className="v-modal-footer">
              <button 
                type="button" 
                className="v-page-btn"
                onClick={() => {
                  setIsPlantModalOpen(false);
                  setNewPlantName("");
                }}
                disabled={isAddingPlant}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="v-add-button"
                onClick={handleAddPlant}
                disabled={isAddingPlant}
              >
                {isAddingPlant ? "Saving..." : "Save Location"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION HISTORY MODAL */}
      {isHistoryOpen && historyVessel && (
        <div className="v-modal-backdrop" onClick={() => setIsHistoryOpen(false)}>
          <div className="v-modal v-history-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="v-modal-header">
              <div>
                <h3 className="v-modal-title">Inspection History</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0 0' }}>
                  {historyVessel.name} ({historyVessel.id})
                </p>
              </div>
              <button className="v-modal-close" onClick={() => setIsHistoryOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="v-modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {inspectionHistory.length > 0 ? (
                <table className="v-history-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Title</th>
                      <th>Inspector</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionHistory.map((record, index) => (
                      <tr key={record.reportid}>
                        <td>{index + 1}</td>
                        <td>{new Date(record.reportdate).toLocaleDateString()}</td>
                        <td>{record.title}</td>
                        <td>{record.inspectorName}</td>
                        <td>
                          <span className={`v-history-badge ${getStatusBadgeClass(record.status)}`}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <History size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p>No inspection history found for this vessel.</p>
                </div>
              )}
            </div>
            <div className="v-modal-footer">
              <button className="v-add-button" onClick={() => setIsHistoryOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VesselsViewAll;
