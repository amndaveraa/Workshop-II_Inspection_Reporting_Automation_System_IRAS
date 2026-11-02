import React, { useState, useEffect } from "react";
import "./settings.css";
import type { Employee } from "../../models/Employee"
import * as EmployeeService from "../../services/employeeService"
import * as TokenHelper from "../../utils/tokenUtils"
import * as AvatarHelper from "../../utils/avatarUtils"
import { Eye, EyeOff } from "lucide-react";

type TabKey = "profile" | "preferences";
interface ProfileForm {
  name: string;
  email: string;
  role: string;
  phoneNum: string;
  department: string;
  avatar?: string; 
}

type ProfileErrors = Partial<Record<keyof ProfileForm, string>>;

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

// type ThemeColor = "blue" | "green" | "purple" | "orange";

// interface PreferencesState {
//   primaryColor: ThemeColor;
//   emailNotifications: boolean;
//   pushNotifications: boolean;
//   reportReminders: boolean;
//   inspectionAlerts: boolean;
// }

// const PREFS_KEY = "settings_preferences";
const PASSWORD_KEY = "settings_password";

// const DEFAULT_PREFS: PreferencesState = {
//   primaryColor: "blue",
//   emailNotifications: true,
//   pushNotifications: false,
//   reportReminders: true,
//   inspectionAlerts: true,
// };

const DEFAULT_PASSWORD = "12345678A"; 

// function loadPreferences(): PreferencesState {
//   if (typeof window === "undefined") return DEFAULT_PREFS;
//   try {
//     const raw = window.localStorage.getItem(PREFS_KEY);
//     if (!raw) return DEFAULT_PREFS;
//     const parsed = JSON.parse(raw) as PreferencesState;
//     return { ...DEFAULT_PREFS, ...parsed };
//   } catch {
//     return DEFAULT_PREFS;
//   }
// }

function loadPassword(): string {
  if (typeof window === "undefined") return DEFAULT_PASSWORD;
  try {
    const raw = window.localStorage.getItem(PASSWORD_KEY);
    if (!raw) return DEFAULT_PASSWORD;
    return raw;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

const SettingsPage: React.FC = () => {
  const [activeTab, _setActiveTab] = useState<TabKey>("profile");


  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [savedProfile, setSavedProfile] = useState<ProfileForm>({
    name: "", email: "", role: "", phoneNum: "", department: "", avatar: ""
  });
  const [profile, setProfile] = useState<ProfileForm>({
    name: "", email: "", role: "", phoneNum: "", department: "", avatar: ""
  });

  // const [savedPrefs, setSavedPrefs] = useState<PreferencesState>(() =>
  //   loadPreferences()
  // );

  // const [prefs, setPrefs] = useState<PreferencesState>(savedPrefs);

  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [showPass, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [_storedPassword, _setStoredPassword] = useState<string>(() =>
    loadPassword()
  );

  const [profileSavedMsg, setProfileSavedMsg] = useState("");
  //const [prefsSavedMsg, setPrefsSavedMsg] = useState("");
  const [isUploading, setIsUploading] = useState(false);
 
  const [profileGlobalError, setProfileGlobalError] = useState("");
  //const [prefsGlobalError, setPrefsGlobalError] = useState("");

  console.log("DEBUG: currentUser from utility:", user);

  useEffect(() => {
    const currentUser = TokenHelper.getUserFromToken();
    if (currentUser) {
      setUser(currentUser);
      const userData = {
        name: currentUser.name || "",
        email: currentUser.email || "",
        role: currentUser.role || "",
        phoneNum: currentUser.phoneNum || "",
        department: currentUser.department || "General",
        avatar: currentUser.avatar || "",
      };
      setProfile(userData);
      setSavedProfile(userData);
    }
    setIsLoading(false); // Stop loading after check
  }, []);

  if (isLoading) {
    return (
      <div className="settings-page">
        <div className="settings-card">Loading Profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="settings-page">
        <div className="settings-card">
          <p>Please log in to view your settings.</p>
        </div>
      </div>
    );
  }

  const handleProfileChange =
    (field: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setProfile((prev) => ({ ...prev, [field]: value }));
      setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
      setProfileSavedMsg("");
      setProfileGlobalError("");
    };

  const handlePasswordChange =
    (field: keyof PasswordForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setPasswordForm((prev) => ({ ...prev, [field]: value }));
      setPasswordErrors((prev) => ({ ...prev, [field]: undefined }));
      setProfileSavedMsg("");
      setProfileGlobalError("");
    };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setProfileGlobalError("Session expired. Please log in again.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileGlobalError("Please upload a valid image file.");
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, avatar: localPreviewUrl }));

    try {
      setIsUploading(true);
      setProfileGlobalError("");

      const response = await EmployeeService.updateAvatarApi(user.employeeid, file);

      if (response.token) {
        TokenHelper.updateTokenInCorrectStorage(response.token);
        
        // --- NEW: ADD CACHE BUSTER ---
        // Adding ?t=... ensures the browser doesn't show the old cached version
        const freshAvatarUrl = `${response.avatarUrl}?t=${new Date().getTime()}`;
        
        setProfile((prev) => ({ ...prev, avatar: freshAvatarUrl }));
        setSavedProfile((prev) => ({ ...prev, avatar: freshAvatarUrl }));
        
        // Clean up the local memory preview
        URL.revokeObjectURL(localPreviewUrl);
        
        window.dispatchEvent(new Event("storage"));
        setProfileSavedMsg("Avatar updated successfully!");
      }
    } catch (err: any) {
      setProfileGlobalError(err.message || "Failed to upload avatar.");
      setProfile((prev) => ({ ...prev, avatar: savedProfile.avatar }));
    } finally {
      setIsUploading(false);
    }
  };

  const validateProfile = (): boolean => {
    const newErrors: ProfileErrors = {};

    if (!profile.name.trim()) {
      newErrors.name = "Full name is required.";
    }

    if (profile.phoneNum.trim()) {
      const phoneRegex = /^[0-9+\-\s()]{7,}$/;
      if (!phoneRegex.test(profile.phoneNum.trim())) {
        newErrors.phoneNum = "Please enter a valid phone number.";
      }
    }

    setProfileErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (): boolean => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    const newErrors: PasswordErrors = {};

    // If all fields are empty, the user isn't trying to change the password
    if (!currentPassword && !newPassword && !confirmPassword) {
        return true; 
    }

    if (!currentPassword) {
        newErrors.currentPassword = "Required to change password.";
    }

    if (!newPassword) {
        newErrors.newPassword = "New password is required.";
    } else {
        const strongRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!strongRegex.test(newPassword)) {
            newErrors.newPassword = "At least 8 characters, 1 uppercase, and 1 number.";
        }
    }

    if (confirmPassword !== newPassword) {
        newErrors.confirmPassword = "Passwords do not match.";
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleSaveProfile = async (e: React.FormEvent) => {
  e.preventDefault();
  setProfileSavedMsg("");
  setProfileGlobalError("");
  setPasswordErrors({}); // Clear old password errors

  // 1. Validate both sections
  const isProfileValid = validateProfile();
  const isPasswordValid = validatePassword();

  if (!isProfileValid || !isPasswordValid) {
    setProfileGlobalError("Please fix the highlighted fields.");
    return;
  }

  try {
    let profileUpdated = false;
    let passwordUpdated = false;

    // 2. Profile Update Logic
    if (profile.name !== savedProfile.name || profile.phoneNum !== savedProfile.phoneNum) {
      const response = await EmployeeService.updateProfileApi({
        employeeid: user.employeeid,
        name: profile.name,
        phoneNum: profile.phoneNum
      });

      if (response.token) {
        TokenHelper.updateTokenInCorrectStorage(response.token);
        if (user) user.name = profile.name;
        window.dispatchEvent(new Event("storage"));

        const freshUrl = `${response.avatarUrl}?t=${new Date().getTime()}`;
    
        setProfile((prev) => ({ ...prev, avatar: freshUrl }));
        setSavedProfile((prev) => ({ ...prev, avatar: freshUrl }));
        
        window.dispatchEvent(new Event("storage"));
        setProfileSavedMsg("Avatar updated successfully!");
      }
      profileUpdated = true;
    }

    // 3. Password Update Logic
    // We only call the API if the user has typed something in the 'New Password' field
    if (passwordForm.newPassword) {
      try {
        await EmployeeService.changePasswordApi({
          employeeid: user.employeeid,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        });
        
        // Success: Clear the password fields
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        passwordUpdated = true;
      } catch (err: any) {
        // Specifically show the "Incorrect Password" error on the input field
        setPasswordErrors({ currentPassword: err.message });
        // Stop here so we don't show the "All changes saved" message
        return; 
      }
    }

    // 4. Final Success Handling
    if (profileUpdated || passwordUpdated) {
      setSavedProfile(profile);
      setProfileSavedMsg("All changes saved successfully!");
    } else {
      setProfileGlobalError("No changes were detected.");
    }

  } catch (err: any) {
    setProfileGlobalError(err.message || "An error occurred while saving.");
  }};

  // const handlePrefsChange =
  //   (field: keyof PreferencesState) =>
  //   (
  //     e:
  //       | React.ChangeEvent<HTMLSelectElement>
  //       | React.ChangeEvent<HTMLInputElement>
  //   ) => {
  //     const target = e.target as HTMLInputElement | HTMLSelectElement;

  //     if (target.type === "checkbox") {
  //       const checked = (target as HTMLInputElement).checked;
  //       setPrefs((prev) => ({ ...prev, [field]: checked }));
  //     } else {
  //       const value = target.value as ThemeColor;
  //       setPrefs((prev) => ({ ...prev, [field]: value }));
  //     }
  //     setPrefsSavedMsg("");
  //     setPrefsGlobalError("");
  //   };

  //   const handleSavePreferences = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setPrefsSavedMsg("");
  //   setPrefsGlobalError("");

  //   const hasPrefsChanges =
  //     prefs.primaryColor !== savedPrefs.primaryColor ||
  //     prefs.emailNotifications !== savedPrefs.emailNotifications ||
  //     prefs.pushNotifications !== savedPrefs.pushNotifications ||
  //     prefs.reportReminders !== savedPrefs.reportReminders ||
  //     prefs.inspectionAlerts !== savedPrefs.inspectionAlerts;

  //   if (!hasPrefsChanges) {
  //     setPrefsGlobalError("Nothing changed to be saved.");
  //     return;
  //   }

   
  //   if (typeof window !== "undefined") {
  //     window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  //   }

  //   setSavedPrefs(prefs);
  //   setPrefsSavedMsg("Preferences saved successfully.");
  // };

  // const handleResetPreferences = () => {
  //   setPrefs(DEFAULT_PREFS);
  //   setSavedPrefs(DEFAULT_PREFS);
  //   if (typeof window !== "undefined") {
  //     window.localStorage.setItem(PREFS_KEY, JSON.stringify(DEFAULT_PREFS));
  //   }
  //   setPrefsGlobalError("");
  //   setPrefsSavedMsg("Preferences reset to default.");
  // };


  const initials = AvatarHelper.getInitials(profile.name);

  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>
      <p className="settings-subtitle">
        Manage your account and preferences
      </p>

      {/* <div className="settings-tabs">
        <button
          type="button"
          className={`settings-tab ${
            activeTab === "profile" ? "settings-tab--active" : ""
          }`}
          onClick={() => {
            setActiveTab("profile");
  
            setPrefsGlobalError("");
          }}
        >
          Profile Settings
        </button>
        <button
          type="button"
          className={`settings-tab ${
            activeTab === "preferences" ? "settings-tab--active" : ""
          }`}
          onClick={() => {
            setActiveTab("preferences");
          
            setProfileGlobalError("");
          }}
        >
          System Preferences
        </button>
      </div> */}


      {activeTab === "profile" && (
        <form className="settings-card" onSubmit={handleSaveProfile} noValidate>
          {profileGlobalError && (
            <div className="settings-error-banner">{profileGlobalError}</div>
          )}

      
          <div className="settings-profile-header">
            <div className="settings-avatar-block">
              {/* The Circle - KEEP OVERFLOW HIDDEN HERE */}
              <div className="settings-avatar-wrapper">
                {profile.avatar && profile.avatar.trim() !== "" ? (
                  <img
                    src={profile.avatar}
                    alt="Avatar"
                    className="settings-avatar-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      setProfile((prev) => ({ ...prev, avatar: "" }));
                    }}
                  />
                ) : (
                  <div className="settings-avatar-placeholder">
                    <span>{initials}</span>
                  </div>
                )}
              </div>

              {/* The Info and Link - MOVE LABEL HERE */}
              <div className="settings-avatar-name">
                <div className="settings-avatar-fullname">{profile.name || "Unnamed"}</div>
                <div className="settings-avatar-role">{profile.role || "Role"}</div>
                
                <label className="settings-avatar-change">
                  {isUploading ? "Uploading..." : "Change avatar"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={isUploading}
                    style={{ display: "none" }}
                    onClick={(e) => ((e.target as HTMLInputElement).value = "")}
                  />
                </label>
              </div>
            </div>
          </div>

         
          <div className="settings-grid settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">
                Full Name <span className="settings-required">*</span>
              </label>
              <input
                className={`settings-input`}
                value={profile.name}
                onChange={handleProfileChange("name")}
                placeholder="Enter full name"
              />
              {profileErrors.name && (
                <div className="settings-error">{profileErrors.name}</div>
              )}
            </div>

            <div className="settings-field">
              <label className="settings-label">Phone</label>
              <input
                type="tel"
                className={`settings-input ${
                  profileErrors.phoneNum ? "settings-input--error" : ""
                }`}
                value={profile.phoneNum}
                onChange={handleProfileChange("phoneNum")}
                placeholder="+60 12-345 6789"
              />
              {profileErrors.phoneNum && (
                <div className="settings-error">{profileErrors.phoneNum}</div>
              )}
            </div>
          </div>

          <div className="settings-grid settings-grid-2">
            <div className="settings-field">
              <label className="settings-label">
                Role <span className="settings-required">*</span>
              </label>
              <input
                disabled
                className={`settings-input settings-input--disabled`}
                value={profile.role}
              >                
              </input>
              <p className="settings-help-text">
                Your role determines your system permissions and is managed by your administrator.
              </p>
              {profileErrors.role && (
                <div className="settings-error">{profileErrors.role}</div>
              )}
            </div>

            <div className="settings-field">
              <label className="settings-label">
                Email <span className="settings-required">*</span>
              </label>
                <input
                  type="email"
                  disabled
                  className="settings-input settings-input--disabled"
                  value={profile.email}
                  readOnly
                  placeholder="Enter email"
                />
                <p className="settings-help-text">
                  Contact IT support to change your company email address.
                </p>
            </div>
          </div>

          <div className="settings-grid settings-grid-1">
            <div className="settings-field">
              <label className="settings-label">Department</label>
              <input
                disabled
                className="settings-input"
                value={profile.department}
                placeholder="None"
              />
              <p className="settings-help-text">
                Your assigned department for reporting and organizational structure.
              </p>
            </div>
          </div>

         
          <div className="settings-section-divider" />
          <div className="settings-section-title">Change Password</div>
          <div className="settings-grid settings-grid-1 settings-password-grid">
            <div className="settings-field">
              <label className="settings-label">Current Password</label>
              <div className="settings-input-container">
                <input
                  type={showPass.current ? "text" : "password"}
                  className={`settings-input settings-input--password ${passwordErrors.currentPassword ? "settings-input--error" : ""}`}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange("currentPassword")}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onMouseDown={() => setShowPassword(prev => ({ ...prev, current: true }))}
                  onMouseUp={() => setShowPassword(prev => ({ ...prev, current: false }))}
                  onMouseLeave={() => setShowPassword(prev => ({ ...prev, current: false }))}
                >
                  {showPass.current ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordErrors.currentPassword && <div className="settings-error">{passwordErrors.currentPassword}</div>}
            </div>

            <div className="settings-field">
              <label className="settings-label">New Password</label>
              <div className="settings-input-container">
                <input
                  type={showPass.new ? "text" : "password"}
                  className={`settings-input settings-input--password ${passwordErrors.newPassword ? "settings-input--error" : ""}`}
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange("newPassword")}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onMouseDown={() => setShowPassword(prev => ({ ...prev, new: true }))}
                  onMouseUp={() => setShowPassword(prev => ({ ...prev, new: false }))}
                  onMouseLeave={() => setShowPassword(prev => ({ ...prev, new: false }))}
                >
                  {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordErrors.newPassword && <div className="settings-error">{passwordErrors.newPassword}</div>}
            </div>

            <div className="settings-field">
              <label className="settings-label">Confirm Password</label>
              <div className="settings-input-container">
                <input
                  type={showPass.confirm ? "text" : "password"}
                  className={`settings-input settings-input--password ${passwordErrors.confirmPassword ? "settings-input--error" : ""}`}
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange("confirmPassword")}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onMouseDown={() => setShowPassword(prev => ({ ...prev, confirm: true }))}
                  onMouseUp={() => setShowPassword(prev => ({ ...prev, confirm: false }))}
                  onMouseLeave={() => setShowPassword(prev => ({ ...prev, confirm: false }))}
                >
                  {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordErrors.confirmPassword && <div className="settings-error">{passwordErrors.confirmPassword}</div>}
            </div>
          </div>

        
          <div className="settings-footer">
            {/* Success Message */}
            {profileSavedMsg && (
              <span className="settings-success">{profileSavedMsg}</span>
            )}

            <div className="settings-footer-buttons">
              <button
                type="button"
                className="settings-btn settings-btn--secondary"
                onClick={() => {
                  // RESET everything to the last known "Saved" state from DB
                  setProfile(savedProfile); 
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  // CLEAR all UI noise
                  setProfileErrors({});
                  setPasswordErrors({});
                  setProfileSavedMsg("");
                  setProfileGlobalError("");
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="settings-btn settings-btn--primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}

   
      {/* {activeTab === "preferences" && (
        <form
          className="settings-card"
          onSubmit={handleSavePreferences}
          noValidate
        >
          {prefsGlobalError && (
            <div className="settings-error-banner">{prefsGlobalError}</div>
          )}

          <div className="settings-section-title">Theme Settings</div>
          <div className="settings-field">
            <label className="settings-label">Primary Color</label>
            <select
              className="settings-input"
              value={prefs.primaryColor}
              onChange={handlePrefsChange("primaryColor")}
            >
              <option value="blue">Blue (Default)</option>
              <option value="green">Green</option>
              <option value="purple">Purple</option>
              <option value="orange">Orange</option>
            </select>
          </div>

          <div className="settings-section-title">Notification Settings</div>

          <div className="settings-notif-row">
            <div>
              <div className="settings-notif-title">
                Email Notifications
              </div>
              <div className="settings-notif-subtitle">
                Receive email updates about inspections and reports
              </div>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={prefs.emailNotifications}
                onChange={handlePrefsChange("emailNotifications")}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          <div className="settings-notif-row">
            <div>
              <div className="settings-notif-title">
                Push Notifications
              </div>
              <div className="settings-notif-subtitle">
                Get instant alerts on your device
              </div>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={prefs.pushNotifications}
                onChange={handlePrefsChange("pushNotifications")}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          <div className="settings-notif-row">
            <div>
              <div className="settings-notif-title">
                Report Reminders
              </div>
              <div className="settings-notif-subtitle">
                Remind me about pending reports
              </div>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={prefs.reportReminders}
                onChange={handlePrefsChange("reportReminders")}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          <div className="settings-notif-row">
            <div>
              <div className="settings-notif-title">
                Inspection Alerts
              </div>
              <div className="settings-notif-subtitle">
                Alert me when inspections are due
              </div>
            </div>
            <label className="settings-switch">
              <input
                type="checkbox"
                checked={prefs.inspectionAlerts}
                onChange={handlePrefsChange("inspectionAlerts")}
              />
              <span className="settings-switch-slider" />
            </label>
          </div>

          <div className="settings-footer">
            {prefsSavedMsg && (
              <span className="settings-success">{prefsSavedMsg}</span>
            )}
            <div className="settings-footer-buttons">
              <button
                type="button"
                className="settings-btn settings-btn--secondary"
                onClick={handleResetPreferences}
              >
                Reset to Default
              </button>
              <button
                type="submit"
                className="settings-btn settings-btn--primary"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </form>
      )} */}
    </div>
  );
};

export default SettingsPage;
