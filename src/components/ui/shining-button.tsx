import * as React from "react";
import { cn } from "@/lib/utils";

export interface ShiningButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const ShiningButton = React.forwardRef<HTMLButtonElement, ShiningButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          "cursor-pointer font-medium px-4 py-[0.4rem] bg-gradient-to-b from-[#B64769] via-[#A03D5C] to-[#8E3653] overflow-hidden relative rounded-full",
          "before:absolute before:w-[0.4rem] before:h-[20rem] before:top-0 before:translate-x-[-8rem] hover:before:translate-x-[7rem] before:duration-[0.8s] before:-skew-x-[10deg] before:transition-all before:bg-white before:blur-[8px]",
          "hover:brightness-110 flex items-center justify-center gap-2 transition-all group text-white",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
      >
        {children}
      </button>
    );
  },
);
ShiningButton.displayName = "ShiningButton";