"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Word, Lesson, THEME_LABELS, ThemeName } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Upload, Download, Plus, Clock, CheckCircle2, Layers, Palette, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { playSound, setSoundEnabled } from "@/lib/sounds";

export function HomePage() {
  const data = useAppStore((s) => s.data);
  const setView = useAppStore((s) => s.setView);
  const addLesson = useAppStore((s) => s.addLesson);
  const importData = useAppStore((s) => s.importData);
  const exportData = useAppStore((s) => s.exportData);
  const updatePreferences = useAppStore((s) => s.updatePreferences);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [lessonName, setLessonName] = useState("");
  const [lessonJson, setLessonJson] = useState("");
  const [importJson, setImportJson] = useState("");
  const [prefsOpen, setPrefsOpen] = useState(false);

  const preferences = data.preferences
    ? data.preferences
    : { theme: "emerald" as ThemeName, soundEnabled: true };

  const totalWords = data.lessons.reduce((s, l) => s + l.words.length, 0);
  const totalReviews = data.lessons.reduce(
    (s, l) => s + l.history.length,
    0
  );
  const totalSeen = data.lessons.reduce(
    (s, l) => s + l.progress.filter((p) => p.seen).length,
    0
  );

  const handleCreate = () => {
    try {
      const words = JSON.parse(lessonJson) as Word[];
      if (!Array.isArray(words)) throw new Error("Input must be a JSON array");
      if (words.length === 0) throw new Error("Cannot create an empty lesson");
      for (const w of words) {
        if (!w.word || !w.translation) {
          throw new Error("Each word must have at least 'word' and 'translation'");
        }
      }
      addLesson(lessonName || `Lesson ${data.lessons.length + 1}`, words);
      setLessonName("");
      setLessonJson("");
      setCreateOpen(false);
      playSound("correct");
      toast.success("Lesson created!");
    } catch (e) {
      playSound("incorrect");
      toast.error("Failed to create lesson: " + (e as Error).message);
    }
  };

  const handleExport = () => {
    playSound("click");
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lingua-loop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported");
  };

  const handleImport = () => {
    try {
      importData(importJson);
      setImportJson("");
      setImportOpen(false);
      playSound("correct");
      toast.success("Data imported!");
    } catch (e) {
      playSound("incorrect");
      toast.error("Import failed: " + (e as Error).message);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportJson(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleFileLesson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLessonJson(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col theme-gradient">
      <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg theme-primary flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Lingua Loop</h1>
              <p className="text-xs text-muted-foreground">Spaced repetition language learning</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { playSound("click"); setPrefsOpen(true); }}>
              <Palette className="w-4 h-4 mr-1" /> Theme
            </Button>
            <Button variant="outline" size="sm" onClick={() => { playSound("click"); setImportOpen(true); }}>
              <Upload className="w-4 h-4 mr-1" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
            <Button size="sm" onClick={() => { playSound("click"); setCreateOpen(true); }} className="theme-primary theme-primary-hover text-white">
              <Plus className="w-4 h-4 mr-1" /> New Lesson
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Layers className="w-5 h-5" />} label="Lessons" value={data.lessons.length} />
          <StatCard icon={<BookOpen className="w-5 h-5" />} label="Total Words" value={totalWords} />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Words Seen" value={totalSeen} />
          <StatCard icon={<Clock className="w-5 h-5" />} label="Total Reviews" value={totalReviews} />
        </div>

        {/* Lessons */}
        {data.lessons.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full theme-bg-light flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 theme-text" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Create your first lesson by pasting JSON or uploading a file. Each lesson is a list of words with definitions, translations, and example sentences.
              </p>
              <Button onClick={() => { playSound("click"); setCreateOpen(true); }} className="theme-primary theme-primary-hover text-white">
                <Plus className="w-4 h-4 mr-1" /> Create Lesson
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} onClick={() => setView({ kind: "lesson", lessonId: lesson.id })} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          Lingua Loop · All data stored locally in your browser
        </div>
      </footer>

      {/* Create Lesson Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a new lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="lesson-name">Lesson name</Label>
              <Input
                id="lesson-name"
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
                placeholder="e.g. Spanish Basics — Animals"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="lesson-json">Words (JSON array)</Label>
                <label className="text-xs theme-text hover:underline cursor-pointer">
                  <Upload className="w-3 h-3 inline mr-1" /> Upload file
                  <input type="file" accept=".json" className="hidden" onChange={handleFileLesson} />
                </label>
              </div>
              <Textarea
                id="lesson-json"
                value={lessonJson}
                onChange={(e) => setLessonJson(e.target.value)}
                placeholder={`[\n  {\n    "word": "gato",\n    "translation": "cat",\n    "definition": "...",\n    "sentences": [...]\n  }\n]`}
                className="font-mono text-xs min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="theme-primary theme-primary-hover text-white">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import user data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your backup JSON or upload a backup file. This will replace all current data.
            </p>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="import-json">Backup JSON</Label>
                <label className="text-xs theme-text hover:underline cursor-pointer">
                  <Upload className="w-3 h-3 inline mr-1" /> Upload file
                  <input type="file" accept=".json" className="hidden" onChange={handleFileImport} />
                </label>
              </div>
              <Textarea
                id="import-json"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste backup JSON here..."
                className="font-mono text-xs min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} className="theme-primary theme-primary-hover text-white">Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4" /> Color Theme
              </Label>
              <Select
                value={preferences.theme}
                onValueChange={(v) => {
                  updatePreferences({ theme: v as ThemeName });
                  playSound("click");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(THEME_LABELS) as ThemeName[]).map((t) => (
                    <SelectItem key={t} value={t}>{THEME_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 mt-3">
                {(Object.keys(THEME_LABELS) as ThemeName[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { updatePreferences({ theme: t }); playSound("click"); }}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${preferences.theme === t ? "ring-2 ring-offset-2" : ""}`}
                    style={{ backgroundColor: getThemeColor(t) }}
                    title={THEME_LABELS[t]}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="w-4 h-4" /> Sound Effects
              </Label>
              <Switch
                checked={preferences.soundEnabled}
                onCheckedChange={(on) => {
                  setSoundEnabled(on); // enable immediately so the confirmation plays
                  updatePreferences({ soundEnabled: on });
                  if (on) playSound("correct");
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { playSound("click"); setPrefsOpen(false); }} className="theme-primary theme-primary-hover text-white">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper to get the primary color for a theme (for swatches).
function getThemeColor(theme: ThemeName): string {
  const colors: Record<ThemeName, string> = {
    emerald: "#10b981",
    ocean: "#0891b2",
    sunset: "#f97316",
    royal: "#a855f7",
    slate: "#475569",
  };
  return colors[theme];
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg theme-bg-light flex items-center justify-center theme-text">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function LessonCard({ lesson, onClick }: { lesson: Lesson; onClick: () => void }) {
  const seen = lesson.progress.filter((p) => p.seen).length;
  const pct = lesson.words.length > 0 ? (seen / lesson.words.length) * 100 : 0;
  const avgMastery =
    seen > 0
      ? lesson.progress.filter((p) => p.seen).reduce((s, p) => s + p.mastery, 0) / seen
      : 0;

  const todayReviews = lesson.history.filter((h) => {
    const d = new Date(h.ts);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { playSound("click"); onClick(); }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate group-hover:theme-text transition-colors">
              {lesson.name}
            </CardTitle>
            <CardDescription className="text-xs">
              {lesson.words.length} words · {lesson.settings.algorithm.toUpperCase()}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="ml-2 shrink-0">
            Lv {avgMastery.toFixed(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{seen} / {lesson.words.length} seen</span>
            <span>{todayReviews} reviews today</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
