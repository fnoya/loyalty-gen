import * as React from "react";

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = "", orientation = "horizontal", ...props }, ref) => {
    const orientationClass =
      orientation === "vertical" ? "h-full w-px" : "h-px w-full";
    return (
      <div
        ref={ref}
        className={`bg-slate-200 ${orientationClass} ${className}`}
        {...props}
      />
    );
  },
);
Separator.displayName = "Separator";

export { Separator };
