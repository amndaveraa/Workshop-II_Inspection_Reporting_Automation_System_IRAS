import { jwtDecode } from "jwt-decode";
import type { Employee } from "../models/Employee";

export const getUserFromToken = (): Employee | null => {
    let token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (token) {
        try {
            const decoded = jwtDecode<Employee & { exp: number }>(token);

            const currentTime = Date.now() / 1000;
            if (decoded.exp < currentTime) {
                console.warn("Token expired");
                localStorage.removeItem("token");
                sessionStorage.removeItem("token");
                return null;
            }

            return decoded;
        } catch (error) {
            console.error("Invalid token", error);
            localStorage.removeItem("token"); 
            sessionStorage.removeItem("token");
            return null;
        }
    }
    return null; 
};

export const updateTokenInCorrectStorage = (newToken: string) => {
  // 1. Check if it exists in Session Storage
  if (sessionStorage.getItem("token")) {
    sessionStorage.setItem("token", newToken);
    console.log("Updated token in SESSION storage");
  } 
  // 2. Otherwise, check if it exists in Local Storage
  else if (localStorage.getItem("token")) {
    localStorage.setItem("token", newToken);
    console.log("Updated token in LOCAL storage");
  } 
  // 3. Fallback: If for some reason it's missing, default to one (usually local)
  else {
    localStorage.setItem("token", newToken);
  }

  window.dispatchEvent(new Event("storage"));
};
