"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User } from "lucide-react";

export function GameHUD() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "U";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-12 backdrop-blur-sm border-b-2 flex items-center justify-between px-4"
      style={{
        backgroundColor: "rgba(61, 52, 40, 0.95)",
        borderColor: "var(--cozy-border)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="pixel-font text-xs pixel-glow" style={{ color: "var(--cozy-border)" }}>
          Fitconomy
        </span>
        <span className="text-[9px] pixel-body hidden sm:inline" style={{ color: "var(--cozy-muted)" }}>
          猫咪餐厅经营
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-2 py-1 border transition-colors"
            style={{
              borderColor: "var(--cozy-border)",
              backgroundColor: "rgba(44, 36, 25, 0.6)",
            }}
          >
            <div
              className="w-6 h-6 flex items-center justify-center text-[10px] pixel-body"
              style={{ backgroundColor: "rgba(184, 149, 110, 0.25)", color: "var(--cozy-border)" }}
            >
              {initials}
            </div>
            <span className="text-[11px] pixel-body hidden sm:inline" style={{ color: "var(--cozy-foreground)" }}>
              {user?.username}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[160px] pixel-body text-xs"
          style={{
            backgroundColor: "var(--cozy-bg-panel)",
            borderColor: "var(--cozy-border)",
            color: "var(--cozy-foreground)",
          }}
        >
          <DropdownMenuItem
            className="gap-2 pixel-body text-xs focus:bg-[var(--cozy-bg-deep)] focus:text-[var(--cozy-border)]"
            style={{ color: "var(--cozy-foreground)" }}
          >
            <User className="h-3.5 w-3.5" />
            个人资料
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 pixel-body text-xs focus:bg-[var(--cozy-bg-deep)] focus:text-[var(--cozy-border)]"
            style={{ color: "var(--cozy-foreground)" }}
          >
            <Settings className="h-3.5 w-3.5" />
            设置
          </DropdownMenuItem>
          <DropdownMenuSeparator style={{ backgroundColor: "var(--cozy-border)" }} />
          <DropdownMenuItem
            className="gap-2 pixel-body text-xs focus:bg-[var(--cozy-bg-deep)] focus:text-[var(--cozy-negative)]"
            style={{ color: "var(--cozy-negative)" }}
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
