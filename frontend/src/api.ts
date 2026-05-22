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

export type Role = "developer" | "superadmin" | "admin" | "analyst" | "manager" | "employee";

export const ROLE_LEVEL: Record<Role, number> = {
  developer: 100,
  superadmin: 80,
  admin: 60,
  analyst: 40,
  manager: 30,
  employee: 10,
};

export function hasAccess(role: Role | undefined, min: number): boolean {
  if (!role) return false;
  return ROLE_LEVEL[role] >= min;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: Role;
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

export interface Department {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  user_email: string | null;
  action: string;
  resource: string | null;
  detail: string | null;
  created_at: string | null;
}

export const ROLE_LABELS: Record<Role, string> = {
  developer: "Разработчик",
  superadmin: "Суперадмин",
  admin: "Администратор",
  analyst: "Аналитик",
  manager: "Менеджер",
  employee: "Сотрудник",
};

export const ROLE_COLORS: Record<Role, string> = {
  developer: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 ring-1 ring-fuchsia-300/50",
  superadmin: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-amber-300/50",
  admin: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-1 ring-red-300/50",
  analyst: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-1 ring-purple-300/50",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300/50",
  employee: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-slate-300/50",
};
