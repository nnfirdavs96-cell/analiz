import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Search } from "lucide-react";
import toast from "react-hot-toast";
import { api, Dataset } from "../api";

interface RowsResp {
  total: number;
  rows: Record<string, unknown>[];
}

interface ColStat {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  stddev: number;
}

const PAGE_SIZE = 50;

export default function DatasetDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [ds, setDs] = useState<Dataset | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Record<string, ColStat>>({});

  useEffect(() => {
    if (!id) return;
    api.get<Dataset>(`/datasets/${id}`).then((r) => setDs(r.data));
    api.get<Record<string, ColStat>>(`/dashboards/stats/${id}`).then((r) => setStats(r.data));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (search) params.set("search", search);
    api.get<RowsResp>(`/datasets/${id}/rows?${params}`).then((r) => {
      setRows(r.data.rows);
      setTotal(r.data.total);
    });
  }, [id, page, search]);

  async function exportFile(format: "csv" | "excel" | "json") {
    if (!ds) return;
    const tid = toast.loading("Подготовка...");
    try {
      const r = await api.get(`/datasets/${ds.id}/export?format=${format}`, {
        responseType: "blob",
      });
      const blob = new Blob([r.data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "excel" ? "xlsx" : format;
      a.download = `${ds.name}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Скачано", { id: tid });
    } catch {
      toast.error("Ошибка", { id: tid });
    }
  }

  if (!ds) return <div className="card p-8 skeleton h-40" />;

  const cols = rows[0] ? Object.keys(rows[0]) : ds.columns_meta?.map((c) => c.name) || [];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav("/datasets")}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{ds.name}</h1>
            <p className="text-sm text-slate-500">
              {ds.row_count.toLocaleString("ru-RU")} строк · {ds.source_type}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {(["csv", "excel", "json"] as const).map((f) => (
            <button
              key={f}
              onClick={() => exportFile(f)}
              className="btn-secondary"
            >
              <Download className="w-4 h-4" /> {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {ds.description && (
        <div className="card p-4 text-sm text-slate-600 dark:text-slate-300">
          {ds.description}
        </div>
      )}

      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(stats).map(([col, s], i) => (
            <motion.div
              key={col}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5"
            >
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate mb-3">
                {col}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <StatItem label="Сумма" value={s.sum} />
                <StatItem label="Среднее" value={s.avg} />
                <StatItem label="Медиана" value={s.median} />
                <StatItem label="Мин" value={s.min} />
                <StatItem label="Макс" value={s.max} />
                <StatItem label="σ" value={s.stddev} />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Поиск по строкам..."
              className="input pl-10"
            />
          </div>
          <div className="text-sm text-slate-500 whitespace-nowrap">
            Страница {page + 1} / {Math.max(totalPages, 1)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 sticky top-0">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c}
                    className="px-4 py-3 text-left font-medium whitespace-nowrap border-b border-slate-200 dark:border-slate-800"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {cols.map((c) => (
                    <td key={c} className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-200">
                      {String(r[c] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={cols.length || 1} className="text-center py-12 text-slate-500">
                    Нет строк
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="btn-secondary disabled:opacity-50"
            >
              Назад
            </button>
            <span className="text-sm text-slate-500">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} из {total}
            </span>
            <button
              disabled={page >= totalPages - 1}
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

function StatItem({ label, value }: { label: string; value: number }) {
  const formatted =
    Math.abs(value) >= 10000
      ? value.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
      : value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="font-mono font-semibold text-slate-900 dark:text-white">{formatted}</div>
    </div>
  );
}
