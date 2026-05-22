import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive ? "bg-brand-600 text-white" : "text-slate-300 hover:bg-slate-700 hover:text-white"
    }`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-xl font-bold">Analiz</span>
            <nav className="flex gap-1">
              <NavLink to="/" className={link} end>
                Дашборд
              </NavLink>
              <NavLink to="/datasets" className={link}>
                Данные
              </NavLink>
              <NavLink to="/upload" className={link}>
                Загрузка
              </NavLink>
              {user?.role === "admin" && (
                <NavLink to="/users" className={link}>
                  Пользователи
                </NavLink>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-300">
              {user?.email} <span className="text-xs text-slate-500">({user?.role})</span>
            </span>
            <button onClick={logout} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600">
              Выход
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
