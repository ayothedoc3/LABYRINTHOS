import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, ChevronRight, ChevronLeft, Sparkles, Star, 
  Trophy, Target, Shield, BookOpen, FileText, Users,
  CheckCircle2, Play, Crown, Award, X, Home
} from 'lucide-react';

// ==================== ONBOARDING CONTEXT ====================
const ONBOARDING_STORAGE_KEY = 'labyrinth_onboarding_completed';
const ONBOARDING_XP_KEY = 'labyrinth_user_xp';

export const hasCompletedOnboarding = () => {
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
};

export const setOnboardingComplete = () => {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  const currentXP = parseInt(localStorage.getItem(ONBOARDING_XP_KEY) || '0');
  localStorage.setItem(ONBOARDING_XP_KEY, String(currentXP + 500));
};

export const getUserXP = () => {
  return parseInt(localStorage.getItem(ONBOARDING_XP_KEY) || '0');
};

export const addUserXP = (amount) => {
  const currentXP = getUserXP();
  localStorage.setItem(ONBOARDING_XP_KEY, String(currentXP + amount));
  return currentXP + amount;
};

export const resetOnboarding = () => {
  localStorage.removeItem(ONBOARDING_STORAGE_KEY);
};

// ==================== PARTICLE BACKGROUND ====================
const ParticleBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(30)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: `hsl(${Math.random() * 60 + 250}, 70%, 60%)`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

// ==================== STEP 1: WELCOME ====================
const OnboardingWelcome = ({ onNext, onSkip }) => {
  const features = [
    { icon: Shield, label: "7-Gate System", desc: "Guided workflow execution" },
    { icon: BookOpen, label: "Playbooks", desc: "Pre-built business strategies" },
    { icon: Users, label: "Talent Matching", desc: "Tier-based assignments" },
    { icon: Target, label: "KPI Tracking", desc: "Automated monitoring" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-8"
    >
      <ParticleBackground />

      <div className="relative z-10 max-w-4xl w-full text-center">
        {/* Logo & Title */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-6 shadow-2xl">
            <Zap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Labyrinth OS</span>
          </h1>
          <p className="text-xl text-purple-200">
            Master the 7-Gate Constraint System
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1, type: "spring" }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
            >
              <feature.icon className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <h3 className="font-semibold text-white">{feature.label}</h3>
              <p className="text-sm text-purple-200">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* XP Preview */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 mb-8"
        >
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-semibold">Complete tutorial to earn 500 XP!</span>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Button
            size="lg"
            onClick={onNext}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-6 text-lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Tutorial
          </Button>
          <button
            onClick={onSkip}
            className="text-purple-300 hover:text-white text-sm"
          >
            Skip Tutorial →
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ==================== STEP 2: GATE EXPLANATION ====================
const OnboardingGates = ({ onNext, onBack }) => {
  const [activeGate, setActiveGate] = useState(1);

  const gates = [
    { num: 1, name: "Strategy Selection", desc: "Choose your business tier (Bronze/Silver/Gold)", color: "from-blue-500 to-blue-600", icon: "🎯" },
    { num: 2, name: "Level Selection", desc: "Pick your phase: Acquire, Maintain, or Scale", color: "from-green-500 to-green-600", icon: "📊" },
    { num: 3, name: "Playbook Selection", desc: "Select pre-built strategies for your function", color: "from-purple-500 to-purple-600", icon: "📘" },
    { num: 4, name: "Talent Matching", desc: "Match team members by tier requirements", color: "from-orange-500 to-orange-600", icon: "👥" },
    { num: 5, name: "SOP Activation", desc: "Trigger relevant standard procedures", color: "from-pink-500 to-pink-600", icon: "📋" },
    { num: 6, name: "Contract Enforcement", desc: "Apply accountability boundaries", color: "from-red-500 to-red-600", icon: "📜" },
    { num: 7, name: "KPI Feedback Loop", desc: "Monitor and learn from results", color: "from-yellow-500 to-yellow-600", icon: "📈" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-8"
    >
      <div className="max-w-5xl w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 mb-4">
            Step 2 of 5
          </Badge>
          <h2 className="text-4xl font-bold text-white mb-2">
            The 7-Gate System
          </h2>
          <p className="text-purple-200">Click each gate to learn more</p>
        </motion.div>

        {/* Gate Path */}
        <div className="relative">
          {/* Connection Line */}
          <div className="absolute top-1/2 left-0 right-0 h-2 bg-gray-700 rounded-full -translate-y-1/2" />
          <motion.div
            className="absolute top-1/2 left-0 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full -translate-y-1/2"
            initial={{ width: 0 }}
            animate={{ width: `${(activeGate / 7) * 100}%` }}
            transition={{ duration: 0.5 }}
          />

          {/* Gates */}
          <div className="relative flex justify-between">
            {gates.map((gate) => (
              <motion.button
                key={gate.num}
                onClick={() => setActiveGate(gate.num)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative w-14 h-14 rounded-full flex items-center justify-center text-2xl
                  transition-all duration-300
                  ${gate.num <= activeGate 
                    ? `bg-gradient-to-br ${gate.color} shadow-lg` 
                    : 'bg-gray-700'
                  }
                  ${gate.num === activeGate ? 'ring-4 ring-white/50 ring-offset-2 ring-offset-transparent' : ''}
                `}
              >
                {gate.icon}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Active Gate Details */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeGate}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gates[activeGate - 1].color} flex items-center justify-center text-3xl`}>
                {gates[activeGate - 1].icon}
              </div>
              <div>
                <div className="text-sm text-purple-300">Gate {activeGate}</div>
                <h3 className="text-2xl font-bold text-white">{gates[activeGate - 1].name}</h3>
              </div>
            </div>
            <p className="text-lg text-purple-100">{gates[activeGate - 1].desc}</p>
            
            {/* Pro tip */}
            <div className="mt-4 p-3 bg-yellow-400/10 rounded-lg border border-yellow-400/30">
              <p className="text-sm text-yellow-300">
                💡 <strong>Pro tip:</strong> Each gate acts as a filter, reducing complexity by eliminating options that don't match your context.
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={onBack} className="border-white/30 text-white hover:bg-white/10">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={onNext} className="bg-gradient-to-r from-blue-500 to-purple-600">
            Continue <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// Helper Badge component for onboarding
const Badge = ({ children, className }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${className}`}>
    {children}
  </span>
);

// ==================== STEP 3: TIER SYSTEM ====================
const OnboardingTiers = ({ onNext, onBack }) => {
  const [selectedTier, setSelectedTier] = useState(null);

  const tiers = [
    {
      num: 1,
      name: "Bronze",
      emoji: "🥉",
      color: "from-gray-400 to-gray-600",
      glow: "shadow-gray-500/30",
      abilities: ["Basic playbooks", "Standard SOPs", "Foundation workflows"],
      unlockText: "Starting tier for all users"
    },
    {
      num: 2,
      name: "Silver",
      emoji: "🥈",
      color: "from-blue-400 to-blue-600",
      glow: "shadow-blue-500/30",
      abilities: ["Advanced playbooks", "Complex workflows", "Cross-function access"],
      unlockText: "Unlock by mastering Bronze"
    },
    {
      num: 3,
      name: "Gold",
      emoji: "🥇",
      color: "from-yellow-400 to-yellow-600",
      glow: "shadow-yellow-500/30",
      abilities: ["Premium playbooks", "Full system access", "Custom workflows"],
      unlockText: "Elite tier for experts"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-8"
    >
      <div className="max-w-5xl w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-12"
        >
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 mb-4">
            Step 3 of 5
          </Badge>
          <h2 className="text-4xl font-bold text-white mb-2">
            The Tier System
          </h2>
          <p className="text-purple-200">Progress through tiers to unlock more capabilities</p>
        </motion.div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.num}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => setSelectedTier(tier.num)}
              className={`
                relative cursor-pointer rounded-2xl p-6 border-2 transition-all
                ${selectedTier === tier.num 
                  ? 'border-white bg-white/20' 
                  : 'border-white/20 bg-white/5 hover:bg-white/10'
                }
              `}
            >
              {/* Tier Badge */}
              <motion.div
                animate={selectedTier === tier.num ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5 }}
                className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center text-4xl mb-4 shadow-lg ${tier.glow}`}
              >
                {tier.emoji}
              </motion.div>

              <h3 className="text-2xl font-bold text-white text-center mb-2">
                {tier.name}
              </h3>
              <p className="text-sm text-purple-300 text-center mb-4">{tier.unlockText}</p>

              {/* Abilities */}
              <div className="space-y-2">
                {tier.abilities.map((ability, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    {ability}
                  </div>
                ))}
              </div>

              {/* Selected indicator */}
              {selectedTier === tier.num && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Info Box */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-400/30 mb-8"
        >
          <div className="flex items-start gap-4">
            <Crown className="w-8 h-8 text-yellow-400 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-white mb-1">How Tiers Work</h4>
              <p className="text-purple-200 text-sm">
                Your tier determines which playbooks and features you can access. 
                Gate 4 (Talent Matching) enforces tier requirements - if a playbook requires Tier 2, 
                only Silver or Gold tier users can execute it. This ensures quality and accountability.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} className="border-white/30 text-white hover:bg-white/10">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button onClick={onNext} className="bg-gradient-to-r from-blue-500 to-purple-600">
            Continue <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== STEP 4: FIRST QUEST ====================
const OnboardingFirstQuest = ({ onNext, onBack }) => {
  const [completedGates, setCompletedGates] = useState([]);
  const [currentGate, setCurrentGate] = useState(1);

  const questGates = [
    { num: 1, name: "Select Strategy", action: "Choose your tier" },
    { num: 2, name: "Pick Level", action: "Select Acquire mode" },
    { num: 3, name: "Choose Playbook", action: "Pick a Sales playbook" },
    { num: 4, name: "Match Talent", action: "Assign a team member" },
  ];

  const completeGate = (gateNum) => {
    if (!completedGates.includes(gateNum)) {
      setCompletedGates([...completedGates, gateNum]);
      if (gateNum < 4) {
        setCurrentGate(gateNum + 1);
      }
    }
  };

  const allComplete = completedGates.length === 4;

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-8"
    >
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30 mb-4">
            Step 4 of 5
          </Badge>
          <h2 className="text-4xl font-bold text-white mb-2">
            🧙‍♂️ Your First Quest
          </h2>
          <p className="text-purple-200">Complete these gates to see the system in action</p>
        </motion.div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-purple-300 mb-2">
            <span>Quest Progress</span>
            <span>{completedGates.length}/4 Gates</span>
          </div>
          <Progress value={(completedGates.length / 4) * 100} className="h-3" />
        </div>

        {/* Quest Gates */}
        <div className="space-y-4 mb-8">
          {questGates.map((gate, index) => {
            const isCompleted = completedGates.includes(gate.num);
            const isCurrent = currentGate === gate.num && !isCompleted;
            const isLocked = gate.num > currentGate && !isCompleted;

            return (
              <motion.div
                key={gate.num}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  relative rounded-xl p-4 border-2 transition-all
                  ${isCompleted ? 'bg-green-500/20 border-green-400' : ''}
                  ${isCurrent ? 'bg-blue-500/20 border-blue-400 ring-2 ring-blue-400/50' : ''}
                  ${isLocked ? 'bg-gray-800/50 border-gray-600 opacity-60' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? 'bg-blue-500 text-white' : ''}
                      ${isLocked ? 'bg-gray-600 text-gray-400' : ''}
                    `}>
                      {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : gate.num}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isLocked ? 'text-gray-500' : 'text-white'}`}>
                        Gate {gate.num}: {gate.name}
                      </h3>
                      <p className={`text-sm ${isLocked ? 'text-gray-600' : 'text-purple-300'}`}>
                        {gate.action}
                      </p>
                    </div>
                  </div>

                  {isCurrent && (
                    <Button
                      onClick={() => completeGate(gate.num)}
                      className="bg-gradient-to-r from-green-500 to-emerald-600"
                    >
                      Complete
                    </Button>
                  )}
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium"
                    >
                      ✓ Done
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Wizard Helper */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-400/30 mb-8"
        >
          <div className="flex items-start gap-3">
            <div className="text-3xl">🧙‍♂️</div>
            <div>
              <p className="text-purple-100">
                {!allComplete ? (
                  <>
                    <strong>Wizard says:</strong> "Click 'Complete' on each gate to simulate passing through. 
                    In the real app, you'll make actual selections!"
                  </>
                ) : (
                  <>
                    <strong>Wizard says:</strong> "Excellent work, apprentice! You've mastered the basics. 
                    Now claim your reward! 🎉"
                  </>
                )}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} className="border-white/30 text-white hover:bg-white/10">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button 
            onClick={onNext} 
            disabled={!allComplete}
            className={allComplete ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gray-600"}
          >
            {allComplete ? "Claim Reward" : "Complete all gates"} <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== STEP 5: COMPLETION ====================
const OnboardingComplete = ({ onFinish }) => {
  const [showFireworks, setShowFireworks] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowFireworks(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-8"
    >
      {/* Fireworks/Confetti */}
      {showFireworks && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 5],
                left: `${Math.random() * 100}%`,
                top: '50%',
              }}
              initial={{ scale: 0, y: 0 }}
              animate={{
                scale: [0, 1, 0],
                y: [0, -(Math.random() * 500 + 200)],
                x: (Math.random() - 0.5) * 400,
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 2 + Math.random(),
                delay: Math.random() * 0.5,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Trophy */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="mb-8"
        >
          <motion.div
            animate={{ 
              boxShadow: [
                "0 0 30px rgba(255, 215, 0, 0.3)",
                "0 0 80px rgba(255, 215, 0, 0.6)",
                "0 0 30px rgba(255, 215, 0, 0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"
          >
            <Trophy className="w-16 h-16 text-white" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-5xl font-bold text-white mb-4">
            🎉 Congratulations!
          </h1>
          <p className="text-xl text-purple-200 mb-8">
            You've completed the Labyrinth OS Tutorial
          </p>
        </motion.div>

        {/* Rewards */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="space-y-4 mb-12"
        >
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
            <Zap className="w-8 h-8" />
            <span className="text-3xl font-bold">+500 XP</span>
          </div>

          <div className="flex justify-center gap-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20"
            >
              <Award className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <span className="text-sm text-white">Tutorial Master</span>
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20"
            >
              <Star className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
              <span className="text-sm text-white">Quick Learner</span>
            </motion.div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Button
            size="lg"
            onClick={onFinish}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-12 py-6 text-lg"
          >
            <Home className="w-5 h-5 mr-2" />
            Enter Labyrinth OS
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ==================== MAIN ONBOARDING CONTAINER ====================
export const OnboardingContainer = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);

  const handleSkip = () => {
    setOnboardingComplete();
    onComplete?.();
  };

  const handleFinish = () => {
    setOnboardingComplete();
    onComplete?.();
  };

  const steps = {
    1: <OnboardingWelcome onNext={() => setCurrentStep(2)} onSkip={handleSkip} />,
    2: <OnboardingGates onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />,
    3: <OnboardingTiers onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />,
    4: <OnboardingFirstQuest onNext={() => setCurrentStep(5)} onBack={() => setCurrentStep(3)} />,
    5: <OnboardingComplete onFinish={handleFinish} />,
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <AnimatePresence mode="wait">
        {steps[currentStep]}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingContainer;
