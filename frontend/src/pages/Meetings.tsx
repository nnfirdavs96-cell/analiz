import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Users as UsersIcon,
  Plus,
  X,
  Check,
  Ban,
} from "lucide-react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { api, hasAccess } from "../api";
import { useAuth } from "../context/AuthContext";

interface Participant {
  id: number;
  user_id: number;
  response: string;
}

interface Meeting {
  id: number;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  organizer_id: number | null;
  department: string | null;
  status: string;
  created_at: string;
  participants: Participant[];
}

interface User {
  id: number;
  email: string;
  full_name: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ongoing: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  completed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Запланировано",
  ongoing: "Идёт",
  completed: "Завершено",
  cancelled: "Отменено",
};

export default function Meetings() {
  const { user } = useAuth();
  const [list, setList] = useState<Meeting[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .get<Meeting[]>("/meetings")
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
    if (hasAccess(user?.role, 60)) {
      api.get<User[]>("/users").then((r) => setUsers(r.data)).catch(() => {});
    }
  }
  useEffect(load, []);

  async function respond(id: number, response: "accepted" | "declined") {
    try {
      await api.post(`/meetings/${id}/respond?response=${response}`);
      toast.success(response === "accepted" ? "Принято" : "Отклонено");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  async function remove(id: number, title: string) {
    if (!confirm(`Удалить встречу "${title}"?`)) return;
    try {
      await api.delete(`/meetings/${id}`);
      toast.success("Удалено");
      load();
    } catch {
      toast.error("Ошибка");
    }
  }

  const canCreate = hasAccess(user?.role, 30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-md">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Встречи</h1>
            <p className="text-sm text-slate-500 mt-1">{list.length} встреч</p>
          </div>
        </div>
        {canCreate && (
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Создать
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-8 skeleton h-40" />
      ) : list.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Нет встреч</p>
          {canCreate && (
            <button onClick={() => setCreating(true)} className="btn-primary mt-4">
              Создать первую
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((m, i) => {
            const myResp = m.participants.find((p) => p.user_id === user?.id);
            const isOrganizer = m.organizer_id === user?.id;
            const startDate = new Date(m.starts_at);
            const isPast = startDate < new Date();
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={clsx(
                  "card card-hover p-5",
                  isPast && "opacity-70"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{m.title}</h3>
                    {m.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                        {m.description}
                      </p>
                    )}
                  </div>
                  <span className={`badge ${STATUS_COLORS[m.status]}`}>{STATUS_LABELS[m.status]}</span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {startDate.toLocaleString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {m.location && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {m.location}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <UsersIcon className="w-4 h-4 text-slate-400" />
                    {m.participants.length} участник(ов)
                  </div>
                  {m.department && (
                    <span className="inline-block badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {m.department}
                    </span>
                  )}
                </div>

                {myResp && (
                  <div className="flex gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => respond(m.id, "accepted")}
                      className={clsx(
                        "flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-colors text-sm",
                        myResp.response === "accepted"
                          ? "bg-emerald-500 text-white"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <Check className="w-4 h-4" /> Принять
                    </button>
                    <button
                      onClick={() => respond(m.id, "declined")}
                      className={clsx(
                        "flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-colors text-sm",
                        myResp.response === "declined"
                          ? "bg-red-500 text-white"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <Ban className="w-4 h-4" /> Отклонить
                    </button>
                  </div>
                )}

                {isOrganizer && (
                  <button
                    onClick={() => remove(m.id, m.title)}
                    className="mt-3 text-xs text-red-500 hover:underline"
                  >
                    Удалить встречу
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <MeetingModal
            users={users}
            onClose={() => setCreating(false)}
            onSuccess={() => {
              setCreating(false);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MeetingModal({
  users,
  onClose,
  onSuccess,
}: {
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [location, setLocation] = useState("");
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/meetings", {
        title,
        description: description || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        location: location || null,
        participant_ids: participantIds,
      });
      toast.success("Встреча создана");
      onSuccess();
    } catch (err: unknown) {
      // @ts-expect-error axios
      toast.error(err?.response?.data?.detail || "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  function toggleParticipant(id: number) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
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
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Новая встреча</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Название
            </label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input" />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Начало
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Окончание
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Место
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Переговорная №1 / Zoom..."
              className="input"
            />
          </div>
          {users.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Участники ({participantIds.length})
              </label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={participantIds.includes(u.id)}
                      onChange={() => toggleParticipant(u.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {u.full_name || u.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "..." : "Создать"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Отмена
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
