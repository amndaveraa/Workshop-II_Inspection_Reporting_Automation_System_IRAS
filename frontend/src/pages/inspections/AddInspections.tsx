import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, User, Anchor, ChevronLeft } from "lucide-react";
import { supervisorService } from "../../services/supervisorService";
import "./addInspections.css";

const CreateInspectionTask: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    equipmentid: "",
    employeeid: "",
    reportdate: "",
  });

  const getLocalDate = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  };

  const minDate = getLocalDate();

  const [inspectors, setInspectors] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [inspectorWorkload, setInspectorWorkload] = useState<{ [key: string]: number }>({});
  const [loadingWorkload, setLoadingWorkload] = useState(false);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        setLoadingWorkload(true);
        const vData = await supervisorService.getActiveVessels();
        const iData = await supervisorService.getInspectors();
        
        if (vData) setVessels(vData);
        if (iData) {
          setInspectors(iData);
          
          const workloadMap: { [key: string]: number } = {};
          for (const inspector of iData) {
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
        }
      } catch (err) {
        console.error("Error loading form data:", err);
      } finally {
        setLoadingWorkload(false);
      }
    };
    fetchFormData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentid || !formData.employeeid) {
      alert("Please select both a vessel and an inspector.");
      return;
    }

    if (formData.reportdate < minDate) {
      alert("Please select a date that is not in the past.");
      return;
    }

    const selectedWorkload = inspectorWorkload[formData.employeeid] || 0;
    if (selectedWorkload >= 3) {
      alert(`The selected inspector already has ${selectedWorkload} active inspections (maximum is 3). Please select another inspector.`);
      return;
    }

    setLoading(true);
    try {
      await supervisorService.assignTask(formData);
      alert("Inspection task assigned successfully!");
      navigate("/app/supervisor-dashboard");
    } catch (err: any) {
      const errorMessage = err.message || "Failed to assign task";
      alert(`Error: ${errorMessage}`);
      console.error("Assignment error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-task-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ChevronLeft size={18} /> Back to Dashboard
      </button>

      <div className="task-form-container">
        <h1 className="form-title">Assign New Inspection</h1>
        <p className="form-subtitle">Create a pending task for an inspector</p>

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label>Inspection Title</label>
            <input 
              type="text" 
              placeholder="e.g. Annual Pressure Test" 
              required 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label><Anchor size={16} /> Select Vessel / Equipment</label>
            <select 
              required 
              value={formData.equipmentid}
              onChange={(e) => setFormData({...formData, equipmentid: e.target.value})}
            >
              <option value="">-- Select Vessel --</option>
              {vessels.map(v => <option key={v.equipmentid} value={v.equipmentid}>{v.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label><User size={16} /> Assign To Inspector</label>
            <select 
              required 
              value={formData.employeeid}
              onChange={(e) => setFormData({...formData, employeeid: e.target.value})}
              disabled={loadingWorkload}
            >
              <option value="">-- Select Inspector --</option>
              {inspectors.map(i => {
                const workload = inspectorWorkload[i.employeeid] || 0;
                const isAtLimit = workload >= 3;
                return (
                  <option 
                    key={i.employeeid} 
                    value={i.employeeid}
                    disabled={isAtLimit}
                  >
                    {i.name} {loadingWorkload ? '' : `(${workload}/3 active)${isAtLimit ? ' - FULL' : ''}`}
                  </option>
                );
              })}
            </select>
            {loadingWorkload && <small style={{ color: '#666', fontSize: '12px' }}>Loading workload...</small>}
            {formData.employeeid && !loadingWorkload && (
              <small style={{ 
                color: inspectorWorkload[formData.employeeid] >= 2 ? '#f59e0b' : '#22c55e',
                fontSize: '12px',
                marginTop: '4px',
                display: 'block'
              }}>
                {inspectorWorkload[formData.employeeid] >= 3 
                  ? '⚠️ Inspector at maximum capacity'
                  : inspectorWorkload[formData.employeeid] >= 2
                  ? '⚠️ Inspector has limited capacity'
                  : '✓ Inspector available'}
              </small>
            )}
          </div>

          <div className="form-group">
            <label><Calendar size={16} /> Due Date (Report Date)</label>
            <input 
              type="date" 
              required 
              min={minDate} 
              value={formData.reportdate}
              onChange={(e) => setFormData({...formData, reportdate: e.target.value})}
            />
          </div>

          <button type="submit" className="submit-task-btn" disabled={loading}>
            {loading ? "Assigning..." : "Confirm Assignment"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateInspectionTask;