import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Area,
  AreaChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Database as DatabaseIcon,
  Layers,
  Tag,
  Building2,
  TrendingUp,
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Activity,
} from "lucide-react";
import { api, Dataset } from "../api";
import { useTheme } from "../context/ThemeContext";

interface Summary {
  datasets_count: number;
  total_rows: number;
  by_source: Record<string, number>;
  by_department: Record<string, number>;
  recent: { id: number; name: string; row_count: number; source_type: string; created_at: string | null }[];
}

interface AggRow {
  label: string;
  value: number;
}

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
type ChartType = "bar" | "line" | "area" | "pie";

export default function Dashboard() {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<string>("");
  const [metric, setMetric] = useState<string>("");
  const [agg, setAgg] = useState<string>("sum");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [chartData, setChartData] = useState<AggRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Summary>("/dashboards/summary").then((r) => setSummary(r.data)),
      api.get<Dataset[]>("/datasets").then((r) => {
        setDatasets(r.data);
        if (r.data.length > 0) setSelectedId(r.data[0].id);
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const current = datasets.find((d) => d.id === selectedId);

  useEffect(() => {
    if (!current || !current.columns_meta) return;
    const text = current.columns_meta.find((c) => c.type === "text");
    const num = current.columns_meta.find((c) => c.type === "number");
    setGroupBy(text?.name || current.columns_meta[0]?.name || "");
    setMetric(num?.name || current.columns_meta[0]?.name || "");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || !groupBy || !metric) return;
    api
      .post<AggRow[]>("/dashboards/aggregate", {
        dataset_id: selectedId,
        group_by: groupBy,
        metric,
        agg,
      })
      .then((r) => setChartData(r.data));
  }, [selectedId, groupBy, metric, agg]);

  const sourceData = summary
    ? Object.entries(summary.by_source).map(([k, v]) => ({ name: k, value: v }))
    : [];
  const deptData = summary
    ? Object.entries(summary.by_department).map(([k, v]) => ({ name: k, value: v }))
    : [];

  const gridColor = theme === "dark" ? "#1e293b" : "#e2e8f0";
  const textColor = theme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Дашборд
          </h1>
          <p className="text-sm text-slate-500 mt-1">Обзор данных и ключевые метрики</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI
          icon={DatabaseIcon}
          label="Наборов данных"
          value={summary?.datasets_count ?? 0}
          gradient="from-blue-500 to-cyan-500"
          loading={loading}
          delay={0}
        />
        <KPI
          icon={Layers}
          label="Всего строк"
          value={summary?.total_rows ?? 0}
          gradient="from-purple-500 to-pink-500"
          loading={loading}
          delay={0.05}
        />
        <KPI
          icon={Tag}
          label="Источников"
          value={sourceData.length}
          gradient="from-emerald-500 to-teal-500"
          loading={loading}
          delay={0.1}
        />
        <KPI
          icon={Building2}
          label="Отделов"
          value={deptData.length}
          gradient="from-amber-500 to-orange-500"
          loading={loading}
          delay={0.15}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 mr-auto">
            <Activity className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Аналитика по набору
            </h2>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              { type: "bar", icon: BarChart3 },
              { type: "line", icon: LineIcon },
              { type: "area", icon: TrendingUp },
              { type: "pie", icon: PieIcon },
            ] as { type: ChartType; icon: typeof BarChart3 }[]).map(({ type, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  chartType === type
                    ? "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Select
            label="Набор"
            value={selectedId ? String(selectedId) : ""}
            onChange={(v) => setSelectedId(Number(v))}
            options={datasets.map((d) => ({ value: String(d.id), label: d.name }))}
          />
          {current?.columns_meta && (
            <>
              <Select
                label="Группа"
                value={groupBy}
                onChange={setGroupBy}
                options={current.columns_meta.map((c) => ({ value: c.name, label: c.name }))}
              />
              <Select
                label="Метрика"
                value={metric}
                onChange={setMetric}
                options={current.columns_meta.map((c) => ({ value: c.name, label: c.name }))}
              />
              <Select
                label="Агрегация"
                value={agg}
                onChange={setAgg}
                options={[
                  { value: "sum", label: "Сумма" },
                  { value: "avg", label: "Среднее" },
                  { value: "count", label: "Количество" },
                  { value: "median", label: "Медиана" },
                  { value: "min", label: "Минимум" },
                  { value: "max", label: "Максимум" },
                  { value: "stddev", label: "Ст. отклонение" },
                  { value: "distinct", label: "Уникальных" },
                ]}
              />
            </>
          )}
        </div>

        {chartData.length > 0 ? (
          <motion.div
            key={chartType}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ResponsiveContainer width="100%" height={360}>
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: theme === "dark" ? "#1e293b" : "#fff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: theme === "dark" ? "#1e293b" : "#fff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      borderRadius: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              ) : chartType === "area" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 12 }} />
                  <YAxis tick={{ fill: textColor, fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: theme === "dark" ? "#1e293b" : "#fff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      borderRadius: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                  />
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    outerRadius={130}
                    label={(e) => e.label}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: theme === "dark" ? "#1e293b" : "#fff",
                      border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <EmptyState text={datasets.length === 0 ? "Загрузите файл, чтобы увидеть графики" : "Нет данных"} />
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">По источникам</h2>
          </div>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50} label>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip
                  contentStyle={{
                    background: theme === "dark" ? "#1e293b" : "#fff",
                    border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                    borderRadius: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Нет данных" />
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">По отделам</h2>
          </div>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fill: textColor, fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: textColor, fontSize: 12 }} width={100} />
                <Tooltip
                  contentStyle={{
                    background: theme === "dark" ? "#1e293b" : "#fff",
                    border: theme === "dark" ? "1px solid #334155" : "1px solid #e2e8f0",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Нет данных" />
          )}
        </motion.div>
      </div>

      {summary?.recent && summary.recent.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            Недавно загруженные
          </h2>
          <div className="space-y-2">
            {summary.recent.map((d, i) => (
              <motion.a
                key={d.id}
                href={`/datasets/${d.id}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
              >
                <div>
                  <div className="font-medium text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {d.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {d.source_type} · {d.row_count} строк
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {d.created_at && new Date(d.created_at).toLocaleDateString("ru-RU")}
                </div>
              </motion.a>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function KPI({
  icon: Icon,
  label,
  value,
  gradient,
  loading,
  delay,
}: {
  icon: typeof DatabaseIcon;
  label: string;
  value: number;
  gradient: string;
  loading: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="card card-hover p-5 relative overflow-hidden"
    >
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl`} />
      <div className="relative">
        <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
          {loading ? (
            <div className="h-9 w-20 skeleton rounded" />
          ) : (
            value.toLocaleString("ru-RU")
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
        <BarChart3 className="w-8 h-8 text-slate-400" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
