'use client';

import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedValueProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
  duration?: number;
}

export function AnimatedValue({
  value,
  format = (v) => Math.round(v).toString(),
  className,
  duration = 0.8,
}: AnimatedValueProps) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration,
  });

  const display = useTransform(spring, (current) => format(current));
  const prevValue = useRef(value);

  useEffect(() => {
    // Only animate if value changed significantly
    if (Math.abs(value - prevValue.current) > 0.01) {
      spring.set(value);
      prevValue.current = value;
    }
  }, [value, spring]);

  // Set initial value without animation on mount
  useEffect(() => {
    spring.jump(value);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <motion.span className={className}>{display}</motion.span>;
}
