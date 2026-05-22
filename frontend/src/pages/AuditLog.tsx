import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, User as UserIcon, Activity, Search } from "lucide-react";
import { api, AuditEntry } from "../api";

const ACTION_COLORS: Record<string, string> = {
  login: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  create_user: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  update_user: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  delete_user: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  upload_dataset: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  delete_dataset: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  grant_access: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  create_department: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
};

const ACTION_LABELS: Record<string, string> = {
  login: "Вход",
  create_user: "Создан пользователь",
  update_user: "Обновлён пользователь",
  delete_user: "Удалён пользователь",
  upload_dataset: "Загружен набор",
  delete_dataset: "Удалён набор",
  grant_access: "Выдан доступ",
  revoke_access: "Отозван доступ",
  create_department: "Создан отдел",
  update_department: "Обновлён отдел",
  delete_department: "Удалён отдел",
  create_meeting: "Создана встреча",
  update_meeting: "Обновлена встреча",
  delete_meeting: "Удалена встреча",
  update_setting: "Изменена настройка",
  reset_setting: "Сброшена настройка",
};

export default function AuditLog() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    api
      .get<{ total: number; items: AuditEntry[] }>(
        `/audit?limit=${limit}&offset=${page * limit}`
      )
      .then((r) => {
        setItems(r.data.items);
        setTotal(r.data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = items.filter(
    (e) =>
      !filter ||
      e.action.toLowerCase().includes(filter.toLowerCase()) ||
      (e.user_email || "").toLowerCase().includes(filter.toLowerCase()) ||
      (e.resource || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md">
          <History className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Журнал действий</h1>
          <p className="text-sm text-slate-500 mt-1">{total} записей</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Фильтр по действию, email или ресурсу..."
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 skeleton h-40" />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 flex items-start gap-3 transition-colors"
              >
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  <Activity className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`badge ${
                        ACTION_COLORS[e.action] ||
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                    {e.resource && (
                      <span className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate">
                        {e.resource}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    {e.user_email && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {e.user_email}
                      </span>
                    )}
                    {e.detail && <span className="text-slate-400">· {e.detail}</span>}
                  </div>
                </div>
                <div className="text-xs text-slate-400 whitespace-nowrap">
                  {e.created_at && new Date(e.created_at).toLocaleString("ru-RU")}
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-500">Нет записей</div>
            )}
          </div>
        )}

        {total > limit && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn-secondary disabled:opacity-50"
            >
              Назад
            </button>
            <span className="text-sm text-slate-500">
              Страница {page + 1} / {Math.ceil(total / limit)}
            </span>
            <button
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
