import React from "react";
import { Search, Bell } from "lucide-react";
import * as TokenHelper from "../utils/tokenUtils";
import * as AvatarHelper from "../utils/avatarUtils";
import "./headerBar.css";
import type { Employee } from "../models/Employee";

const HeaderBar: React.FC = () => {
  const [user, setUser] = React.useState<Employee | null>(TokenHelper.getUserFromToken());

  React.useEffect(() => {
    const handleStorageUpdate = () => {
      setUser(TokenHelper.getUserFromToken());
    };

    window.addEventListener("storage", handleStorageUpdate);
    return () => window.removeEventListener("storage", handleStorageUpdate);
  }, []);

  if (!user) return null;

  const initials = AvatarHelper.getInitials(user.name);

  return (
    <header className="header-bar">
      <div className="header-left">
        <h1 className="header-app-name">Pressure Vessel Inspection System</h1>
        <span className="header-page-name">Inspector Dashboard</span>
      </div>

      <div className="header-middle">
      </div>

      <div className="header-right">

        <div className="header-user-separator"></div>

        <div className="header-user">
          <div className="header-user-info">
            <span className="header-user-name">{user.name}</span>
            <span className="header-user-role">{user.role}</span>
          </div>

          <div className="header-avatar">
            {/* Logic: Only show image if URL exists and hasn't failed */}
            {user.avatar && user.avatar.trim() !== "" ? (
              <img
                src={user.avatar}
                alt="User"
                className="header-avatar-img"
                onError={(e) => {
                  // If link is broken, hide image and clear state to show initials
                  (e.target as HTMLImageElement).style.display = "none";
                  setUser({ ...user, avatar: "" });
                }}
              />
            ) : (
              /* Falls back to initials with the single default color */
              <span className="avatar-initials">{initials}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;