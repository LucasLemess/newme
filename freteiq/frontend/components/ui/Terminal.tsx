"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";

export interface TerminalLine {
  type: "info" | "success" | "error" | "warn" | "cmd";
  text: string;
  timestamp?: string;
}

interface TerminalProps {
  lines: TerminalLine[];
  title?: string;
  loading?: boolean;
  className?: string;
}

const typeConfig = {
  info: { prefix: "›", cls: "text-text-secondary" },
  success: { prefix: "✓", cls: "text-green-500" },
  error: { prefix: "✗", cls: "text-red-500" },
  warn: { prefix: "⚠", cls: "text-amber-500" },
  cmd: { prefix: "$", cls: "text-blue-500" },
};

export function Terminal({ lines, title = "AUDIT LOG", loading = false, className }: TerminalProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div
      className={clsx(
        "bg-black/60 border border-border rounded-lg overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface/50">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-amber-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-text-secondary text-xs font-mono ml-2 tracking-wider">
          {title}
        </span>
      </div>

      {/* Output */}
      <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
        {lines.length === 0 && !loading && (
          <p className="text-text-secondary text-xs font-mono opacity-50">
            Aguardando arquivo...
          </p>
        )}
        {lines.map((line, i) => {
          const cfg = typeConfig[line.type];
          return (
            <div key={i} className="flex gap-2 text-xs font-mono mb-1.5 animate-fade-in">
              {line.timestamp && (
                <span className="text-text-secondary/40 shrink-0 w-20">
                  {line.timestamp}
                </span>
              )}
              <span className={clsx("shrink-0", cfg.cls)}>{cfg.prefix}</span>
              <span className={cfg.cls}>{line.text}</span>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-green-500 mt-1">
            <span>$</span>
            <span className="terminal-cursor">Processando</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
