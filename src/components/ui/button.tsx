import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-standard)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0 [&_svg]:size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white shadow-1 hover:bg-brand-hover",
        secondary: "bg-surface text-foreground border border-border-strong shadow-1 hover:bg-surface-3",
        tonal: "bg-brand-soft text-brand-ink hover:bg-[color-mix(in_oklab,var(--brand)_16%,var(--surface))]",
        ghost: "text-muted hover:bg-surface-3 hover:text-foreground",
        danger: "bg-danger text-white shadow-1 hover:brightness-95",
        success: "bg-success text-white shadow-1 hover:brightness-95",
        link: "text-brand-ink underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 rounded-md px-3 text-[13px]",
        md: "h-9 rounded-lg px-3.5 text-[13.5px]",
        lg: "h-11 rounded-lg px-5 text-[15px]",
        icon: "size-9 rounded-lg",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, isLoading, loadingText, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>
      {asChild ? (
        children
      ) : isLoading ? (
        <>
          <LoaderCircle className="animate-spin" aria-hidden />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

export { buttonVariants };
