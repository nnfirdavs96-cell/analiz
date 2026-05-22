import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  Database,
  Users as UsersIcon,
  HardDrive,
  Terminal,
  Cpu,
  Save,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../api";

interface SystemInfo {
  python_version: string;
  platform: string;
  users_count: number;
  datasets_count: number;
  rows_count: number;
  audit_count: number;
  departments_count: number;
  upload_dir: string;
  upload_size_mb: number;
  upload_file_count: number;
}

interface Setting {
  key: string;
  value: unknown;
  default: unknown;
  overridden: boolean;
}

const SETTING_LABELS: Record<string, string> = {
  site_name: "Название сайта",
  site_subtitle: "Подзаголовок",
  primary_color: "Основной цвет",
  accent_color: "Акцентный цвет",
  logo_emoji: "Иконка-эмодзи",
  allow_registration: "Открытая регистрация",
  max_upload_mb: "Макс. размер файла (MB)",
  show_demo_data: "Показывать демо-данные",
};

export default function Developer() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      api.get<SystemInfo>("/settings/system").then((r) => setInfo(r.data)),
      api.get<Setting[]>("/settings").then((r) => {
        setSettings(r.data);
        setValues(Object.fromEntries(r.data.map((s) => [s.key, s.value])));
      }),
    ]).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function saveSetting(key: string) {
    try {
      await api.put(`/settings/${key}`, { value: values[key] });
      toast.success("Сохранено");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  async function resetSetting(key: string) {
    try {
      await api.delete(`/settings/${key}`);
      toast.success("Сброшено");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/30">
          <Code2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-fuchsia-600 to-purple-600 bg-clip-text text-transparent">
            Разработчик
          </h1>
          <p className="text-sm text-slate-500 mt-1">Контроль системы и настроек</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={UsersIcon}
          label="Пользователи"
          value={info?.users_count ?? 0}
          gradient="from-blue-500 to-cyan-500"
          loading={loading}
        />
        <StatCard
          icon={Database}
          label="Наборы данных"
          value={info?.datasets_count ?? 0}
          gradient="from-purple-500 to-pink-500"
          loading={loading}
        />
        <StatCard
          icon={Cpu}
          label="Строк всего"
          value={info?.rows_count ?? 0}
          gradient="from-emerald-500 to-teal-500"
          loading={loading}
        />
        <StatCard
          icon={Terminal}
          label="Лог-записей"
          value={info?.audit_count ?? 0}
          gradient="from-amber-500 to-orange-500"
          loading={loading}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Terminal className="w-5 h-5 text-slate-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Системная информация</h2>
        </div>
        {info && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm font-mono">
            <InfoRow label="Python" value={info.python_version} />
            <InfoRow label="Platform" value={info.platform} />
            <InfoRow label="Upload dir" value={info.upload_dir} />
            <InfoRow label="Upload size" value={`${info.upload_size_mb} MB`} />
            <InfoRow label="Files on disk" value={String(info.upload_file_count)} />
            <InfoRow label="Departments" value={String(info.departments_count)} />
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-brand-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Настройки приложения</h2>
          </div>
          <button onClick={load} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Обновить
          </button>
        </div>
        <div className="space-y-3">
          {settings.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  {SETTING_LABELS[s.key] || s.key}
                  {s.overridden && (
                    <span className="ml-2 badge bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      изменено
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono">{s.key}</div>
              </div>
              <div className="flex items-center gap-2">
                {typeof s.default === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(values[s.key])}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [s.key]: e.target.checked }))
                    }
                    className="w-5 h-5"
                  />
                ) : typeof s.default === "number" ? (
                  <input
                    type="number"
                    value={String(values[s.key] ?? "")}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [s.key]: Number(e.target.value) }))
                    }
                    className="input w-32"
                  />
                ) : s.key.includes("color") ? (
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={String(values[s.key] || s.default)}
                      onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={String(values[s.key] ?? "")}
                      onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                      className="input w-28 font-mono"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    value={String(values[s.key] ?? "")}
                    onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                    className="input w-48"
                  />
                )}
                <button onClick={() => saveSetting(s.key)} className="btn-primary p-2">
                  <Save className="w-4 h-4" />
                </button>
                {s.overridden && (
                  <button
                    onClick={() => resetSetting(s.key)}
                    className="btn-secondary p-2"
                    title="Сбросить"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  gradient,
  loading,
}: {
  icon: typeof Database;
  label: string;
  value: number;
  gradient: string;
  loading: boolean;
}) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl`} />
      <div className="relative">
        <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-3`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
          {loading ? <div className="h-9 w-20 skeleton rounded" /> : value.toLocaleString("ru-RU")}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="text-slate-900 dark:text-white text-xs truncate ml-2">{value}</span>
    </div>
  );
}
