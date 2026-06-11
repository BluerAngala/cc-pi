"use client";

import { ThreadPrimitive } from "@assistant-ui/react";
import {
  Code2Icon,
  FileSearchIcon,
  GitBranchIcon,
  SparklesIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react";

const capabilities = [
  {
    icon: Code2Icon,
    label: "Code editing",
    description: "Read, write, and refactor source files",
  },
  {
    icon: TerminalIcon,
    label: "Command execution",
    description: "Run shell commands in your workspace",
  },
  {
    icon: FileSearchIcon,
    label: "Code search",
    description: "Search across files with semantic understanding",
  },
  {
    icon: GitBranchIcon,
    label: "Git operations",
    description: "Stage, commit, diff, and manage branches",
  },
  {
    icon: ZapIcon,
    label: "Diagnostics",
    description: "Analyze errors and suggest fixes",
  },
];

const suggestionPrompts = [
  {
    prompt: "Read the repo README and give me an onboarding roadmap",
    icon: FileSearchIcon,
  },
  {
    prompt: "Find the most dangerous coupling point in recent changes",
    icon: Code2Icon,
  },
  {
    prompt: "Review the current diff and flag the riskiest change",
    icon: GitBranchIcon,
  },
];

export function WelcomeState() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl animate-fade-in">
        {/* Hero */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl glass-accent shadow-md animate-float">
            <SparklesIcon className="size-7 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pi Agent Workspace
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
            A coding agent with real tool access. Ask it to read files, run commands, edit code, and debug issues in your workspace.
          </p>
        </div>

        {/* Capabilities strip */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {capabilities.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-muted transition-colors duration-[var(--duration-fast)] hover:text-foreground-dim">
              <Icon className="size-3 text-accent-dim" />
              {label}
            </div>
          ))}
        </div>

        {/* Suggestion cards */}
        <div className="grid gap-2.5 stagger-children">
          {suggestionPrompts.map(({ prompt, icon: Icon }) => (
            <ThreadPrimitive.Suggestion
              key={prompt}
              prompt={prompt}
              method="replace"
              autoSend
              className="group flex items-center gap-3 rounded-xl glass px-4 py-3 text-left transition-all duration-[var(--duration-normal)] hover:glass-accent hover:shadow-sm hover:scale-[1.01]"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-muted)] text-muted transition-all duration-[var(--duration-normal)] group-hover:bg-accent/10 group-hover:text-accent group-hover:shadow-xs">
                <Icon className="size-3.5" />
              </div>
              <span className="text-sm text-foreground-dim transition-colors duration-[var(--duration-fast)] group-hover:text-foreground">
                {prompt}
              </span>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>

        {/* Footer hint */}
        <div className="mt-6 text-center text-[10px] text-muted-dim">
          Configure your API key to get started
        </div>
      </div>
    </div>
  );
}
