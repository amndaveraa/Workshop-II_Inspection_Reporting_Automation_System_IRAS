import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Hash, ArrowRight, Building2, Clock, XCircle, BadgeCheck, Send, Search } from 'lucide-react';
import { useGetReportData as useGetPendingReports } from '../../hooks/getReportData';
import { useGetReportData as useGetCompletedReports } from '../../hooks/getCompletedReport';
import { useGetReportData as useGetRejectedReports } from '../../hooks/getRejectedReport';
import { useGetReportData as useGetApprovedReports } from '../../hooks/getApprovedReport';
import { getUserFromToken } from '../../utils/tokenUtils';
import './PendingPage.css';

interface ReportCardProps {
  report: Report;
  onContinue: (id: number) => void;
}

function ReportCard({ report, onContinue }: ReportCardProps) {
  const statusConfig = {
    pending: {
      color: 'amber',
      icon: Clock,
      label: 'In Progress'
    },
    submitted: {
      color: 'purple',
      icon: Send,
      label: 'Submitted'
    },
    approved: {
      color: 'blue',
      icon: BadgeCheck,
      label: 'Approved'
    },
    rejected: {
      color: 'red',
      icon: XCircle,
      label: 'Rejected'
    }
  };

  const config = statusConfig[report.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;
 

  return (
    <div className="group bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Status Bar */}
      <div className={`h-1 bg-gradient-to-r ${
        config.color === 'amber' ? 'from-amber-400 to-amber-500' :
        config.color === 'purple' ? 'from-purple-400 to-purple-500' :
        config.color === 'blue' ? 'from-blue-400 to-blue-500' :
        'from-red-400 to-red-500'
      }`} />
      
      {/* Card Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1.5 truncate" title={report.reportNo}>
              {report.title || report.reportNo}
            </h3>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              config.color === 'amber' ? 'bg-amber-50 text-amber-700' :
              config.color === 'purple' ? 'bg-purple-50 text-purple-700' :
              config.color === 'blue' ? 'bg-blue-50 text-blue-700' :
              config.color === 'red' ? 'bg-red-50 text-red-700' :
              'bg-gray-50 text-gray-700'
            }`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {config.label}
            </div>
          </div>
        </div>
        
        {/* REJECTION REASON BOX */}
        {report.status === 'rejected' && report.rejectionNote && (
          <div className="rejection-feedback-container">
            <div className="rejection-feedback-header">
              <XCircle className="w-3.5 h-3.5" />
              <span>Supervisor Feedback</span>
            </div>
            <p className="rejection-feedback-text">
              "{report.rejectionNote}"
            </p>
          </div>
        )}

        {/* Details */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Hash className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">DOSH Registration</p>
              <p className="text-gray-900 font-medium truncate">{report.doshRegistrationNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 font-medium mb-0.5">Created</p>
              <p className="text-gray-900 font-medium">
                {new Date(report.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onContinue(report.id)}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-all duration-200 group/btn"
        >
          <span>
            {report.status === 'pending' || report.status === 'rejected' 
              ? 'Continue Report' 
              : 'View Details'}
          </span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
        </button>
      </div>
    </div>
  );
}

interface Report {
  id: number;
  title?: string;
  reportNo: string;
  doshRegistrationNo: string;
  createdAt: string;
  status: string;
  rejectionNote?: string;
  equipment?: {
      plant?: {
          name: string;
      };
      tagno?: string;
      doshregno?: string;
  };
}

function PendingReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'approved' | 'rejected'>('pending');
  
  const navigate = useNavigate();
  
  const { load: loadPending, loading: loadingPending, data: pendingData } = useGetPendingReports();
  const { load: loadCompleted, loading: loadingCompleted, data: completedData } = useGetCompletedReports();
  const { load: loadRejected, loading: loadingRejected, data: rejectedData } = useGetRejectedReports();
  const { load: loadApproved, loading: loadingApproved, data: approvedData } = useGetApprovedReports();

  const isLoading = loadingPending || loadingCompleted || loadingRejected || loadingApproved;

  useEffect(() => {
    const user = getUserFromToken();
    if (user && user.employeeid) {
        console.log("Loading reports for inspector:", user.employeeid);
        loadPending(user.employeeid);
        loadCompleted(user.employeeid);
        loadRejected(user.employeeid);
        loadApproved(user.employeeid);
    } else {
        console.warn("No user token found, cannot load reports.");
    }
  }, []);

  useEffect(() => {
    const combinedReports: Report[] = [];

    if (pendingData && pendingData.length > 0) {
      const formattedPending = pendingData.map(item => {
        const reportTitle = item.title || 'Unknown Report';
        const plantName = item.equipment?.plant?.name || 'Unknown Plant';
        const tagNo = item.equipment?.tagno || 'Unknown Tag';
        const reportNo = `${plantName}/VI/${tagNo}/TA2025`;
        
        return {
          id: item.reportid,
          reportNo: reportNo,
          title: reportTitle,
          doshRegistrationNo: item.equipment?.doshregno || 'N/A',
          createdAt: item.reportdate || new Date().toISOString(),
          status: 'pending'
        };
      });
      combinedReports.push(...formattedPending);
    }

    if (completedData && completedData.length > 0) {
      const formattedCompleted = completedData.map(item => {
        const reportTitle = item.title || 'Unknown Report';
        const plantName = item.equipment?.plant?.name || 'Unknown Plant';
        const tagNo = item.equipment?.tagno || 'Unknown Tag';
        const reportNo = `${plantName}/VI/${tagNo}/TA2025`;
        
        return {
          id: item.reportid,
          reportNo: reportNo,
          title: reportTitle,
          doshRegistrationNo: item.equipment?.doshregno || 'N/A',
          createdAt: item.reportdate || new Date().toISOString(),
          status: 'submitted' // Remapping 'completed' from DB to 'submitted' in UI
        };
      });
      combinedReports.push(...formattedCompleted);
    }

    if (approvedData && approvedData.length > 0) {
      const formattedApproved = approvedData.map(item => {
        const reportTitle = item.title || 'Unknown Report';
        const plantName = item.equipment?.plant?.name || 'Unknown Plant';
        const tagNo = item.equipment?.tagno || 'Unknown Tag';
        const reportNo = `${plantName}/VI/${tagNo}/TA2025`;
        
        return {
          id: item.reportid,
          reportNo: reportNo,
          title: reportTitle,
          doshRegistrationNo: item.equipment?.doshregno || 'N/A',
          createdAt: item.reportdate || new Date().toISOString(),
          status: 'approved'
        };
      });
      combinedReports.push(...formattedApproved);
    }

    if (rejectedData && rejectedData.length > 0) {
      const formattedRejected = rejectedData.map(item => {
        const reportTitle = item.title || 'Unknown Report';
        const plantName = item.equipment?.plant?.name || 'Unknown Plant';
        const tagNo = item.equipment?.tagno || 'Unknown Tag';
        const reportNo = `${plantName}/VI/${tagNo}/TA2025`;
        
        return {
          id: item.reportid,
          reportNo: reportNo,
          title: reportTitle,
          doshRegistrationNo: item.equipment?.doshregno || 'N/A',
          createdAt: item.reportdate || new Date().toISOString(),
          status: 'rejected',
          rejectionNote: item.rejection_note // Add this line
        };
      });
      combinedReports.push(...formattedRejected);
    }

    setReports(combinedReports);
  }, [pendingData, completedData, rejectedData, approvedData]);

  const handleContinue = (reportId: number) => {
    console.log('Continue editing report:', reportId);
     navigate(`/app/generator/${reportId}`);
  };

  const filteredReports = useMemo(() => {
  return reports
    .filter((report) => report.status === activeTab)
    .filter((report) => {
      const searchLower = searchQuery.toLowerCase().trim();
      if (!searchLower) return true;

      // Check all searchable fields
      return (
        report.reportNo.toLowerCase().includes(searchLower) ||
        report.doshRegistrationNo.toLowerCase().includes(searchLower) ||
        (report.title && report.title.toLowerCase().includes(searchLower))
      );
    });
}, [reports, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <img src="https://lucide.dev/api/icons/hard-hat" width="24" height="24" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Inspection Reports</h1>
              <p className="text-sm text-gray-600 mt-0.5">
                {reports.length} active inspection{reports.length !== 1 ? 's' : ''} • Last updated today
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs and Search Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              In Progress
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'pending' ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {reports.filter(r => r.status === 'pending').length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('submitted')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'submitted'
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Send className="w-4 h-4" />
              Submitted
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'submitted' ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {reports.filter(r => r.status === 'submitted').length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'approved'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BadgeCheck className="w-4 h-4" />
              Approved
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'approved' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {reports.filter(r => r.status === 'approved').length}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('rejected')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all ${
                activeTab === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Rejected
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'rejected' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'
              }`}>
                {reports.filter(r => r.status === 'rejected').length}
              </span>
            </button>
          </div>

          {/* Search */}
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by title, tag number, or DOSH registration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="modern-search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search-btn" 
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Submitted</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'submitted').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Send className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Approved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'approved').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <BadgeCheck className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-24">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-gray-600 mt-6 font-medium">Loading inspection task...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg py-16 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              {activeTab === 'pending' && <Clock className="w-10 h-10 text-amber-400" />}
              {activeTab === 'submitted' && <Send className="w-10 h-10 text-purple-400" />}
              {activeTab === 'approved' && <BadgeCheck className="w-10 h-10 text-blue-400" />}
              {activeTab === 'rejected' && <XCircle className="w-10 h-10 text-red-400" />}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No reports found' : `No ${activeTab} reports`}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              {searchQuery 
                ? 'Try adjusting your search criteria' 
                : activeTab === 'pending' 
                  ? "You're all caught up! Start a new inspection from the Vessels page."
                  : `You don't have any ${activeTab} reports yet.`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 capitalize">{activeTab} Inspection</h2>
              <span className="text-sm text-gray-600 bg-white px-4 py-1.5 rounded-full border border-gray-200 font-medium">
                {filteredReports.length} {filteredReports.length === 1 ? 'Report' : 'Reports'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onContinue={handleContinue}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PendingReports;