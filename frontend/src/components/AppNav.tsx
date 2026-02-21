"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Scale, Utensils, Gamepad2, LogOut } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { href: "/weight", label: "体重", icon: Scale },
  { href: "/food", label: "饮食", icon: Utensils },
  { href: "/game", label: "餐厅", icon: Gamepad2 },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r bg-card min-h-screen p-4 gap-2 shrink-0">
        <div className="mb-4 px-2">
          <h2 className="text-xl font-bold">
            <span className="text-emerald-600">Fit</span>conomy
          </h2>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.username}</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant={pathname.startsWith(href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  pathname.startsWith(href) && "font-semibold"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start gap-2 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background flex">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground transition-colors",
              pathname.startsWith(href) && "text-emerald-600 font-semibold"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
