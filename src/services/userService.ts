import supabase from "../config/supabaseClient";
import bcrypt from "bcrypt";

export type UserRole = "Inspector" | "Supervisor" | "Administrator";
export type UserStatus = "Active" | "Inactive";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  lastLogin?: string | null;
  phoneNum?: string;
}

interface UserInput {
  name: string;
  email: string;
  role: string;
  status: string;
  department?: string;
  password?: string;
  phoneNum?: string;
}

const err = (status: number, message: string) => ({ status, message });

const normalizeRole = (role: string): UserRole => {
  const r = String(role ?? "").trim().toLowerCase();
  if (r === "inspector") return "Inspector";
  if (r === "supervisor") return "Supervisor";
  if (r === "administrator" || r === "admin") return "Administrator";
  return "Inspector";
};

const pickLastLogin = (row: any) => row.lastLogin ?? row.lastlogin ?? row.last_login ?? null;
const pickCreatedAt = (row: any) => row.createdAt ?? row.createdat ?? row.created_at ?? row.created ?? null;

const toManagedUser = (row: any): ManagedUser => ({
  id: String(row.employeeid),
  name: row.name ?? "",
  email: row.email ?? "",
  role: normalizeRole(row.role),
  status: row.isActive ? "Active" : "Inactive",
  department: row.department ?? "Operations",
  lastLogin: pickLastLogin(row),
  phoneNum: row.phoneNum ?? undefined,
});

// GET users 
export const getAllUsers = async (
  status?: string
): Promise<{ data?: ManagedUser[]; error?: any }> => {
  let q = supabase.from("employee").select("employeeid, name, email, role, department, isActive, lastLogin, phoneNum, createdAt");

  if (status === "active") q = q.eq("isActive", true);
  if (status === "inactive") q = q.eq("isActive", false);

  const { data, error } = await q;
  if (error) return { error };

  const sorted = (data ?? []).sort((a: any, b: any) => {
    const da = new Date(pickCreatedAt(a) ?? 0).getTime();
    const db = new Date(pickCreatedAt(b) ?? 0).getTime();
    return db - da;
  });

  return { data: sorted.map(toManagedUser) };
};


export const createNewUser = async (
  userInput: UserInput
): Promise<{ data?: ManagedUser; error?: any }> => {
  try {
    console.log("📥 createNewUser received input:", userInput);
    
    const name = String(userInput?.name ?? "").trim();
    const email = String(userInput?.email ?? "").toLowerCase().trim();
    const role = normalizeRole(String(userInput?.role ?? "Inspector"));
    const status = String(userInput?.status ?? "Active");
    const department = String(userInput?.department ?? "Operations").trim();
    const phoneNum = userInput?.phoneNum ? String(userInput.phoneNum).trim() : undefined;

    console.log("📞 Extracted phoneNum:", phoneNum);

    if (!name || !email) return { error: err(400, "Name and email are required") };

    const { data: existingUser, error: checkError } = await supabase
      .from("employee")
      .select("employeeid")
      .eq("email", email)
      .maybeSingle();

    if (checkError) return { error: checkError };
    if (existingUser) return { error: err(409, "Email already exists") };

    const defaultPassword = "Demo#123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const now = new Date().toISOString();

    const newUser: any = {
      name,
      email,
      role: role.toLowerCase(),
      department,
      isActive: status === "Active",
      hashedPassword,
      createdAt: now,
      updatedAt: now,
    };

    if (phoneNum) newUser.phoneNum = phoneNum;

    console.log("🔨 Final newUser object to insert:", newUser);

    const { data, error } = await supabase
      .from("employee")
      .insert([newUser])
      .select("employeeid, name, email, role, department, isActive, lastLogin, phoneNum")
      .single();

    console.log("✅ Insert result - data:", data, "error:", error);

    if (error) return { error };
    if (!data) return { error: err(500, "User created but no data returned") };

    return { data: toManagedUser(data) };
  } catch (error) {
    return { error };
  }
};


export const updateExistingUser = async (
  id: string,
  userInput: Partial<UserInput>
): Promise<{ data?: ManagedUser; error?: any }> => {
  try {
    const { data: existingUser, error: checkError } = await supabase
      .from("employee")
      .select("employeeid, role, isActive")
      .eq("employeeid", id)
      .maybeSingle();

    if (checkError) return { error: checkError };
    if (!existingUser) return { error: err(404, "User not found") };

    
    if (userInput.email !== undefined) {
      const nextEmail = String(userInput.email).toLowerCase().trim();

      const { data: duplicateUser, error: dupErr } = await supabase
        .from("employee")
        .select("employeeid")
        .eq("email", nextEmail)
        .neq("employeeid", id)
        .maybeSingle();

      if (dupErr) return { error: dupErr };
      if (duplicateUser) return { error: err(409, "Email already exists") };
    }

    const updateData: any = { updatedAt: new Date().toISOString() };

    if (userInput.name !== undefined) updateData.name = String(userInput.name).trim();
    if (userInput.email !== undefined) updateData.email = String(userInput.email).toLowerCase().trim();
    if (userInput.role !== undefined) updateData.role = normalizeRole(String(userInput.role)).toLowerCase();
    if (userInput.department !== undefined) updateData.department = String(userInput.department).trim();
    if (userInput.phoneNum !== undefined) updateData.phoneNum = userInput.phoneNum ? String(userInput.phoneNum).trim() : null;

    
    if (userInput.status !== undefined) {
      const nextIsActive = String(userInput.status) === "Active";
      const currentRole = normalizeRole(existingUser.role);

      // prevent deactivating last active admin
      if (currentRole === "Administrator" && existingUser.isActive === true && nextIsActive === false) {
        const { count, error: countErr } = await supabase
          .from("employee")
          .select("employeeid", { count: "exact", head: true })
          .eq("role", "administrator")
          .eq("isActive", true);

        if (countErr) return { error: countErr };
        if ((count ?? 0) <= 1) {
          return { error: err(409, "You cannot deactivate the last active Administrator.") };
        }
      }

      updateData.isActive = nextIsActive;
    }

    const { data, error } = await supabase
      .from("employee")
      .update(updateData)
      .eq("employeeid", id)
      .select("employeeid, name, email, role, department, isActive, lastLogin, phoneNum")
      .single();

    if (error) return { error };
    if (!data) return { error: err(500, "Update succeeded but no data returned") };

    return { data: toManagedUser(data) };
  } catch (error) {
    return { error };
  }
};

//  SOFT DELETE / RESTORE
export const setUserActive = async (
  id: string,
  isActive: boolean
): Promise<{ error?: any }> => {
  try {
    const { data: userRow, error: checkError } = await supabase
      .from("employee")
      .select("employeeid, role, isActive")
      .eq("employeeid", id)
      .maybeSingle();

    if (checkError) return { error: checkError };
    if (!userRow) return { error: err(404, "User not found") };

    const role = normalizeRole(userRow.role);

    // prevent deactivating last active admin
    if (role === "Administrator" && userRow.isActive === true && isActive === false) {
      const { count, error: countErr } = await supabase
        .from("employee")
        .select("employeeid", { count: "exact", head: true })
        .eq("role", "administrator")
        .eq("isActive", true);

      if (countErr) return { error: countErr };
      if ((count ?? 0) <= 1) {
        return { error: err(409, "You cannot deactivate the last active Administrator.") };
      }
    }

    const { error } = await supabase
      .from("employee")
      .update({ isActive, updatedAt: new Date().toISOString() })
      .eq("employeeid", id);

    if (error) return { error };
    return {};
  } catch (error) {
    return { error };
  }
};

//  PERMANENT DELETE
export const deleteExistingUser = async (id: string): Promise<{ error?: any }> => {
  try {
    const { data: userRow, error: checkError } = await supabase
      .from("employee")
      .select("employeeid, role")
      .eq("employeeid", id)
      .maybeSingle();

    if (checkError) return { error: checkError };
    if (!userRow) return { error: err(404, "User not found") };

    const role = normalizeRole(userRow.role);

    if (role === "Administrator") {
      const { count, error: countErr } = await supabase
        .from("employee")
        .select("employeeid", { count: "exact", head: true })
        .eq("role", "administrator");

      if (countErr) return { error: countErr };
      if ((count ?? 0) <= 1) {
        return { error: err(409, "You cannot delete the last Administrator.") };
      }
    }

    const { error } = await supabase.from("employee").delete().eq("employeeid", id);
    if (error) return { error };

    return {};
  } catch (error) {
    return { error };
  }
};

// Admin change user password
export const changeUserPasswordByAdmin = async (
  id: string,
  newPassword: string
): Promise<{ error?: any }> => {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { error: err(400, "Password must be at least 8 characters") };
    }

    const strongRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!strongRegex.test(newPassword)) {
      return { error: err(400, "Password must contain at least 1 uppercase letter and 1 number") };
    }

    const { data: userRow, error: checkError } = await supabase
      .from("employee")
      .select("employeeid")
      .eq("employeeid", id)
      .maybeSingle();

    if (checkError) return { error: checkError };
    if (!userRow) return { error: err(404, "User not found") };

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from("employee")
      .update({ hashedPassword, updatedAt: new Date().toISOString() })
      .eq("employeeid", id);

    if (error) return { error };
    return {};
  } catch (error) {
    return { error };
  }
};
