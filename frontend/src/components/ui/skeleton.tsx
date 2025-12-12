import { cn } from "@/lib/utils"

function Skeleton({
  className,
  "data-testid": dataTestId,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { "data-testid"?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-100 dark:bg-slate-800", className)}
      data-testid={dataTestId || "skeleton"}
      {...props}
    />
  )
}

export { Skeleton }
