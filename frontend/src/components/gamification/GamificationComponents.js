import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, Star, Zap, Lock, Unlock, ChevronRight,
  Award, Sparkles, Crown, Shield, Target, CheckCircle2,
  X
} from 'lucide-react';

// ==================== ANIMATED TIER BADGE ====================
export const AnimatedTierBadge = ({ tier, size = "md", showLabel = true, animate = true }) => {
  const tierConfig = {
    1: {
      name: "Bronze",
      emoji: "🥉",
      gradient: "from-gray-400 to-gray-600",
      glow: "shadow-gray-500/50",
      border: "border-gray-400",
      textColor: "text-gray-100"
    },
    2: {
      name: "Silver", 
      emoji: "🥈",
      gradient: "from-blue-400 to-blue-600",
      glow: "shadow-blue-500/50",
      border: "border-blue-400",
      textColor: "text-blue-100"
    },
    3: {
      name: "Gold",
      emoji: "🥇",
      gradient: "from-yellow-400 to-yellow-600",
      glow: "shadow-yellow-500/50",
      border: "border-yellow-400",
      textColor: "text-yellow-100"
    }
  };

  const config = tierConfig[tier] || tierConfig[1];
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <motion.div
      initial={animate ? { scale: 0, rotate: -180 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.05 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full
        bg-gradient-to-r ${config.gradient}
        ${config.textColor} ${sizeClasses[size]}
        shadow-lg ${config.glow}
        border ${config.border}
        font-semibold
      `}
    >
      <motion.span
        animate={animate ? { 
          rotate: [0, 10, -10, 0],
          scale: [1, 1.2, 1]
        } : {}}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          repeatDelay: 3 
        }}
      >
        {config.emoji}
      </motion.span>
      {showLabel && <span>Tier {tier}</span>}
      {tier === 3 && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute -top-1 -right-1"
        >
          <Sparkles className="w-3 h-3 text-yellow-300" />
        </motion.div>
      )}
    </motion.div>
  );
};

// ==================== GATE PROGRESS BAR ====================
export const GateProgressBar = ({ 
  currentGate = 1, 
  totalGates = 7, 
  xp = 0,
  maxXp = 100,
  showXP = true,
  animated = true 
}) => {
  const progress = (currentGate / totalGates) * 100;
  const xpProgress = (xp / maxXp) * 100;

  const gateLabels = [
    "Strategy",
    "Level",
    "Playbook",
    "Talent",
    "SOP",
    "Contract",
    "KPI"
  ];

  return (
    <div className="w-full space-y-3">
      {/* XP Bar */}
      {showXP && (
        <div className="flex items-center gap-3">
          <motion.div
            initial={animated ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold"
          >
            <Zap className="w-3 h-3" />
            <span>{xp} XP</span>
          </motion.div>
          <div className="flex-1">
            <motion.div 
              className="h-2 bg-gray-200 rounded-full overflow-hidden"
              initial={animated ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
                initial={animated ? { width: 0 } : false}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </motion.div>
          </div>
          <span className="text-xs text-muted-foreground">{maxXp} XP</span>
        </div>
      )}

      {/* Gate Progress */}
      <div className="relative">
        {/* Progress Track */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
            initial={animated ? { width: 0 } : false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </div>

        {/* Gate Markers */}
        <div className="absolute inset-0 flex justify-between items-center px-1">
          {gateLabels.map((label, index) => {
            const gateNum = index + 1;
            const isPassed = gateNum < currentGate;
            const isCurrent = gateNum === currentGate;
            const isFuture = gateNum > currentGate;

            return (
              <motion.div
                key={gateNum}
                initial={animated ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <motion.div
                  className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${isPassed ? 'bg-green-500 text-white' : ''}
                    ${isCurrent ? 'bg-blue-500 text-white ring-2 ring-blue-300 ring-offset-2' : ''}
                    ${isFuture ? 'bg-gray-300 text-gray-600' : ''}
                  `}
                  whileHover={{ scale: 1.2 }}
                >
                  {isPassed ? <CheckCircle2 className="w-4 h-4" /> : gateNum}
                </motion.div>
                
                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Gate {gateNum}: {label}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ==================== ACHIEVEMENT TOAST ====================
export const AchievementToast = ({ 
  title, 
  description, 
  xp = 10, 
  icon: Icon = Trophy,
  onClose,
  autoClose = true,
  duration = 5000 
}) => {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="fixed top-4 right-4 z-50"
    >
      <div className="relative overflow-hidden rounded-lg border-2 border-yellow-400 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 shadow-2xl min-w-[300px]">
        {/* Sparkle effects */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute top-2 left-4">
            <Sparkles className="w-4 h-4 text-yellow-300" />
          </div>
          <div className="absolute bottom-2 right-8">
            <Sparkles className="w-3 h-3 text-yellow-300" />
          </div>
          <div className="absolute top-4 right-16">
            <Star className="w-3 h-3 text-yellow-300" />
          </div>
        </motion.div>

        <div className="relative flex items-start gap-3">
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-yellow-400" />
            </div>
          </motion.div>

          <div className="flex-1">
            <motion.h3
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-bold text-lg"
            >
              🎉 {title}
            </motion.h3>
            <p className="text-sm text-purple-100 mt-1">{description}</p>
            
            {/* XP Badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold"
            >
              <Zap className="w-3 h-3" />
              +{xp} XP
            </motion.div>
          </div>

          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress bar for auto-close */}
        {autoClose && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-yellow-400"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
          />
        )}
      </div>
    </motion.div>
  );
};

// ==================== TIER BLOCK MODAL ====================
export const TierBlockModal = ({ 
  isOpen, 
  onClose, 
  requiredTier = 2, 
  currentTier = 1,
  featureName = "this feature",
  onUpgrade
}) => {
  if (!isOpen) return null;

  const tierNames = { 1: "Bronze", 2: "Silver", 3: "Gold" };
  const tierEmojis = { 1: "🥉", 2: "🥈", 3: "🥇" };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-purple-500/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Lock Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-6"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Lock className="w-10 h-10 text-white" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-center text-white mb-2"
          >
            🔒 Level Up Required!
          </motion.h2>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-300 text-center mb-6"
          >
            {featureName} requires <span className="text-yellow-400 font-bold">{tierNames[requiredTier]} Tier</span> or higher
          </motion.p>

          {/* Tier Comparison */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-4 mb-6"
          >
            <div className="text-center">
              <div className="text-3xl mb-1">{tierEmojis[currentTier]}</div>
              <div className="text-sm text-gray-400">Your Tier</div>
              <div className="text-white font-bold">{tierNames[currentTier]}</div>
            </div>
            
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <ChevronRight className="w-8 h-8 text-yellow-400" />
            </motion.div>
            
            <div className="text-center">
              <motion.div 
                className="text-3xl mb-1"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {tierEmojis[requiredTier]}
              </motion.div>
              <div className="text-sm text-yellow-400">Required</div>
              <div className="text-yellow-400 font-bold">{tierNames[requiredTier]}</div>
            </div>
          </motion.div>

          {/* Unlock Benefits */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/5 rounded-lg p-4 mb-6"
          >
            <h3 className="text-sm font-semibold text-purple-300 mb-2">
              ✨ Unlock {tierNames[requiredTier]} Benefits:
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {requiredTier >= 2 && (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Access to advanced playbooks
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Higher complexity workflows
                  </li>
                </>
              )}
              {requiredTier >= 3 && (
                <>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    Premium playbooks & resources
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    Full system capabilities
                  </li>
                </>
              )}
            </ul>
          </motion.div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={onClose}
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              onClick={onUpgrade || onClose}
            >
              <Unlock className="w-4 h-4 mr-2" />
              Level Up
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ==================== GATE UNLOCK ANIMATION ====================
export const GateUnlockAnimation = ({ 
  isVisible, 
  gateName = "Gate", 
  gateNumber = 1,
  onComplete 
}) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const confettiColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black z-50 flex items-center justify-center"
    >
      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                background: confettiColors[i % confettiColors.length],
                left: `${Math.random() * 100}%`,
                top: -20
              }}
              initial={{ y: -20, rotate: 0, opacity: 1 }}
              animate={{
                y: window.innerHeight + 20,
                rotate: Math.random() * 720 - 360,
                opacity: [1, 1, 0]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 0.5,
                ease: "easeIn"
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="text-center">
        {/* Gate Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mb-8"
        >
          <motion.div
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(255, 215, 0, 0.3)",
                "0 0 60px rgba(255, 215, 0, 0.6)",
                "0 0 20px rgba(255, 215, 0, 0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, delay: 0.5 }}
            >
              <Unlock className="w-16 h-16 text-white" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🎉 Gate {gateNumber} Unlocked!
          </h1>
          <p className="text-xl text-purple-200 mb-6">{gateName}</p>
          
          {/* XP Earned */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-lg"
          >
            <Zap className="w-5 h-5" />
            +10 XP Earned!
          </motion.div>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8"
        >
          <Button
            size="lg"
            className="bg-white text-purple-900 hover:bg-gray-100"
            onClick={onComplete}
          >
            Continue <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ==================== POWER UP CARD ====================
export const PowerUpCard = ({ 
  title, 
  description, 
  icon: Icon = Shield,
  isUnlocked = false,
  tier = 1,
  onClick
}) => {
  return (
    <motion.div
      whileHover={{ scale: isUnlocked ? 1.02 : 1, y: isUnlocked ? -2 : 0 }}
      whileTap={{ scale: isUnlocked ? 0.98 : 1 }}
      className={`
        relative overflow-hidden rounded-xl p-4
        ${isUnlocked 
          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 cursor-pointer' 
          : 'bg-gray-800/50 border border-gray-700 opacity-60'
        }
      `}
      onClick={isUnlocked ? onClick : undefined}
    >
      {/* Lock overlay for locked cards */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
          <Lock className="w-8 h-8 text-gray-500" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={`
          w-12 h-12 rounded-lg flex items-center justify-center
          ${isUnlocked ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gray-700'}
        `}>
          <Icon className={`w-6 h-6 ${isUnlocked ? 'text-white' : 'text-gray-500'}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
              {title}
            </h3>
            <AnimatedTierBadge tier={tier} size="sm" showLabel={false} animate={false} />
          </div>
          <p className={`text-sm mt-1 ${isUnlocked ? 'text-gray-300' : 'text-gray-500'}`}>
            {description}
          </p>
        </div>
      </div>

      {/* Unlock glow effect */}
      {isUnlocked && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}
    </motion.div>
  );
};

export default {
  AnimatedTierBadge,
  GateProgressBar,
  AchievementToast,
  TierBlockModal,
  GateUnlockAnimation,
  PowerUpCard
};
