import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Settings } from 'lucide-react';

export interface GenerationParameters {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/** Same defaults as the original Streamlit app. */
export const DEFAULT_PARAMETERS: GenerationParameters = {
  temperature: 0.5,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

interface ParameterControlsProps {
  values: GenerationParameters;
  onChange: (next: GenerationParameters) => void;
  disabled?: boolean;
}

export default function ParameterControls({ values, onChange, disabled }: ParameterControlsProps) {
  const isDefault =
    values.temperature === DEFAULT_PARAMETERS.temperature &&
    values.topP === DEFAULT_PARAMETERS.topP &&
    values.frequencyPenalty === DEFAULT_PARAMETERS.frequencyPenalty &&
    values.presencePenalty === DEFAULT_PARAMETERS.presencePenalty;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          AI Parameters
        </CardTitle>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_PARAMETERS)}
          disabled={disabled || isDefault}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </CardHeader>
      <CardContent className="space-y-5">
        <Slider
          label="Temperature"
          min={0}
          max={2}
          step={0.1}
          value={values.temperature}
          onChange={(temperature) => onChange({ ...values, temperature })}
          disabled={disabled}
        />
        <Slider
          label="Top P"
          min={0}
          max={1}
          step={0.05}
          value={values.topP}
          onChange={(topP) => onChange({ ...values, topP })}
          disabled={disabled}
        />
        <Slider
          label="Frequency Penalty"
          min={0}
          max={2}
          step={0.1}
          value={values.frequencyPenalty}
          onChange={(frequencyPenalty) => onChange({ ...values, frequencyPenalty })}
          disabled={disabled}
        />
        <Slider
          label="Presence Penalty"
          min={0}
          max={2}
          step={0.1}
          value={values.presencePenalty}
          onChange={(presencePenalty) => onChange({ ...values, presencePenalty })}
          disabled={disabled}
        />

        <div className="space-y-1.5 border-t border-gray-200 pt-4 text-xs text-gray-600">
          <p><strong>Temperature:</strong> lower for consistent output, higher for more variety.</p>
          <p><strong>Top P:</strong> nucleus sampling; lower values keep the wording more focused.</p>
          <p><strong>Frequency penalty:</strong> reduces repeated phrases.</p>
          <p><strong>Presence penalty:</strong> encourages covering new topics.</p>
        </div>
      </CardContent>
    </Card>
  );
}
