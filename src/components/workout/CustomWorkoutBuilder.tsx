'use client';

import { ArrowUpDown, Plus, Trash2, Timer } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Exercise } from '@/lib/domain/types';
import { getBackend } from '@/lib/storage';

type BuiltExercise = {
  id: string;
  exercise: Exercise;
  sets: number;
  reps: number | null;
  duration: number | null;
  rest: number;
  notes: string;
  mode: 'reps' | 'time';
};

export const CustomWorkoutBuilder = () => {
  const [name, setName] = useState('My Workout');
  const [exercises, setExercises] = useState<BuiltExercise[]>([]);
  const [saved, setSaved] = useState(false);

  const addExercise = useCallback(async () => {
    const catalog = await getBackend().exercises.list();
    const pick = catalog[0];
    if (!pick) return;
    setExercises((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        exercise: pick,
        sets: 3,
        reps: 10,
        duration: null,
        rest: 60,
        notes: '',
        mode: 'reps',
      },
    ]);
  }, []);

  const save = useCallback(async () => {
    const draft = {
      name,
      days: [
        {
          dayOfWeek: 1,
          name: 'Custom Day',
          isRestDay: false,
          exercises: exercises.map((e, idx) => ({
            exerciseId: e.exercise.id,
            orderIndex: idx,
            sets: e.sets,
            reps: e.mode === 'time' ? null : (e.reps ?? 10),
            durationSeconds: e.mode === 'reps' ? null : (e.duration ?? 30),
            restSeconds: e.rest,
            notes: e.notes,
          })),
          targetDurationMinutes: 30,
        },
      ],
    };
    await getBackend().plans.save(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [name, exercises]);

  const updateExercise = useCallback((id: string, patch: Partial<BuiltExercise>) => {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const removeExercise = useCallback((id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const moveUp = useCallback((id: string) => {
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const a = copy[idx - 1]!;
      const b = copy[idx]!;
      copy[idx - 1] = b;
      copy[idx] = a;
      return copy;
    });
  }, []);

  const numInput = (
    label: string,
    value: number | null | undefined,
    onChange: (v: number) => void,
    min = 1,
    max = 99,
  ) => (
    <input
      type="number"
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-16 rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg"
      aria-label={label}
    />
  );

  return (
    <section className="max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Input
          label="Plan name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48"
        />
        <Button onClick={addExercise} size="sm">
          <Plus className="h-3 w-3" /> Add
        </Button>
        <Button onClick={save} size="sm" variant="secondary">
          Save
        </Button>
        {saved && <span className="text-xs text-accent">Saved</span>}
      </div>

      {exercises.length === 0 && (
        <p className="text-sm text-muted" role="status">
          No exercises yet. Build a custom day.
        </p>
      )}

      <ol className="space-y-2" aria-label="Custom exercises">
        {exercises.map((item) => (
          <li key={item.id} className="rounded-lg border border-line bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">{item.exercise.name}</h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveUp(item.id)}
                  aria-label="Move up"
                  className="rounded p-1 hover:bg-surface"
                >
                  <ArrowUpDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeExercise(item.id)}
                  aria-label="Remove"
                  className="rounded p-1 text-muted hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1">
                <span>Sets:</span>
                {numInput('Sets', item.sets, (v) => updateExercise(item.id, { sets: v }), 1, 10)}
              </label>

              <button
                type="button"
                onClick={() =>
                  updateExercise(item.id, { mode: item.mode === 'reps' ? 'time' : 'reps' })
                }
                className="rounded border border-line px-2 py-1 text-xs hover:bg-surface"
              >
                {item.mode === 'reps' ? 'Reps mode' : 'Time mode'}
              </button>

              {item.mode === 'reps' ? (
                <label className="flex items-center gap-1">
                  <span>Reps:</span>
                  {numInput('Reps', item.reps, (v) => updateExercise(item.id, { reps: v }))}
                </label>
              ) : (
                <label className="flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  <span>Time (s):</span>
                  {numInput('Duration', item.duration, (v) => updateExercise(item.id, { duration: v }), 5)}
                </label>
              )}

              <label className="flex items-center gap-1">
                <span>Rest (s):</span>
                {numInput('Rest seconds', item.rest, (v) => updateExercise(item.id, { rest: v }), 5, 300)}
              </label>
            </div>

            <Input
              label="Notes (optional)"
              value={item.notes}
              onChange={(e) => updateExercise(item.id, { notes: e.target.value })}
              className="text-xs"
            />
          </li>
        ))}
      </ol>
    </section>
  );
};
