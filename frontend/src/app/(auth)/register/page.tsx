"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { TokenResponse } from "@/types";
import { ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    region: "",
    goal_weight: "",
    daily_calorie_target: "2000",
  });

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        username: form.username,
        region: form.region || undefined,
        goal_weight: form.goal_weight ? parseFloat(form.goal_weight) : undefined,
        daily_calorie_target: parseInt(form.daily_calorie_target),
      };
      const res = await authApi.register(payload);
      const data: TokenResponse = res.data;
      login(data.user, data.access_token, data.refresh_token);
      toast.success(`账号创建成功！欢迎，${data.user.username}！`);
      router.replace("/dashboard");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "注册失败，请检查信息后重试";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-lg border-0 shadow-black/5">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">创建账号</CardTitle>
        <CardDescription>开始你的健康投资之旅</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="username">昵称</Label>
            <Input id="username" placeholder="你的名字" value={form.username} onChange={(e) => handleChange("username", e.target.value)} required className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required autoComplete="email" className="h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码（至少 8 位）</Label>
            <Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={(e) => handleChange("password", e.target.value)} required autoComplete="new-password" className="h-11" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal_weight">目标体重 (kg)</Label>
              <Input id="goal_weight" type="number" step="0.1" placeholder="65.0" value={form.goal_weight} onChange={(e) => handleChange("goal_weight", e.target.value)} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="calorie_target">每日热量目标</Label>
              <Input id="calorie_target" type="number" step="50" placeholder="2000" value={form.daily_calorie_target} onChange={(e) => handleChange("daily_calorie_target", e.target.value)} className="h-11" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>所在地区</Label>
            <Select onValueChange={(v) => handleChange("region", v)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="选择地区（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CN">中国大陆</SelectItem>
                <SelectItem value="TW">台湾</SelectItem>
                <SelectItem value="JP">日本</SelectItem>
                <SelectItem value="US">美国</SelectItem>
                <SelectItem value="OTHER">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-2">
          <Button type="submit" className="w-full h-11 rounded-full text-base gap-2" disabled={loading}>
            {loading ? "创建中…" : "开始使用"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
          <p className="text-muted-foreground text-sm text-center">
            已有账号？{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              去登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
