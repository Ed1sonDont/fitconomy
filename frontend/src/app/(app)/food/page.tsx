"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { foodApi, uploadApi } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { DailyFoodSummary, FoodRecord, MealType, PixelIconType } from "@/types";
import { Utensils, Plus, Trash2, Camera, Flame } from "lucide-react";
import Image from "next/image";

const PIXEL_ICONS: Record<PixelIconType, string> = {
  rice: "🍚",
  meat: "🥩",
  vegetable: "🥦",
  fruit: "🍎",
  dairy: "🥛",
  drink: "🍵",
  snack: "🍪",
  other: "🍽️",
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-100 text-amber-800",
  lunch: "bg-sky-100 text-sky-800",
  dinner: "bg-indigo-100 text-indigo-800",
  snack: "bg-pink-100 text-pink-800",
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
      items: p.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
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

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="h-6 w-6 text-emerald-500" />
          饮食记录
        </h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5">
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
                <div className="space-y-1.5">
                  <Label>餐次</Label>
                  <Select
                    value={form.meal_type}
                    onValueChange={(v) => setForm((p) => ({ ...p, meal_type: v as MealType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(MEAL_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>日期</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>食物列表</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    添加
                  </Button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2.5">
                    <div className="flex gap-2">
                      <Input
                        placeholder="食物名称"
                        value={item.name}
                        onChange={(e) => updateItem(idx, "name", e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground"
                        onClick={() => removeItem(idx)}
                        disabled={form.items.length === 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">热量 (kcal)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.calories}
                          onChange={(e) => updateItem(idx, "calories", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">克重 (g)</Label>
                        <Input
                          type="number"
                          placeholder="可选"
                          value={item.amount_g}
                          onChange={(e) => updateItem(idx, "amount_g", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">分类</Label>
                        <Select
                          value={item.pixel_icon_type}
                          onValueChange={(v) => updateItem(idx, "pixel_icon_type", v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PIXEL_ICONS).map(([k, icon]) => (
                              <SelectItem key={k} value={k}>
                                {icon} {k}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {/* Image upload */}
                    <div className="flex items-center gap-2">
                      {item.image_url ? (
                        <div className="relative h-12 w-12 rounded overflow-hidden border">
                          <Image src={item.image_url} alt="food" fill className="object-cover" />
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={uploading}
                        onClick={() => {
                          const el = document.createElement("input");
                          el.type = "file";
                          el.accept = "image/*";
                          el.onchange = async (ev) => {
                            const f = (ev.target as HTMLInputElement).files?.[0];
                            if (f) await handleImageUpload(idx, f);
                          };
                          el.click();
                        }}
                      >
                        <Camera className="h-3.5 w-3.5" />
                        {uploading ? "上传中…" : item.image_url ? "换图片" : "拍照/上传"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>备注（可选）</Label>
                <Input
                  placeholder="感受、餐厅名…"
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                />
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "保存中…" : "保存记录"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date picker + summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="font-semibold">{dateLabel}</p>
              <div className="flex items-center gap-2 mt-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-sm">
                  <span className="font-bold text-orange-500">{totalCalories}</span>
                  <span className="text-muted-foreground"> / {calorieTarget} kcal</span>
                </span>
              </div>
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Progress value={caloriePct} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {caloriePct.toFixed(0)}% 热量目标
            {caloriePct > 110 && (
              <span className="text-red-500 ml-1">· 已超出目标</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Records */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">加载中…</div>
      ) : !summary || summary.records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Utensils className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p>今日暂无饮食记录</p>
          <p className="text-xs mt-1">点击"添加记录"开始记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summary.records.map((record) => (
            <FoodRecordCard key={record.id} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}

function FoodRecordCard({ record }: { record: FoodRecord }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <Badge className={MEAL_COLORS[record.meal_type as MealType]}>
            {MEAL_LABELS[record.meal_type as MealType]}
          </Badge>
          <span className="text-sm font-semibold text-orange-500">
            {record.total_calories} kcal
          </span>
        </div>
        {record.note && (
          <p className="text-xs text-muted-foreground mt-1">{record.note}</p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {record.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.image_url ? (
                <div className="relative h-10 w-10 rounded overflow-hidden border shrink-0">
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-lg shrink-0">
                  {PIXEL_ICONS[item.pixel_icon_type as PixelIconType] || "🍽️"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.calories} kcal
                  {item.amount_g && ` · ${item.amount_g}g`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
