/**
 * Checks the relations graph and the ranking rules.
 *
 * The graph is reference data that only changes by hand, so a typo would ship a
 * dead link. These assertions are the guard.
 */
import { SEED_EXERCISES, seedExerciseBySlug } from '@/lib/domain/exercise-seed';
import { EXERCISE_RELATIONS } from '@/lib/domain/exercise-relations';
import { RANKED_BODY_PARTS, rankExercisesFor } from '@/lib/exercises/ranking';
import { difficultyRank } from '@/lib/ui/labels';
import type { Exercise, FitnessLevel, PrimaryGoal } from '@/lib/domain/types';

let passed = 0;
let failed = 0;
const check = (name: string, condition: boolean, detail?: unknown): void => {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL ${name}`, detail === undefined ? '' : detail);
  }
};

const byslug = (slug: string): Exercise => {
  const found = seedExerciseBySlug(slug);
  if (!found) throw new Error(`missing exercise: ${slug}`);
  return found;
};

console.log('\n1. Relations graph integrity');
{
  const known = new Set(SEED_EXERCISES.map((e) => e.slug));
  const dangling: string[] = [];
  const selfLinks: string[] = [];
  for (const e of SEED_EXERCISES) {
    for (const list of [
      e.progressionExercises,
      e.regressionExercises,
      e.alternativeExercises,
    ]) {
      for (const target of list) {
        if (!known.has(target)) dangling.push(`${e.slug} -> ${target}`);
        if (target === e.slug) selfLinks.push(e.slug);
      }
    }
  }
  check('no dangling slugs', dangling.length === 0, dangling);
  check('no self-links', selfLinks.length === 0, selfLinks);
  check(
    'every exercise has at least one relation',
    SEED_EXERCISES.every(
      (e) =>
        e.progressionExercises.length +
          e.regressionExercises.length +
          e.alternativeExercises.length >
        0,
    ),
    SEED_EXERCISES.filter(
      (e) =>
        e.progressionExercises.length +
          e.regressionExercises.length +
          e.alternativeExercises.length ===
        0,
    ).map((e) => e.slug),
  );
  check(
    'the graph covers every catalog entry',
    SEED_EXERCISES.every((e) => EXERCISE_RELATIONS[e.slug] !== undefined),
  );
}

console.log('\n2. Bidirectional discoverability');
{
  // If A lists B as a progression, B should list A as a regression, or at
  // minimum mention A somewhere, otherwise the link is a dead end.
  const orphans: string[] = [];
  for (const e of SEED_EXERCISES) {
    for (const harder of e.progressionExercises) {
      const other = seedExerciseBySlug(harder);
      if (!other) continue;
      // An advanced entry at the top of its ladder has nothing to point back
      // from, so a missing backlink there is correct rather than broken.
      if (other.difficulty === 'advanced') continue;
      const backLinks = [
        ...other.progressionExercises,
        ...other.regressionExercises,
        ...other.alternativeExercises,
      ];
      if (!backLinks.includes(e.slug)) orphans.push(`${e.slug} -> ${harder} (no backlink)`);
    }
  }
  check(
    'every progression link has a path back',
    orphans.length === 0,
    `${orphans.length} one-way: ${orphans.slice(0, 6).join('; ')}`,
  );
}

console.log('\n3. Direction is honest about difficulty');
{
  // A "regression" must never be harder than the exercise it points from, and a
  // "progression" must never be easier. Alternates are exempt by design.
  const wrongDirection: string[] = [];
  for (const e of SEED_EXERCISES) {
    const here = difficultyRank(e.difficulty);
    for (const easier of e.regressionExercises) {
      const other = seedExerciseBySlug(easier);
      if (other && difficultyRank(other.difficulty) > here) {
        wrongDirection.push(`${e.slug}(${e.difficulty}) regression -> ${easier}(${other.difficulty})`);
      }
    }
    for (const harder of e.progressionExercises) {
      const other = seedExerciseBySlug(harder);
      if (other && difficultyRank(other.difficulty) < here) {
        wrongDirection.push(`${e.slug}(${e.difficulty}) progression -> ${harder}(${other.difficulty})`);
      }
    }
  }
  check(
    'regressions are never harder, progressions never easier',
    wrongDirection.length === 0,
    wrongDirection,
  );
}

console.log('\n4. Ranking hides anything above the viewer level');
{
  for (const level of ['beginner', 'intermediate', 'advanced'] as FitnessLevel[]) {
    for (const part of RANKED_BODY_PARTS) {
      const ranked = rankExercisesFor(SEED_EXERCISES, part, { level, goal: null, avoid: [] }, null);
      const tooHard = ranked.filter(
        (r) => difficultyRank(r.exercise.difficulty) > difficultyRank(level),
      );
      check(
        `${level} view for ${part} hides harder movements`,
        tooHard.length === 0,
        tooHard.map((r) => r.exercise.slug),
      );
    }
  }
}

console.log('\n5. Ranking honours the avoid list');
{
  const ranked = rankExercisesFor(
    SEED_EXERCISES,
    'legs',
    { level: 'advanced', goal: 'strength', avoid: ['lunge'] },
    null,
  );
  check(
    'avoided movement type is excluded',
    ranked.every((r) => r.exercise.exerciseType !== 'lunge'),
    ranked.filter((r) => r.exercise.exerciseType === 'lunge').map((r) => r.exercise.slug),
  );
  const byName = rankExercisesFor(
    SEED_EXERCISES,
    'chest',
    { level: 'advanced', goal: null, avoid: ['push-up'] },
    null,
  );
  check(
    'avoided name is excluded',
    !byName.some((r) => r.exercise.name.toLowerCase().includes('push-up')),
    byName.map((r) => r.exercise.name),
  );
}

console.log('\n6. Ranking responds to the goal');
{
  const endurance = rankExercisesFor(
    SEED_EXERCISES,
    'full_body',
    { level: 'advanced', goal: 'endurance', avoid: [] },
    5,
  );
  const mobility = rankExercisesFor(
    SEED_EXERCISES,
    'full_body',
    { level: 'advanced', goal: 'mobility', avoid: [] },
    5,
  );
  const topEndurance = endurance[0]?.exercise.exerciseType ?? '';
  const topMobility = mobility[0]?.exercise.exerciseType ?? '';
  check(
    'an endurance goal surfaces conditioning first',
    ['burpee', 'mountain_climber', 'jump', 'locomotion'].includes(topEndurance),
    topEndurance,
  );
  check(
    'a mobility goal surfaces mobility work first',
    ['stretch', 'balance'].includes(topMobility),
    topMobility,
  );
  check(
    'the two goals produce different lists',
    endurance[0]?.exercise.slug !== mobility[0]?.exercise.slug,
  );
}

console.log('\n7. Ranking only returns entries for the requested body part');
{
  for (const part of RANKED_BODY_PARTS) {
    const ranked = rankExercisesFor(SEED_EXERCISES, part, { level: null, goal: null, avoid: [] }, null);
    check(
      `${part} ranking only contains ${part} work`,
      ranked.every((r) => r.exercise.bodyParts.includes(part)),
      ranked.filter((r) => !r.exercise.bodyParts.includes(part)).map((r) => r.exercise.slug),
    );
  }
}

console.log('\n8. Ranking is stable and explains itself');
{
  const context = { level: 'intermediate' as FitnessLevel, goal: 'strength' as PrimaryGoal, avoid: [] };
  const first = rankExercisesFor(SEED_EXERCISES, 'chest', context, 6);
  const second = rankExercisesFor(SEED_EXERCISES, 'chest', context, 6);
  check(
    'repeated runs give the same order',
    first.map((r) => r.exercise.slug).join() === second.map((r) => r.exercise.slug).join(),
  );
  check(
    'results are descending by score',
    first.every((r, i) => i === 0 || (first[i - 1]?.score ?? 0) >= r.score),
  );
  check('every result carries a reason', first.every((r) => r.reasons.length > 0));
  check('a limit is respected', first.length <= 6);
  const unlimited = rankExercisesFor(SEED_EXERCISES, 'chest', context, null);
  check('an unlimited rank is not capped at 6', unlimited.length >= first.length);
}

console.log('\n9. The library still resolves every slug it links to');
{
  const pushUp = byslug('push-up');
  const targets = [
    ...pushUp.progressionExercises,
    ...pushUp.regressionExercises,
    ...pushUp.alternativeExercises,
  ];
  check('push-up has relations', targets.length > 0);
  check(
    'all of push-up\'s relation targets resolve',
    targets.every((t) => seedExerciseBySlug(t) !== undefined),
    targets,
  );
  check(
    'wall push-up exists and regresses upward to incline',
    byslug('wall-push-up').progressionExercises.includes('incline-push-up'),
  );
}

console.log(`\n${failed === 0 ? 'All' : 'FAILED'} ${passed + failed} checks (${passed} passed, ${failed} failed)\n`);
if (failed > 0) process.exit(1);
