
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { vesselService } from "../../services/equipmentService";
import { supabase } from "../../services/supabaseClient";
import "./VesselsAddNew.css";
import { Camera } from "lucide-react";


interface FormState {
  vesselName: string;
  DOShRegistrationNumber: string;
  type: string;
  EquipmentTagNo: string;
  capacity: string;
  location: string;
  installationDate: string;
}

interface CustomComponent {
  name: string;
  componentType: string;
  tagNumber: string;
}

const COMPONENT_OPTIONS = [
  { id: "shell", label: "Shell" },
  { id: "support", label: "Support" },
  { id: "pressure-gauge", label: "Pressure Gauge" },
  { id: "nozzle", label: "Nozzle" },
  { id: "skirt", label: "Skirt" },
  { id: "others", label: "Others" },
  { id: "manhole", label: "Manhole" },
  { id: "safety-valve", label: "Safety Valve" },
];

const VesselsAddNew: React.FC = () => {
  const navigate = useNavigate();

  const [plants, setPlants] = useState<{ plantid: string; name: string }[]>([]);
  const [vesselTypes, setVesselTypes] = useState<{ vesseltypeid: string; name: string }[]>([]);

  const [form, setForm] = useState<FormState>({
    vesselName: "",
    DOShRegistrationNumber: "",
    type: "",
    EquipmentTagNo: "",
    capacity: "",
    location: "",
    installationDate: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "components", string>>>({});
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [customComponents, setCustomComponents] = useState<CustomComponent[]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [_imageError, _setImageError] = useState<string>("");

  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [componentForm, setComponentForm] = useState({ name: "", componentType: "", tagNumber: "" });

  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const data = await vesselService.getMetadata();
        if (data.plants) setPlants(data.plants);
        if (data.vesselTypes) setVesselTypes(data.vesselTypes);
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };
    loadMetadata();
  }, []);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleToggleComponent = (id: string) => {
    setSelectedComponents((prev) => {
      const already = prev.includes(id);
      if (already) {
        if (id === "others") setCustomComponents([]);
        return prev.filter((c) => c !== id);
      }
      if (id === "others") setIsComponentModalOpen(true);
      return [...prev, id];
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validate = () => {
    const newErrors: any = {};
    if (!form.vesselName.trim()) newErrors.vesselName = "Vessel name is required.";
    if (!form.DOShRegistrationNumber.trim()) newErrors.DOShRegistrationNumber = "DOSH Number is required.";
    if (!form.type) newErrors.type = "Please select a type.";
    if (!form.location) newErrors.location = "Location is required.";
    if (!form.installationDate) newErrors.installationDate = "Date is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      if (!supabase) {
        throw new Error("Supabase client is not initialized. Check your .env configuration.");
      }

      const { error: uploadError } = await supabase.storage
        .from('vessel-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      if (!supabase) {
        throw new Error("Supabase client is not initialized.");
      }

      const { data } = supabase.storage
        .from('vessel-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      const output = error.message || error.error_description || JSON.stringify(error);
      _setImageError(`Upload failed: ${output}`);
      return null;
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    let publicImageUrl = "";

    if (imageFile) {
      const url = await uploadImage(imageFile);
      if (url) {
        publicImageUrl = url;
      } else {
        setIsSubmitting(false);
        // Alert already shown in uploadImage catch block if we kept it, 
        // or we can show it here.
        // The uploadImage function updates 'imageError' state.
        return;
      }
    }

    const payload = {
      equipmentData: {
        name: form.vesselName,
        status: "active",
        tagno: form.EquipmentTagNo,
        doshregno: form.DOShRegistrationNumber,
        lastInspectionDate: new Date().toISOString(),
        plantid: form.location,
        capacity: parseFloat(form.capacity) || 0,
        installationdate: form.installationDate,
        vesseltypeid: form.type,
        image: publicImageUrl
      },
      components: [
        ...selectedComponents
          .filter(id => id !== "others")
          .map(id => ({
            name: COMPONENT_OPTIONS.find(opt => opt.id === id)?.label,
            type: "Standard",
            tagno: "N/A"
          })),
        ...customComponents.map(cc => ({
          name: cc.name,
          type: cc.componentType,
          tagno: cc.tagNumber || "N/A"
        }))
      ]
    };

    try {
      const result = await vesselService.submitVessel(payload);
      if (result.success) {
        navigate("/app/vessels");
      } else {
        alert("Error saving: " + result.message);
        setIsSubmitting(false);
      }
    } catch (err) {
      alert("Failed to communicate with the backend server.");
      setIsSubmitting(false);
    }
  };

  const selectedComponentsCount = selectedComponents.filter((id) => id !== "others").length + customComponents.length;

  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
  const [newPlantName, setNewPlantName] = useState("");
  const [isAddingPlant, setIsAddingPlant] = useState(false);

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
        // Add to local plants list
        const newPlant = result.data;
        setPlants(prev => [...prev, newPlant]);
        
        // Select the newly added plant
        setForm(prev => ({ ...prev, location: newPlant.plantid }));
        
        // Close modal and reset
        setIsPlantModalOpen(false);
        setNewPlantName("");
        
        // Show success message
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

  return (
    <div className="va-page">
      <button type="button" className="va-back-link" onClick={() => navigate("/app/vessels")}>
        ← Back to Vessels
      </button>

      <div className="va-header">
        <h1 className="va-title">Add New Vessel</h1>
        <p className="va-subtitle">Register a new pressure vessel in the system.</p>
      </div>

      <form className="va-main" onSubmit={handleSubmit} noValidate>
        <div className="va-left">
          <section className="va-card">
            <h2 className="va-section-title">Basic Information</h2>

            <div className="va-grid va-grid-2">
              <div className="va-field">
                <label className="va-label">Vessel Name *</label>
                <input className="va-input" value={form.vesselName} onChange={handleChange("vesselName")} />
                {errors.vesselName && <div className="va-error">{errors.vesselName}</div>}
              </div>

              <div className="va-field">
                <label className="va-label">DOSH Registration Number *</label>
                <input className="va-input" value={form.DOShRegistrationNumber} onChange={handleChange("DOShRegistrationNumber")} />
                {errors.DOShRegistrationNumber && <div className="va-error">{errors.DOShRegistrationNumber}</div>}
              </div>
            </div>

            <div className="va-grid va-grid-2">
              <div className="va-field">
                <label className="va-label">Type *</label>
                <select className="va-input" value={form.type} onChange={handleChange("type")}>
                  <option value="">Select type</option>
                  {vesselTypes.map((t) => (
                    <option key={t.vesseltypeid} value={t.vesseltypeid}>{t.name}</option>
                  ))}
                </select>
                {errors.type && <div className="va-error">{errors.type}</div>}
              </div>

              <div className="va-field">
                <label className="va-label">Equipment Tag No *</label>
                <input className="va-input" value={form.EquipmentTagNo} onChange={handleChange("EquipmentTagNo")} />
                {errors.EquipmentTagNo && <div className="va-error">{errors.EquipmentTagNo}</div>}
              </div>
            </div>

            <div className="va-grid va-grid-2">
              <div className="va-field">
                <label className="va-label">Capacity</label>
                <input className="va-input" value={form.capacity} onChange={handleChange("capacity")} placeholder="e.g. 50000" />
              </div>

              <div className="va-field">
                <label className="va-label">Installation Date *</label>
                <input type="date" className="va-input" value={form.installationDate} onChange={handleChange("installationDate")} />
                {errors.installationDate && <div className="va-error">{errors.installationDate}</div>}
              </div>
            </div>

            <div className="va-grid va-grid-2">
              <div className="va-field">
                <label className="va-label">Location (Plant) *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select className="va-input" style={{ flex: 1 }} value={form.location} onChange={handleChange("location")}>
                    <option value="">Select location</option>
                    {plants.map((p) => (
                      <option key={p.plantid} value={p.plantid}>{p.name}</option>
                    ))}
                  </select>
                  <button type="button" className="va-secondary-btn" style={{ padding: '0 12px' }} onClick={() => setIsPlantModalOpen(true)}>+</button>
                </div>
                {errors.location && <div className="va-error">{errors.location}</div>}
              </div>
            </div>
          </section>

          <section className="va-card">
            <h2 className="va-section-title">Main Components</h2>
            <div className="va-components-grid">
              {COMPONENT_OPTIONS.map((c) => (
                <label key={c.id} className="va-checkbox">
                  <input type="checkbox" checked={selectedComponents.includes(c.id)} onChange={() => handleToggleComponent(c.id)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>

            <div className="va-chips">
              {customComponents.map((c, i) => (
                <button key={i} type="button" className="va-chip" onClick={() => setCustomComponents(prev => prev.filter((_, idx) => idx !== i))}>
                  {c.name} ({c.tagNumber}) <span className="va-chip-remove">×</span>
                </button>
              ))}
            </div>

            {selectedComponents.includes("others") && (
              <button type="button" className="va-add-button" onClick={() => setIsComponentModalOpen(true)}>
                Add Component Details
              </button>
            )}
          </section>

          <div className="va-actions">
            <button type="button" className="va-secondary-btn" onClick={() => navigate("/app/vessels")} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="va-primary-btn" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Vessel"}
            </button>
          </div>
        </div>

        <div className="va-right">
          <section className="va-card va-preview-card">
            <div className="va-preview-header">
              <h2 className="va-section-title">Asset Thumbnail</h2>
              <span className="va-status-tag">Draft Mode</span>
            </div>

            {/* Modern Image Upload Zone */}
            <div className="va-image-drop-zone" onClick={() => document.getElementById('vessel-image')?.click()}>
              {imagePreview ? (
                <div className="va-preview-container">
                  <img src={imagePreview} className="va-preview-img" alt="Vessel Preview" />
                  <div className="va-image-overlay">
                    <span>Change Image</span>
                  </div>
                </div>
              ) : (
                <div className="va-upload-placeholder">
                  <div className="va-upload-icon-wrapper">
                    <Camera size={32} />
                  </div>
                  <span className="va-upload-text">UPLOAD VESSEL PHOTO</span>
                  <span className="va-upload-hint">Recommended: 800x600px</span>
                </div>
              )}
              <input 
                id="vessel-image" 
                type="file" 
                accept="image/*" 
                className="va-hidden-input" 
                onChange={handleImageChange} 
              />
            </div>

            {_imageError && <div className="va-error-alert">{_imageError}</div>}

            {/* Technical Summary List */}
            <div className="va-preview-info">
              <h3 className="va-preview-summary-title">Technical Summary</h3>
              <div className="va-preview-table">
                <div className="va-preview-row">
                  <span className="va-preview-label">Vessel Ident.</span>
                  <span className="va-preview-value">{form.vesselName || "Unassigned"}</span>
                </div>
                <div className="va-preview-row">
                  <span className="va-preview-label">Sub-Components</span>
                  <span className="va-preview-value highlight">{selectedComponentsCount} Items</span>
                </div>
                <div className="va-preview-row">
                  <span className="va-preview-label">Created On</span>
                  <span className="va-preview-value">{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </form>

      {isComponentModalOpen && (
        <div className="va-modal-backdrop">
          <div className="va-modal">
            <div className="va-modal-header"><h3 className="va-modal-title">Add Component Details</h3></div>
            <div className="va-modal-body">
              <div className="va-field">
                <label className="va-label">Component Name *</label>
                <input className="va-input" value={componentForm.name} onChange={e => setComponentForm({ ...componentForm, name: e.target.value })} />
              </div>
              <div className="va-field">
                <label className="va-label">Component Type *</label>
                <input className="va-input" value={componentForm.componentType} onChange={e => setComponentForm({ ...componentForm, componentType: e.target.value })} />
              </div>
              <div className="va-field">
                <label className="va-label">Tag Number</label>
                <input className="va-input" value={componentForm.tagNumber} onChange={e => setComponentForm({ ...componentForm, tagNumber: e.target.value })} />
              </div>
            </div>
            <div className="va-modal-footer">
              <button type="button" onClick={() => setIsComponentModalOpen(false)}>Cancel</button>
              <button type="button" onClick={() => {
                setCustomComponents([...customComponents, componentForm]);
                setIsComponentModalOpen(false);
                setComponentForm({ name: "", componentType: "", tagNumber: "" });
              }}>Add Component</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW PLANT MODAL */}
      {isPlantModalOpen && (
        <div className="va-modal-backdrop">
          <div className="va-modal">
            <div className="va-modal-header"><h3 className="va-modal-title">Add New Location</h3></div>
            <div className="va-modal-body">
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
            <div className="va-modal-footer">
              <button 
                type="button" 
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
                onClick={handleAddPlant}
                disabled={isAddingPlant}
              >
                {isAddingPlant ? "Saving..." : "Save Location"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VesselsAddNew;