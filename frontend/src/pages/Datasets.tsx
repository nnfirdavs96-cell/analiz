import { useEffect, useState } from "react";
import { api, Dataset } from "../api";
import { useAuth } from "../context/AuthContext";

export default function Datasets() {
  const [list, setList] = useState<Dataset[]>([]);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const { user } = useAuth();

  function load() {
    api.get<Dataset[]>("/datasets").then((r) => setList(r.data));
  }
  useEffect(load, []);

  async function preview(id: number) {
    setPreviewId(id);
    const r = await api.get<Record<string, unknown>[]>(`/datasets/${id}/rows?limit=50`);
    setRows(r.data);
  }

  async function remove(id: number) {
    if (!confirm("Удалить набор данных?")) return;
    await api.delete(`/datasets/${id}`);
    if (previewId === id) {
      setPreviewId(null);
      setRows([]);
    }
    load();
  }

  const canDelete = user?.role === "admin" || user?.role === "analyst";
  const currentCols = previewId && rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Наборы данных</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Название</th>
              <th className="px-4 py-2">Источник</th>
              <th className="px-4 py-2">Строк</th>
              <th className="px-4 py-2">Отдел</th>
              <th className="px-4 py-2">Создан</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-500">{d.id}</td>
                <td className="px-4 py-2 font-medium">{d.name}</td>
                <td className="px-4 py-2">{d.source_type}</td>
                <td className="px-4 py-2">{d.row_count}</td>
                <td className="px-4 py-2">{d.department || "—"}</td>
                <td className="px-4 py-2 text-slate-500">{new Date(d.created_at).toLocaleString("ru-RU")}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button onClick={() => preview(d.id)} className="text-brand-600 hover:underline">
                    Просмотр
                  </button>
                  {canDelete && (
                    <button onClick={() => remove(d.id)} className="text-red-600 hover:underline">
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Нет загруженных данных
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {previewId && rows.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="px-4 py-2 border-b font-medium">Превью первых строк</div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 text-left">
              <tr>
                {currentCols.map((c) => (
                  <th key={c} className="px-3 py-2">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {currentCols.map((c) => (
                    <td key={c} className="px-3 py-1.5">{String(r[c] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
