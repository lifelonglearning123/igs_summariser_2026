import React from 'react';

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
}

export function Slider({
  label,
  min = 0,
  max = 1,
  step = 0.01,
  value = 0.5,
  onChange,
  ...props
}: SliderProps) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          {...props}
        />
        <span className="text-sm font-medium text-gray-700 w-12 text-right">{value.toFixed(2)}</span>
      </div>
    </div>
  );
}
