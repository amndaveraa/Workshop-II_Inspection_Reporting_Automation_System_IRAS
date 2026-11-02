import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Archive,
  Users,
  UserCheck,
  Shield,
  Crown,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./userManagement.css";
import {
  fetchUsers,
  fetchActiveUsers, 
  createUser,
  updateUser,
  deactivateUser,
  changeUserPassword,
  type ManagedUser,
  type UserRole,
} from "../../services/userService";

interface User extends ManagedUser {}
type UserStatus = "Active" | "Inactive";

const normalizeRole = (role: any): UserRole => {
  const v = String(role ?? "").toLowerCase();
  if (v === "inspector") return "Inspector";
  if (v === "supervisor") return "Supervisor";
  if (v === "administrator" || v === "admin") return "Administrator";
  return "Inspector";
};

const normalizeStatus = (status: any): UserStatus => {
  const v = String(status ?? "").toLowerCase();
  return v === "inactive" ? "Inactive" : "Active";
};

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const logoutNow = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("currentUser");
};

const getCurrentIdentity = (): { id: string | null; email: string | null } => {
  const stored = localStorage.getItem("currentUser");
  if (stored) {
    try {
      const u = JSON.parse(stored);
      const id = u?.id ?? u?.userId ?? u?.employeeid ?? u?.employeeId ?? null;
      const email = u?.email ?? null;
      return {
        id: id ? String(id) : null,
        email: email ? String(email).toLowerCase() : null,
      };
    } catch {}
  }

  const token = getToken();
  if (!token) return { id: null, email: null };

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const id =
      payload?.id ??
      payload?.userId ??
      payload?.employeeid ??
      payload?.employeeId ??
      payload?.sub ??
      payload?.user?.id ??
      payload?.user?.employeeid ??
      null;

    const email = payload?.email ?? payload?.user?.email ?? null;

    return {
      id: id ? String(id) : null,
      email: email ? String(email).toLowerCase() : null,
    };
  } catch {
    return { id: null, email: null };
  }
};

const formatLastLogin = (value?: string | null) => {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const UsersPage: React.FC = () => {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUsersCount, setTotalUsersCount] = useState(0);
const [activeUsersCount, setActiveUsersCount] = useState(0);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    status: UserStatus;
    department: string;
    password: string;
  }>({
    name: "",
    email: "",
    phone: "",
    role: "Inspector",
    status: "Active",
    department: "Operations",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successModal, setSuccessModal] = useState<{ show: boolean; userName: string; userEmail: string; password: string }>({ show: false, userName: "", userEmail: "", password: "" });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  
  const loadUsers = useCallback(async () => {
  setLoading(true);
  setApiError(null);

  try {
    
    const [allUsers, activeOnly] = await Promise.all([
      fetchUsers(),
      fetchActiveUsers(),
    ]);

 
    setTotalUsersCount(allUsers.length);
    setActiveUsersCount(activeOnly.length);

    
    const normalized = activeOnly.map((u: any) => ({
      ...u,
      role: normalizeRole(u.role),
      status: normalizeStatus(u.status),
    })) as User[];

    setUsers(normalized);
  } catch (err: any) {
    setApiError(err?.message || "Unable to load users from server.");
    setUsers([]);
    setTotalUsersCount(0);
    setActiveUsersCount(0);
  } finally {
    setLoading(false);
  }
}, []);
useEffect(() => {
  loadUsers();
}, [loadUsers]);


  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(term) ||
        (u.email || "").toLowerCase().includes(term) ||
        String(u.role || "").toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

 
  const totalUsers = totalUsersCount;
const activeUsers = activeUsersCount;

  const inspectors = users.filter((u) => u.role === "Inspector").length;
  const admins = users.filter((u) => u.role === "Administrator").length;

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", role: "Inspector", status: "Active", department: "Operations", password: "" });
    setErrors({});
    setEditingUserId(null);
    setApiError(null);
    setShowPassword(false);
  };

  const openAddForm = () => {
    resetForm();
    setShowAddForm(true);
  };

  const cancelAdd = () => {
    resetForm();
    setShowAddForm(false);
  };

  const openEdit = (user: User) => {
    setEditingUserId(user.id);
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: (user as any).phoneNum ?? "",
      role: normalizeRole(user.role),
      status: normalizeStatus(user.status),
      department: user.department ?? "Operations",
      password: "",
    });
    setErrors({});
    setApiError(null);
    setShowAddForm(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    if (!name) e.name = "Full name is required";
    else if (name.length < 2) e.name = "Name is too short";

    if (!email) e.email = "Email is required";
    else if (!isValidEmail(email)) e.email = "Enter a valid email address";

    const duplicate = users.find(
      (u) =>
        (u.email || "").toLowerCase() === email.toLowerCase() &&
        u.id !== editingUserId
    );
    if (duplicate) e.email = "This email is already in use.";

    // Phone validation - optional but if provided must be valid
    if (phone && !/^[0-9+\-\s()]{10,15}$/.test(phone)) {
      e.phone = "Enter a valid phone number (10-15 digits)";
    }

    // Password validation (only in edit mode when password is provided)
    if (editingUserId && form.password.trim()) {
      const strongRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!strongRegex.test(form.password)) {
        e.password = "At least 8 characters, 1 uppercase, and 1 number.";
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (
    ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = ev.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setApiError(null);

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;

   
    if (editingUserId) {
      const current = users.find((u) => u.id === editingUserId);
      if (
        current?.role === "Administrator" &&
        current.status === "Active" &&
        form.status === "Inactive"
      ) {
        const activeAdminsCount = users.filter(
          (u) => u.role === "Administrator" && u.status === "Active"
        ).length;

        if (activeAdminsCount <= 1) {
          setApiError("You cannot deactivate the last active Administrator.");
          return;
        }
      }
    }

    setSaving(true);
    setApiError(null);

    try {
      if (editingUserId) {
        const updateData: any = {
          name: form.name,
          email: form.email,
          phoneNum: form.phone.trim() || undefined,
          role: form.role,
          status: form.status,
          department: form.department,
        };

        const updated = await updateUser(editingUserId, updateData);
        const normalized = {
          ...updated,
          role: normalizeRole((updated as any).role),
          status: normalizeStatus((updated as any).status),
        } as User;

        // Handle password change if provided
        if (form.password.trim()) {
          try {
            await changeUserPassword(editingUserId, form.password);
          } catch (err: any) {
            setApiError(err?.message || "Failed to change password.");
            setSaving(false);
            return;
          }
        }

        
        if (normalized.status === "Inactive") {
          setUsers((prev) => prev.filter((u) => u.id !== editingUserId));
          setSuccessMessage(`User "${normalized.name}" has been moved to archive successfully.`);
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setUsers((prev) =>
            prev.map((u) => (u.id === editingUserId ? normalized : u))
          );
          setSuccessMessage(`User "${normalized.name}" has been updated successfully.`);
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      } else {
        const createData = {
          name: form.name,
          email: form.email,
          phoneNum: form.phone.trim() || undefined,
          role: form.role,
          status: form.status,
          department: form.department,
        };

        console.log("Creating user with data:", createData);
        const created = await createUser(createData);
        console.log("Created user response:", created);
        const normalized = {
          ...created,
          role: normalizeRole((created as any).role),
          status: normalizeStatus((created as any).status),
        } as User;

        
        if (normalized.status === "Active") {
          setUsers((prev) => [normalized, ...prev]);
        }

        // Show success modal with user details
        setSuccessModal({
          show: true,
          userName: normalized.name,
          userEmail: normalized.email,
          password: "Demo#123",
        });
      }

      cancelAdd();
    } catch (err: any) {
      setApiError(err?.message || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  
  const handleDelete = async (user: User) => {
    if (saving || deletingId) return;

    
    if (user.role === "Administrator") {
      const activeAdminsCount = users.filter(
        (u) => u.role === "Administrator" && u.status === "Active"
      ).length;

      if (activeAdminsCount <= 1) {
        setApiError("You cannot deactivate the last active Administrator.");
        return;
      }
    }

    if (!window.confirm(`Move user "${user.name}" to Archive (set Inactive)?`)) return;

    setDeletingId(user.id);
    setApiError(null);

    try {
      await deactivateUser(user.id); 
      setUsers((prev) => prev.filter((u) => u.id !== user.id)); 

      setSuccessMessage(`User "${user.name}" has been moved to archive successfully.`);
      setTimeout(() => setSuccessMessage(null), 5000);

      const me = getCurrentIdentity();
      const isSelf =
        (me.id && me.id === user.id) ||
        (me.email && me.email === user.email.toLowerCase());

      if (isSelf) {
        logoutNow();
        navigate("/auth", { replace: true });
      }
    } catch (err: any) {
      setApiError(err?.message || "Failed to deactivate user.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="users-page">
      <div className="users-header-area">
        <div className="users-title-row">
          <h1 className="user-management-title">User Management</h1>
          <span className="admin-badge">
            <ShieldCheck size={14} />
            Admin Only
          </span>
        </div>
        <p className="user-management-subtitle">
          Manage system users, roles, and permissions
        </p>
      </div>

      <div className="users-stats-grid">
        <div className="users-stat-card">
          <div className="users-stat-icon users-stat-icon-blue">
            <Users size={20} />
          </div>
          <div className="users-stat-number">{totalUsers}</div>
          <div className="users-stat-label">Total Users</div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon users-stat-icon-green">
            <UserCheck size={20} />
          </div>
          <div className="users-stat-number">{activeUsers}</div>
          <div className="users-stat-label">Active Users</div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon users-stat-icon-indigo">
            <Shield size={20} />
          </div>
          <div className="users-stat-number">{inspectors}</div>
          <div className="users-stat-label">Inspectors</div>
        </div>

        <div className="users-stat-card">
          <div className="users-stat-icon users-stat-icon-orange">
            <Crown size={20} />
          </div>
          <div className="users-stat-number">{admins}</div>
          <div className="users-stat-label">Administrators</div>
        </div>
      </div>

      <div className="users-toolbar">
        <div className="users-search-wrapper">
          <Search size={18} className="users-search-icon" />
          <input
            className="users-search-input"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>

        {!showAddForm && (
          <button
            type="button"
            className="users-add-btn"
            onClick={openAddForm}
            disabled={loading}
          >
            <Plus size={18} />
            <span>Add New User</span>
          </button>
        )}
      </div>

      {apiError && (
        <div className="users-api-error">
          {apiError}
          <button type="button" onClick={loadUsers}>
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: "16px 20px",
          backgroundColor: "#d1fae5",
          border: "1px solid #10b981",
          borderRadius: "8px",
          color: "#065f46",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "14px",
          fontWeight: "500",
        }}>
          <span style={{ fontSize: "20px" }}>✓</span>
          {successMessage}
        </div>
      )}

      {loading && (
        <div className="users-loading">Loading users…</div>
      )}

      {showAddForm && (
        <div className="users-add-card">
          <form onSubmit={handleSubmit} className="users-add-form">
            <div className="users-add-grid">
              <div className="users-form-group">
                <label>
                  Full Name *
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g., Ali Ahmad"
                    value={form.name}
                    onChange={handleChange}
                    className={errors.name ? "has-error" : ""}
                    disabled={saving}
                  />
                </label>
                {errors.name && (
                  <span className="users-error-text">{errors.name}</span>
                )}
              </div>

              <div className="users-form-group">
                <label>
                  Email *
                  <input
                    type="email"
                    name="email"
                    placeholder="e.g., ali.ahmad@company.com"
                    value={form.email}
                    onChange={handleChange}
                    className={errors.email ? "has-error" : ""}
                    disabled={saving}
                  />
                </label>
                {errors.email && (
                  <span className="users-error-text">{errors.email}</span>
                )}
              </div>

              <div className="users-form-group">
                <label>
                  Phone Number
                  <input
                    type="tel"
                    name="phone"
                    placeholder="e.g., +60123456789"
                    value={form.phone}
                    onChange={handleChange}
                    className={errors.phone ? "has-error" : ""}
                    disabled={saving}
                  />
                </label>
                {errors.phone && (
                  <span className="users-error-text">{errors.phone}</span>
                )}
              </div>

              <div className="users-form-group">
                <label>
                  Role
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="Inspector">Inspector</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </label>
              </div>

              <div className="users-form-group">
                <label>
                  Department
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="Operations">Operations</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Safety">Safety</option>
                    <option value="Quality">Quality</option>
                    <option value="Technical">Technical</option>
                  </select>
                </label>
              </div>

              <div className="users-form-group">
                <label>
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    disabled={saving}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
              </div>

              {editingUserId && (
                <div className="users-form-group">
                  <label>
                    New Password (Optional)
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="Leave blank to keep current password"
                        value={form.password}
                        onChange={handleChange}
                        className={errors.password ? "has-error" : ""}
                        disabled={saving}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        disabled={saving}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                  {errors.password && (
                    <span className="users-error-text">{errors.password}</span>
                  )}
                  <small style={{ color: "#6b7280", fontSize: "12px", display: "block", marginTop: "4px" }}>
                    Password must be at least 8 characters with 1 uppercase and 1 number
                  </small>
                </div>
              )}
            </div>

            <div className="users-add-actions">
              <button
                type="button"
                className="users-secondary-btn"
                onClick={cancelAdd}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="users-primary-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : editingUserId ? "Update User" : "Save User"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="users-table-card">
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Last Login</th>
              <th className="users-actions-header">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => {
              const initials =
                (u.name || "")
                  .trim()
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0]?.toUpperCase())
                  .join("") || "?";

              return (
                <tr key={u.id}>
                  <td>
                    <div className="users-user-cell">
                      <div className="users-avatar-circle">{initials}</div>
                      <div className="users-user-info">
                        <div className="users-user-name">{u.name}</div>
                        <div className="users-user-email">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span style={{ color: "#6b7280", fontSize: "14px" }}>
                      {(u as any).phoneNum || "-"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`users-pill users-pill-role-${String(u.role).toLowerCase()}`}
                    >
                      {u.role}
                    </span>
                  </td>

                  <td>
                    <span className="users-department-badge">
                      {u.department || "Operations"}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`users-pill users-pill-status-${
                        u.status === "Active" ? "active" : "inactive"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>

                  <td className="users-last-login">
                    {formatLastLogin(u.lastLogin ?? null)}
                  </td>

                  <td className="users-actions-cell">
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-start" }}>
                      <button
                        className="users-icon-btn users-edit-btn"
                        onClick={() => openEdit(u)}
                        disabled={saving || deletingId === u.id}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        className="users-icon-btn users-delete-btn"
                        onClick={() => handleDelete(u)}
                        disabled={saving || deletingId === u.id}
                        title="Move to Archive"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="users-empty-state">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Success Modal */}
      {successModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setSuccessModal({ show: false, userName: "", userEmail: "", password: "" })}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "32px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "600", color: "#10b981", margin: 0 }}>
                ✓ User Created Successfully
              </h2>
              <button
                onClick={() => setSuccessModal({ show: false, userName: "", userEmail: "", password: "" })}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#6b7280",
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ marginBottom: "24px", padding: "20px", backgroundColor: "#f3f4f6", borderRadius: "8px" }}>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#374151" }}>User Name:</strong>
                <div style={{ fontSize: "18px", color: "#111827", marginTop: "4px" }}>{successModal.userName}</div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <strong style={{ color: "#374151" }}>Email:</strong>
                <div style={{ fontSize: "18px", color: "#111827", marginTop: "4px" }}>{successModal.userEmail}</div>
              </div>
              <div>
                <strong style={{ color: "#374151" }}>Default Password:</strong>
                <div
                  style={{
                    fontSize: "20px",
                    color: "#dc2626",
                    fontWeight: "600",
                    marginTop: "4px",
                    fontFamily: "monospace",
                    backgroundColor: "#fee2e2",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    display: "inline-block",
                  }}
                >
                  {successModal.password}
                </div>
              </div>
            </div>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
              Please share these credentials with the user. They should change their password after first login.
            </p>
            <button
              onClick={() => setSuccessModal({ show: false, userName: "", userEmail: "", password: "" })}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
