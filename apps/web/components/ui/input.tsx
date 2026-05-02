import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[20px] border border-white/10 bg-[rgba(9,16,24,0.82)] px-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-300/45 focus:ring-4 focus:ring-emerald-300/10",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
