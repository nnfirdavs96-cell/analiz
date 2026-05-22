import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus,
  Pencil,
  Trash2,
  Key,
  X,
  Shield,
  Search,
  Mail,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { api, Department, ROLE_COLORS, ROLE_LABELS, Role, User, hasAccess, ROLE_LEVEL } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      api.get<User[]>("/users").then((r) => setUsers(r.data)),
      api.get<Department[]>("/departments").then((r) => setDepartments(r.data)),
    ]).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(id: number, email: string) {
    if (!confirm(`Удалить ${email}?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success("Пользователь удалён");
      load();
    } catch (err: unknown) {
      // @ts-expect-error axios
      toast.error(err?.response?.data?.detail || "Ошибка");
    }
  }

  const myLevel = me ? ROLE_LEVEL[me.role] : 0;
  const filtered = users.filter(
    (u) =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Пользователи</h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} пользователей</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-8 skeleton h-40" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((u, i) => {
            const initials = (u.full_name || u.email).slice(0, 2).toUpperCase();
            const canEdit = u.id === me?.id || ROLE_LEVEL[u.role] < myLevel;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card card-hover p-5"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {u.full_name || u.email.split("@")[0]}
                    </div>
                    <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {u.email}
                    </div>
                  </div>
                  {!u.is_active && (
                    <span className="badge bg-slate-200 text-slate-600">Откл.</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <span className={clsx("badge", ROLE_COLORS[u.role])}>{ROLE_LABELS[u.role]}</span>
                  {u.department && (
                    <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {u.department}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setEditing(u)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-slate-600 dark:text-slate-300"
                    >
                      <Pencil className="w-4 h-4" /> Редактировать
                    </button>
                    {u.id !== me?.id && (
                      <button
                        onClick={() => remove(u.id, u.email)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <UserModal
            departments={departments}
            myLevel={myLevel}
            onClose={() => setCreating(false)}
            onSuccess={() => {
              setCreating(false);
              load();
            }}
          />
        )}
        {editing && (
          <UserModal
            user={editing}
            departments={departments}
            myLevel={myLevel}
            onClose={() => setEditing(null)}
            onSuccess={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function UserModal({
  user,
  departments,
  myLevel,
  onClose,
  onSuccess,
}: {
  user?: User;
  departments: Department[];
  myLevel: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!user;
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [role, setRole] = useState<Role>(user?.role || "employee");
  const [department, setDepartment] = useState(user?.department || "");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        const payload: Record<string, unknown> = {
          full_name: fullName,
          role,
          department: department || null,
          is_active: isActive,
        };
        if (password) payload.password = password;
        await api.patch(`/users/${user.id}`, payload);
        toast.success("Сохранено");
      } else {
        await api.post("/users", {
          email,
          password,
          full_name: fullName,
          role,
          department: department || null,
        });
        toast.success("Пользователь создан");
      }
      onSuccess();
    } catch (err: unknown) {
      // @ts-expect-error axios
      setError(err?.response?.data?.detail || "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  const availableRoles: Role[] = (["developer", "superadmin", "admin", "analyst", "manager", "employee"] as Role[]).filter(
    (r) => ROLE_LEVEL[r] < myLevel
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {isEdit ? "Редактировать" : "Новый пользователь"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              ФИО
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Роль
              </label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Отдел
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input"
              >
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Key className="w-4 h-4" />
              {isEdit ? "Новый пароль (опционально)" : "Пароль"}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required={!isEdit}
            />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Аккаунт активен</span>
            </label>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Отмена
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
