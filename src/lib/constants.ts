export const API_BASE_URL = import.meta.env.MODE === "development"
  ? "http://localhost:10000"
  : "https://landingmaj.onrender.com";

export const getApiUrl = (path: string) => {
  return `${API_BASE_URL}${path}`;
}; 