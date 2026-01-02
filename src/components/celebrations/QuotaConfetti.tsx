'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';
import moduleStyles from './QuotaConfetti.module.css';

interface QuotaConfettiProps {
  isVisible: boolean;
  taskName: string;
  onDismiss: () => void;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

// Celebration styles
type CelebrationStyle = 'confetti' | 'sparkles' | 'burst' | 'rain';

// Confetti particle configuration
const PARTICLE_COUNT = 28;
const COLORS = [
  'var(--primary)',      // Brand blue/purple
  'var(--success)',      // Green
  'var(--warning)',      // Amber/gold
  '#ff6b6b',             // Coral red
  '#a855f7',             // Purple
  '#06b6d4',             // Cyan
];

// Alternative color schemes for variety
const COLOR_SCHEMES = [
  COLORS, // Default
  ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'], // Green gradient
  ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'], // Purple gradient
  ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'], // Gold gradient
  ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8'], // Pink gradient
];

interface Particle {
  id: number;
  color: string;
  size: number;
  x: number;
  rotation: number;
  delay: number;
  shape: 'circle' | 'square' | 'star' | 'heart' | 'diamond';
}

// Generate random particles with style variety
function generateParticles(style: CelebrationStyle): Particle[] {
  const colorScheme = COLOR_SCHEMES[Math.floor(Math.random() * COLOR_SCHEMES.length)];
  const shapes: Particle['shape'][] = style === 'sparkles'
    ? ['star', 'diamond', 'circle']
    : style === 'burst'
    ? ['circle', 'square']
    : ['circle', 'square', 'star', 'heart'];

  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    color: colorScheme[Math.floor(Math.random() * colorScheme.length)],
    size: 6 + Math.random() * 6, // 6-12px
    x: (Math.random() - 0.5) * 300, // -150 to 150
    rotation: Math.random() > 0.5 ? 720 : -720,
    delay: style === 'burst' ? Math.random() * 0.1 : Math.random() * 0.3,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
  }));
}

// Encouraging messages - expanded variety
const MESSAGES = [
  "Quota complete!",
  "Nailed it!",
  "Great work!",
  "You did it!",
  "Mission accomplished!",
  "Fantastic effort!",
  "Way to go!",
  "Crushed it!",
  "Well done!",
  "Achievement unlocked!",
  "Goal reached!",
  "Stellar work!",
];

// Pick a random celebration style
function getRandomStyle(): CelebrationStyle {
  const celebrationStyles: CelebrationStyle[] = ['confetti', 'sparkles', 'burst', 'rain'];
  return celebrationStyles[Math.floor(Math.random() * celebrationStyles.length)];
}

export function QuotaConfetti({
  isVisible,
  taskName,
  onDismiss,
  soundEnabled = true,
  vibrationEnabled = true,
}: QuotaConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [message, setMessage] = useState(MESSAGES[0]);
  const [style, setStyle] = useState<CelebrationStyle>('confetti');

  // Generate new particles and message when becoming visible
  useEffect(() => {
    if (isVisible) {
      const newStyle = getRandomStyle();
      setStyle(newStyle);
      setParticles(generateParticles(newStyle));
      setMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

      // Trigger haptic and sound feedback
      if (vibrationEnabled) {
        triggerHaptic('celebration');
      }
      if (soundEnabled) {
        playSound('complete');
      }

      // Auto-dismiss after 2.5 seconds
      const timer = setTimeout(onDismiss, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss, soundEnabled, vibrationEnabled]);

  // Handle click/tap to dismiss early
  const handleDismiss = useCallback(() => {
    if (vibrationEnabled) {
      triggerHaptic('light');
    }
    onDismiss();
  }, [onDismiss, vibrationEnabled]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={moduleStyles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleDismiss}
          role="dialog"
          aria-label={`${message} ${taskName}`}
        >
          {/* Confetti particles */}
          <div className={moduleStyles.confettiContainer}>
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className={moduleStyles.particle}
                style={{
                  backgroundColor: ['circle', 'square'].includes(particle.shape) ? particle.color : undefined,
                  width: particle.size,
                  height: particle.size,
                  borderRadius: particle.shape === 'circle' ? '50%' : particle.shape === 'diamond' ? 0 : '2px',
                  transform: particle.shape === 'diamond' ? 'rotate(45deg)' : undefined,
                }}
                initial={{
                  x: 0,
                  y: 0,
                  scale: 0,
                  rotate: 0,
                  opacity: 0,
                }}
                animate={{
                  x: particle.x,
                  y: style === 'rain'
                    ? [0, 300 + Math.random() * 100]
                    : style === 'burst'
                    ? [-100 - Math.random() * 50, 100 + Math.random() * 100]
                    : [-50, -180 - Math.random() * 100, 200 + Math.random() * 100],
                  scale: style === 'burst' ? [0, 1.2, 0.8] : [0, 1, 1, 0.6],
                  rotate: particle.rotation,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: style === 'burst' ? 1.2 : 1.8,
                  delay: particle.delay,
                  ease: style === 'burst' ? 'easeOut' : [0.23, 1, 0.32, 1],
                  times: style === 'rain' ? [0, 1] : [0, 0.2, 0.7, 1],
                }}
              >
                {particle.shape === 'star' && (
                  <svg width={particle.size} height={particle.size} viewBox="0 0 24 24" fill={particle.color}>
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z" />
                  </svg>
                )}
                {particle.shape === 'heart' && (
                  <svg width={particle.size} height={particle.size} viewBox="0 0 24 24" fill={particle.color}>
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                )}
                {particle.shape === 'diamond' && (
                  <div style={{ width: '100%', height: '100%', backgroundColor: particle.color }} />
                )}
              </motion.div>
            ))}
          </div>

          {/* Central celebration message */}
          <motion.div
            className={moduleStyles.messageContainer}
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: 0.1,
            }}
          >
            <motion.div
              className={moduleStyles.iconWrapper}
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 0.6,
                delay: 0.3,
                ease: 'easeInOut',
              }}
            >
              <Sparkles size={32} />
            </motion.div>
            <h2 className={moduleStyles.message}>{message}</h2>
            <p className={moduleStyles.taskName}>{taskName}</p>
            <span className={moduleStyles.tapHint}>Tap to dismiss</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
