import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, FileEdit, RotateCcw } from 'lucide-react';
import { DEFAULT_MAIN_POINTS_PROMPT, DEFAULT_RECOMMENDATIONS_PROMPT } from '@/lib/prompts';
import { DEFAULT_WRITE_UP_PROMPTS, SERVICES, ServiceKey } from '@/lib/services';

export interface SummaryPrompts {
  mainPoints: string;
  recommendations: string;
  /** One Salesforce write-up prompt per service. */
  writeUps: Record<ServiceKey, string>;
}

export const DEFAULT_PROMPTS: SummaryPrompts = {
  mainPoints: DEFAULT_MAIN_POINTS_PROMPT,
  recommendations: DEFAULT_RECOMMENDATIONS_PROMPT,
  writeUps: DEFAULT_WRITE_UP_PROMPTS,
};

function isWriteUpEdited(prompts: SummaryPrompts, service: ServiceKey): boolean {
  return prompts.writeUps[service] !== DEFAULT_PROMPTS.writeUps[service];
}

export function isCustomised(prompts: SummaryPrompts): boolean {
  return (
    prompts.mainPoints !== DEFAULT_PROMPTS.mainPoints ||
    prompts.recommendations !== DEFAULT_PROMPTS.recommendations ||
    SERVICES.some((service) => isWriteUpEdited(prompts, service.key))
  );
}

interface PromptEditorProps {
  prompts: SummaryPrompts;
  onChange: (next: SummaryPrompts) => void;
  disabled?: boolean;
}

export default function PromptEditor({ prompts, onChange, disabled }: PromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [writeUpService, setWriteUpService] = useState<ServiceKey>(SERVICES[0].key);
  const customised = isCustomised(prompts);
  const writeUpEdited = isWriteUpEdited(prompts, writeUpService);

  const setWriteUpPrompt = (value: string) =>
    onChange({ ...prompts, writeUps: { ...prompts.writeUps, [writeUpService]: value } });

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
            Edit the instructions sent to the AI. Changes apply to the next summary or write-up and are remembered in this
            browser.
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

          <div className="space-y-2 border-t border-gray-200 pt-4">
            <label htmlFor="write-up-prompt-service" className="text-sm font-medium text-gray-700">
              Salesforce write-up prompts
            </label>
            <p className="text-xs text-gray-500">Each support has its own. Choose one to edit.</p>
            <select
              id="write-up-prompt-service"
              value={writeUpService}
              onChange={(event) => setWriteUpService(event.target.value as ServiceKey)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SERVICES.map((service) => (
                <option key={service.key} value={service.key}>
                  {service.label}
                  {isWriteUpEdited(prompts, service.key) ? ' (edited)' : ''}
                </option>
              ))}
            </select>
            <Textarea
              aria-label={`Write-up prompt for ${SERVICES.find((service) => service.key === writeUpService)?.label}`}
              value={prompts.writeUps[writeUpService]}
              onChange={(event) => setWriteUpPrompt(event.target.value)}
              disabled={disabled}
              className="min-h-56 font-mono text-xs leading-5"
            />
            {writeUpEdited && (
              <button
                type="button"
                onClick={() => setWriteUpPrompt(DEFAULT_PROMPTS.writeUps[writeUpService])}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
              >
                <RotateCcw className="h-3 w-3" />
                Reset this write-up prompt
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onChange(DEFAULT_PROMPTS)}
            disabled={disabled || !customised}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset all prompts to default
          </button>
        </CardContent>
      )}
    </Card>
  );
}
