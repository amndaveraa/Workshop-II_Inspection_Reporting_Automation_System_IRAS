import React from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ArrowLeft } from "lucide-react";
import "./accessDenied.css";

const AccessDeniedAdmin: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="access-denied-container">
      <div className="access-denied-card admin-denied">
        <div className="access-denied-icon admin-icon">
          <Crown size={64} />
        </div>
        <h1>Administrator Access Only</h1>
        <p>
          This page is restricted to <strong>Administrators</strong> only.
          Please contact your system administrator if you believe you should have access.
        </p>
        <button className="back-btn" onClick={() => navigate("/app/dashboard")}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedAdmin;
