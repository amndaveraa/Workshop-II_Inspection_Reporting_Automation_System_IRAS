import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileDown, FileText, Loader2, Upload, X, Plus, Trash2, Zap, ArrowLeft } from 'lucide-react';
import SearchableDropdown from '../../components/SearchWithDropdown';
import SelectAllFindings from '../../hooks/Finding';
import SelectAllRecommendations from '../../hooks/Recommendation';
import { useInsertFinding } from '../../hooks/InsertFinding';
import { useInsertRecommendation } from '../../hooks/InsertRecommendation';
import SelectAllComponents from '../../hooks/SelectComponents';
import SearchableComponents from '../../components/Compodropdown';
import CheckCompRepDetails from '../../hooks/CheckCompRepDetails';

import InsertToCompRepDetails from '../../hooks/InsertToCompRepDetails';
import UpdateFinding from '../../hooks/UpdateFinding';
import UpdateRecommendation from '../../hooks/UpdateRecommendation';
import UpdateComponent from '../../hooks/UpdateComponent';
import UpdateCompRepDetails from '../../hooks/UpdateCompRepDetails';
import uploadPDF from '../../hooks/pdfBucket';
import update_pdfURL from '../../hooks/update_pdfURL';
import updateReportStatus from '../../hooks/updateReportStatus';

import { useGetReportDetails } from '../../hooks/getReportDetails';

import DraggableBox from '../../components/DraggableBox';
import DraggableText from '../../components/DraggableText';
import { mergeAnnotationsWithScale } from '../../services/handleAddRedBox';
import { mergeAnnotationsWithTextWithScale } from '../../services/handleAddText';

import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";

import './DocumentGenerator.css';




import redBox from '../../assets/redBox.png';
import insertText from '../../assets/insertText.png';

import handleConToLLM from '../../services/handleConToLLM';
import handleFirstPageAI from '../../services/firstPageAIService';

import ConstraintTab from '../../components/ConstraintTab';

// Interfaces
interface Annotation {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextAnnotation {
  id: number;
  x: number;
  y: number;
  text: string;
  width: number;
  height: number;
}

interface ReportEntry {
  id: number;
  selectedImage: File | null;
  previewUrl: string | null;
  base64Image: string | null;
  finding: string;
  findingId: string | number | null;
  findingIsFromDb: boolean;
  recommendation: string;
  recommendationId: string | number | null;
  recommendationIsFromDb: boolean;
  component: string;
  componentId: string | number | null;
  componentIsFromDb: boolean;
  annotations: Annotation[];
  textAnnotations: TextAnnotation[];
  dbDetailsId: string | number | null;
  dbFindingId: string | number | null;
  dbRecommendationId: string | number | null;
  dbComponentId: string | number | null;
  originalFindingText: string;
  originalRecommendationText: string;
  originalComponentText: string;
  dbBase64Image: string | null;
  dbInspectionType: string;
  imageType?: string;
  isExistingEntry?: boolean;
  imageRef?: HTMLImageElement | null;
}






export default function DocumentGenerator() {
  const navigate = useNavigate();
  const { reportId: paramReportId } = useParams();
  const { insertFinding } = useInsertFinding();
  const { insertRecommendation } = useInsertRecommendation();
  const { insertToCompRepDetails } = InsertToCompRepDetails();
  const { updateFinding } = UpdateFinding();
  const { updateRecommendation } = UpdateRecommendation();
  const { updateComponent } = UpdateComponent();

  const { updateCompRepDetails } = UpdateCompRepDetails();
  const { update_pdfURL: updatePdfUrlHook } = update_pdfURL(); // Alias to avoid conflict with import or service

  const toast = useRef<Toast>(null);

  // Fetch report details (MOVED UP)
  const { data: reportDetailsData } = useGetReportDetails(paramReportId || '12'); // Using paramReportId directly or default for now as state is defined later

  // Fetch findings from database
  const findings = SelectAllFindings();
  const recommendations = SelectAllRecommendations();
  // Fetch components based on equipment ID from report details
  const components = SelectAllComponents(reportDetailsData?.equipmentid);



  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); // New state for initial load
  const [apiStatus, setApiStatus] = useState('checking');

  // Constraint Tab State
  const [isConstraintOpen, setIsConstraintOpen] = useState(false);
  const [constraintConfig, setConstraintConfig] = useState<{
    title: string;
    message: string;
    action: () => void;
    confirmLabel: string;
    isDestructive?: boolean;
  }>({ title: '', message: '', action: () => { }, confirmLabel: '' });
  // Store parsed AI response

  {/*  just for testing purposes */ }
  {/*  just for testing purposes */ }
  const [reportId] = useState(paramReportId || '12'); // Use param or default

  // Initial loading timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);


  // Check for existing report details
  const { data: existingData, loading: detailsLoading } = CheckCompRepDetails(reportId);


  // Dynamic entries for images, findings, and recommendations
  const [entries, setEntries] = useState<ReportEntry[]>([]);

  // Placeholder removed - original location of useGetReportDetails


  useEffect(() => {
    if (reportDetailsData) {
      console.log("🔍 DocumentGenerator received data:", reportDetailsData);
      console.log("🔍 Employee object:", reportDetailsData.employee);
    }
  }, [reportDetailsData]);

  // Construct Report No
  const plantName = reportDetailsData?.equipment?.plant?.name || 'UNKNOWN_PLANT';
  const tagNo = reportDetailsData?.equipment?.tagno || 'UNKNOWN_TAG';
  const generatedReportNo = `${plantName}/VI/${tagNo}/TA2026`;

  // Update first entry with TagNo once loaded (if it's the default)
  useEffect(() => {
    if (tagNo && tagNo !== 'UNKNOWN_TAG' && entries.length > 0) {
      // Check if first entry is the default placeholder
      if (entries[0].component === 'General view of equipment') {
        setEntries(prev => prev.map((entry, idx) =>
          idx === 0 ? { ...entry, component: `General view of equipment (${tagNo})` } : entry
        ));
      }
    }
  }, [tagNo]);

  const isReadOnly = ['submitted', 'approved', 'completed'].includes(reportDetailsData?.status?.toLowerCase() || '');

  // map data to match testData structure
  const reportData = {
    equipment_tag: reportDetailsData?.equipment?.tagno || 'N/A',
    equipment_description: reportDetailsData?.equipment?.vesseltype?.name || 'N/A',
    report_no: generatedReportNo,
    report_date: new Date().toLocaleDateString(), // Default to today since not in query
    plant_unit_area: reportDetailsData?.equipment?.plant?.name || 'N/A',
    dosh_registration_no: reportDetailsData?.equipment?.doshregno || 'N/A',
    inspected_by: reportDetailsData?.employee?.name || 'N/A',
  };


  // Check API health on mount
  React.useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/health');
      if (response.ok) {
        setApiStatus('connected');
        console.log('✅ Python API is running!');
      } else {
        setApiStatus('error');
      }
    } catch (error) {
      setApiStatus('error');
      console.error('❌ Python API is not running');
    }
  };

  // Populate entries if existing data is found
  useEffect(() => {
    if (detailsLoading) return;

    if (existingData && existingData.length > 0) {

      console.log("📥 Loading existing data:", existingData);
      if (existingData.length > 0) {
        console.log("🔑 First item keys:", Object.keys(existingData[0]));
        console.log("🔑 First item ID value:", existingData[0].id);
      }

      const loadedEntries = existingData.map((item, index) => ({
        id: Date.now() + index, // Unique ID
        selectedImage: null, // We don't have the original file object, only the base64/path
        previewUrl: null,
        base64Image: item.photo_path, // Load saved base64/URL
        finding: item.finding?.description || '',
        findingId: item.finding?.findingtemplateid || null, // Template ID for dropdown
        findingIsFromDb: true,
        recommendation: item.recommendation?.content || '', // Note: 'content' based on user query
        recommendationId: item.recommendation?.recommendationtemplateid || null, // Template ID for dropdown
        recommendationIsFromDb: true,
        component: item.component?.name || '',
        componentId: item.componentid,
        componentIsFromDb: true,
        annotations: [], // Annotations are burned in, so we start fresh or need a separate table to store them editable
        textAnnotations: [],
        imageType: item.inspectiontype,
        isExistingEntry: true,

        // STORE ORIGINAL DB IDs (Primary Keys)
        dbDetailsId: item.id, // Primary Key of componentreportdetails
        dbFindingId: item.findingid,
        dbRecommendationId: item.recommendationid,
        dbComponentId: item.componentid,

        // STORE ORIGINAL CONTENT (to detect changes)
        originalFindingText: item.finding?.description || '',
        originalRecommendationText: item.recommendation?.content || '',
        originalComponentText: item.component?.name || '',
        dbBase64Image: item.photo_path,
        dbInspectionType: item.inspectiontype
      }));

      setEntries(loadedEntries);
      if (toast.current) {
        toast.current.show({ severity: 'info', summary: 'Data Loaded', detail: 'Existing report details loaded.' });
      }
    } else if (!existingData || existingData.length === 0) {
      // Initialize with one empty entry if no data exists
      setEntries([{
        id: Date.now(),
        selectedImage: null,
        previewUrl: null,
        base64Image: null,
        finding: '',
        findingId: null,
        findingIsFromDb: false,
        recommendation: '',
        recommendationId: null,
        recommendationIsFromDb: false,
        component: '',
        componentId: null,
        componentIsFromDb: false,
        annotations: [],
        textAnnotations: [],
        dbDetailsId: null,
        dbFindingId: null,
        dbRecommendationId: null,
        dbComponentId: null,
        originalFindingText: '',
        originalRecommendationText: '',
        originalComponentText: '',
        dbBase64Image: null,
        dbInspectionType: '',
        imageType: 'Internal'
      }]);
    }
  }, [existingData, detailsLoading]);

  // Add new entry
  const addNewEntry = () => {
    const newEntry: ReportEntry = {
      id: Date.now(),
      selectedImage: null,
      previewUrl: null,
      base64Image: null,
      finding: '',
      findingId: null,
      findingIsFromDb: false,
      recommendation: '',
      recommendationId: null,
      recommendationIsFromDb: false,
      component: '',
      componentId: 1,
      componentIsFromDb: false,
      annotations: [],
      textAnnotations: [],
      dbDetailsId: null,
      dbFindingId: null,
      dbRecommendationId: null,
      dbComponentId: null,
      originalFindingText: '',
      originalRecommendationText: '',
      originalComponentText: '',
      dbBase64Image: null,
      dbInspectionType: '',
      imageType: 'Internal'
    };
    setEntries([...entries, newEntry]);
  };

  // Remove entry
  const removeEntry = (id: number) => {
    if (entries.length === 1) {
      toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'You must have at least one entry' });
      return;
    }
    setEntries(entries.filter(entry => entry.id !== id));
  };

  // Image handling functions for specific entry
  const handleImageChange = async (entryId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);

      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;

        setEntries(entries.map(entry =>
          entry.id === entryId
            ? { ...entry, selectedImage: file, previewUrl: url, base64Image: base64String }
            : entry
        ));

        console.log(`✅ Image ${entryId} converted to base64`);
      };
      reader.readAsDataURL(file);

    } else {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Please select a valid image file' });
    }
  };

  const handleClearImage = (entryId: number) => {
    setEntries(entries.map(entry =>
      entry.id === entryId
        ? { ...entry, selectedImage: null, previewUrl: null, base64Image: null }
        : entry
    ));
  };

  const handleImageTypeChange = (entryId: number, imageType: string) => {
    setEntries(entries.map(entry =>
      entry.id === entryId
        ? { ...entry, imageType }
        : entry
    ));
  };

  // Handle component selection/editing from SearchableDropdown
  const handleComponentChange = (entryId: number, data: any) => {
    setEntries(entries.map(entry =>
      entry.id === entryId
        ? {
          ...entry,
          component: data.text,
          componentId: data.id,
          componentIsFromDb: data.isFromDatabase
        }
        : entry
    ));

    console.log(`Entry ${entryId} - Component:`, {
      text: data.text,
      id: data.id,
      isFromDatabase: data.isFromDatabase
    });
  };

  // Handle finding selection/editing from SearchableDropdown
  const handleFindingChange = (entryId: number, data: any) => {
    setEntries(entries.map(entry =>
      entry.id === entryId
        ? {
          ...entry,
          finding: data.text,                    // The text (from dropdown or typed)
          findingId: data.id,                    // Template ID (null if custom text)
          findingIsFromDb: data.isFromDatabase   // True if selected from dropdown
        }
        : entry
    ));

    console.log(`Entry ${entryId} - Finding:`, {
      text: data.text,
      id: data.id,
      isFromDatabase: data.isFromDatabase
    });
  };

  // Handle recommendation selection/editing from SearchableDropdown
  const handleRecommendationChange = (entryId: number, data: any) => {
    setEntries(entries.map(entry =>
      entry.id === entryId
        ? {
          ...entry,
          recommendation: data.text,                    // The text (from dropdown or typed)
          recommendationId: data.id,                    // Template ID (null if custom text)
          recommendationIsFromDb: data.isFromDatabase   // True if selected from dropdown
        }
        : entry
    ));

    console.log(`Entry ${entryId} - Recommendation:`, {
      text: data.text,
      id: data.id,
      isFromDatabase: data.isFromDatabase
    });
  };

  // Handle adding a new red box annotation
  const handleAddRedBox = (entryId: number) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        const newAnnotation: Annotation = {
          id: Date.now(),
          x: 50, // Default position
          y: 50,
          width: 100, // Default size
          height: 100
        };
        return {
          ...entry,
          annotations: [...(entry.annotations || []), newAnnotation]
        };
      }
      return entry;
    }));
  };

  const handleAddText = (entryId: number) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        const newText: TextAnnotation = {
          id: Date.now(),
          x: 100,
          y: 100,
          text: 'Text',
          width: 150,
          height: 30
        };
        return {
          ...entry,
          textAnnotations: [...(entry.textAnnotations || []), newText]
        };
      }
      return entry;
    }));
  };

  // Handle updating text annotation
  const handleTextUpdate = (entryId: number, textId: number, newData: Partial<TextAnnotation>) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          textAnnotations: entry.textAnnotations.map(txt =>
            txt.id === textId ? { ...txt, ...newData } : txt
          )
        };
      }
      return entry;
    }));
  };

  // Delete Handlers
  const handleDeleteRedBox = (entryId: number, annotationId: number) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          annotations: entry.annotations.filter(a => a.id !== annotationId)
        };
      }
      return entry;
    }));
  };

  const handleDeleteText = (entryId: number, textId: number) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          textAnnotations: entry.textAnnotations.filter(t => t.id !== textId)
        };
      }
      return entry;
    }));
  };

  // Handle updating an annotation (drag/resize)
  const handleAnnotationUpdate = (entryId: number, annotationId: number, newRect: Partial<Annotation>) => {
    setEntries(entries.map(entry => {
      if (entry.id === entryId) {
        return {
          ...entry,
          annotations: entry.annotations.map(ann =>
            ann.id === annotationId ? { ...ann, ...newRect } : ann
          )
        };
      }
      return entry;
    }));
  };

  // Track selected annotation for resizing handles
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<number | null>(null);

  // Save entries to database
  const saveEntriesToDatabase = async (entriesToProcess = entries) => {
    const successfullySavedIds: number[] = []; // Track saved entries

    try {
      console.log('💾 Saving entries to database...');

      for (const entry of entriesToProcess) {
        let insertedFindingId: number | null = null;
        let insertedRecommendationId: number | null = null;

        // --- LOGIC FOR EXISTING ENTRIES ---
        if (entry.isExistingEntry) {
          console.log(`🔄 Processing existing entry ${entry.id}`);
          let newFindingId = entry.dbFindingId;
          let newRecId = entry.dbRecommendationId;
          let detailsChanged = false;

          // 1. CHECK COMPONENTS CHANGES
          let newCompId = entry.dbComponentId;

          if (entry.componentId && entry.componentId !== entry.dbComponentId) {
            // Case A: Switched Component from Dropdown -> Update LINK in details
            console.log(`📝 Component switched from ${entry.dbComponentId} to ${entry.componentId}. Updating link.`);
            newCompId = entry.componentId;
            detailsChanged = true;
          } else if (entry.component !== entry.originalComponentText && entry.dbComponentId) {
            // Case B: Edited Text of SAME component -> Rename component in master table
            // WARNING: This renames the component for ALL reports using it.
            console.log(`✏️ Component name edited for ID ${entry.dbComponentId}. Updating master record.`);
            await updateComponent(entry.dbComponentId, entry.component);
            // ID stays same, but we updated name
          }

          // 2. CHECK FINDING CHANGES
          const findingTextChanged = entry.finding !== entry.originalFindingText;

          if (entry.findingId && entry.findingId !== entry.dbFindingId && entry.dbFindingId) {
            // Case A: Switched Template -> UPDATE existing finding record with new text and new template ID
            console.log(`📝 Template switched for finding ${entry.dbFindingId}. Updating record.`);
            const fResult = await updateFinding(entry.dbFindingId, entry.finding, entry.findingId);
            if (!fResult.error) {
              newFindingId = entry.dbFindingId; // Remains the same
              detailsChanged = true;
            }
          } else if (findingTextChanged) {
            // Case B: Edited Text -> Update EXISTING record or Insert if it was null before
            if (entry.dbFindingId) {
              console.log(`✏️ Text edited for finding ${entry.dbFindingId}. Updating.`);
              await updateFinding(entry.dbFindingId, entry.finding);
            } else {
              console.log(`📝 Was empty, now has text. Inserting new finding.`);
              const fResult = await insertFinding(entry.finding, entry.findingId || undefined);
              if (!fResult.error) {
                newFindingId = fResult.data?.[0]?.findingid;
                detailsChanged = true;
              }
            }
          }

          // 3. CHECK RECOMMENDATION CHANGES
          const recTextChanged = entry.recommendation !== entry.originalRecommendationText;

          if (entry.recommendationId && entry.recommendationId !== entry.dbRecommendationId && entry.dbRecommendationId) {
            // Case A: Switched Template -> UPDATE existing record
            console.log(`📝 Template switched for recommendation ${entry.dbRecommendationId}. Updating record.`);
            const rResult = await updateRecommendation(entry.dbRecommendationId, entry.recommendation, entry.recommendationId);
            if (!rResult.error) {
              newRecId = entry.dbRecommendationId; // Remains the same (Record ID)
              detailsChanged = true;
            }
          } else if (recTextChanged) {
            // Case B: Edited Text
            if (entry.dbRecommendationId) {
              console.log(`✏️ Text edited for recommendation ${entry.dbRecommendationId}. Updating.`);
              await updateRecommendation(entry.dbRecommendationId, entry.recommendation);
            } else {
              console.log(`📝 Was empty, now has text. Inserting new recommendation.`);
              const rResult = await insertRecommendation(entry.recommendation, entry.recommendationId || undefined);
              if (!rResult.error) {
                newRecId = rResult.data?.[0]?.recommendationid;
                detailsChanged = true;
              }
            }
          }


          // 4. CHECK INSPECTION TYPE & IMAGE CHANGES
          const inspectionTypeChanged = entry.imageType !== entry.dbInspectionType;
          let newInspectionType = entry.dbInspectionType;
          let newBase64Image = entry.dbBase64Image;

          if (inspectionTypeChanged && entry.imageType) {
            console.log(`📝 Inspection Type changed to ${entry.imageType}. Updating record.`);
            newInspectionType = entry.imageType;
            detailsChanged = true;
          }

          // Check if new image selected
          if (entry.selectedImage) {
            console.log(`📸 New image selected for entry ${entry.id}. updating.`);
            try {
              const file = entry.selectedImage;
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
              });
              newBase64Image = base64;
              detailsChanged = true;
            } catch (err) {
              console.error(`❌ Failed to convert new image for entry ${entry.id}:`, err);
            }
          }

          // UPDATE DETAILS IF LINKS CHANGED
          if ((detailsChanged || entry.dbFindingId !== newFindingId || entry.dbRecommendationId !== newRecId || entry.dbComponentId !== newCompId) && entry.dbDetailsId) {
            console.log(`🔗 Updating ComponentReportDetails: F=${newFindingId}, R=${newRecId}, C=${newCompId}, Type=${newInspectionType}`);
            await updateCompRepDetails(entry.dbDetailsId, {
              findingid: newFindingId,
              recommendationid: newRecId,
              componentid: newCompId,
              inspectiontype: newInspectionType,
              photo_path: newBase64Image
            });
          }

          successfullySavedIds.push(entry.id);
          continue;
        }

        // 1. Insert finding
        if (entry.finding && entry.finding.trim()) {
          const result = await insertFinding(
            entry.finding,              // description
            entry.findingId || undefined             // findingtemplateid
          );

          if (result.error) {
            console.error('❌ Error inserting finding:', result.error);
          } else {
            // Get the inserted ID
            insertedFindingId = result.data?.[0]?.findingid || null;
            console.log('✅ Finding saved, ID:', insertedFindingId);
          }
        }

        // 2. Insert recommendation
        if (entry.recommendation && entry.recommendation.trim()) {
          const result = await insertRecommendation(
            entry.recommendation,       // content
            entry.recommendationId || undefined      // recommendationtemplateid
          );

          if (result.error) {
            console.error('❌ Error inserting recommendation:', result.error);
          } else {
            // Get the inserted ID
            insertedRecommendationId = result.data?.[0]?.recommendationid || null;
            console.log('✅ Recommendation saved, ID:', insertedRecommendationId);
          }
        }

        // 3. Insert into ComponentReportDetails if we have at least finding or recommendation
        console.log('🔍 Checking details insert:', {
          findingId: insertedFindingId,
          recId: insertedRecommendationId
        });

        if (insertedFindingId || insertedRecommendationId) {
          // Assuming reportId is 1 for now (from test state)
          // Defaulting inspectionType to 'Internal' if not set, matching dropdown options
          const inspectionType = entry.imageType || 'Internal';

          // Use first image path or null if none
          // We are storing base64 directly now using photo_path column

          let currentBase64Image = entry.base64Image;

          // Fallback: If base64Image is missing but selectedImage exists, convert it now
          if (!currentBase64Image && entry.selectedImage) {
            console.log(`⚠️ Base64 missing for entry ${entry.id}, converting on the fly...`);
            try {
              const file = entry.selectedImage;
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = error => reject(error);
              });
              currentBase64Image = base64;
              console.log(`✅ Converted on the fly: ${currentBase64Image ? "Success" : "Failed"}`);
            } catch (err) {
              console.error(`❌ Failed to convert image on the fly for entry ${entry.id}:`, err);
            }
          }

          console.log('🚀 Invoking insertToCompRepDetails with:', {
            recId: insertedRecommendationId,
            findId: insertedFindingId,
            image: currentBase64Image ? "Base64 String present" : "NULL",
            repId: reportId,
            compId: entry.componentId || 1,
            type: inspectionType
          });

          const result = await insertToCompRepDetails(
            insertedRecommendationId || null,
            insertedFindingId || null,
            currentBase64Image || "", // Pass base64 string, cannot be null for text field presumably
            reportId,     // from state
            entry.componentId || 1, // default to 1 if missing
            inspectionType
          );

          console.log('👉 Insert result:', result);

          if (result.error) {
            console.error('❌ Error inserting details:', result.error);
          } else {
            console.log('✅ Details saved for entry:', entry.id, 'Data:', result.data);
            successfullySavedIds.push(entry.id);
          }
        }
      }

      // Update state to mark saved entries as existing
      setEntries(prevEntries => prevEntries.map(e =>
        successfullySavedIds.includes(e.id) ? { ...e, isExistingEntry: true } : e
      ));

      console.log('✅ All entries saved to database!');
      toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Document generated and data saved to database!' });
    } catch (error) {
      console.error('❌ Error saving to database:', error);
      toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'Document generated but some data failed to save to database.' });
    }
  };



  // Validate entries before generation
  const validateEntries = () => {
    const invalidEntries: { id: number; missing: string[] }[] = [];

    entries.forEach((entry, index) => {
      const missingFields: string[] = [];
      if (!entry.selectedImage && !entry.base64Image) missingFields.push('Image');
      if (!entry.finding) missingFields.push('Finding');
      if (!entry.recommendation) missingFields.push('Recommendation');
      if (!entry.component) missingFields.push('Component');

      if (missingFields.length > 0) {
        invalidEntries.push({
          id: index + 1,
          missing: missingFields
        });
      }
    });

    return invalidEntries;
  };


  const handleSaveDraft = async () => {
    // 1. Validation Check BEFORE opening dialog
    const invalidEntries = validateEntries();
    if (invalidEntries.length > 0) {
      const errorMsg = invalidEntries.map(e =>
        `Entry ${e.id}: Missing ${e.missing.join(', ')}`
      ).join('\n');
      toast.current?.show({ severity: 'warn', summary: 'Incomplete Entries', detail: `Cannot save draft. Please complete all fields:\n\n${errorMsg}`, life: 5000 });
      return;
    }

    setConstraintConfig({
      title: 'Save as Draft?',
      message: 'This will save your current progress to the database. You can continue editing later.',
      confirmLabel: 'Save Draft',
      action: executeSaveDraft,
      isDestructive: false
    });
    setIsConstraintOpen(true);
  };

  const executeSaveDraft = async () => {
    // 1. Validation Check (Double check for safety)
    const invalidEntries = validateEntries();
    if (invalidEntries.length > 0) {
      const errorMsg = invalidEntries.map(e =>
        `Entry ${e.id}: Missing ${e.missing.join(', ')}`
      ).join('\n');
      toast.current?.show({ severity: 'warn', summary: 'Incomplete Entries', detail: `Cannot save draft. Please complete all fields:\n\n${errorMsg}`, life: 5000 });
      return;
    }

    setLoading(true);

    try {
      console.log('💾 Saving draft...');

      // 1. PREPARE ENTRIES (Merge Annotations)
      console.log('🎨 Merging annotations for all entries...');
      const finalEntries = await Promise.all(entries.map(async (entry) => {
        let finalImage = entry.base64Image;

        // Merge Red Box annotations
        if (entry.annotations && entry.annotations.length > 0 && entry.imageRef) {
          const containerWidth = entry.imageRef.width;
          const containerHeight = entry.imageRef.height;
          try {
            finalImage = await mergeAnnotationsWithScale(
              (entry.base64Image || entry.previewUrl) as string,
              entry.annotations,
              containerWidth,
              containerHeight
            );
          } catch (err) {
            console.error(`❌ Failed to merge red box annotations for entry ${entry.id}`, err);
          }
        }

        // Merge text annotations (Chain the merger)
        if (entry.textAnnotations && entry.textAnnotations.length > 0 && entry.imageRef) {
          const containerWidth = entry.imageRef.width;
          const containerHeight = entry.imageRef.height;
          try {
            finalImage = await mergeAnnotationsWithTextWithScale(
              (finalImage || entry.base64Image || entry.previewUrl) as string,
              entry.textAnnotations,
              containerWidth,
              containerHeight
            );
          } catch (err) {
            console.error(`❌ Failed to merge text annotations for entry ${entry.id}`, err);
          }
        }

        return {
          ...entry,
          base64Image: finalImage // UPDATE base64 with merged version
        };
      }));

      // 2. SAVE TO DATABASE
      await saveEntriesToDatabase(finalEntries);

      // 3. UPDATE STATUS (Draft)

      const { updateReportStatus: updateStatusFn } = updateReportStatus(reportId, 'draft');
      await updateStatusFn();

      console.log('✅ Draft saved successfully.');
      toast.current?.show({ severity: 'success', summary: 'Draft Saved', detail: 'Report saved as draft.' });

    } catch (error) {
      console.error('❌ Error saving draft:', error);
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to save draft.' });
    } finally {
      setLoading(false);
    }
  };



  const handleGenerateWithAI = async (isAutoTrigger = false, targetEntryId?: number) => {
    if (!isAutoTrigger) setLoading(true);
    try {
      console.log(`🤖 Starting AI generation...`);

      let hasUpdates = false;
      const updatedEntries = [...entries];

      // Process each entry that has an image
      for (let i = 0; i < updatedEntries.length; i++) {
        const entry = updatedEntries[i];


        // If specific target requested, check validation
        if (targetEntryId && entry.id === targetEntryId) {
          if (!entry.base64Image && !entry.selectedImage) {
            toast.current?.show({ severity: 'warn', summary: 'Missing Image', detail: 'Please upload an image before generating findings.' });
            continue;
          }
          if (!entry.component) {
            toast.current?.show({ severity: 'warn', summary: 'Missing Component', detail: 'Please enter a component name before generating findings.' });
            continue;
          }
          // if (!entry.imageType) { // Ensure inspection type is selected
          //   toast.current?.show({ severity: 'warn', summary: 'Missing Input', detail: 'Please select an Inspection Type (Internal/External).' });
          //   continue;
          // }
        }

        // If specific target requested, skip others (moved down to allow validation logic above to fire for the target)
        if (targetEntryId && entry.id !== targetEntryId) continue;

        // Skip if no image (cannot analyze) - General skip for auto-process
        if (!entry.base64Image && !entry.selectedImage) continue;

        // Prepare base64
        let base64 = entry.base64Image;
        if (!base64 && entry.selectedImage) {
          // Should have been converted, but check again
          try {
            base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(entry.selectedImage!);
              reader.onload = () => resolve(reader.result as string);
            });
          } catch (e) {
            console.error("Failed to convert image for AI", e);
            continue;
          }
        }

        if (!base64) continue;

        // Call AI Service
        if (!isAutoTrigger) {
          toast.current?.show({ severity: 'info', summary: 'AI Processing', detail: `Analyzing image for entry ${i + 1}...`, life: 2000 });
        }

        // Strict validation ensures these are present for targeted runs. For mixed runs, we might still want defaults or skip? 
        // User asked for catch/toast if not complete.
        // If auto-trigger (all entries), we probably shouldn't toast for every missing field on every entry, just skip?
        // But for targeted (button click), we definitely toast.

        const componentToUse = entry.component || "Unknown Component";
        const typeToUse = entry.imageType || "Visual Inspection";

        const result = await handleConToLLM(base64, componentToUse, typeToUse);

        if (result) {
          // Update Entry with AI results
          if (result.finding && result.finding.text) {
            updatedEntries[i].finding = result.finding.text;
            updatedEntries[i].findingId = result.finding.id || null;
          }

          if (result.recommendation && result.recommendation.text) {
            updatedEntries[i].recommendation = result.recommendation.text;
            updatedEntries[i].recommendationId = result.recommendation.id || null;
          }

          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        setEntries(updatedEntries);
        toast.current?.show({ severity: 'success', summary: 'AI Generation Complete', detail: 'Findings and Recommendations updated.' });
      } else {
        if (!isAutoTrigger && !hasUpdates) toast.current?.show({ severity: 'warn', summary: 'No Updates', detail: 'AI could not generate new insights.' });
      }

    } catch (error) {
      console.error("AI Generation Error", error);
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'An error occurred during AI generation.' });
    } finally {
      if (!isAutoTrigger) setLoading(false);
    }
  };

  const generateDocument = async (format: 'pdf' | 'docx') => {
    // Validation already done in handleSubmitReport (if called via button)
    // But keeping it here as a safety net for direct calls if any
    const invalidEntries = validateEntries();
    if (invalidEntries.length > 0) {
      // ... (This block is redundant if called via handleSubmitReport but safe to keep or remove. I'll keep it simple)
      const errorMsg = invalidEntries.map(e =>
        `Entry ${e.id}: Missing ${e.missing.join(', ')}`
      ).join('\n');
      toast.current?.show({ severity: 'warn', summary: 'Incomplete Entries', detail: `Cannot generate document. Please complete all fields:\n\n${errorMsg}`, life: 5000 });
      return;
    }

    if (apiStatus !== 'connected') {
      toast.current?.show({ severity: 'error', summary: 'Connection Error', detail: 'Python API is not running! Please start it with: python app.py' });
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Starting Workflow...');

      // 1. PREPARE ENTRIES (Merge Annotations)
      console.log('🎨 Merging annotations for all entries...');
      const finalEntries = await Promise.all(entries.map(async (entry) => {
        let finalImage = entry.base64Image;

        // Merge Red Box annotations
        if (entry.annotations && entry.annotations.length > 0 && entry.imageRef) {
          const containerWidth = entry.imageRef.width;
          const containerHeight = entry.imageRef.height;
          try {
            finalImage = await mergeAnnotationsWithScale(
              (entry.base64Image || entry.previewUrl) as string,
              entry.annotations,
              containerWidth,
              containerHeight
            );
          } catch (err) {
            console.error(`❌ Failed to merge red box annotations for entry ${entry.id}`, err);
          }
        }

        // Merge text annotations (Chain the merger)
        if (entry.textAnnotations && entry.textAnnotations.length > 0 && entry.imageRef) {
          const containerWidth = entry.imageRef.width;
          const containerHeight = entry.imageRef.height;
          try {
            finalImage = await mergeAnnotationsWithTextWithScale(
              (finalImage || entry.base64Image || entry.previewUrl) as string,
              entry.textAnnotations,
              containerWidth,
              containerHeight
            );
          } catch (err) {
            console.error(`❌ Failed to merge text annotations for entry ${entry.id}`, err);
          }
        }

        return {
          ...entry,
          base64Image: finalImage // UPDATE base64 with merged version
        };
      }));

      // 2. SAVE TO DATABASE (Validation: must save before generate)
      console.log('💾 Saving merged data to database...');
      await saveEntriesToDatabase(finalEntries);
      console.log('✅ Database save complete.');

      // 2. UPDATE STATUS (Draft)
      const { updateReportStatus: updateStatusFn } = updateReportStatus(reportId, 'submitted'); // ParseID removed
      await updateStatusFn();

      // 3. GENERATE FIRST PAGE SUMMARY (AI)
      console.log('🤖 Generating First Page Summary...');
      toast.current?.show({ severity: 'info', summary: 'AI Processing', detail: 'Generating Executive Summary...', life: 3000 });

      let aiSummary = {
        external: '',
        internal: '',
        ndt: '',
        recommendations: ''
      };

      try {
        const aiResult = await handleFirstPageAI({
          reportId: reportId, // Pass ID for backend DB fetch
          findings: finalEntries.map(e => ({
            component: e.component,
            finding: e.finding,
            imageType: e.imageType // To help AI classify External/Internal
          })),
          recommendations: finalEntries.map(e => ({
            component: e.component,
            recommendation: e.recommendation
          })),
          equipmentDetails: {
            name: reportData.equipment_description,
            tagNo: reportData.equipment_tag
          }
        });

        if (aiResult) {
          aiSummary = aiResult;
          console.log("✅ AI Summary Generated:", aiSummary);
          toast.current?.show({ severity: 'success', summary: 'AI Success', detail: 'Executive Summary Generated.', life: 2000 });
        } else {
          console.warn("⚠️ AI returned null, using defaults.");
        }

      } catch (aiErr) {
        console.error("❌ AI Summary Failed:", aiErr);
        // Non-blocking, proceed with defaults
      }


      // 4. GENERATE DOCUMENT
      console.log('📄 Generating document...');
      const photoEntries = finalEntries.map(entry => ({
        photo: entry.base64Image || '[NO IMAGE]',
        finding: entry.finding || '',
        recommendation: entry.recommendation || '',
        component: entry.component || '',
      }));

      // Combine all findings and recommendations
      const allFindings = finalEntries
        .filter(entry => entry.finding.trim())
        .map((entry, index) => `${index + 1}. ${entry.finding}`)
        .join('\n\n');

      const allRecommendations = finalEntries
        .filter(entry => entry.recommendation.trim())
        .map((entry, index) => `${index + 1}. ${entry.recommendation}`)
        .join('\n\n');

      const allComponents = finalEntries
        .filter(entry => entry.component.trim())
        .map((entry, index) => `${index + 1}. ${entry.component}`)
        .join('\n\n');

      // Use first image for main Photo field
      const mainPhoto = finalEntries[0]?.base64Image || '[NO IMAGE UPLOADED]';

      // Map test data to template placeholders
      const templateData = {
        '{{Equipment tag no}}': reportData.equipment_tag,
        '{{Equipment description}}': reportData.equipment_description,
        '{{Report no}}': reportData.report_no,
        '{{Report date}}': reportData.report_date,
        '{{Plant/Unit/Area}}': reportData.plant_unit_area,
        '{{DOSH registration no}}': reportData.dosh_registration_no,
        // @ts-ignore - employee might not exist on ReportDetails
        '{{Inspected by}}': reportDetailsData?.employee?.name || reportData.inspected_by || 'N/A', // Fix employee access
        '{{Initial/Pre-Inspection}}': 'Not applicable',
        '{{External}}': aiSummary.external,
        '{{Internal}}': aiSummary.internal,
        '{{NON-DESTRUCTIVE TESTING}}': aiSummary.ndt,
        '{{RECOMMENDATION}}': aiSummary.recommendations,
        '{{Photo}}': mainPhoto,
        '{{Finding}}': allFindings || 'No findings entered',
        '{{Recommendation}}': allRecommendations || 'No recommendations entered',
        '{{Component}}': allComponents || 'No components entered',

        photoEntries: photoEntries  // NEW: Send all entries as array
      };

      console.log('📤 Sending to Python API...');
      console.log('📸 Photo entries:', photoEntries.length);

      // Sanitize filename to remove invalid characters like slashes
      const safeFilename = `test_report_${reportData.report_no}`.replace(/[\/\\?%*:|"<>]/g, '_');

      const response = await fetch('http://localhost:5001/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: templateData,
          format: format,
          filename: safeFilename
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Document generation failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('✅ Document generated successfully!');

      // Upload to Supabase Storage
      try {
        const file = new File([blob], `${safeFilename}.${format}`, { type: 'application/pdf' });
        console.log('☁️ Uploading PDF to Supabase...');
        const publicUrl = await uploadPDF(file);
        console.log('✅ PDF Uploaded! URL:', publicUrl);

        // Save PDF URL to database
        console.log('💾 Saving PDF URL to database...');

        // Ensure ID is passed as is (string/UUID)
        const { data: updateData, error: dbError } = await updatePdfUrlHook(reportId, publicUrl);


        if (dbError) {
          console.error('❌ Failed to save PDF URL to database:', dbError);
          toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'PDF uploaded but URL not saved to database.' });
        } else {
          console.log('✅ PDF URL saved to database!', updateData);
          toast.current?.show({ severity: 'success', summary: 'Upload Success', detail: 'PDF Uploaded and URL saved!' });

          // Refresh the page after successful submission as requested
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } catch (error: any) {
        console.error('❌ PDF Upload failed:', error);
        toast.current?.show({ severity: 'error', summary: 'Upload Failed', detail: 'Document generated but failed to upload to storage.' });
      }

      // (Removed explicit save call here, as it's done before generation)

    } catch (error: any) {
      console.error('❌ Error:', error);
      toast.current?.show({ severity: 'error', summary: 'Generation Failed', detail: `Failed to generate document: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };






  const handleSubmitReport = () => {
    // 1. Validation Check BEFORE opening dialog
    const invalidEntries = validateEntries();
    if (invalidEntries.length > 0) {
      const errorMsg = invalidEntries.map(e =>
        `Entry ${e.id}: Missing ${e.missing.join(', ')}`
      ).join('\n');
      toast.current?.show({ severity: 'warn', summary: 'Incomplete Entries', detail: `Cannot submit report. Please complete all fields:\n\n${errorMsg}`, life: 5000 });
      return;
    }

    setConstraintConfig({
      title: 'Submit Report?',
      message: 'Are you sure you want to submit this report? This action might finalize the report depending on your workflow.',
      confirmLabel: 'Submit Report',
      action: () => generateDocument('pdf'),
      isDestructive: false
    });
    setIsConstraintOpen(true);
  };

  return (
    <div className="document-generator">

      {/* Loading Overlay */}
      {initialLoading && (
        <div className="loading-overlay">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="8" fill="var(--surface-ground)" animationDuration=".5s" />
        </div>
      )}

      {/* Professional Header */}
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 relative">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/app/pending')}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mr-2 shadow-sm cursor-pointer"
                  title="Back to Reports"
                  type="button"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-medium text-sm">Back</span>
                </button>
              </div>

              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <h1 className="text-xl font-bold text-gray-900">Inspection Report</h1>
                <p className="text-sm text-gray-500">
                  {reportData.report_no} • {isReadOnly ? 'View Only' : 'Edit Mode'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`status-badge ${apiStatus === 'connected' ? 'online' : 'offline'}`}>
                  <div className={`status-indicator ${apiStatus === 'connected' ? 'online' : 'offline'}`}></div>
                  <span className={`status-text ${apiStatus === 'connected' ? 'online' : 'offline'}`}>
                    {apiStatus === 'connected' ? 'System Online' : 'System Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="main-content">

          {/* Report Information */}
          <div className="report-info-card">
            <div className="card-header">
              <h2 className="card-title">Report Information</h2>
            </div>
            <div className="card-content">
              <div className="info-grid">
                <div className="info-item">
                  <label className="info-label">Equipment Tag</label>
                  <p className="info-value">{reportData.equipment_tag}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Report Number</label>
                  <p className="info-value">{reportData.report_no}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Equipment Description</label>
                  <p className="info-value">{reportData.equipment_description}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Plant/Unit/Area</label>
                  <p className="info-value">{reportData.plant_unit_area}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Report Date</label>
                  <p className="info-value">{reportData.report_date}</p>
                </div>
                <div className="info-item">
                  <label className="info-label">Inspector</label>
                  <p className="info-value">{reportData.inspected_by}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Entries */}
          {entries.map((entry, index) => (
            <div key={entry.id} className="entry-card">
              <div className="entry-card-header">
                <div className="entry-header-left">
                  <div className="entry-number-badge">
                    <span className="entry-number">{index + 1}</span>
                  </div>
                  <h3 className="entry-title">Inspection Entry</h3>
                </div>
                <div className="entry-header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleGenerateWithAI(false, entry.id)}
                      disabled={loading || (!entry.base64Image && !entry.selectedImage)}
                      className="action-button ai-generate"
                      style={{ padding: '6px 12px', fontSize: '0.9rem', height: 'auto' }}
                      title="Generate Findings & Recommendations for this entry"
                    >
                      {loading ? <Loader2 className="spinner-icon" size={16} /> : <Zap className="action-icon" size={16} />}
                      <span style={{ marginLeft: '6px' }}>Generate with AI</span>
                    </button>
                  )}
                  {(entries.length > 1 && !isReadOnly) && (
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="remove-entry-btn"
                    >
                      <Trash2 className="remove-icon" />
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="entry-card-body">
                {/* Image Upload Section */}
                <div className="image-upload-section">
                  <label className="upload-label">Image Upload</label>
                  <div className="upload-controls">
                    <label className="upload-button">
                      <Upload className="upload-icon" />
                      Choose File
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={(e) => handleImageChange(entry.id, e)}
                        className="upload-input"
                        disabled={isReadOnly}
                      />
                    </label>

                    <select
                      value={entry.imageType || 'Internal'}
                      onChange={(e) => handleImageTypeChange(entry.id, e.target.value)}
                      className="image-type-select"
                      disabled={isReadOnly}
                    >
                      <option value="Internal">Internal</option>
                      <option value="External">External</option>
                    </select>

                    {(entry.selectedImage || entry.base64Image) && !isReadOnly && (
                      <button
                        onClick={() => handleClearImage(entry.id)}
                        className="clear-image-btn"
                      >
                        <X className="clear-icon" />
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Annotation Tools */}
                  {(entry.selectedImage || entry.base64Image) && !isReadOnly && (
                    <div className="annotation-tools">
                      <img
                        src={redBox}
                        alt="Red Box"
                        className="annotation-tool-btn"
                        onClick={() => handleAddRedBox(entry.id)}
                      />
                      <img
                        src={insertText}
                        alt="Insert Text"
                        className="annotation-tool-btn"
                        onClick={() => handleAddText(entry.id)}
                      />
                    </div>
                  )}

                  {/* Image Preview */}
                  {(entry.previewUrl || entry.base64Image) && (
                    <div className="image-preview-container">
                      <div className="image-preview-wrapper" style={{ overflow: 'hidden' }}>
                        {/* Image Container needs to be relative for absolute positioning of boxes */}
                        <div className="image-preview-inner">
                          <img
                            src={entry.previewUrl || entry.base64Image || undefined}
                            ref={(el) => { entry.imageRef = el; }} // Store ref to image/container
                            alt={`Preview ${index + 1}`}
                            className="preview-image" // Matched style to new look roughly
                            draggable={false}
                          />

                          {/* Render Annotations */}
                          {entry.annotations && entry.annotations.map(ann => (
                            <DraggableBox
                              key={ann.id}
                              {...ann}
                              containerRef={{ current: entry.imageRef?.parentElement as HTMLDivElement | null }} // Pass parent container
                              onUpdate={(id, newRect) => handleAnnotationUpdate(entry.id, id as number, newRect)}
                              isSelected={selectedAnnotationId === ann.id}
                              onSelect={(id) => setSelectedAnnotationId(id as number)}
                              onDelete={(id) => handleDeleteRedBox(entry.id, id as number)}
                            />
                          ))}

                          {/* Render Text Annotations */}
                          {entry.textAnnotations && entry.textAnnotations.map(txt => (
                            <DraggableText
                              key={txt.id}
                              {...txt}
                              containerRef={{ current: entry.imageRef?.parentElement as HTMLDivElement | null }}
                              onUpdate={(id, newData) => handleTextUpdate(entry.id, id as number, newData)}
                              isSelected={selectedAnnotationId === txt.id}
                              onSelect={(id) => setSelectedAnnotationId(id as number)}
                              onDelete={(id) => handleDeleteText(entry.id, id as number)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div className="form-fields-grid">
                  <div className="form-field">
                    <label className="field-label">Component</label>
                    <SearchableComponents
                      options={components}
                      value={entry.component}
                      onChange={(data) => handleComponentChange(entry.id, data)}
                      placeholder="Enter component name..."
                      label="" // Remove label from inner component since we have one outside
                      returnFullObject={true}
                      disabled={(!entry.selectedImage && !entry.base64Image) || isReadOnly}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Finding</label>
                    <SearchableDropdown
                      options={findings as any[]}
                      value={entry.finding}
                      onChange={(data) => handleFindingChange(entry.id, data)}
                      placeholder="Enter findings..."
                      label=""
                      returnFullObject={true}
                      disabled={(!entry.selectedImage && !entry.base64Image) || isReadOnly}
                      hideSearchByDefault={false}
                    />
                  </div>

                  <div className="form-field">
                    <label className="field-label">Recommendation</label>
                    <SearchableDropdown
                      options={recommendations as any[]}
                      value={entry.recommendation}
                      onChange={(data) => handleRecommendationChange(entry.id, data)}
                      placeholder="Enter recommendations..."
                      label=""
                      returnFullObject={true}
                      disabled={(!entry.selectedImage && !entry.base64Image) || isReadOnly}
                      hideSearchByDefault={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Entry Button */}
          {!isReadOnly && (
            <button
              onClick={addNewEntry}
              className="add-entry-btn"
            >
              <Plus className="add-icon" />
              <span className="add-entry-text">Add New Entry</span>
            </button>
          )}

          {/* Action Buttons */}
          {!isReadOnly && (

            <div className="actions-container">
              <div className="actions-grid">
                <button
                  onClick={() => handleGenerateWithAI(false)}
                  disabled={loading || apiStatus !== 'connected'}
                  className="action-button ai-generate-all" // You might need to add specific styling for this class
                  style={{ backgroundColor: '#8b5cf6', color: 'white' }} // Inline style for now to match purple theme
                >
                  {loading ? (
                    <Loader2 className="spinner-icon" />
                  ) : (
                    <Zap className="action-icon" />
                  )}
                  Analyze All Images
                </button>

                <button
                  onClick={handleSaveDraft}
                  disabled={loading || apiStatus !== 'connected'}
                  className="action-button save-draft"
                >
                  {loading ? (
                    <Loader2 className="spinner-icon" />
                  ) : (
                    <FileText className="action-icon" />
                  )}
                  Save as Draft
                </button>

                <button
                  onClick={handleSubmitReport}
                  disabled={loading || apiStatus !== 'connected'}
                  className="action-button submit-report"
                >
                  {loading ? (
                    <Loader2 className="spinner-icon" />
                  ) : (
                    <FileDown className="action-icon" />
                  )}
                  Submit Report
                </button>
              </div>
            </div>
          )}
        </div>
        <Toast ref={toast} />

        <ConstraintTab
          isOpen={isConstraintOpen}
          onClose={() => setIsConstraintOpen(false)}
          onConfirm={constraintConfig.action}
          title={constraintConfig.title}
          message={constraintConfig.message}
          confirmLabel={constraintConfig.confirmLabel}
          isDestructive={constraintConfig.isDestructive}
        />
      </div>
    </div>
  );
}
