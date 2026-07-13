"use client";

import { IntroductionSpec } from "@/lib/formats";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cleanSynonym } from "@/lib/mastery";

interface Props {
  spec: IntroductionSpec;
  onAnswer: (correct: boolean) => void;
  disabled: boolean;
}

export function IntroductionFormat({ spec, onAnswer, disabled }: Props) {
  const { word } = spec;
  const synonym = cleanSynonym(word.synonym);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">New Word</div>
          <div className="text-4xl font-bold text-emerald-600">{word.word}</div>
          <div className="text-lg text-muted-foreground mt-1">{word.translation}</div>
        </div>

        {word.definition && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Definition</div>
            <div className="text-sm">{word.definition}</div>
          </div>
        )}

        {word.explanation && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Explanation</div>
            <div className="text-sm">{word.explanation}</div>
          </div>
        )}

        {synonym && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Synonym</div>
            <div className="text-sm">{synonym}</div>
          </div>
        )}

        {(word.alt1 || word.alt2 || word.alt3) && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Alternate Forms</div>
            <div className="text-sm flex flex-wrap gap-2">
              {[word.alt1, word.alt2, word.alt3].filter(Boolean).map((a, i) => (
                <span key={i} className="px-2 py-0.5 bg-background rounded border">{a}</span>
              ))}
            </div>
          </div>
        )}

        {word.sentences && word.sentences.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Example</div>
            <div className="text-sm italic">{word.sentences[0].exert}</div>
            <div className="text-xs text-muted-foreground mt-1">{word.sentences[0].translation}</div>
          </div>
        )}

        <Button
          onClick={() => onAnswer(true)}
          disabled={disabled}
          className="w-full bg-emerald-500 hover:bg-emerald-600"
          size="lg"
        >
          Got it
        </Button>
      </CardContent>
    </Card>
  );
}
