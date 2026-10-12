/**
 * Generates `supabase/seed.sql` from the application catalog.
 *
 * Run:  npm run seed:generate
 *
 * The catalog lives in `src/lib/domain/exercise-seed.ts` because the app needs
 * it at runtime. This script serialises that same array to SQL so the database
 * and the bundle cannot disagree about what the catalog contains. It is a
 * build step, not a runtime import of the seed into the client.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SEED_EXERCISES } from '../../src/lib/domain/exercise-seed';
import type { Exercise } from '../../src/lib/domain/types';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, '../seed.sql');

/** Escapes a value for a single-quoted SQL literal. */
const lit = (value: string): string => `'${value.replace(/'/g, "''")}'`;

/**
 * Renders a JS string array as a Postgres array literal.
 *
 * `typeName` is the element type: the catalog's array columns are enum arrays
 * (`body_part[]`, `muscle_group[]`) while the instruction lists are `text[]`.
 */
const arr = (values: readonly string[], typeName: string): string =>
  values.length === 0
    ? `'{}'::${typeName}[]`
    : `ARRAY[${values.map(lit).join(', ')}]::${typeName}[]`;

/** Renders a JS string as a quoted literal cast to its enum type. */
const enm = (value: string, type: string): string => `'${value}'::${type}`;

const numOrNull = (value: number | null): string => (value === null ? 'null' : String(value));

const row = (exercise: Exercise): string => {
  const cells = [
    lit(exercise.id),
    lit(exercise.name),
    lit(exercise.slug),
    lit(exercise.description),
    arr(exercise.bodyParts, 'body_part'),
    arr(exercise.primaryMuscles, 'muscle_group'),
    arr(exercise.secondaryMuscles, 'muscle_group'),
    enm(exercise.difficulty, 'fitness_level'),
    enm(exercise.exerciseType, 'exercise_type'),
    enm(exercise.equipmentRequired, 'equipment'),
    arr(exercise.instructions, 'text'),
    arr(exercise.formCues, 'text'),
    arr(exercise.commonMistakes, 'text'),
    lit(exercise.breathingInstruction),
    numOrNull(exercise.recommendedSets),
    numOrNull(exercise.recommendedReps),
    numOrNull(exercise.recommendedDurationSeconds),
    String(exercise.recommendedRestSeconds),
    lit(exercise.safetyNotes),
  ];
  return `  (${cells.join(', ')})`;
};

const sql = `-- ============================================================================
-- FlexAt Home — exercise catalog seed
--
-- GENERATED FILE. Do not edit by hand.
-- Regenerate with:  npm run seed:generate
--
-- Source of truth: src/lib/domain/exercise-seed.ts
--
-- The catalog is reference data shared by every user. It is inserted with a
-- fixed id derived from the slug so re-running this file is idempotent and the
-- app's local ids line up with the cloud ones.
-- ============================================================================

begin;

insert into public.exercises (
  id, name, slug, description, body_parts, primary_muscles, secondary_muscles,
  difficulty, exercise_type, equipment_required, instructions, form_cues,
  common_mistakes, breathing_instruction, recommended_sets, recommended_reps,
  recommended_duration, recommended_rest, safety_notes
) values
${SEED_EXERCISES.map(row).join(',\n')}
on conflict (id) do update set
  name                   = excluded.name,
  slug                   = excluded.slug,
  description            = excluded.description,
  body_parts             = excluded.body_parts,
  primary_muscles        = excluded.primary_muscles,
  secondary_muscles      = excluded.secondary_muscles,
  difficulty             = excluded.difficulty,
  exercise_type          = excluded.exercise_type,
  equipment_required     = excluded.equipment_required,
  instructions           = excluded.instructions,
  form_cues              = excluded.form_cues,
  common_mistakes        = excluded.common_mistakes,
  breathing_instruction  = excluded.breathing_instruction,
  recommended_sets       = excluded.recommended_sets,
  recommended_reps       = excluded.recommended_reps,
  recommended_duration   = excluded.recommended_duration,
  recommended_rest       = excluded.recommended_rest,
  safety_notes           = excluded.safety_notes;

commit;
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sql, 'utf8');

console.log(`Wrote ${SEED_EXERCISES.length} exercises to ${outPath}`);
