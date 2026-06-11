"use client";

import { type ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  LoaderCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { useState } from "react";

export const ToolCallBlock: ToolCallMessagePartComponent = ({ toolName, args, result, isError }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRunning = result === undefined && !isError;

  return (
    <div className="mt-2.5 overflow-hidden rounded-xl glass animate-slide-up">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-[var(--duration-fast)] hover:bg-[var(--bg-subtle)]"
      >
        <div className={`flex size-6 items-center justify-center rounded-md transition-colors duration-[var(--duration-normal)] ${
          isRunning ? "bg-info/10" : isError ? "bg-danger/10" : "bg-accent/10"
        }`}>
          {isRunning ? (
            <LoaderCircleIcon className="size-3.5 animate-spin text-info" />
          ) : isError ? (
            <XCircleIcon className="size-3.5 text-danger" />
          ) : (
            <CheckCircle2Icon className="size-3.5 text-accent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="font-mono text-xs font-medium text-foreground">{toolName}</span>
          {!isRunning && (
            <span className={`ml-2 text-[10px] font-medium ${isError ? "text-danger" : "text-accent-dim"}`}>
              {isError ? "Failed" : "Done"}
            </span>
          )}
          {isRunning && (
            <span className="ml-2 text-[10px] font-medium text-info">Running...</span>
          )}
        </div>
        <ChevronDownIcon className={`size-3.5 text-muted-dim transition-transform duration-[var(--duration-fast)] ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {/* Body */}
      {isExpanded && (
        <div className="border-t border-[var(--glass-border)] bg-[var(--bg-inset)] p-3 animate-slide-down">
          <div className="space-y-2">
            {args && Object.keys(args).length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-dim">
                  Arguments
                </div>
                <pre className="overflow-x-auto rounded-lg bg-surface-1 p-2.5 text-[11px] leading-relaxed text-foreground-dim">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
            )}

            {result !== undefined && (
              <div>
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-dim">
                  Result
                </div>
                <pre className={`overflow-x-auto rounded-lg p-2.5 text-[11px] leading-relaxed ${
                  isError ? "bg-danger/5 text-danger" : "bg-surface-1 text-foreground-dim"
                }`}>
                  {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
