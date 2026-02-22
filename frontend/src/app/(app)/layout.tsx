"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { GameHUD } from "@/components/GameHUD";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div
      className="min-h-screen text-[var(--cozy-foreground)]"
      style={{
        background: "var(--cozy-bg-deep)",
        backgroundImage: "linear-gradient(180deg, rgba(52, 70, 90, 0.15) 0%, transparent 25%, transparent 100%)",
      }}
    >
      <GameHUD />
      <main className="pt-12 pb-4">{children}</main>
    </div>
  );
}
