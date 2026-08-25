import { AlertTriangle, SearchX } from "lucide-react";

export function StateMessage({
  variant,
  title,
  description,
  action,
}: {
  variant: "empty" | "error";
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const Icon = variant === "empty" ? SearchX : AlertTriangle;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-black/15 py-16 text-center dark:border-white/15">
      <Icon size={32} className={variant === "error" ? "text-accent" : "text-gray-400"} />
      <p className="text-lg font-bold text-slate-900 dark:text-white">{title}</p>
      {description && <p className="max-w-md text-sm text-gray-500">{description}</p>}
      {action}
    </div>
  );
}
