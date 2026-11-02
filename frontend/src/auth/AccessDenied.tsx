import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft } from "lucide-react";
import "./accessDenied.css";

const AccessDenied: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        <div className="access-denied-icon">
          <ShieldX size={64} />
        </div>
        <h1>Access Denied</h1>
        <p>
          You don't have permission to view this page. 
          This section is restricted to <strong>Supervisors</strong> and <strong>Administrators</strong> only.
        </p>
        <button className="back-btn" onClick={() => navigate("/app/dashboard")}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;
