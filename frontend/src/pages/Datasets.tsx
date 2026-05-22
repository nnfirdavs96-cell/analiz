import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Download,
  Trash2,
  Eye,
  Database,
  FileSpreadsheet,
  FileJson,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, Dataset, hasAccess } from "../api";
import { useAuth } from "../context/AuthContext";

const SOURCE_ICONS: Record<string, typeof FileSpreadsheet> = {
  excel: FileSpreadsheet,
  csv: FileText,
  tsv: FileText,
  json: FileJson,
  parquet: Database,
};

const SOURCE_COLORS: Record<string, string> = {
  excel: "from-emerald-500 to-green-500",
  csv: "from-blue-500 to-cyan-500",
  tsv: "from-sky-500 to-cyan-500",
  json: "from-amber-500 to-orange-500",
  parquet: "from-purple-500 to-pink-500",
};

export default function Datasets() {
  const [list, setList] = useState<Dataset[]>([]);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterSource) params.set("source_type", filterSource);
    api
      .get<Dataset[]>(`/datasets?${params}`)
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, filterSource]);

  async function remove(id: number, name: string) {
    if (!confirm(`Удалить набор "${name}"?`)) return;
    try {
      await api.delete(`/datasets/${id}`);
      toast.success("Набор удалён");
      load();
    } catch {
      toast.error("Не удалось удалить");
    }
  }

  async function exportDataset(id: number, format: "csv" | "excel" | "json", name: string) {
    const tid = toast.loading("Подготовка файла...");
    try {
      const r = await api.get(`/datasets/${id}/export?format=${format}`, {
        responseType: "blob",
      });
      const blob = new Blob([r.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "excel" ? "xlsx" : format;
      a.download = `${name}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Файл скачан", { id: tid });
    } catch {
      toast.error("Ошибка экспорта", { id: tid });
    }
  }

  const canDelete = hasAccess(user?.role, 40);
  const sources = Array.from(new Set(list.map((d) => d.source_type)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Наборы данных</h1>
          <p className="text-sm text-slate-500 mt-1">{list.length} набор(ов)</p>
        </div>
        {hasAccess(user?.role, 30) && (
          <Link to="/upload" className="btn-primary">
            Загрузить
          </Link>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или описанию..."
              className="input pl-10"
            />
          </div>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="input md:w-48"
          >
            <option value="">Все источники</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 h-40 skeleton" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
            <Database className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Нет наборов данных</p>
          <p className="text-sm text-slate-500 mt-1">Загрузите первый файл</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((d, i) => {
            const Icon = SOURCE_ICONS[d.source_type] || Database;
            const color = SOURCE_COLORS[d.source_type] || "from-slate-500 to-slate-600";
            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -4 }}
                className="card card-hover p-5 group relative overflow-hidden"
              >
                <div
                  className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl`}
                />
                <div className="flex items-start gap-3 mb-3 relative">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${color} shadow-md flex-shrink-0`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/datasets/${d.id}`}
                      className="font-semibold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 transition-colors line-clamp-1 block"
                    >
                      {d.name}
                    </Link>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {d.row_count.toLocaleString("ru-RU")} строк · {d.source_type}
                    </div>
                  </div>
                </div>
                {d.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                    {d.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {d.department && (
                    <span className="badge bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {d.department}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(d.created_at).toLocaleDateString("ru-RU")}
                  </span>
                </div>
                <div className="flex items-center gap-1 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/datasets/${d.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm text-slate-600 dark:text-slate-300"
                  >
                    <Eye className="w-4 h-4" /> Открыть
                  </Link>
                  <div className="relative group/menu">
                    <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500">
                      <Download className="w-4 h-4" />
                    </button>
                    <div className="absolute right-0 bottom-full mb-1 hidden group-hover/menu:block z-10">
                      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-1 min-w-[140px]">
                        {(["csv", "excel", "json"] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => exportDataset(d.id, f, d.name)}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            {f.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => remove(d.id, d.name)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
