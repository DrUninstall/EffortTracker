'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHaptic } from '@/lib/haptics';
import styles from './FocusCompanion.module.css';

interface FocusCompanionProps {
  isTimerRunning: boolean;
  elapsedMinutes: number;
  onPet?: () => void;
}

// Companion moods based on focus session
type CompanionMood = 'idle' | 'working' | 'happy' | 'proud' | 'sleepy';

// Companion activities while you focus
const ACTIVITIES = [
  'knitting a tiny scarf',
  'reading a small book',
  'sorting colorful buttons',
  'watering a plant',
  'writing in a journal',
  'folding paper cranes',
  'organizing pebbles',
  'brewing tiny tea',
];

// Encouraging messages from companion
const ENCOURAGEMENT = [
  "You're doing great!",
  "Keep going, friend!",
  "I believe in you!",
  "Focus is your superpower!",
  "We make a good team!",
  "You've got this!",
];

// Celebration messages
const CELEBRATIONS = [
  "Wonderful work today!",
  "You did amazing!",
  "So proud of you!",
  "That was incredible!",
  "You're a focus champion!",
];

export function FocusCompanion({ isTimerRunning, elapsedMinutes, onPet }: FocusCompanionProps) {
  const [mood, setMood] = useState<CompanionMood>('idle');
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [petCount, setPetCount] = useState(0);

  // Update mood based on timer state
  useEffect(() => {
    if (!isTimerRunning) {
      if (elapsedMinutes >= 25) {
        setMood('proud');
      } else if (elapsedMinutes > 0) {
        setMood('happy');
      } else {
        setMood('idle');
      }
    } else {
      setMood('working');
    }
  }, [isTimerRunning, elapsedMinutes]);

  // Change activity periodically during focus
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setActivity(ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)]);
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Show random encouragement during long sessions
  useEffect(() => {
    if (!isTimerRunning || elapsedMinutes < 10) return;

    // Show encouragement every ~10 minutes with some randomness
    if (elapsedMinutes % 10 === 0 && Math.random() > 0.3) {
      const msg = ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)];
      setMessage(msg);
      setShowMessage(true);
      setTimeout(() => setShowMessage(false), 3000);
    }
  }, [isTimerRunning, elapsedMinutes]);

  // Handle petting the companion
  const handlePet = () => {
    setPetCount(c => c + 1);
    triggerHaptic('companionPet');

    // Show appreciation message
    const messages = [
      '\u2764\uFE0F',
      'Thank you!',
      '\u2728',
      'That feels nice!',
      '\u{1F60A}',
    ];
    setMessage(messages[Math.floor(Math.random() * messages.length)]);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 1500);

    if (onPet) onPet();
  };

  // Get companion expression based on mood
  const expression = useMemo(() => {
    switch (mood) {
      case 'working': return '\u{1F9F6}'; // Ball of yarn (working)
      case 'happy': return '\u{1F60A}'; // Smiling face
      case 'proud': return '\u{1F929}'; // Star eyes
      case 'sleepy': return '\u{1F634}'; // Sleeping
      default: return '\u{1F43B}'; // Bear face (idle)
    }
  }, [mood]);

  return (
    <div className={styles.container}>
      {/* Companion character */}
      <motion.button
        className={styles.companion}
        onClick={handlePet}
        whileTap={{ scale: 0.95 }}
        animate={{
          y: isTimerRunning ? [0, -5, 0] : 0,
        }}
        transition={{
          duration: 2,
          repeat: isTimerRunning ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        <span className={styles.face}>{expression}</span>
        {petCount > 5 && <span className={styles.hearts}>\u2764\uFE0F</span>}
      </motion.button>

      {/* Activity bubble */}
      <AnimatePresence>
        {isTimerRunning && (
          <motion.div
            className={styles.activityBubble}
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.9 }}
          >
            <span className={styles.activityText}>{activity}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message bubble */}
      <AnimatePresence>
        {showMessage && (
          <motion.div
            className={styles.messageBubble}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.8 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session complete celebration */}
      <AnimatePresence>
        {mood === 'proud' && !isTimerRunning && (
          <motion.div
            className={styles.celebration}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <span className={styles.celebrationText}>
              {CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]}
            </span>
            <span className={styles.confetti}>{'\u2728\uD83C\uDF89\u2728'}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
