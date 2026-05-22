import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { hasAccess } from "./api";
import Dashboard from "./pages/Dashboard";
import Datasets from "./pages/Datasets";
import Login from "./pages/Login";
import Upload from "./pages/Upload";
import Users from "./pages/Users";
import Departments from "./pages/Departments";
import AuditLog from "./pages/AuditLog";
import DatasetDetail from "./pages/DatasetDetail";
import Meetings from "./pages/Meetings";
import Developer from "./pages/Developer";

export default function App() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
          <p className="text-slate-500 text-sm">Загрузка…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === "dark" ? "#1e293b" : "#fff",
            color: theme === "dark" ? "#f1f5f9" : "#0f172a",
            border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
            borderRadius: "12px",
            fontSize: "14px",
            padding: "10px 14px",
          },
        }}
      />
      {!user ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/datasets" element={<Datasets />} />
              <Route path="/datasets/:id" element={<DatasetDetail />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/meetings" element={<Meetings />} />
              {hasAccess(user.role, 60) && <Route path="/users" element={<Users />} />}
              {hasAccess(user.role, 60) && <Route path="/departments" element={<Departments />} />}
              {hasAccess(user.role, 60) && <Route path="/audit" element={<AuditLog />} />}
              {hasAccess(user.role, 80) && <Route path="/developer" element={<Developer />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AnimatePresence>
      )}
    </>
  );
}
