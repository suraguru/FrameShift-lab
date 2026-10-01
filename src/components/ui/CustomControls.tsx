import React from "react";
import { Check } from "lucide-react";

export function SectionHeader({
  icon: Icon,
  title,
  rightControl,
}: {
  icon?: React.ElementType;
  title: string;
  rightControl?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-1.5 text-text-muted">
        {Icon && <Icon size={12} />}
        <span className="font-mono text-[11px] font-bold">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightControl}
      </div>
    </div>
  );
}

export function GridSelect({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (val: string) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-sm text-[10px] font-mono transition-colors border ${
              isSelected
                ? "bg-bg-hover text-text-primary border-border-light"
                : "bg-bg text-text-dim border-transparent hover:bg-bg-surface hover:text-text-muted"
            }`}
          >
            {opt.icon}
            {opt.label}
            {isSelected && <div className="w-1 h-1 rounded-full bg-accent-orange absolute top-1 right-1" />}
          </button>
        );
      })}
    </div>
  );
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  suffix?: string;
}) {
  return (
    <div className="space-y-1 mb-3">
      <div className="flex justify-between items-center text-[10px] font-mono text-text-dim">
        <span>{label}</span>
        <span className="text-text-muted">{value.toFixed(step < 1 ? 2 : 0)}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent-green"
      />
    </div>
  );
}

export function ToggleControl({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1 cursor-pointer text-[10px] font-mono text-text-muted">
      <input 
        type="checkbox" 
        checked={value} 
        onChange={(e) => onChange(e.target.checked)} 
        className="accent-accent-green" 
      /> 
      {label}
    </label>
  );
}

export function ColorPalette({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ backgroundColor: c }}
        >
          {value === c && <Check size={12} className="text-white mix-blend-difference" />}
        </button>
      ))}
    </div>
  );
}
