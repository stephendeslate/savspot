'use client';

import { type ReactNode, useState, useEffect, useRef, Children } from 'react';

/* ─── Existing components ─── */

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

/* ─── New motion components ─── */

interface SlideUpProps {
  children: ReactNode;
  className?: string;
  /** Threshold 0-1 for when the animation triggers */
  threshold?: number;
}

/**
 * IntersectionObserver-triggered scroll reveal.
 * Uses the `slide-up` keyframe from globals.css.
 * Respects `prefers-reduced-motion`.
 */
export function SlideUp({ children, className, threshold = 0.1 }: SlideUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip animation if user prefers reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? undefined : 0,
        animation: visible ? 'slide-up 0.5s ease forwards' : 'none',
      }}
    >
      {children}
    </div>
  );
}

interface ScaleInProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds */
  delay?: number;
}

/**
 * Scale entrance for modals, popovers, and overlay content.
 * Uses the `scale-in` keyframe from globals.css.
 * Respects `prefers-reduced-motion`.
 */
export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  const [visible, setVisible] = useState(false);
  const prefersReduced = useRef(false);

  useEffect(() => {
    prefersReduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced.current) {
      setVisible(true);
      return;
    }
    const timer = setTimeout(() => setVisible(true), delay * 1000);
    return () => clearTimeout(timer);
  }, [delay]);

  if (prefersReduced.current) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={className}
      style={{
        opacity: visible ? undefined : 0,
        animation: visible ? 'scale-in 0.3s ease forwards' : 'none',
      }}
    >
      {children}
    </div>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  /** Delay between each child in seconds */
  interval?: number;
}

/**
 * Wraps children with incremental animation delays.
 * Each child gets `interval * index` seconds of delay.
 * Respects `prefers-reduced-motion`.
 */
export function Stagger({ children, className, interval = 0.06 }: StaggerProps) {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    setPrefersReduced(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  return (
    <div className={className}>
      {Children.map(children, (child, index) => (
        <div
          style={
            prefersReduced
              ? undefined
              : {
                  opacity: 0,
                  animation: `slide-up 0.4s ease ${index * interval}s forwards`,
                }
          }
        >
          {child}
        </div>
      ))}
    </div>
  );
}
