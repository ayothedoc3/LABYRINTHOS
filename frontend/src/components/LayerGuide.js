import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  X, ChevronRight, ChevronLeft, Lightbulb, 
  MousePointer2, Zap, Target, Home, Layers
} from 'lucide-react';

// Storage key for tracking guide completion
const GUIDE_STORAGE_KEY = 'workflowviz_layer_guide_completed';
const GUIDE_DISMISSED_KEY = 'workflowviz_layer_guide_dismissed';

export const hasCompletedGuide = () => {
  return localStorage.getItem(GUIDE_STORAGE_KEY) === 'true';
};

export const setGuideCompleted = () => {
  localStorage.setItem(GUIDE_STORAGE_KEY, 'true');
};

export const resetGuide = () => {
  localStorage.removeItem(GUIDE_STORAGE_KEY);
  localStorage.removeItem(GUIDE_DISMISSED_KEY);
};

export const isGuideDismissed = () => {
  return localStorage.getItem(GUIDE_DISMISSED_KEY) === 'true';
};

export const dismissGuide = () => {
  localStorage.setItem(GUIDE_DISMISSED_KEY, 'true');
};

// Layer-specific guide content
const LAYER_GUIDES = {
  STRATEGIC: {
    title: "🏔️ Strategic Layer",
    subtitle: "High-level overview of your workflow",
    steps: [
      {
        icon: Layers,
        title: "You're at the Top Level",
        description: "This is the Strategic layer - the bird's eye view of your entire workflow process."
      },
      {
        icon: Zap,
        title: "Look for ACTION Nodes (Blue)",
        description: "Blue ACTION nodes are special - they contain sub-workflows that you can drill into for more detail."
      },
      {
        icon: MousePointer2,
        title: "Double-click to Drill Down",
        description: "Double-click any blue ACTION node to navigate to its Tactical layer and see the detailed steps inside."
      }
    ],
    nextAction: "Double-click a blue ACTION node to explore deeper →",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200"
  },
  TACTICAL: {
    title: "⚔️ Tactical Layer",
    subtitle: "Detailed breakdown of the action",
    steps: [
      {
        icon: Target,
        title: "You've Drilled Down!",
        description: "Welcome to the Tactical layer - here you see the detailed steps that make up the parent ACTION."
      },
      {
        icon: Zap,
        title: "More ACTIONs to Explore",
        description: "If you see more blue ACTION nodes here, you can drill down further to the Execution layer."
      },
      {
        icon: Home,
        title: "Navigate with Breadcrumb",
        description: "Use the breadcrumb trail at the top to go back to Strategic level or switch between parent nodes."
      }
    ],
    nextAction: "Double-click another ACTION node or use breadcrumb to go back ↑",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200"
  },
  EXECUTION: {
    title: "🎯 Execution Layer",
    subtitle: "Ground-level task details",
    steps: [
      {
        icon: Target,
        title: "You're at the Deepest Level",
        description: "This is the Execution layer - the most granular view showing individual tasks and deliverables."
      },
      {
        icon: Lightbulb,
        title: "This is the Bottom",
        description: "You cannot drill down further from here. This is where the actual work gets done!"
      },
      {
        icon: Home,
        title: "Navigate Back Up",
        description: "Use the breadcrumb trail to navigate back to Tactical or Strategic layers."
      }
    ],
    nextAction: "Use the breadcrumb to navigate back up the hierarchy ↑",
    color: "from-green-500 to-emerald-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200"
  }
};

// Main Layer Guide Component
export const LayerGuide = ({ 
  layer = 'STRATEGIC', 
  isVisible = true,
  onDismiss,
  position = 'bottom-right' // 'bottom-right', 'bottom-left', 'top-right', 'center'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const guideContent = LAYER_GUIDES[layer] || LAYER_GUIDES.STRATEGIC;
  const totalSteps = guideContent.steps.length;

  // Show guide when layer changes (with small delay for animation)
  useEffect(() => {
    if (!isGuideDismissed()) {
      setCurrentStep(0);
      setMinimized(false);
      const timer = setTimeout(() => setShowGuide(true), 500);
      return () => clearTimeout(timer);
    }
  }, [layer]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Completed all steps
      setGuideCompleted();
      setMinimized(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDismiss = () => {
    dismissGuide();
    setShowGuide(false);
    onDismiss?.();
  };

  const handleMinimize = () => {
    setMinimized(true);
  };

  const handleExpand = () => {
    setMinimized(false);
    setCurrentStep(0);
  };

  if (!isVisible || !showGuide) return null;

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-20 right-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  // Minimized bubble view
  if (minimized) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className={`fixed ${positionClasses[position]} z-50`}
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExpand}
          className={`
            w-14 h-14 rounded-full shadow-lg flex items-center justify-center
            bg-gradient-to-br ${guideContent.color} text-white
            border-2 border-white/30
          `}
        >
          <Lightbulb className="w-6 h-6" />
        </motion.button>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute -top-2 -right-2"
        >
          <span className="flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-yellow-500 text-xs items-center justify-center text-white font-bold">?</span>
          </span>
        </motion.div>
      </motion.div>
    );
  }

  const currentStepData = guideContent.steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className={`fixed ${positionClasses[position]} z-50 w-80`}
      >
        <div className={`
          rounded-2xl shadow-2xl overflow-hidden
          ${guideContent.bgColor} ${guideContent.borderColor} border-2
        `}>
          {/* Header */}
          <div className={`bg-gradient-to-r ${guideContent.color} text-white p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{guideContent.title}</h3>
                <p className="text-sm text-white/80">{guideContent.subtitle}</p>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={handleMinimize}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Minimize"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Don't show again"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Step indicators */}
            <div className="flex gap-1.5 mt-3">
              {guideContent.steps.map((_, idx) => (
                <motion.div
                  key={idx}
                  className={`h-1.5 rounded-full flex-1 ${
                    idx === currentStep ? 'bg-white' : 'bg-white/30'
                  }`}
                  animate={idx === currentStep ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.5 }}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                    bg-gradient-to-br ${guideContent.color}
                  `}>
                    <StepIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{currentStepData.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{currentStepData.description}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Next Action Hint */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800 font-medium">
                💡 {guideContent.nextAction}
              </p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="text-gray-600"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              
              <span className="text-sm text-gray-500">
                {currentStep + 1} of {totalSteps}
              </span>
              
              <Button
                size="sm"
                onClick={handleNext}
                className={`bg-gradient-to-r ${guideContent.color} text-white hover:opacity-90`}
              >
                {currentStep === totalSteps - 1 ? 'Got it!' : 'Next'} 
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* Decorative arrow pointing to canvas */}
        <motion.div
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute -left-6 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <ChevronLeft className="w-6 h-6" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact inline guide for the toolbar
export const LayerGuideBadge = ({ layer, onClick }) => {
  const guideContent = LAYER_GUIDES[layer] || LAYER_GUIDES.STRATEGIC;
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        bg-gradient-to-r ${guideContent.color} text-white shadow-md
        hover:shadow-lg transition-shadow
      `}
    >
      <Lightbulb className="w-4 h-4" />
      <span>Guide</span>
    </motion.button>
  );
};

// Quick tooltip for action hints
export const ActionHint = ({ layer, show = true }) => {
  if (!show) return null;

  const hints = {
    STRATEGIC: "Double-click blue ACTION nodes to drill down",
    TACTICAL: "Double-click ACTIONs for Execution level, or use breadcrumb to go back",
    EXECUTION: "You're at the deepest level. Use breadcrumb to navigate back up"
  };

  const colors = {
    STRATEGIC: "bg-blue-500",
    TACTICAL: "bg-amber-500", 
    EXECUTION: "bg-green-500"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-white
        ${colors[layer]} shadow-md
      `}
    >
      <MousePointer2 className="w-3 h-3" />
      <span>{hints[layer]}</span>
    </motion.div>
  );
};

export default LayerGuide;
