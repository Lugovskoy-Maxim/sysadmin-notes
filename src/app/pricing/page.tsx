"use client";

import Link from "next/link";
import { LogIn, Sparkles } from "lucide-react";
import { PricingPanel } from "@/components/PricingPanel";
import { useAppStore } from "@/lib/store";

export default function PricingPage() {
  const token = useAppStore((s) => s.token);

  return (
    <main className="pricing-page">
      <header className="pricing-header">
        <Link href="/" className="pricing-logo">
          <Sparkles size={18} />
          Sysadmin Notes
        </Link>
        <div className="pricing-header-actions">
          {token ? (
            <Link href="/" className="ghost-button compact">В приложение</Link>
          ) : (
            <Link href="/" className="ghost-button compact">
              <LogIn size={14} />
              Войти
            </Link>
          )}
        </div>
      </header>
      <PricingPanel token={token} />
    </main>
  );
}