import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      if (location.pathname !== "/login") location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: "admin" | "analyst" | "manager" | "employee";
  department: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Dataset {
  id: number;
  name: string;
  description: string | null;
  source_type: string;
  row_count: number;
  department: string | null;
  columns_meta: { name: string; type: string }[] | null;
  owner_id: number | null;
  created_at: string;
  updated_at: string;
}
