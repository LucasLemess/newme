import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreteIQ — Auditoria Inteligente de Fretes",
  description:
    "Plataforma SaaS de auditoria automática de CT-e para o mercado brasileiro. Identifique cobranças indevidas e gere contestações com IA.",
  keywords: ["frete", "auditoria", "CT-e", "SEFAZ", "logística", "transportadora"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-background text-text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
