import Link from 'next/link';
import { Clock, Dumbbell } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import type { Exercise } from '@/lib/domain/types';
import { fitnessLevelLabels } from '@/lib/domain/validation';
import { bodyPartLabel, difficultyRank, muscleLabel } from '@/lib/ui/labels';

const difficultyTone = (level: Exercise['difficulty']): 'accent' | 'info' | 'warning' => {
  if (level === 'beginner') return 'accent';
  if (level === 'intermediate') return 'info';
  return 'warning';
};

/** Summary line: reps-based, time-based, or both when the catalog has both. */
const prescription = (exercise: Exercise): string | null => {
  const parts: string[] = [];
  if (exercise.recommendedSets && exercise.recommendedReps) {
    parts.push(`${exercise.recommendedSets} × ${exercise.recommendedReps}`);
  }
  if (exercise.recommendedDurationSeconds) {
    parts.push(`${exercise.recommendedDurationSeconds}s`);
  }
  if (parts.length === 0) return null;
  if (exercise.recommendedSets && exercise.recommendedDurationSeconds) {
    return `${parts[0]} or ${parts[1]}`;
  }
  return parts[0] ?? null;
};

export const ExerciseCard = ({ exercise }: { exercise: Exercise }) => (
  <Link
    href={`/exercise/${exercise.slug}`}
    className="group flex h-full flex-col rounded-lg border border-line bg-card p-4 transition-colors hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
  >
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-sm font-bold leading-snug group-hover:text-accent">{exercise.name}</h3>
      <Badge tone={difficultyTone(exercise.difficulty)} className="shrink-0">
        {fitnessLevelLabels[exercise.difficulty]}
      </Badge>
    </div>

    <p className="mt-2 line-clamp-2 flex-1 text-xs leading-relaxed text-muted">
      {exercise.description}
    </p>

    <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <Dumbbell className="size-3" aria-hidden="true" />
        {exercise.primaryMuscles.slice(0, 2).map(muscleLabel).join(', ')}
      </span>
      {prescription(exercise) ? (
        <span className="font-stats flex items-center gap-1.5">
          <Clock className="size-3" aria-hidden="true" />
          {prescription(exercise)}
        </span>
      ) : null}
    </div>

    <p className="mt-2.5 text-[0.6875rem] uppercase tracking-wider text-muted/70">
      {exercise.bodyParts.map(bodyPartLabel).join(' · ')}
      {'  ·  '}
      <span className="sr-only">difficulty rank </span>
      {difficultyRank(exercise.difficulty) + 1} of 3
    </p>
  </Link>
);
