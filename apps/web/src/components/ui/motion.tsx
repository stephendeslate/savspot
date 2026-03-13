'use client';

import { type ReactNode, useState, useEffect, useRef } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      {children}
    </div>
  );
}

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      {children}
    </div>
  );
}

interface StepTransitionProps {
  children: ReactNode;
  direction: 'forward' | 'backward';
  stepKey: string;
}

export function StepTransition({
  children,
  direction,
  stepKey,
}: StepTransitionProps) {
  const [state, setState] = useState<'enter' | 'visible'>('enter');
  const prevKeyRef = useRef(stepKey);

  useEffect(() => {
    if (prevKeyRef.current !== stepKey) {
      setState('enter');
      prevKeyRef.current = stepKey;
    }
    const frame = requestAnimationFrame(() => setState('visible'));
    return () => cancelAnimationFrame(frame);
  }, [stepKey]);

  const offsetX = direction === 'forward' ? 40 : -40;

  return (
    <div
      key={stepKey}
      style={{
        opacity: state === 'visible' ? 1 : 0,
        transform: state === 'visible' ? 'translateX(0)' : `translateX(${offsetX}px)`,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
      }}
    >
      {children}
    </div>
  );
}
