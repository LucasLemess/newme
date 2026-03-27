"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Search,
  Clock,
  FileText,
  MessageSquare,
  LogOut,
  Truck,
  Zap,
  Network,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/audit", label: "Nova Auditoria", icon: Search },
  { href: "/history", label: "Histórico", icon: Clock },
  { href: "/contracts", label: "Contratos", icon: FileText },
  { href: "/contestacao", label: "Contestações", icon: MessageSquare },
  { href: "/malha", label: "Malha", icon: Network },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 shrink-0 bg-surface border-r border-border flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <Truck size={14} className="text-green-500" />
          </div>
          <div>
            <p className="text-text-primary font-mono font-semibold text-sm tracking-wider">
              FRETE<span className="text-green-500">IQ</span>
            </p>
            <p className="text-text-secondary text-xs font-mono">Auditoria Inteligente</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-green-500/10 text-green-500 border border-green-500/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              )}
            >
              <Icon
                size={16}
                className={clsx(
                  "transition-colors",
                  active ? "text-green-500" : "text-text-secondary group-hover:text-text-primary"
                )}
              />
              <span>{label}</span>
              {href === "/audit" && (
                <span className="ml-auto">
                  <Zap size={10} className="text-amber-500" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:text-red-500 hover:bg-red-500/5 transition-all w-full"
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
