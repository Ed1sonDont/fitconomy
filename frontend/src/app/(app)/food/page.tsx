"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FoodPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/game");
  }, [router]);
  return null;
}
