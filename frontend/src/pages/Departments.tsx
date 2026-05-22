import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Plus, Pencil, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { api, Department } from "../api";

const PRESET_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

export default function Departments() {
  const [list, setList] = useState<Department[]>([]);
  const [editing, setEditing] = useState<Department | "new" | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .get<Department[]>("/departments")
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(id: number, name: string) {
    if (!confirm(`Удалить отдел "${name}"?`)) return;
    try {
      await api.delete(`/departments/${id}`);
      toast.success("Отдел удалён");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Отделы</h1>
          <p className="text-sm text-slate-500 mt-1">{list.length} отделов</p>
        </div>
        <button onClick={() => setEditing("new")} className="btn-primary">
          <Plus className="w-4 h-4" /> Создать
        </button>
      </div>

      {loading ? (
        <div className="card p-8 skeleton h-40" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card card-hover p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="p-3 rounded-xl shadow-md flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${d.color || "#3b82f6"}, ${d.color || "#3b82f6"}aa)`,
                  }}
                >
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                    {d.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    с {new Date(d.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
              </div>
              {d.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                  {d.description}
                </p>
              )}
              <div className="flex items-center gap-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setEditing(d)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-slate-600 dark:text-slate-300"
                >
                  <Pencil className="w-4 h-4" /> Изменить
                </button>
                <button
                  onClick={() => remove(d.id, d.name)}
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <DepartmentModal
            dep={editing === "new" ? undefined : editing}
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

function DepartmentModal({
  dep,
  onClose,
  onSuccess,
}: {
  dep?: Department;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(dep?.name || "");
  const [description, setDescription] = useState(dep?.description || "");
  const [color, setColor] = useState(dep?.color || PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, description: description || null, color };
      if (dep) {
        await api.patch(`/departments/${dep.id}`, payload);
        toast.success("Сохранено");
      } else {
        await api.post("/departments", payload);
        toast.success("Создан");
      }
      onSuccess();
    } catch (err: unknown) {
      // @ts-expect-error axios
      toast.error(err?.response?.data?.detail || "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {dep ? "Редактировать отдел" : "Новый отдел"}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Название
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Цвет
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-xl border-2 transition-all ${
                    color === c
                      ? "border-slate-900 dark:border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "..." : "Сохранить"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Отмена
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
