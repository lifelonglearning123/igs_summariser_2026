import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, FileEdit, RotateCcw } from 'lucide-react';
import { DEFAULT_MAIN_POINTS_PROMPT, DEFAULT_RECOMMENDATIONS_PROMPT } from '@/lib/prompts';

export interface SummaryPrompts {
  mainPoints: string;
  recommendations: string;
}

export const DEFAULT_PROMPTS: SummaryPrompts = {
  mainPoints: DEFAULT_MAIN_POINTS_PROMPT,
  recommendations: DEFAULT_RECOMMENDATIONS_PROMPT,
};

interface PromptEditorProps {
  prompts: SummaryPrompts;
  onChange: (next: SummaryPrompts) => void;
  disabled?: boolean;
}

export default function PromptEditor({ prompts, onChange, disabled }: PromptEditorProps) {
  const [open, setOpen] = useState(false);
  const customised =
    prompts.mainPoints !== DEFAULT_PROMPTS.mainPoints || prompts.recommendations !== DEFAULT_PROMPTS.recommendations;

  return (
    <Card>
      <CardHeader className="py-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={open}
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <FileEdit className="h-4 w-4" />
            Prompts
            {customised && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Customised</span>
            )}
          </CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>
        {open && (
          <CardDescription>
            Edit the instructions sent to the AI. Changes apply to the next summary and are remembered in this browser.
          </CardDescription>
        )}
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="main-points-prompt" className="text-sm font-medium text-gray-700">
              Main Discussion Points prompt
            </label>
            <Textarea
              id="main-points-prompt"
              value={prompts.mainPoints}
              onChange={(event) => onChange({ ...prompts, mainPoints: event.target.value })}
              disabled={disabled}
              className="min-h-40 font-mono text-xs leading-5"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="recommendations-prompt" className="text-sm font-medium text-gray-700">
              Recommendations prompt
            </label>
            <Textarea
              id="recommendations-prompt"
              value={prompts.recommendations}
              onChange={(event) => onChange({ ...prompts, recommendations: event.target.value })}
              disabled={disabled}
              className="min-h-72 font-mono text-xs leading-5"
            />
          </div>

          <button
            type="button"
            onClick={() => onChange(DEFAULT_PROMPTS)}
            disabled={disabled || !customised}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default prompts
          </button>
        </CardContent>
      )}
    </Card>
  );
}
