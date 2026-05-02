import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(143,245,195,0.45)]",
  {
    variants: {
      variant: {
        default:
          "border-emerald-200/30 bg-[linear-gradient(180deg,rgba(162,255,215,0.98),rgba(95,231,184,0.92))] text-slate-950 shadow-[0_16px_48px_rgba(76,224,177,0.28)] hover:brightness-105 active:translate-y-px",
        secondary:
          "border-white/10 bg-white/[0.055] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.09]",
        ghost: "border-transparent bg-transparent text-zinc-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white",
        outline:
          "border-[rgba(143,245,195,0.18)] bg-[rgba(143,245,195,0.06)] text-emerald-100 hover:bg-[rgba(143,245,195,0.12)]",
        danger: "border-red-300/20 bg-red-400/90 text-red-950 hover:bg-red-300"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-[0.95rem]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, size, variant, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ className, size, variant }))} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";
