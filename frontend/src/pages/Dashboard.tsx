import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, Dataset } from "../api";

interface Summary {
  datasets_count: number;
  total_rows: number;
  by_source: Record<string, number>;
  by_department: Record<string, number>;
}

interface AggRow {
  label: string;
  value: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<string>("");
  const [metric, setMetric] = useState<string>("");
  const [agg, setAgg] = useState<string>("sum");
  const [chartData, setChartData] = useState<AggRow[]>([]);

  useEffect(() => {
    api.get<Summary>("/dashboards/summary").then((r) => setSummary(r.data));
    api.get<Dataset[]>("/datasets").then((r) => {
      setDatasets(r.data);
      if (r.data.length > 0) setSelectedId(r.data[0].id);
    });
  }, []);

  const current = datasets.find((d) => d.id === selectedId);

  useEffect(() => {
    if (!current || !current.columns_meta) return;
    const text = current.columns_meta.find((c) => c.type === "text");
    const num = current.columns_meta.find((c) => c.type === "number");
    setGroupBy(text?.name || current.columns_meta[0]?.name || "");
    setMetric(num?.name || current.columns_meta[0]?.name || "");
  }, [selectedId]);

  async function runAggregate() {
    if (!selectedId || !groupBy || !metric) return;
    const r = await api.post<AggRow[]>("/dashboards/aggregate", {
      dataset_id: selectedId,
      group_by: groupBy,
      metric,
      agg,
    });
    setChartData(r.data);
  }

  useEffect(() => {
    if (selectedId && groupBy && metric) runAggregate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, groupBy, metric, agg]);

  const sourceData = summary
    ? Object.entries(summary.by_source).map(([k, v]) => ({ name: k, value: v }))
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPI label="Наборов данных" value={summary?.datasets_count ?? 0} />
        <KPI label="Всего строк" value={summary?.total_rows ?? 0} />
        <KPI label="Источников" value={sourceData.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <h2 className="text-lg font-semibold mr-auto">Аналитика по набору</h2>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {current?.columns_meta && (
              <>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {current.columns_meta.map((c) => (
                    <option key={c.name} value={c.name}>
                      Группа: {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {current.columns_meta.map((c) => (
                    <option key={c.name} value={c.name}>
                      Метрика: {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={agg}
                  onChange={(e) => setAgg(e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="sum">сумма</option>
                  <option value="avg">среднее</option>
                  <option value="count">количество</option>
                  <option value="min">мин</option>
                  <option value="max">макс</option>
                </select>
              </>
            )}
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 py-12 text-center">
              {datasets.length === 0 ? "Нет загруженных наборов" : "Нет данных для отображения"}
            </p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">По источникам</h2>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 py-12 text-center">Нет данных</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-bold text-slate-900 mt-1">{value.toLocaleString("ru-RU")}</div>
    </div>
  );
}
