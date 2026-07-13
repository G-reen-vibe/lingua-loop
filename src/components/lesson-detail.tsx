"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { StudyMode, FORMAT_LABELS, FORMAT_DIFFICULTY, FormatKind } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Play, Zap, Flame, Target, RotateCcw, Trash2, Settings2, BookOpen, Clock, Trophy } from "lucide-react";
import { toast } from "sonner";
import { dueWords, wordsForIntroduction } from "@/lib/mastery";

export function LessonDetail({ lessonId }: { lessonId: string }) {
  const data = useAppStore((s) => s.data);
  const setView = useAppStore((s) => s.setView);
  const startSession = useAppStore((s) => s.startSession);
  const deleteLesson = useAppStore((s) => s.deleteLesson);
  const resetLessonProgress = useAppStore((s) => s.resetLessonProgress);
  const updateLessonSettings = useAppStore((s) => s.updateLessonSettings);

  const lesson = data.lessons.find((l) => l.id === lessonId);
  const [showSettings, setShowSettings] = useState(false);

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Lesson not found.</p>
        <Button onClick={() => setView({ kind: "home" })}>Back</Button>
      </div>
    );
  }

  const seen = lesson.progress.filter((p) => p.seen);
  const avgMastery =
    seen.length > 0 ? seen.reduce((s, p) => s + p.mastery, 0) / seen.length : 0;
  const totalCorrect = lesson.progress.reduce((s, p) => s + p.correct, 0);
  const totalIncorrect = lesson.progress.reduce((s, p) => s + p.incorrect, 0);
  const accuracy =
    totalCorrect + totalIncorrect > 0
      ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100
      : 0;

  const due = dueWords(lesson).length;
  const newWords = wordsForIntroduction(lesson).length;

  // Last 7 days review chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toDateString();
    const reviews = lesson.history.filter((h) => new Date(h.ts).toDateString() === dayStr);
    const correct = reviews.filter((r) => r.correct).length;
    return { date: d.toLocaleDateString("en-US", { weekday: "short" }), reviews: reviews.length, correct };
  });

  const startStudy = (mode: StudyMode) => {
    // Check if there's anything to study
    if (due === 0 && newWords === 0 && seen.length === 0) {
      toast.error("Nothing to study — add more words or wait for reviews.");
      return;
    }
    startSession(lessonId, mode);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
      <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView({ kind: "home" })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{lesson.name}</h1>
              <p className="text-xs text-muted-foreground">{lesson.words.length} words · {lesson.settings.algorithm.toUpperCase()}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="w-4 h-4 mr-1" /> Settings
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatBox icon={<BookOpen className="w-4 h-4" />} label="Words Seen" value={`${seen.length}/${lesson.words.length}`} />
          <StatBox icon={<Target className="w-4 h-4" />} label="Avg Mastery" value={avgMastery.toFixed(1)} />
          <StatBox icon={<Trophy className="w-4 h-4" />} label="Accuracy" value={`${accuracy.toFixed(0)}%`} />
          <StatBox icon={<Clock className="w-4 h-4" />} label="Due Now" value={due} />
          <StatBox icon={<Flame className="w-4 h-4" />} label="New Available" value={newWords} />
        </div>

        {/* 7-day chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-32">
              {last7Days.map((d, i) => {
                const max = Math.max(1, ...last7Days.map((x) => x.reviews));
                const h = (d.reviews / max) * 100;
                const correctH = d.reviews > 0 ? (d.correct / d.reviews) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex-1 flex items-end relative">
                      <div className="w-full bg-muted rounded-t overflow-hidden flex flex-col justify-end" style={{ height: `${h}%` }}>
                        <div className="w-full bg-emerald-500" style={{ height: `${correctH}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{d.date}</span>
                    <span className="text-xs font-medium">{d.reviews}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Correct</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted" /> Incorrect</span>
            </div>
          </CardContent>
        </Card>

        {/* Study modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StudyModeCard
            icon={<Target className="w-6 h-6" />}
            title="Daily Review"
            description="30 questions · balanced practice"
            color="emerald"
            onClick={() => startStudy("daily")}
          />
          <StudyModeCard
            icon={<BookOpen className="w-6 h-6" />}
            title="Lesson"
            description="100 questions · deep practice"
            color="sky"
            onClick={() => startStudy("lesson")}
          />
          <StudyModeCard
            icon={<Zap className="w-6 h-6" />}
            title="Rush"
            description="5 minutes · 3 lives"
            color="rose"
            onClick={() => startStudy("rush")}
          />
        </div>

        {/* Settings panel */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lesson Settings</CardTitle>
              <CardDescription>Configure how questions are served for this lesson.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-medium">Spaced Repetition Algorithm</Label>
                <Select
                  value={lesson.settings.algorithm}
                  onValueChange={(v) => updateLessonSettings(lessonId, { algorithm: v as "sm2" | "fsrs" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sm2">SM-2 (classic)</SelectItem>
                    <SelectItem value="fsrs">FSRS (modern)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  SM-2 is the classic algorithm. FSRS-5 is a newer model that predicts memory stability more accurately.
                </p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm font-medium">Max New Words Per Day</Label>
                  <Badge variant="secondary">{lesson.settings.maxNewWordsDaily}</Badge>
                </div>
                <Slider
                  value={[lesson.settings.maxNewWordsDaily]}
                  onValueChange={(v) => updateLessonSettings(lessonId, { maxNewWordsDaily: v[0] })}
                  min={1}
                  max={50}
                  step={1}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label className="text-sm font-medium">Min Mastery Before New Words</Label>
                  <Badge variant="secondary">{lesson.settings.minMasteryForNewWords}</Badge>
                </div>
                <Slider
                  value={[lesson.settings.minMasteryForNewWords]}
                  onValueChange={(v) => updateLessonSettings(lessonId, { minMasteryForNewWords: v[0] })}
                  min={0}
                  max={4}
                  step={1}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Existing words must reach this average mastery before new words are introduced.
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-1" /> Reset Progress
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will erase all review history and word mastery for this lesson. The words themselves will remain. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          resetLessonProgress(lessonId);
                          toast.success("Progress reset");
                        }}
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-1" /> Delete Lesson
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the lesson and all its data. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          deleteLesson(lessonId);
                          toast.success("Lesson deleted");
                        }}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Word list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Words ({lesson.words.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
              {lesson.words.map((w, i) => {
                const p = lesson.progress[i];
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{w.word}</div>
                      <div className="text-xs text-muted-foreground truncate">{w.translation}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p?.seen ? (
                        <>
                          <Badge variant="outline" className="text-xs">M{p.mastery}</Badge>
                          <div className="text-xs text-muted-foreground w-16 text-right">
                            {p.correct}✓ {p.incorrect}✗
                          </div>
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StudyModeCard({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "emerald" | "sky" | "rose";
  onClick: () => void;
}) {
  const colorMap = {
    emerald: "bg-emerald-500 hover:bg-emerald-600 text-emerald-50",
    sky: "bg-sky-500 hover:bg-sky-600 text-sky-50",
    rose: "bg-rose-500 hover:bg-rose-600 text-rose-50",
  };
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button onClick={onClick} className="w-full text-left p-5 hover:bg-muted/30 transition-colors">
          <div className={`w-12 h-12 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
            {icon}
          </div>
          <div className="font-semibold text-base">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </button>
      </CardContent>
    </Card>
  );
}
