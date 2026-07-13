"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { HomePage } from "@/components/home-page";
import { LessonDetail } from "@/components/lesson-detail";
import { StudySession } from "@/components/study-session";

export default function Home() {
  const init = useAppStore((s) => s.init);
  const view = useAppStore((s) => s.view);

  useEffect(() => {
    init();
  }, [init]);

  if (view.kind === "home") return <HomePage />;
  if (view.kind === "lesson") return <LessonDetail lessonId={view.lessonId} />;
  if (view.kind === "study")
    return <StudySession lessonId={view.lessonId} mode={view.mode} />;

  return <HomePage />;
}
