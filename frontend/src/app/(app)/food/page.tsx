"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { foodApi, uploadApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { DailyFoodSummary, FoodRecord, MealType, PixelIconType } from "@/types";
import { Utensils, Plus, Trash2, Camera, Flame, ArrowRight } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  lunch: "bg-primary/10 text-primary border-primary/20",
  dinner: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  snack: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const FOOD_ICONS: Record<PixelIconType, string> = {
  rice: "🍚",
  meat: "🥩",
  vegetable: "🥦",
  fruit: "🍎",
  dairy: "🥛",
  drink: "🍵",
  snack: "🍪",
  other: "🍽️",
};

export default function FoodPage() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [summary, setSummary] = useState<DailyFoodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    meal_type: "lunch" as MealType,
    note: "",
    items: [{ name: "", calories: "", amount_g: "", pixel_icon_type: "other" as PixelIconType, image_url: "" }],
  });

  const fetchFood = useCallback(async () => {
    setLoading(true);
    try {
      const res = await foodApi.getDaily(selectedDate);
      setSummary(res.data);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchFood();
  }, [fetchFood]);

  const addItem = () =>
    setForm((p) => ({
      ...p,
      items: [...p.items, { name: "", calories: "", amount_g: "", pixel_icon_type: "other", image_url: "" }],
    }));

  const removeItem = (idx: number) =>
    setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx: number, field: string, value: string) =>
    setForm((p) => ({
      ...p,
      items: p.items.map((itm, i) => (i === idx ? { ...itm, [field]: value } : itm)),
    }));

  const handleImageUpload = async (idx: number, file: File) => {
    setUploading(true);
    try {
      const res = await uploadApi.image(file);
      updateItem(idx, "image_url", res.data.url);
      toast.success("图片上传成功");
    } catch {
      toast.error("图片上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = form.items.filter((it) => it.name.trim());
    if (validItems.length === 0) {
      toast.error("至少填写一个食物名称");
      return;
    }
    setSubmitting(true);
    try {
      await foodApi.createRecord({
        meal_type: form.meal_type,
        recorded_date: selectedDate,
        note: form.note || undefined,
        items: validItems.map((it) => ({
          name: it.name,
          calories: parseInt(it.calories) || 0,
          amount_g: it.amount_g ? parseFloat(it.amount_g) : undefined,
          pixel_icon_type: it.pixel_icon_type,
          image_url: it.image_url || undefined,
        })),
      });
      toast.success("饮食记录成功！");
      setDialogOpen(false);
      setForm({
        meal_type: "lunch",
        note: "",
        items: [{ name: "", calories: "", amount_g: "", pixel_icon_type: "other", image_url: "" }],
      });
      fetchFood();
    } catch {
      toast.error("记录失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCalories = summary?.total_calories ?? 0;
  const calorieTarget = user?.daily_calorie_target ?? 2000;
  const caloriePct = Math.min((totalCalories / calorieTarget) * 100, 200);
  const dateLabel = format(new Date(selectedDate + "T00:00:00"), "M月d日 EEEE", { locale: zhCN });

  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  const recordsByMeal = (meal: MealType) =>
    summary?.records.filter((r) => r.meal_type === meal) ?? [];

  return (
    <motion.div
      className="p-4 md:p-6 max-w-2xl mx-auto space-y-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">饮食记录</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 rounded-full h-10 px-5">
              <Plus className="h-4 w-4" />
              添加记录
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>添加饮食记录</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>餐次</Label>
                  <Select value={form.meal_type} onValueChange={(v) => setForm((p) => ({ ...p, meal_type: v as MealType }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEAL_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>日期</Label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-11" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>食物列表</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="text-xs rounded-full">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    添加
                  </Button>
                </div>
                {form.items.map((itm, idx) => (
                  <div key={idx} className="border border-border rounded-xl p-3 space-y-2.5 bg-muted/30">
                    <div className="flex gap-2">
                      <Input placeholder="食物名称" value={itm.name} onChange={(e) => updateItem(idx, "name", e.target.value)} className="flex-1 h-10" />
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive rounded-full" onClick={() => removeItem(idx)} disabled={form.items.length === 1}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">热量 (kcal)</Label>
                        <Input type="number" placeholder="0" value={itm.calories} onChange={(e) => updateItem(idx, "calories", e.target.value)} className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">克重 (g)</Label>
                        <Input type="number" placeholder="可选" value={itm.amount_g} onChange={(e) => updateItem(idx, "amount_g", e.target.value)} className="mt-1 h-9" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">分类</Label>
                        <Select value={itm.pixel_icon_type} onValueChange={(v) => updateItem(idx, "pixel_icon_type", v)}>
                          <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(FOOD_ICONS).map(([k, icon]) => (
                              <SelectItem key={k} value={k}>{icon} {k}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {itm.image_url ? (
                        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border">
                          <Image src={itm.image_url} alt="food" fill className="object-cover" />
                        </div>
                      ) : null}
                      <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs rounded-full" disabled={uploading} onClick={() => {
                        const el = document.createElement("input"); el.type = "file"; el.accept = "image/*";
                        el.onchange = async (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) await handleImageUpload(idx, f); }; el.click();
                      }}>
                        <Camera className="h-3.5 w-3.5" />
                        {uploading ? "上传中…" : itm.image_url ? "换图片" : "拍照/上传"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>备注（可选）</Label>
                <Input placeholder="感受、餐厅名…" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className="h-11" />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
              <Button type="submit" className="w-full h-11 rounded-full gap-2" disabled={submitting}>
                {submitting ? "保存中…" : "保存"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Date picker + summary */}
      <motion.div variants={item}>
        <Card className="border-0 shadow-md shadow-black/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <p className="font-semibold text-lg">{dateLabel}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Flame className="h-4 w-4 text-chart-3" />
                  <span className="text-sm">
                    <span className="font-bold text-chart-3 text-lg">{totalCalories}</span>
                    <span className="text-muted-foreground"> / {calorieTarget} kcal</span>
                  </span>
                </div>
              </div>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto h-10" />
            </div>
            <Progress value={caloriePct} className="h-3 rounded-full" />
            <p className="text-xs text-muted-foreground mt-2">
              {caloriePct.toFixed(0)}% 热量目标
              {caloriePct > 110 && (
                <span className="text-destructive ml-1 font-medium">· 已超出目标</span>
              )}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Records by meal type */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-full" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : !summary || summary.records.length === 0 ? (
        <motion.div variants={item} className="text-center py-16 text-muted-foreground">
          <Utensils className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">今日暂无饮食记录</p>
          <p className="text-sm mt-1">点击"添加记录"开始记录</p>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <Tabs defaultValue="all">
            <TabsList className="w-full rounded-full h-10 p-1">
              <TabsTrigger value="all" className="flex-1 rounded-full text-xs">全部</TabsTrigger>
              {mealTypes.map((m) => (
                <TabsTrigger key={m} value={m} className="flex-1 rounded-full text-xs">
                  {MEAL_LABELS[m]}
                  {recordsByMeal(m).length > 0 && (
                    <span className="ml-0.5 text-muted-foreground">({recordsByMeal(m).length})</span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="all" className="space-y-3 mt-3">
              <AnimatePresence>
                {summary.records.map((record) => (
                  <FoodRecordCard key={record.id} record={record} />
                ))}
              </AnimatePresence>
            </TabsContent>
            {mealTypes.map((m) => (
              <TabsContent key={m} value={m} className="space-y-3 mt-3">
                <AnimatePresence>
                  {recordsByMeal(m).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">暂无{MEAL_LABELS[m]}记录</p>
                  ) : (
                    recordsByMeal(m).map((record) => (
                      <FoodRecordCard key={record.id} record={record} />
                    ))
                  )}
                </AnimatePresence>
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      )}
    </motion.div>
  );
}

function FoodRecordCard({ record }: { record: FoodRecord }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="border-0 shadow-md shadow-black/5">
        <CardHeader className="pb-2 pt-4 px-5">
          <div className="flex items-center justify-between">
            <Badge className={`rounded-full ${MEAL_COLORS[record.meal_type as MealType]}`}>
              {MEAL_LABELS[record.meal_type as MealType]}
            </Badge>
            <span className="text-sm font-semibold text-chart-3">
              {record.total_calories} kcal
            </span>
          </div>
          {record.note && (
            <p className="text-xs text-muted-foreground mt-1">{record.note}</p>
          )}
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="space-y-2.5">
            {record.items.map((foodItem) => (
              <div key={foodItem.id} className="flex items-center gap-3">
                {foodItem.image_url ? (
                  <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-border shrink-0">
                    <Image src={foodItem.image_url} alt={foodItem.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="h-11 w-11 rounded-xl border border-border bg-muted flex items-center justify-center text-lg shrink-0">
                    {FOOD_ICONS[foodItem.pixel_icon_type as PixelIconType] || "🍽️"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{foodItem.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {foodItem.calories} kcal
                    {foodItem.amount_g && ` · ${foodItem.amount_g}g`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
