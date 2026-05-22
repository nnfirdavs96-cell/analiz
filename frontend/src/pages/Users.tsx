import { FormEvent, useEffect, useState } from "react";
import { api, User } from "../api";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<User["role"]>("employee");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<User[]>("/users").then((r) => setUsers(r.data));
  }
  useEffect(load, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/users", { email, password, full_name: fullName, role, department: department || null });
      setEmail("");
      setPassword("");
      setFullName("");
      setDepartment("");
      load();
    } catch (err: unknown) {
      // @ts-expect-error axios error shape
      setError(err?.response?.data?.detail || "Error");
    }
  }

  async function remove(id: number) {
    if (!confirm("Удалить пользователя?")) return;
    await api.delete(`/users/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Пользователи</h1>

      <form onSubmit={create} className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <input className="border rounded px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="border rounded px-3 py-2" placeholder="Пароль" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="border rounded px-3 py-2" placeholder="ФИО" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <select className="border rounded px-3 py-2" value={role} onChange={(e) => setRole(e.target.value as User["role"])}>
          <option value="admin">Администратор</option>
          <option value="analyst">Аналитик</option>
          <option value="manager">Менеджер</option>
          <option value="employee">Сотрудник</option>
        </select>
        <input className="border rounded px-3 py-2" placeholder="Отдел" value={department} onChange={(e) => setDepartment(e.target.value)} />
        <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded font-medium">
          Создать пользователя
        </button>
        {error && <div className="col-span-full text-sm text-red-600">{error}</div>}
      </form>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 text-left">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">ФИО</th>
              <th className="px-4 py-2">Роль</th>
              <th className="px-4 py-2">Отдел</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2 text-slate-500">{u.id}</td>
                <td className="px-4 py-2 font-medium">{u.email}</td>
                <td className="px-4 py-2">{u.full_name || "—"}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.department || "—"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => remove(u.id)} className="text-red-600 hover:underline">
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
