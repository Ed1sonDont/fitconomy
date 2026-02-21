"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { TokenResponse } from "@/types";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const data: TokenResponse = res.data;
      login(data.user, data.access_token, data.refresh_token);
      toast.success(`欢迎回来，${data.user.username}！`);
      router.replace("/dashboard");
    } catch {
      toast.error("邮箱或密码错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-lg border-0 shadow-black/5">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">欢迎回来</CardTitle>
        <CardDescription>登录你的 Fitconomy 账号</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-11"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button type="submit" className="w-full h-11 rounded-full text-base gap-2" disabled={loading}>
            {loading ? "登录中…" : "登录"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
          <p className="text-muted-foreground text-sm text-center">
            还没有账号？{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              立即注册
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
