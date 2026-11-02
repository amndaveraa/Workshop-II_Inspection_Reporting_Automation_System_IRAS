import AdminDashboard from "./AdminDashboard";
import InspectorDashboard from "./InspectorDashboard";
import SupervisorDashboard from "./SupervisorDashboard";
import React from "react";
import { getUserFromToken } from "../../utils/tokenUtils";
import { Navigate } from "react-router-dom";
import type { Employee } from "../../models/Employee";


const Dashboard: React.FC = () => {
  // Initialize synchronously instead of using undefined + useEffect
  const [user] = React.useState<Employee | null>(() => {
    return (getUserFromToken() as Employee) || null;
  });

  // You can keep the Navigate check here
  if (!user) return <Navigate to="/auth" />;

  switch (user.role) {
    case "administrator":
      return <AdminDashboard />;
    case "inspector":
      return <InspectorDashboard employeeId={user.employeeid}/>;
    case "supervisor":
      return <SupervisorDashboard employeeId={user.employeeid}/>;
    default:
      return <div>Role not recognized</div>;
  }
};

export default Dashboard;
