"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WeightChart } from "@/components/charts/WeightChart";
import { weightApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { WeightRecord } from "@/types";
import { Scale, Plus, Trash2, TrendingDown, Target, ArrowDownRight, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function WeightSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex justify-between">
        <Skeleton className="h-7 w-32 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-52 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

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

  if (loading) return <WeightSkeleton />;

  return (
    <motion.div
      className="p-4 md:p-6 max-w-2xl mx-auto space-y-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
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
            <Button className="gap-1.5 rounded-full h-10 px-5">
              <Plus className="h-4 w-4" />
              记录体重
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>记录今日体重</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="w_kg">体重 (kg)</Label>
                <Input id="w_kg" type="number" step="0.01" placeholder="例如 65.5" value={form.weight_kg} onChange={(e) => setForm((p) => ({ ...p, weight_kg: e.target.value }))} required autoFocus className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w_date">日期</Label>
                <Input id="w_date" type="date" value={form.recorded_date} onChange={(e) => setForm((p) => ({ ...p, recorded_date: e.target.value }))} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="w_note">备注（可选）</Label>
                <Input id="w_note" placeholder="心情、状态…" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className="h-11" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-full gap-2" disabled={submitting}>
                {submitting ? "保存中…" : "保存"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats row */}
      {latest && (
        <div className="grid grid-cols-3 gap-3">
          <motion.div variants={item}>
            <Card className="border-0 shadow-md shadow-black/5">
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">当前体重</p>
                <p className="text-xl font-bold text-foreground">{latest.weight_kg}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="border-0 shadow-md shadow-black/5">
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center mb-2">
                  <ArrowDownRight className="h-5 w-5 text-chart-5" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">较上次</p>
                {diff !== null ? (
                  <>
                    <p className={`text-xl font-bold ${parseFloat(diff) < 0 ? "text-primary" : parseFloat(diff) > 0 ? "text-destructive" : "text-foreground"}`}>
                      {parseFloat(diff) > 0 ? "+" : ""}{diff}
                    </p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">–</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card className="border-0 shadow-md shadow-black/5">
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center mb-2">
                  <Target className="h-5 w-5 text-chart-4" />
                </div>
                <p className="text-xs text-muted-foreground mb-1">距目标</p>
                {user?.goal_weight ? (
                  <>
                    <p className={`text-xl font-bold ${latest.weight_kg <= user.goal_weight ? "text-primary" : "text-chart-3"}`}>
                      {Math.abs(latest.weight_kg - user.goal_weight).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">kg</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">–</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Chart */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
              <TrendingDown className="h-4 w-4 text-chart-5" />
              近 90 天趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WeightChart data={records.map((r) => ({ date: r.recorded_date, weight_kg: r.weight_kg }))} goalWeight={user?.goal_weight} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Records list */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md shadow-black/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">历史记录</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">还没有记录，点击右上角开始</p>
            ) : (
              <ScrollArea className="max-h-80">
                <div className="space-y-0.5">
                  <AnimatePresence>
                    {[...records].reverse().map((r) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className="flex items-center justify-between py-3 px-2 rounded-xl hover:bg-muted/50 group transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-sm">{r.weight_kg} kg</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(r.recorded_date), "M月d日 (E)", { locale: zhCN })}
                            {r.note && <span className="ml-2 text-chart-5">· {r.note}</span>}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
