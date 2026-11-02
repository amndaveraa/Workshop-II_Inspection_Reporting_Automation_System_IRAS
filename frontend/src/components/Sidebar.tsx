import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Box,
  ClipboardList,
  FileText,
  BarChart2,
  Archive,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Users,          
} from "lucide-react";
import "./sideBar.css";
import { getUserFromToken } from "../utils/tokenUtils";

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const user = getUserFromToken();

  const [isHovered, setIsHovered] = useState(false);
  const [vesselsOpen, setVesselsOpen] = useState(true);

  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "administrator";
  const isInspector = user?.role === "inspector";

  const isDashboard = location.pathname === "/app/dashboard";
  const isVesselsActive = location.pathname.startsWith("/app/vessels");

  const isExpanded = isDashboard || isHovered;

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isVesselsActive) setVesselsOpen(true);
  }, [isVesselsActive]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/auth");
  };

  const iconSize = 20;

  return (
    <aside
      className={`sidebar ${isExpanded ? "expanded" : "collapsed"}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-mark">IRAS</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-title">IRAS</div>
            <div className="sidebar-subtitle">Inspection System</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " sidebar-link-active" : "")
          }
        >
          <LayoutDashboard size={iconSize} className="sidebar-icon" />
          <span className="sidebar-text">Dashboard</span>
        </NavLink>

        {(isAdmin || isSupervisor || isInspector) && (
          <div className={"sidebar-group" + (isVesselsActive ? " active-group" : "")}>
            <button
              type="button"
              className={
                "sidebar-link sidebar-link-toggle" +
                (isVesselsActive ? " sidebar-link-active" : "")
              }
              onClick={() => isExpanded && setVesselsOpen((o) => !o)}
            >
              <Box size={iconSize} className="sidebar-icon" />
              <span className="sidebar-text">Pressure Vessels</span>
              {isExpanded && (
                <span className="sidebar-toggle-arrow">
                  {vesselsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              )}
            </button>

            {isExpanded && vesselsOpen && (
              <div className="sidebar-submenu">
                <NavLink
                  to="/app/vessels"
                  end
                  className={({ isActive }) =>
                    "sidebar-sublink" + (isActive ? " sidebar-sublink-active" : "")
                  }
                >
                  View All
                </NavLink>
                
                {/* ONLY show 'Add New' to Admins */}
                {isAdmin && (
                  <NavLink
                    to="/app/vessels/new"
                    className={({ isActive }) =>
                      "sidebar-sublink" + (isActive ? " sidebar-sublink-active" : "")
                    }
                  >
                    Add New Vessel
                  </NavLink>
                )}
              </div>
            )}
          </div>
        )}
        
        {(isAdmin || isSupervisor) &&
        <NavLink
          to="/app/inspections"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " sidebar-link-active" : "")
          }
        >
          <ClipboardList size={iconSize} className="sidebar-icon" />
          <span className="sidebar-text">Inspection List</span>
        </NavLink>}

        {isInspector && (
        <NavLink
          to="/app/pending"
          className={({ isActive }) =>
            "sidebar-link" + (isActive || location.pathname.includes("/app/generator") ? " sidebar-link-active" : "")
        }
        >
          <FileText size={iconSize} className="sidebar-icon" />
          <span className="sidebar-text">Inspection Reports</span>
        </NavLink>
        )}

        {/*  NEW: User Management item - Admin only */}
        {isAdmin && (
          <NavLink
            to="/app/users"  
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " sidebar-link-active" : "")
            }
          >
            <Users size={iconSize} className="sidebar-icon" />
            <span className="sidebar-text">User Management</span>
          </NavLink>
        )}

        {(isSupervisor || isAdmin) && (
          <NavLink
            to="/app/analytics"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " sidebar-link-active" : "")
            }
          >
            <BarChart2 size={iconSize} className="sidebar-icon" />
            <span className="sidebar-text">Analytics</span>
          </NavLink>
        )}

        {/* Archive - Admin only */}
          {(isAdmin || isSupervisor) && (
          <NavLink
            to="/app/archive"
            className={({ isActive }) =>
              "sidebar-link" + (isActive ? " sidebar-link-active" : "")
            }
          >
            <Archive size={iconSize} className="sidebar-icon" />
            <span className="sidebar-text">Archive</span>
          </NavLink>
        )}

        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " sidebar-link-active" : "")
          }
        >
          <Settings size={iconSize} className="sidebar-icon" />
          <span className="sidebar-text">Settings</span>
        </NavLink>
      </nav>

      <button
        type="button"
        className="sidebar-logout"
        onClick={handleLogout}
      >
        <LogOut size={iconSize} className="sidebar-icon" />
        <span className="sidebar-text">Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;