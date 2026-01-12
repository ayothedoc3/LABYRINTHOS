import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Info, Lightbulb, Sparkles, Target, Zap } from 'lucide-react';

// Gamified tooltips configuration for different elements
export const TOOLTIPS = {
  // Labyrinth OS Elements
  playbook: {
    title: "📚 Playbook",
    description: "Your strategic battle plan! Playbooks define HOW to win in each function (Sales, Marketing, etc.) at different growth stages.",
    tip: "💡 Pro tip: Start with ACQUIRE playbooks to build your foundation, then MAINTAIN and SCALE!"
  },
  sop: {
    title: "📋 Standard Operating Procedure",
    description: "Step-by-step guides that ensure consistent execution. Think of them as your team's cheat codes!",
    tip: "⚡ Achievement unlocked: Master an SOP to level up your efficiency!"
  },
  talent: {
    title: "👤 Talent Profile",
    description: "Define the perfect hero for each role. Competency scores help you find the right fit.",
    tip: "🎯 Match talent competencies to role requirements for 10x results!"
  },
  contract: {
    title: "📄 Contract",
    description: "Define clear boundaries and deliverables. Protects both you and your clients!",
    tip: "🛡️ Clear boundaries = Happy clients + Profitable projects"
  },
  kpi: {
    title: "📊 Key Performance Indicator",
    description: "Track your progress with measurable metrics. What gets measured gets managed!",
    tip: "📈 Green = Winning | Yellow = Watch | Red = Action needed!"
  },
  gate: {
    title: "🚪 Gate System",
    description: "Your 7-step quality checkpoint. Each gate ensures you're ready before moving forward.",
    tip: "🎮 Pass all 7 gates to unlock maximum business power!"
  },
  
  // Gate Descriptions
  G1_SCOPE: {
    title: "🎯 G1: Scope Gate",
    description: "Define the mission! Validate market need, assess feasibility, and set clear boundaries.",
    tip: "First gate = First victory. Get this right!"
  },
  G2_PLAYBOOK: {
    title: "📚 G2: Playbook Gate",
    description: "Select your strategy! Choose the right playbook for your mission.",
    tip: "The right playbook = The right outcome"
  },
  G3_TALENT: {
    title: "👥 G3: Talent Gate",
    description: "Assemble your team! Match skills to requirements.",
    tip: "A players only! Quality over quantity"
  },
  G4_CONTRACT: {
    title: "📝 G4: Contract Gate",
    description: "Set the rules! Define deliverables and boundaries.",
    tip: "Clear expectations = Smooth execution"
  },
  G5_SOP: {
    title: "⚙️ G5: SOP Gate",
    description: "Load your procedures! Ensure everyone knows the steps.",
    tip: "Consistent process = Consistent results"
  },
  G6_EXECUTION: {
    title: "🚀 G6: Execution Gate",
    description: "Launch time! Execute with precision and monitor progress.",
    tip: "Execute fast, iterate faster!"
  },
  G7_COMPLETION: {
    title: "🏆 G7: Completion Gate",
    description: "Victory lap! Validate deliverables and celebrate success.",
    tip: "Document learnings for next time!"
  },

  // WorkflowViz Elements
  workflow: {
    title: "🔄 Workflow",
    description: "Visual representation of your process. Connect nodes to show how work flows!",
    tip: "🎨 Drag nodes, draw connections, build your perfect process!"
  },
  node_issue: {
    title: "🔴 Issue Node",
    description: "A problem to solve or trigger event. Issues kick off actions!",
    tip: "Every workflow starts with identifying the issue"
  },
  node_action: {
    title: "🔵 Action Node",
    description: "A task to complete. Actions move work forward!",
    tip: "Break big actions into smaller steps for clarity"
  },
  node_resource: {
    title: "🟢 Resource Node",
    description: "Tools, people, or assets needed. Resources enable actions!",
    tip: "Link resources to the actions that need them"
  },
  node_deliverable: {
    title: "🟣 Deliverable Node",
    description: "An output or result. Deliverables prove progress!",
    tip: "Clear deliverables = Clear success metrics"
  },
  node_task: {
    title: "🔷 Task Node",
    description: "A specific work item. Tasks are the building blocks!",
    tip: "Assign owners and deadlines to tasks"
  },
  node_blocker: {
    title: "🟠 Blocker Node",
    description: "An obstacle to overcome. Blockers need resolution!",
    tip: "Address blockers quickly to keep flow moving"
  },
  node_note: {
    title: "📝 Note Node",
    description: "Additional context or information. Notes add clarity!",
    tip: "Use notes for important context that doesn't fit elsewhere"
  },

  // AI Features
  ai_generate: {
    title: "✨ AI Generation",
    description: "Let AI create content from your description! Just describe what you need in plain English.",
    tip: "Be specific in your description for better results!"
  },
  byok: {
    title: "🔑 Bring Your Own Key",
    description: "Use your own API keys for AI providers. More control, your usage, your costs.",
    tip: "OpenAI, Anthropic, and Gemini work with Emergent Key by default!"
  },

  // Layers
  strategic: {
    title: "🏔️ Strategic Layer",
    description: "The big picture! High-level goals and major initiatives.",
    tip: "Think quarters and years, not days"
  },
  tactical: {
    title: "⚔️ Tactical Layer",
    description: "The game plan! Projects and campaigns that achieve strategic goals.",
    tip: "Break strategy into manageable campaigns"
  },
  execution: {
    title: "🎯 Execution Layer",
    description: "The action! Daily tasks and specific work items.",
    tip: "Where the rubber meets the road"
  }
};

// Tooltip wrapper component
export const InfoTooltip = ({ 
  tooltipKey, 
  children, 
  side = "top",
  showIcon = true,
  iconSize = "w-4 h-4",
  customContent = null
}) => {
  const tooltip = TOOLTIPS[tooltipKey];
  
  if (!tooltip && !customContent) {
    return children || null;
  }

  const content = customContent || tooltip;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {children}
            {showIcon && (
              <HelpCircle className={`${iconSize} text-muted-foreground hover:text-primary transition-colors`} />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <div className="space-y-1">
            {content.title && (
              <p className="font-semibold">{content.title}</p>
            )}
            {content.description && (
              <p className="text-sm text-muted-foreground">{content.description}</p>
            )}
            {content.tip && (
              <p className="text-xs text-primary mt-2 border-t pt-1">{content.tip}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Simple inline tooltip for quick hints
export const HintTooltip = ({ text, children, side = "top" }) => (
  <TooltipProvider>
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side}>
        <p className="text-sm">{text}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

// Badge with built-in tooltip
export const TooltipBadge = ({ tooltipKey, children, className = "" }) => {
  const tooltip = TOOLTIPS[tooltipKey];
  
  return (
    <InfoTooltip tooltipKey={tooltipKey} showIcon={false}>
      <span className={`inline-flex items-center ${className}`}>
        {children}
      </span>
    </InfoTooltip>
  );
};

export default InfoTooltip;
