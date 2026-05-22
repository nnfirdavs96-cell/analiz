import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("admin@analiz.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Добро пожаловать!");
      nav("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ошибка входа";
      setError(msg);
      toast.error("Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 gradient-mesh" />

      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-gradient-to-br from-brand-500/20 to-purple-500/20 blur-3xl"
          style={{
            width: `${200 + i * 50}px`,
            height: `${200 + i * 50}px`,
            top: `${10 + i * 15}%`,
            left: `${5 + i * 18}%`,
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow-lg mb-4"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-1">Analiz</h1>
            <p className="text-sm text-slate-300">Корпоративная BI-платформа</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className="text-sm text-slate-300 mb-1.5 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-all"
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="text-sm text-slate-300 mb-1.5 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none transition-all"
                required
              />
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-300 bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-400 hover:to-purple-500 disabled:opacity-50 text-white py-3 rounded-xl font-semibold shadow-lg shadow-brand-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              {loading ? "Вход…" : "Войти"}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center text-xs text-slate-400"
          >
            <p>Демо: admin@analiz.local / admin123</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
