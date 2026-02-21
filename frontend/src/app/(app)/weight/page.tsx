"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeightChart } from "@/components/charts/WeightChart";
import { weightApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { WeightRecord } from "@/types";
import { Scale, Plus, Trash2, TrendingDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function WeightPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    weight_kg: "",
    recorded_date: format(new Date(), "yyyy-MM-dd"),
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await weightApi.list(90);
      setRecords(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.weight_kg) return;
    setSubmitting(true);
    try {
      await weightApi.create({
        weight_kg: parseFloat(form.weight_kg),
        recorded_date: form.recorded_date,
        note: form.note || undefined,
      });
      toast.success("体重记录成功！资产已更新");
      setDialogOpen(false);
      setForm({ weight_kg: "", recorded_date: format(new Date(), "yyyy-MM-dd"), note: "" });
      fetchRecords();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "记录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await weightApi.delete(id);
      toast.success("记录已删除");
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch {
      toast.error("删除失败");
    }
  };

  const latest = records[records.length - 1];
  const prev = records[records.length - 2];
  const diff = latest && prev ? (latest.weight_kg - prev.weight_kg).toFixed(1) : null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6 text-indigo-500" />
            体重记录
          </h1>
          {user?.goal_weight && (
            <p className="text-muted-foreground text-sm mt-0.5">
              目标体重：{user.goal_weight} kg
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              记录体重
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>记录今日体重</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="w_kg">体重 (kg)</Label>
                <Input
                  id="w_kg"
                  type="number"
                  step="0.01"
                  placeholder="例如 65.5"
                  value={form.weight_kg}
                  onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w_date">日期</Label>
                <Input
                  id="w_date"
                  type="date"
                  value={form.recorded_date}
                  onChange={(e) => setForm((p) => ({ ...p, recorded_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w_note">备注（可选）</Label>
                <Input
                  id="w_note"
                  placeholder="心情、状态…"
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "保存中…" : "保存记录"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats row */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">当前体重</p>
              <p className="text-2xl font-bold">{latest.weight_kg}</p>
              <p className="text-xs text-muted-foreground">kg</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">较上次</p>
              {diff !== null ? (
                <>
                  <p className={`text-2xl font-bold ${parseFloat(diff) < 0 ? "text-emerald-600" : parseFloat(diff) > 0 ? "text-red-500" : ""}`}>
                    {parseFloat(diff) > 0 ? "+" : ""}{diff}
                  </p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">–</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">距目标</p>
              {user?.goal_weight ? (
                <>
                  <p className={`text-2xl font-bold ${latest.weight_kg <= user.goal_weight ? "text-emerald-600" : "text-orange-500"}`}>
                    {Math.abs(latest.weight_kg - user.goal_weight).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">–</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-indigo-500" />
            近 90 天趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeightChart data={records.map((r) => ({ date: r.recorded_date, weight_kg: r.weight_kg }))} goalWeight={user?.goal_weight} />
        </CardContent>
      </Card>

      {/* Records list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">历史记录</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-4">加载中…</p>
          ) : records.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">还没有记录，点击右上角开始</p>
          ) : (
            <div className="space-y-2">
              {[...records].reverse().map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{r.weight_kg} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(r.recorded_date), "M月d日 (E)", { locale: zhCN })}
                      {r.note && <span className="ml-2">· {r.note}</span>}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => handleDelete(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
