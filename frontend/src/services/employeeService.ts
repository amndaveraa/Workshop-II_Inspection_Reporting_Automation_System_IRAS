const API = import.meta.env.VITE_API_URL;

export const updateProfileApi = async (data: { employeeid: string, name: string, phoneNum: string }) => {
    const response = await fetch(`${API}/employee/update-profile`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || "Failed to update profile");
    }

    return result;
};

export const changePasswordApi = async (payload: { employeeid: string, currentPassword: string, newPassword: string }) => {
  const response = await fetch(`${API}/employee/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to change password");

  return data;
};

export const updateAvatarApi = async (employeeid: string, file: File) => {
  const formData = new FormData();
  formData.append("employeeid", employeeid);
  formData.append("avatar", file); // Must match the 'avatar' key in your backend route

  const response = await fetch(`${API}/employee/update-avatar`, {
    method: "POST",
    body: formData,
    // Note: No headers! Let the browser handle the multipart boundary.
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to upload avatar");
  return data;
};