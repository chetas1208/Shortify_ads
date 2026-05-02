import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full resize-none rounded-[24px] border border-white/10 bg-[rgba(9,16,24,0.82)] px-4 py-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-300/45 focus:ring-4 focus:ring-emerald-300/10",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
