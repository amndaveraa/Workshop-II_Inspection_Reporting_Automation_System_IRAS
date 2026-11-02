
import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import HeaderBar from "../components/HeaderBar"; 
import "./appShell.css";

const AppShell: React.FC = () => {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <HeaderBar />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AppShell;