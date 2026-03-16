"use client";

import { Bell, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="h-14 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-text-primary font-semibold text-sm">{title}</h1>
        {subtitle && (
          <p className="text-text-secondary text-xs font-mono">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={16} />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors">
          <Settings size={16} />
        </button>
        <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <span className="text-blue-500 text-xs font-mono font-semibold">{initials}</span>
        </div>
      </div>
    </header>
  );
}
