import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Database,
  Upload as UploadIcon,
  Users as UsersIcon,
  Building2,
  History,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  ChevronLeft,
  Sparkles,
  Calendar,
  Code2,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ROLE_COLORS, ROLE_LABELS, hasAccess } from "../api";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  minLevel?: number;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Дашборд", icon: LayoutDashboard, end: true },
  { to: "/datasets", label: "Данные", icon: Database },
  { to: "/upload", label: "Загрузка", icon: UploadIcon, minLevel: 30 },
  { to: "/meetings", label: "Встречи", icon: Calendar },
  { to: "/users", label: "Пользователи", icon: UsersIcon, minLevel: 60 },
  { to: "/departments", label: "Отделы", icon: Building2, minLevel: 60 },
  { to: "/audit", label: "Журнал", icon: History, minLevel: 60 },
  { to: "/developer", label: "Разработчик", icon: Code2, minLevel: 80 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter((it) => !it.minLevel || hasAccess(user?.role, it.minLevel));

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 80 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={clsx(
          "fixed lg:relative z-50 h-screen flex-shrink-0 flex flex-col",
          "bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800",
          "transition-transform duration-300 shadow-xl lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden"
                >
                  <div className="font-bold text-lg text-slate-900 dark:text-white whitespace-nowrap">
                    Analiz
                  </div>
                  <div className="text-xs text-slate-500 whitespace-nowrap">BI Platform</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.map((item, i) => (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <NavLink
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={clsx(
                        "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-500 dark:text-slate-400"
                      )}
                    />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: "auto" }}
                          exit={{ opacity: 0, width: 0 }}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.label}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === "dark" ? 360 : 0 }}
              transition={{ duration: 0.5 }}
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </motion.div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <motion.div animate={{ rotate: collapsed ? 180 : 0 }}>
              <ChevronLeft className="w-5 h-5" />
            </motion.div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  Свернуть
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2">
                <span className={clsx("badge", ROLE_COLORS[user.role])}>
                  {ROLE_LABELS[user.role]}
                </span>
                {user.department && (
                  <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {user.department}
                  </span>
                )}
              </div>
            )}
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;
  const initials = (user.full_name || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-slate-900 dark:text-white leading-tight">
            {user.full_name || user.email.split("@")[0]}
          </div>
          <div className="text-xs text-slate-500 leading-tight">{user.email}</div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden"
            >
              <div className="p-4 bg-gradient-to-br from-brand-50 to-purple-50 dark:from-brand-950 dark:to-purple-950 border-b border-slate-200 dark:border-slate-800">
                <div className="font-medium text-slate-900 dark:text-white">
                  {user.full_name || "Пользователь"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{user.email}</div>
                <div className="mt-2 flex items-center gap-1">
                  <span className={clsx("badge", ROLE_COLORS[user.role])}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Выход
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
