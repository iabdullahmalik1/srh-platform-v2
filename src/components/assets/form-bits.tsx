"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { cn, fmt } from "@/lib/utils";

const show = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? "" : Number.isInteger(v) ? fmt.num(v) : String(v));

/**
 * Numeric input that keeps the typed text (so "4." or "1,000" stay editable)
 * and reports a parsed number, or undefined when empty.
 */
export function NumberInput({ value, onValueChange, id, invalid, placeholder, suffix, prefix, integer, className, ...rest }: {
  value: number | undefined;
  onValueChange: (v: number | undefined) => void;
  id: string;
  invalid?: boolean;
  placeholder?: string;
  suffix?: string;
  prefix?: string;
  integer?: boolean;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "id" | "prefix">) {
  const [text, setText] = React.useState(show(value));
  const last = React.useRef(value);
  React.useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(show(value));
    }
  }, [value]);
  return (
    <div className={cn("relative", className)}>
      {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-subtle">{prefix}</span>}
      <Input
        id={id}
        inputMode={integer ? "numeric" : "decimal"}
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn("tabular", prefix && "pl-12", suffix && "pr-14")}
        onChange={(e) => {
          const raw = e.target.value.replace(integer ? /[^\d,]/g : /[^\d.,]/g, "");
          setText(raw);
          const n = raw.trim() === "" ? undefined : Number(raw.replace(/,/g, ""));
          last.current = n;
          onValueChange(n !== undefined && Number.isFinite(n) ? n : undefined);
        }}
        onBlur={() => setText(show(last.current))}
        {...rest}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-subtle">{suffix}</span>}
    </div>
  );
}

/** Selectable card used for radio and multi-select choices in the wizard. */
export function ChoiceCard({ id, selected, onClick, role = "radio", children, className, disabled, indicator = "radio" }: {
  id?: string;
  selected: boolean;
  onClick: () => void;
  role?: "radio" | "checkbox";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  indicator?: "radio" | "check" | "none";
}) {
  return (
    <button
      id={id}
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex w-full items-start gap-3 rounded-xl border bg-surface p-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        selected ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-border hover:border-border-strong",
        className,
      )}
    >
      <span className="min-w-0 flex-1">{children}</span>
      {indicator !== "none" && (
        <span aria-hidden className={cn("mt-0.5 grid size-[18px] shrink-0 place-items-center border transition-colors", indicator === "radio" ? "rounded-full" : "rounded-[5px]", selected ? "border-brand bg-brand text-white" : "border-border-strong bg-surface")}>
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}
