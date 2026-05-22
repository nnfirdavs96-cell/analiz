import { FormEvent, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload as UploadIcon, FileSpreadsheet, X, FileJson, FileText, Database } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";

const ACCEPT = ".xlsx,.xls,.csv,.tsv,.txt,.json,.jsonl,.ndjson,.parquet";

const FORMAT_ICONS: Record<string, typeof FileSpreadsheet> = {
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  csv: FileText,
  tsv: FileText,
  txt: FileText,
  json: FileJson,
  jsonl: FileJson,
  ndjson: FileJson,
  parquet: Database,
};

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const nav = useNavigate();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  }, [name]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setLoading(true);
    const tid = toast.loading("Загрузка файла...");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name || file.name);
      if (description) form.append("description", description);
      if (department) form.append("department", department);
      await api.post("/datasets/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Файл загружен", { id: tid });
      nav("/datasets");
    } catch (err: unknown) {
      const msg =
        // @ts-expect-error axios shape
        err?.response?.data?.detail || (err instanceof Error ? err.message : "Ошибка загрузки");
      setError(String(msg));
      toast.error("Не удалось загрузить", { id: tid });
    } finally {
      setLoading(false);
    }
  }

  const ext = file?.name.split(".").pop()?.toLowerCase() || "";
  const FileIcon = FORMAT_ICONS[ext] || FileSpreadsheet;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Загрузка данных</h1>
        <p className="text-sm text-slate-500 mt-1">
          Excel, CSV, TSV, JSON, JSONL, Parquet
        </p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        <motion.label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          animate={{
            scale: dragOver ? 1.02 : 1,
            borderColor: dragOver ? "#3b82f6" : "rgba(148, 163, 184, 0.5)",
          }}
          className={`block relative cursor-pointer rounded-2xl border-2 border-dashed transition-all p-8 ${
            dragOver
              ? "bg-brand-50 dark:bg-brand-950/30 border-brand-500"
              : "bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900"
          }`}
        >
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => handleFiles(e.target.files)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {file ? (
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg">
                <FileIcon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white truncate">
                  {file.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB · {ext.toUpperCase()}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setFile(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <motion.div
                animate={{ y: dragOver ? -4 : 0 }}
                className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg mb-4"
              >
                <UploadIcon className="w-8 h-8 text-white" />
              </motion.div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Перетащите файл сюда или нажмите для выбора
              </p>
              <p className="text-xs text-slate-500 mt-1">
                .xlsx · .csv · .tsv · .json · .jsonl · .parquet
              </p>
            </div>
          )}
        </motion.label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Название
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Продажи Q1 2026"
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Отдел
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Продажи, Финансы…"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Описание
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Краткое описание набора..."
            className="input"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={loading || !file} className="btn-primary flex-1">
            {loading ? "Загрузка..." : "Загрузить"}
          </button>
          <button
            type="button"
            onClick={() => nav("/datasets")}
            className="btn-secondary"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}
