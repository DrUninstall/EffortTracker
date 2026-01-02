'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, ChevronDown, ChevronUp, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './TaskBreakdown.module.css';

interface TaskBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSubtask?: (subtask: string) => void;
  initialTaskName?: string;
}

// Spiciness levels (inspired by Goblin.tools)
const SPICINESS_LEVELS = [
  { level: 1, label: 'Simple', emoji: '\u{1F336}\u{FE0F}', description: '2-3 high-level steps' },
  { level: 2, label: 'Moderate', emoji: '\u{1F336}\u{FE0F}\u{1F336}\u{FE0F}', description: '4-5 clear steps' },
  { level: 3, label: 'Detailed', emoji: '\u{1F336}\u{FE0F}\u{1F336}\u{FE0F}\u{1F336}\u{FE0F}', description: '6-8 granular steps' },
  { level: 4, label: 'Very Detailed', emoji: '\u{1F336}\u{FE0F}\u{1F336}\u{FE0F}\u{1F336}\u{FE0F}\u{1F336}\u{FE0F}', description: '9+ micro-steps' },
];

// Local task breakdown templates (no API needed)
const BREAKDOWN_TEMPLATES: Record<string, string[][]> = {
  'clean': [
    ['Gather cleaning supplies', 'Declutter surfaces'],
    ['Gather cleaning supplies', 'Declutter surfaces', 'Wipe down surfaces', 'Take out trash'],
    ['Gather cleaning supplies', 'Clear clutter to one spot', 'Dust surfaces', 'Wipe down counters', 'Clean mirrors/glass', 'Vacuum/sweep floor', 'Take out trash'],
    ['Gather cleaning supplies', 'Put away items in wrong spots', 'Clear surfaces', 'Sort papers/mail', 'Dust shelves', 'Wipe counters', 'Clean mirrors', 'Vacuum carpet', 'Sweep hard floors', 'Mop if needed', 'Take out trash', 'Return supplies'],
  ],
  'exercise': [
    ['Warm up', 'Main workout', 'Cool down'],
    ['Put on workout clothes', 'Warm up (5 min)', 'Main workout (20 min)', 'Cool down stretches', 'Hydrate'],
    ['Set up workout area', 'Put on clothes', 'Dynamic warm-up', 'Cardio portion', 'Strength exercises', 'Core work', 'Static stretches', 'Log workout'],
    ['Prepare water bottle', 'Set up equipment', 'Change clothes', 'Light cardio warm-up', 'Dynamic stretches', 'First exercise set', 'Second exercise set', 'Third exercise set', 'Core exercises', 'Cool-down walk', 'Static stretches', 'Shower', 'Log progress'],
  ],
  'study': [
    ['Review notes', 'Practice problems'],
    ['Gather materials', 'Review previous notes', 'Read new material', 'Practice problems', 'Summarize learning'],
    ['Clear workspace', 'Gather materials', 'Review yesterday\'s notes', 'Read new chapter/section', 'Take notes', 'Do practice problems', 'Check answers', 'Summarize key points'],
    ['Clear desk', 'Silence phone', 'Gather textbooks', 'Open notes app', 'Review previous session', 'Set timer for focus', 'Read first section', 'Take notes', 'Read second section', 'Practice problems', 'Self-test', 'Review mistakes', 'Write summary', 'Plan next session'],
  ],
  'write': [
    ['Outline ideas', 'Draft content'],
    ['Brainstorm ideas', 'Create outline', 'Write first draft', 'Review and edit'],
    ['Research topic', 'Brainstorm main points', 'Create outline', 'Write introduction', 'Write body sections', 'Write conclusion', 'Edit for clarity', 'Proofread'],
    ['Define purpose', 'Research sources', 'Take notes', 'Brainstorm angles', 'Create detailed outline', 'Write hook/intro', 'Write first body paragraph', 'Write middle sections', 'Write final section', 'Write conclusion', 'First edit pass', 'Second edit pass', 'Proofread aloud', 'Final review'],
  ],
  'default': [
    ['Start task', 'Complete task'],
    ['Prepare', 'Execute main task', 'Review', 'Finish up'],
    ['Gather what you need', 'Set up workspace', 'Begin first part', 'Complete middle section', 'Finish final part', 'Review work', 'Clean up'],
    ['Clear distractions', 'Gather materials', 'Set intention', 'Start first step', 'Work on section 1', 'Take short break', 'Work on section 2', 'Work on section 3', 'Review progress', 'Make adjustments', 'Final touches', 'Complete task'],
  ],
};

// Match task to template
function matchTemplate(taskName: string): string[][] {
  const lower = taskName.toLowerCase();
  if (lower.includes('clean') || lower.includes('tidy') || lower.includes('organize')) {
    return BREAKDOWN_TEMPLATES.clean;
  }
  if (lower.includes('exercise') || lower.includes('workout') || lower.includes('gym') || lower.includes('run')) {
    return BREAKDOWN_TEMPLATES.exercise;
  }
  if (lower.includes('study') || lower.includes('learn') || lower.includes('read') || lower.includes('review')) {
    return BREAKDOWN_TEMPLATES.study;
  }
  if (lower.includes('write') || lower.includes('essay') || lower.includes('report') || lower.includes('document')) {
    return BREAKDOWN_TEMPLATES.write;
  }
  return BREAKDOWN_TEMPLATES.default;
}

export function TaskBreakdown({ isOpen, onClose, onAddSubtask, initialTaskName }: TaskBreakdownProps) {
  const [taskInput, setTaskInput] = useState('');
  const [spiciness, setSpiciness] = useState(2);
  const [breakdown, setBreakdown] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Pre-populate with initialTaskName when dialog opens
  useEffect(() => {
    if (isOpen && initialTaskName) {
      setTaskInput(initialTaskName);
      setBreakdown([]); // Reset previous results
    }
  }, [isOpen, initialTaskName]);

  const generateBreakdown = useCallback(() => {
    if (!taskInput.trim()) return;

    setIsGenerating(true);

    // Simulate brief loading for UX
    setTimeout(() => {
      const template = matchTemplate(taskInput);
      const steps = template[spiciness - 1] || template[0];

      // Add some variation by shuffling middle items occasionally
      const result = [...steps];
      if (Math.random() > 0.7 && result.length > 3) {
        // Occasionally swap two middle items for variety
        const idx = Math.floor(Math.random() * (result.length - 2)) + 1;
        [result[idx], result[idx + 1]] = [result[idx + 1], result[idx]];
      }

      setBreakdown(result);
      setIsGenerating(false);
    }, 400);
  }, [taskInput, spiciness]);

  const handleAddStep = (step: string) => {
    if (onAddSubtask) {
      onAddSubtask(step);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <Wand2 size={20} />
              <h2>Break Down Task</h2>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {/* Task Input */}
          <div className={styles.inputSection}>
            <label className={styles.label}>What do you need to do?</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Clean my room, Write essay, Exercise..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateBreakdown()}
            />
          </div>

          {/* Spiciness Slider */}
          <div className={styles.spicySection}>
            <label className={styles.label}>How detailed?</label>
            <div className={styles.spicyLevels}>
              {SPICINESS_LEVELS.map(({ level, label, emoji, description }) => (
                <button
                  key={level}
                  className={`${styles.spicyBtn} ${spiciness === level ? styles.spicyActive : ''}`}
                  onClick={() => setSpiciness(level)}
                  title={description}
                >
                  <span className={styles.spicyEmoji}>{emoji}</span>
                  <span className={styles.spicyLabel}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            variant="default"
            className={styles.generateBtn}
            onClick={generateBreakdown}
            disabled={!taskInput.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className={styles.spinner} />
                Breaking down...
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Break it down
              </>
            )}
          </Button>

          {/* Results */}
          {breakdown.length > 0 && (
            <motion.div
              className={styles.results}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className={styles.resultsTitle}>Steps:</h3>
              <ol className={styles.stepsList}>
                {breakdown.map((step, index) => (
                  <motion.li
                    key={index}
                    className={styles.step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <span className={styles.stepNumber}>{index + 1}</span>
                    <span className={styles.stepText}>{step}</span>
                    {onAddSubtask && (
                      <button
                        className={styles.addStepBtn}
                        onClick={() => handleAddStep(step)}
                        title="Add as subtask"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
