'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { playSound } from '@/lib/sounds';
import styles from './QuotaConfetti.module.css';

interface QuotaConfettiProps {
  isVisible: boolean;
  taskName: string;
  onDismiss: () => void;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}

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

interface Particle {
  id: number;
  color: string;
  size: number;
  x: number;
  rotation: number;
  delay: number;
  shape: 'circle' | 'square' | 'star';
}

// Generate random particles
function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6, // 6-12px
    x: (Math.random() - 0.5) * 300, // -150 to 150
    rotation: Math.random() > 0.5 ? 720 : -720,
    delay: Math.random() * 0.3, // 0-300ms stagger
    shape: ['circle', 'square', 'star'][Math.floor(Math.random() * 3)] as Particle['shape'],
  }));
}

// Encouraging messages
const MESSAGES = [
  "Quota complete!",
  "Nailed it!",
  "Great work!",
  "You did it!",
  "Mission accomplished!",
];

export function QuotaConfetti({
  isVisible,
  taskName,
  onDismiss,
  soundEnabled = true,
  vibrationEnabled = true,
}: QuotaConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [message, setMessage] = useState(MESSAGES[0]);

  // Generate new particles and message when becoming visible
  useEffect(() => {
    if (isVisible) {
      setParticles(generateParticles());
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
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleDismiss}
          role="dialog"
          aria-label={`${message} ${taskName}`}
        >
          {/* Confetti particles */}
          <div className={styles.confettiContainer}>
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className={styles.particle}
                style={{
                  backgroundColor: particle.shape !== 'star' ? particle.color : undefined,
                  width: particle.size,
                  height: particle.size,
                  borderRadius: particle.shape === 'circle' ? '50%' : particle.shape === 'star' ? 0 : '2px',
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
                  y: [-50, -180 - Math.random() * 100, 200 + Math.random() * 100],
                  scale: [0, 1, 1, 0.6],
                  rotate: particle.rotation,
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1.8,
                  delay: particle.delay,
                  ease: [0.23, 1, 0.32, 1], // ease-out-quint
                  times: [0, 0.2, 0.7, 1],
                }}
              >
                {particle.shape === 'star' && (
                  <svg
                    width={particle.size}
                    height={particle.size}
                    viewBox="0 0 24 24"
                    fill={particle.color}
                  >
                    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z" />
                  </svg>
                )}
              </motion.div>
            ))}
          </div>

          {/* Central celebration message */}
          <motion.div
            className={styles.messageContainer}
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
              className={styles.iconWrapper}
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
            <h2 className={styles.message}>{message}</h2>
            <p className={styles.taskName}>{taskName}</p>
            <span className={styles.tapHint}>Tap to dismiss</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
