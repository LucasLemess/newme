"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Truck, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/30 mb-4">
            <Truck size={24} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-mono font-semibold text-text-primary">
            FRETE<span className="text-green-500">IQ</span>
          </h1>
          <p className="text-text-secondary text-sm mt-1 font-mono">
            Auditoria Inteligente de Fretes
          </p>
        </div>

        {/* Form */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-text-primary font-semibold mb-5">Entrar na plataforma</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-text-primary text-sm placeholder-text-secondary/40 focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-xs font-mono mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 bg-background border border-border rounded-lg text-text-primary text-sm placeholder-text-secondary/40 focus:border-blue-500/50 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                <p className="text-red-500 text-xs font-mono">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg text-green-500 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          <p className="text-center text-text-secondary text-xs mt-4">
            Não tem conta?{" "}
            <Link href="/signup" className="text-blue-500 hover:text-blue-400 transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </div>

        <p className="text-center text-text-secondary text-xs mt-4 font-mono">
          Plataforma segura — dados criptografados
        </p>
      </div>
    </div>
  );
}
