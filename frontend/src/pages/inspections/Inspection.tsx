import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Archive, Search, Filter, FileText, CheckCircle, XCircle, 
  ArrowUp, ArrowDown, ArrowUpDown, X 
} from 'lucide-react';
import { inspectionService } from '../../services/inspectionService';
import { supervisorService } from '../../services/supervisorService';
import './inspection.css';

const InspectionManagement: React.FC = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Rejection Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [currentInspectorId, setCurrentInspectorId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [newInspectionDate, setNewInspectionDate] = useState('');
  const [selectedInspectorId, setSelectedInspectorId] = useState<string>('');
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loadingInspectors, setLoadingInspectors] = useState(false);
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [inspectorWorkload, setInspectorWorkload] = useState<{ [key: string]: number }>({});

  // --- 1. SORTING STATE ---
  const [sortConfig, setSortConfig] = useState<{ 
    key: string; 
    direction: 'asc' | 'desc' | null 
  }>({
    key: 'reportdate',
    direction: 'desc', // Default: newest first
  });

  // --- 2. DATA LOADING ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await inspectionService.getMasterList(filterStatus, searchTerm);
      setInspections(data);
    } catch (err) { 
      console.error("Error loading inspections:", err); 
    } finally { 
      setLoading(false); 
    }
  }, [filterStatus, searchTerm]);
  
  useEffect(() => { loadData(); }, [loadData]);

  // --- 3. SORTING LOGIC ---
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const sortedInspections = useMemo(() => {
    let sortableItems = [...inspections];
    if (sortConfig.direction !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue: any, bValue: any;

        // Handle nested fields for sorting
        if (sortConfig.key === 'equipment') {
          aValue = a.equipment?.name?.toLowerCase() || '';
          bValue = b.equipment?.name?.toLowerCase() || '';
        } else if (sortConfig.key === 'inspector') {
          aValue = a.employee?.name?.toLowerCase() || '';
          bValue = b.employee?.name?.toLowerCase() || '';
        } else if (sortConfig.key === 'reportdate') {
          aValue = new Date(a.reportdate).getTime();
          bValue = new Date(b.reportdate).getTime();
        } else {
          aValue = a[sortConfig.key]?.toString().toLowerCase() || '';
          bValue = b[sortConfig.key]?.toString().toLowerCase() || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [inspections, sortConfig]);

  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) {
      return <ArrowUpDown size={14} className="mgmt-sort-icon-neutral" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="mgmt-sort-icon active" /> 
      : <ArrowDown size={14} className="mgmt-sort-icon active" />;
  };

  // --- 4. ACTIONS ---
  const handleReviewAction = async (id: string, newStatus: 'approved' | 'rejected' | 'archived') => {
    if (newStatus === 'rejected') {
      // Find the current inspection to get the inspector ID
      const currentInspection: any = inspections.find((insp: any) => insp.reportid === id);
      const currentEmployeeId = currentInspection?.employeeid || '';
      
      // Open rejection modal
      setRejectingReportId(id);
      setCurrentInspectorId(currentEmployeeId);
      setRejectionReason('');
      setNewInspectionDate('');
      setSelectedInspectorId(currentEmployeeId); // Default to current inspector
      setShowRejectModal(true);
      
      // Load inspectors
      setLoadingInspectors(true);
      try {
        const inspectorsData = await supervisorService.getInspectors();
        setInspectors(inspectorsData);
        
        // Fetch workload count for each inspector
        const workloadMap: { [key: string]: number } = {};
        for (const inspector of inspectorsData) {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/inspection/active-count/${inspector.employeeid}`);
            if (response.ok) {
              const data = await response.json();
              workloadMap[inspector.employeeid] = data.count || 0;
            } else {
              workloadMap[inspector.employeeid] = 0;
            }
          } catch {
            workloadMap[inspector.employeeid] = 0;
          }
        }
        setInspectorWorkload(workloadMap);
      } catch (error) {
        console.error('Error loading inspectors:', error);
        alert('Warning: Could not load inspectors list. You can still reject without reassigning.');
      } finally {
        setLoadingInspectors(false);
      }
      return;
    }

    let comment = "";
    const actionName = newStatus === 'archived' ? 'ARCHIVE' : 'APPROVE';
    if (!window.confirm(`Are you sure you want to ${actionName} this report?`)) return;

    try {
      await inspectionService.updateStatus(id, newStatus, comment);
      loadData(); 
    } catch (err: any) {
      alert("System error: " + (err.message || "Could not update report status."));
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason.");
      return;
    }

    if (!newInspectionDate) {
      alert("Please select a new inspection date.");
      return;
    }

    // Validate date is within 2 weeks
    const selectedDate = new Date(newInspectionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);

    if (selectedDate < today) {
      alert("The new inspection date cannot be in the past.");
      return;
    }

    if (selectedDate > twoWeeksFromNow) {
      alert("The new inspection date must be within 2 weeks from today.");
      return;
    }

    setSubmittingRejection(true);
    try {
      // Only send newEmployeeId if it's different from current
      const newEmployeeId = selectedInspectorId !== currentInspectorId ? selectedInspectorId : undefined;
      
      await inspectionService.updateStatus(
        rejectingReportId!, 
        'rejected', 
        rejectionReason, 
        newInspectionDate,
        newEmployeeId
      );
      setShowRejectModal(false);
      setRejectingReportId(null);
      loadData();
      
      if (newEmployeeId) {
        alert("Inspection reassigned successfully! The inspection now appears as 'In Progress' for the new inspector with the updated date.");
      } else {
        alert("Inspection rejected successfully. New inspection date has been set.");
      }
    } catch (err: any) {
      alert("Error: " + (err.message || "Could not reject the inspection."));
    } finally {
      setSubmittingRejection(false);
    }
  };

  const closeRejectModal = () => {
    if (submittingRejection) return;
    setShowRejectModal(false);
    setRejectingReportId(null);
    setRejectionReason('');
    setNewInspectionDate('');
  };

  // Calculate min and max dates for the date picker
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    return twoWeeks.toISOString().split('T')[0];
  };

  const getStatusClass = (status: string) => `status-badge status-${status.toLowerCase()}`;

  return (
    <div className="inspection-mgmt-container">
      <div className="mgmt-header-section">
        <div>
          <h1 className="mgmt-title">Master Inspection Log</h1>
          <p className="mgmt-subtitle">Management portal for supervisors and admins</p>
        </div>
        <button className="create-task-btn" onClick={() => navigate('/app/inspections/add-inspection')}>
          <Plus size={20} /> Assign New Task
        </button>
      </div>

      <div className="mgmt-control-bar">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input 
            type="text" 
            placeholder="Search by vessel or title..." 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="filter-wrapper">
          <Filter size={18} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="status-filter-select">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="mgmt-table-card">
        {loading ? (
          <div className="table-loading"><div className="spinner" /></div>
        ) : (
          <table className="inspection-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('reportdate')} className="sortable-th">
                  <div className="header-content">
                    Schedule {renderSortIcon('reportdate')}
                  </div>
                </th>
                <th onClick={() => requestSort('title')} className="sortable-th">
                  <div className="header-content">
                    Task Details {renderSortIcon('title')}
                  </div>
                </th>
                <th onClick={() => requestSort('equipment')} className="sortable-th">
                  <div className="header-content">
                    Equipment {renderSortIcon('equipment')}
                  </div>
                </th>
                <th onClick={() => requestSort('inspector')} className="sortable-th">
                  <div className="header-content">
                    Inspector {renderSortIcon('inspector')}
                  </div>
                </th>
                <th onClick={() => requestSort('status')} className="sortable-th">
                  <div className="header-content">
                    Status {renderSortIcon('status')}
                  </div>
                </th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedInspections.map((item: any) => (
                <tr key={item.reportid}>
                  <td>{new Date(item.reportdate).toLocaleDateString('en-GB')}</td>
                  <td>
                    <span className="main-title">{item.title}</span>
                    <span className="sub-id">ID: {item.reportid.substring(0,8)}</span>
                  </td>
                  <td>
                    {item.equipment?.name} <br/> 
                    <span className="equip-tag">{item.equipment?.tagno}</span>
                  </td>
                  <td>{item.employee?.name || 'Unassigned'}</td>
                  <td><span className={getStatusClass(item.status)}>{item.status}</span></td>
                    <td className="action-cell">
                    <div className="review-btn-group">
                      {/* LEFT GROUP: View, Approve, Reject */}
                      <div className="primary-actions">
                        {item.pdf_url && (
                          <button 
                            className="review-btn view" 
                            onClick={() => window.open(item.pdf_url, '_blank')}
                            title="Open PDF"
                          >
                            <FileText size={18} />
                          </button>
                        )}

                        {item.status === 'submitted' && (
                          <>
                            <button 
                              className="review-btn approve" 
                              onClick={() => handleReviewAction(item.reportid, 'approved')}
                              title="Approve Report"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              className="review-btn reject" 
                              onClick={() => handleReviewAction(item.reportid, 'rejected')}
                              title="Reject Report"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* RIGHT GROUP: Archive (Always visible unless already archived) */}
                      {item.status !== 'archived' && (
                        <button 
                          className="archive-action-btn" 
                          onClick={() => handleReviewAction(item.reportid, 'archived')}
                          title="Move to Archives"
                        >
                          <Archive size={16} /> Archive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sortedInspections.length === 0 && (
                <tr>
                  <td colSpan={6} className="no-data-msg">No inspection records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="reject-modal-backdrop" onClick={closeRejectModal}>
          <div className="reject-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reject-modal-header">
              <h3>Reject Inspection Report</h3>
              <button 
                className="reject-modal-close" 
                onClick={closeRejectModal}
                disabled={submittingRejection}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="reject-modal-body">
              <div className="reject-form-group">
                <label className="reject-label">
                  Rejection Reason <span className="required">*</span>
                </label>
                <textarea
                  className="reject-textarea"
                  placeholder="Explain what needs to be corrected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  disabled={submittingRejection}
                />
              </div>

              <div className="reject-form-group">
                <label className="reject-label">
                  New Inspection Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  className="reject-date-input"
                  value={newInspectionDate}
                  onChange={(e) => setNewInspectionDate(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  disabled={submittingRejection}
                />
                <p className="reject-helper-text">
                  Must be within 2 weeks from today
                </p>
              </div>

              <div className="reject-form-group">
                <label className="reject-label">
                  Reassign to Inspector (Optional)
                </label>
                {loadingInspectors ? (
                  <div className="reject-loading-text">Loading inspectors...</div>
                ) : (
                  <>
                    <select
                      className="reject-select-input"
                      value={selectedInspectorId}
                      onChange={(e) => setSelectedInspectorId(e.target.value)}
                      disabled={submittingRejection || inspectors.length === 0}
                    >
                      {inspectors.length > 0 ? (
                        inspectors.map((inspector) => {
                          const workload = inspectorWorkload[inspector.employeeid] || 0;
                          const isAtLimit = workload >= 3;
                          const isCurrent = inspector.employeeid === currentInspectorId;
                          return (
                            <option 
                              key={inspector.employeeid} 
                              value={inspector.employeeid}
                              disabled={isAtLimit && !isCurrent}
                            >
                              {inspector.name} ({workload}/3 active){isAtLimit ? ' - FULL' : ''}{isCurrent ? ' (Current)' : ''}
                            </option>
                          );
                        })
                      ) : (
                        <option value="">No inspectors available</option>
                      )}
                    </select>
                    {selectedInspectorId && !loadingInspectors && (
                      <p className="reject-helper-text" style={{ 
                        color: selectedInspectorId !== currentInspectorId && inspectorWorkload[selectedInspectorId] >= 3 
                          ? '#ef4444' 
                          : selectedInspectorId !== currentInspectorId 
                          ? '#f59e0b' 
                          : '#64748b',
                        marginTop: '8px'
                      }}>
                        {selectedInspectorId !== currentInspectorId && inspectorWorkload[selectedInspectorId] >= 3
                          ? '⚠️ Inspector at capacity. If reassignment fails, current inspector will redo.'
                          : selectedInspectorId !== currentInspectorId
                          ? '⚠️ This inspection will be reassigned to a different inspector'
                          : 'Current inspector will redo this inspection'}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="reject-modal-footer">
              <button
                className="reject-btn-cancel"
                onClick={closeRejectModal}
                disabled={submittingRejection}
              >
                Cancel
              </button>
              <button
                className="reject-btn-submit"
                onClick={handleRejectSubmit}
                disabled={submittingRejection}
              >
                {submittingRejection ? 'Rejecting...' : 'Reject & Set Date'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionManagement;