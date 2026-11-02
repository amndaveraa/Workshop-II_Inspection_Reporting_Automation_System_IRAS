const API = import.meta.env.VITE_API_URL;

interface LoginResponse {
  token: string;
}

export const loginUser = async (
  email: string,
  password: string,
  rememberMe?: boolean   
): Promise<LoginResponse> => {
  try {
    console.log("api path", `${API}/auth`);

    const response = await fetch(`${API}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const data = await response.json();
    console.log("Token from backend:", data.token);
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }
    
    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};