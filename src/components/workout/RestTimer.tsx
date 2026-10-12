'use client';

import { Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { formatSeconds } from '@/lib/ui/format';

type Props = {
  initialSeconds: number;
  onFinished: () => void;
  onSkip: () => void;
};

/** Rest timer with adjustable duration, audio cue, and vibration. */
export const RestTimer = ({ initialSeconds, onFinished, onSkip }: Props) => {
  const [remaining, setRemaining] = useState(initialSeconds);
  const targetRef = useRef<number>(0);
  const [phase, setPhase] = useState<'running' | 'paused' | 'done'>('running');
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    targetRef.current = Date.now() + initialSeconds * 1000;
  }, [initialSeconds]);

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio not available; vibration still fires.
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  }, []);

  const adjust = useCallback((delta: number) => {
    const newRemaining = Math.max(1, remaining + delta);
    setRemaining(newRemaining);
    targetRef.current = Date.now() + newRemaining * 1000;
  }, [remaining]);

  const setCustom = useCallback((seconds: number) => {
    const safe = Math.max(1, Math.min(300, seconds));
    setRemaining(safe);
    targetRef.current = Date.now() + safe * 1000;
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((targetRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setPhase('done');
        playBeep();
        onFinished();
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, onFinished, playBeep]);

  useEffect(() => {
    if (phase === 'done') return;
    const onVisibility = () => {
      if (document.hidden) return;
      const left = Math.max(0, Math.round((targetRef.current - Date.now()) / 1000));
      setRemaining(left);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') {
      e.preventDefault();
      adjust(15);
    } else if (e.key === '-' || e.key === 'ArrowDown') {
      e.preventDefault();
      adjust(-15);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onSkip();
    }
  }, [adjust, onSkip]);

  return (
    <div
      className="flex flex-col items-center gap-3"
      role="timer"
      aria-live="assertive"
      aria-atomic="true"
      aria-label={`Rest timer: ${remaining} seconds remaining`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <p className="font-stats text-4xl font-bold tabular-nums">
        {formatSeconds(remaining)}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => adjust(-15)} aria-label="Remove 15 seconds">
          <Minus className="size-3" /> 15s
        </Button>
        <Button size="sm" variant="secondary" onClick={() => adjust(15)} aria-label="Add 15 seconds">
          <Plus className="size-3" /> 15s
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCustom(30)} aria-label="Set 30 seconds">
          30s
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCustom(90)} aria-label="Set 90 seconds">
          90s
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip} aria-label="Skip rest">
          Skip
        </Button>
      </div>
      <p className="text-center text-xs text-muted">
        Press + / - to adjust, space to skip.
      </p>
    </div>
  );
};