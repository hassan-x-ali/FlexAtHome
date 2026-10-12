/**
 * Related-exercise graph for the catalog.
 *
 * Kept separate from `exercise-seed.ts` so the authoring stays readable: one
 * line per exercise, three directions, and every slug is a real catalog entry.
 * The loader validates the whole graph at module load, so a typo throws in
 * development rather than rendering a dead link in production.
 *
 * Direction convention, matching the detail page's labelling:
 *   progression - harder than this exercise, same movement
 *   regression - easier than this exercise, same movement
 *   alternative - different movement, similar goal
 */
export const EXERCISE_RELATIONS: Record<
  string,
  {
    progression?: string[];
    regression?: string[];
    alternative?: string[];
  }
> = {
  // --- Push ---------------------------------------------------------------
  'push-up': {
    progression: ['pike-push-up', 'decline-push-up', 'diamond-push-up', 'wide-push-up'],
    regression: ['incline-push-up', 'knee-push-up'],
    alternative: ['push-up-plus', 'wide-push-up'],
  },
  'incline-push-up': {
    progression: ['push-up', 'knee-push-up'],
    alternative: ['wall-push-up'],
  },
  'wall-push-up': {
    progression: ['incline-push-up', 'knee-push-up'],
  },
  'knee-push-up': {
    progression: ['push-up', 'incline-push-up'],
    regression: ['wall-push-up'],
    alternative: ['push-up-plus'],
  },
  'wide-push-up': {
    // All beginner, so a wide press is a variant of a push-up rather than a
    // step above it. The genuine step up is the intermediate diamond press.
    progression: ['diamond-push-up'],
    alternative: ['push-up'],
    regression: ['knee-push-up', 'incline-push-up'],
  },
  'diamond-push-up': {
    progression: ['pike-push-up'],
    regression: ['wide-push-up', 'push-up', 'knee-push-up'],
    alternative: ['bodyweight-triceps-extension'],
  },
  'pike-push-up': {
    regression: ['push-up', 'wide-push-up', 'diamond-push-up'],
    alternative: ['wall-triceps-extension'],
  },
  'decline-push-up': {
    regression: ['push-up', 'knee-push-up'],
    alternative: ['pike-push-up'],
  },
  'push-up-plus': {
    regression: ['push-up', 'knee-push-up'],
    alternative: ['wide-push-up'],
  },
  'handstand-wall-drill': {
    regression: ['pike-push-up', 'wall-triceps-extension'],
    alternative: ['cat-cow', 'prone-y-t-w-raise'],
  },

  // --- Triceps / arms -----------------------------------------------------
  'bodyweight-triceps-extension': {
    regression: ['wall-triceps-extension', 'incline-push-up'],
    alternative: ['diamond-push-up'],
  },
  'wall-triceps-extension': {
    progression: ['bodyweight-triceps-extension'],
    alternative: ['incline-push-up'],
  },

  // --- Posterior chain (honest: not true pulling) ------------------------
  'prone-y-t-w-raise': {
    // These are near the ceiling of the posterior chain at bodyweight, and
    // most are also beginner, so they read as alternatives rather than as a
    // genuine step up. A handstand drill is a different movement entirely.
    alternative: [
      'reverse-snow-angel',
      'child-s-pose-to-reach',
      'prone-scapular-retraction',
      'handstand-wall-drill',
    ],
  },
  'superman-hold': {
    alternative: [
      'prone-y-t-w-raise',
      'quadruped-rock-back',
      'cat-cow',
      'thoracic-rotation-on-floor',
    ],
  },
  'reverse-snow-angel': {
    alternative: ['child-s-pose-to-reach', 'prone-y-t-w-raise', 'prone-scapular-retraction'],
  },
  'quadruped-rock-back': {
    alternative: ['superman-hold', 'prone-y-t-w-raise', 'cat-cow', 'bird-dog'],
  },
  'doorway-or-table-row-self-resisted-isometric': {
    progression: ['doorway-row-wide-grip'],
    alternative: [
      'quadruped-rock-back',
      'prone-scapular-retraction',
      'child-s-pose-to-reach',
      'prone-y-t-w-raise',
    ],
  },
  'prone-scapular-retraction': {
    alternative: [
      'doorway-or-table-row-self-resisted-isometric',
      'quadruped-rock-back',
      'reverse-snow-angel',
    ],
  },

  // --- Core ---------------------------------------------------------------
  'dead-bug': {
    progression: ['plank', 'bicycle-crunch'],
    alternative: ['bird-dog', 'hollow-hold'],
  },
  'plank': {
    progression: ['forearm-plank-with-reach', 'side-plank', 'hollow-hold'],
    regression: ['dead-bug', 'bird-dog'],
    alternative: ['plank-shoulder-tap'],
  },
  'forearm-plank-with-reach': {
    regression: ['plank', 'dead-bug'],
    alternative: ['plank-shoulder-tap', 'side-plank'],
  },
  'side-plank': {
    regression: ['plank', 'dead-bug'],
    alternative: ['clamshell', 'bicycle-crunch'],
  },
  'hollow-hold': {
    regression: ['plank', 'dead-bug'],
    alternative: ['forearm-plank-with-reach'],
  },
  'bicycle-crunch': {
    regression: ['dead-bug', 'standing-knee-raise'],
    alternative: ['plank', 'side-plank'],
  },
  'bird-dog': {
    progression: ['dead-bug', 'plank'],
    alternative: ['cat-cow', 'quadruped-rock-back'],
  },
  'mountain-climber': {
    progression: ['burpee', 'hollow-hold'],
    regression: ['plank', 'dead-bug'],
    alternative: ['high-knee-march', 'sprawling-lunge'],
  },
  'standing-knee-raise': {
    progression: ['bicycle-crunch'],
    alternative: ['mountain-climber', 'high-knee-march'],
  },
  'plank-shoulder-tap': {
    regression: ['plank', 'dead-bug'],
    alternative: ['forearm-plank-with-reach', 'quadruped-rock-back'],
  },

  // --- Glutes / legs ------------------------------------------------------
  'bodyweight-squat': {
    progression: ['pistol-squat-progression', 'squat-jump', 'split-squat'],
    // A beginner squat regresses to a wall sit. A deep hold is an intermediate
    // movement, so it is offered as a harder step up, not an easier one.
    regression: ['wall-sit'],
    alternative: ['glute-bridge', 'reverse-lunge'],
  },
  'split-squat': {
    progression: ['bulgarian-split-squat', 'pistol-squat-progression'],
    regression: ['reverse-lunge', 'bodyweight-squat'],
  },
  'reverse-lunge': {
    progression: ['split-squat', 'bulgarian-split-squat'],
    regression: ['bodyweight-squat'],
    alternative: ['glute-bridge', 'standing-knee-raise'],
  },
  'bulgarian-split-squat': {
    regression: ['split-squat', 'reverse-lunge'],
    alternative: ['sprawling-lunge'],
  },
  'wall-sit': {
    progression: ['bodyweight-squat', 'deep-squat-hold', 'pistol-squat-progression'],
    alternative: ['glute-bridge', 'leg-swings'],
  },
  'pistol-squat-progression': {
    regression: ['bodyweight-squat', 'split-squat', 'wall-sit'],
  },
  'standing-calf-raise': {
    alternative: ['wall-ankle-rocks', 'leg-swings'],
  },
  'glute-bridge': {
    progression: ['single-leg-glute-bridge'],
    alternative: ['fire-hydrant', 'thigh-lift-hydrant-hold', 'bodyweight-squat', 'clamshell'],
  },
  'single-leg-glute-bridge': {
    regression: ['glute-bridge'],
    alternative: ['fire-hydrant', 'side-plank'],
  },
  'fire-hydrant': {
    regression: ['glute-bridge', 'clamshell'],
    alternative: ['side-plank', 'thigh-lift-hydrant-hold'],
  },
  'clamshell': {
    progression: ['fire-hydrant', 'side-plank'],
    alternative: ['thigh-lift-hydrant-hold', 'glute-bridge'],
  },
  'thigh-lift-hydrant-hold': {
    regression: ['fire-hydrant', 'clamshell', 'glute-bridge'],
    alternative: ['side-plank', '90-90-hip-switch'],
  },
  'squat-jump': {
    regression: ['bodyweight-squat', 'step-jack'],
    alternative: ['burpee', 'high-knee-march'],
  },

  // --- Cardio -------------------------------------------------------------
  'burpee': {
    // A burpee is already intermediate and near the top of the bodyweight
    // catalogue, so it has no upward step. Downward options are the honest
    // progression for anyone who finds it too much.
    regression: ['step-jack', 'mountain-climber', 'high-knee-march', 'sprawling-lunge'],
    alternative: ['shadow-boxing', 'squat-jump'],
  },
  'step-jack': {
    progression: ['burpee', 'squat-jump'],
    alternative: ['high-knee-march', 'shadow-boxing'],
  },
  'high-knee-march': {
    progression: ['burpee', 'mountain-climber'],
    regression: ['step-jack'],
    alternative: ['standing-knee-raise', 'shadow-boxing'],
  },
  'shadow-boxing': {
    progression: ['burpee', 'squat-jump'],
    alternative: ['high-knee-march', 'standing-knee-raise'],
  },
  'sprawling-lunge': {
    progression: ['burpee'],
    regression: ['reverse-lunge', 'high-knee-march'],
    alternative: ['inchworm-walk-out', 'split-squat'],
  },

  // --- Mobility -----------------------------------------------------------
  'inchworm-walk-out': {
    regression: ['cat-cow', 'wall-ankle-rocks'],
    alternative: ['sprawling-lunge', 'quadruped-rock-back'],
  },
  'cat-cow': {
    progression: ['thoracic-rotation-on-floor', 'inchworm-walk-out'],
    alternative: ['bird-dog', 'quadruped-rock-back'],
  },
  'world-s-greatest-stretch': {
    progression: ['90-90-hip-switch'],
    alternative: ['deep-squat-hold', 'thigh-lift-hydrant-hold'],
  },
  '90-90-hip-switch': {
    regression: ['world-s-greatest-stretch'],
    alternative: ['deep-squat-hold', 'thigh-lift-hydrant-hold'],
  },
  'thoracic-rotation-on-floor': {
    regression: ['cat-cow', 'reverse-snow-angel'],
    alternative: ['child-s-pose-to-reach', 'quadruped-rock-back'],
  },
  'child-s-pose-to-reach': {
    progression: ['thoracic-rotation-on-floor'],
    alternative: ['reverse-snow-angel', 'cat-cow'],
  },
  'wall-ankle-rocks': {
    alternative: ['standing-calf-raise', 'leg-swings'],
  },
  'leg-swings': {
    alternative: ['wall-ankle-rocks', 'world-s-greatest-stretch'],
  },
  'deep-squat-hold': {
    progression: ['pistol-squat-progression'],
    regression: ['bodyweight-squat', 'wall-sit'],
    alternative: ['world-s-greatest-stretch', '90-90-hip-switch'],
  },

  // --- Targeted additions ---------------------------------------------------
  // --- Adductors -------------------------------------------------------------
  'side-lying-adductor-raise': {
    progression: ['copenhagen-plank'],
  },
  'copenhagen-plank': {
    progression: ['copenhagen-plank-full'],
    regression: ['side-lying-adductor-raise'],
    alternative: ['tempo-calf-raise'],
  },

  // --- Erector spinae ---------------------------------------------------------
  'prone-cobra': {
    progression: ['reverse-hyperextension'],
    alternative: ['superman-hold'],
  },
  'reverse-hyperextension': {
    regression: ['prone-cobra'],
    alternative: ['superman-hold', 'glute-bridge'],
  },

  // --- Calves ------------------------------------------------------------------
  'single-leg-calf-raise': {
    progression: ['tempo-calf-raise'],
    regression: ['standing-calf-raise'],
    alternative: ['standing-calf-raise'],
  },
  'tempo-calf-raise': {
    regression: ['standing-calf-raise', 'single-leg-calf-raise', 'standing-calf-raise'],
  },

  // --- Obliques ----------------------------------------------------------------
  'windshield-wipers': {
    progression: ['side-plank-with-leg-lift'],
    alternative: ['bicycle-crunch'],
  },
  'side-plank-with-leg-lift': {
    regression: ['side-plank', 'windshield-wipers'],
    alternative: ['side-plank'],
  },

  // --- Hamstrings ---------------------------------------------------------------
  'single-leg-glute-bridge-march': {
    progression: ['nordic-curl-eccentric'],
    regression: ['single-leg-glute-bridge'],
    alternative: ['glute-bridge'],
  },
  'nordic-curl-eccentric': {
    progression: ['single-leg-nordic-curl-eccentric'],
    regression: ['glute-bridge', 'single-leg-glute-bridge-march'],
    alternative: ['tempo-calf-raise'],
  },

  // --- Hip flexors ----------------------------------------------------------------
  'standing-knee-drive': {
    progression: ['mountain-climber-slow'],
    alternative: ['standing-knee-raise', 'mountain-climber'],
  },
  'mountain-climber-slow': {
    progression: ['l-sit-progression'],
    regression: ['mountain-climber', 'standing-knee-drive'],
    alternative: ['mountain-climber'],
  },

  // --- Delts -------------------------------------------------------------------------
  'wall-walk': {
    progression: ['handstand-hold-wall', 'decline-pike-push-up'],
    regression: ['pike-push-up'],
    alternative: ['pike-push-up'],
  },
  'handstand-hold-wall': {
    regression: ['wall-walk', 'pike-push-up'],
    alternative: ['decline-pike-push-up'],
  },
  'decline-pike-push-up': {
    progression: ['handstand-hold-wall'],
    regression: ['pike-push-up', 'wall-walk'],
    alternative: ['handstand-hold-wall', 'wall-walk'],
  },

  // --- Lats -------------------------------------------------------------------------
  'doorway-row-wide-grip': {
    regression: ['doorway-or-table-row-self-resisted-isometric', 'quadruped-rock-back'],
    alternative: ['quadruped-rock-back', 'reverse-snow-angel'],
  },
  'prone-snow-angel': {
    alternative: ['reverse-snow-angel', 'cat-cow', 'prone-y-t-w-raise'],
  },

  // --- Obliques (advanced second) ------------------------------------------------------
  'suitcase-carry-march': {
    alternative: ['windshield-wipers', 'side-plank-with-leg-lift'],
  },

  // --- Hip flexors (advanced second) ----------------------------------------------------
  'l-sit-progression': {
    regression: ['mountain-climber-slow', 'standing-knee-drive'],
    alternative: ['hollow-hold'],
  },

  // --- Adductors (advanced third) -------------------------------------------------------
  'side-lying-adductor-squeeze': {
    progression: ['copenhagen-plank-full'],
    regression: ['side-lying-adductor-raise'],
    alternative: ['side-lying-adductor-raise', 'copenhagen-plank'],
  },
  'copenhagen-plank-full': {
    regression: ['copenhagen-plank'],
    alternative: ['side-lying-adductor-raise'],
  },

  // --- Hamstrings (advanced third) ------------------------------------------------------
  'single-leg-nordic-curl-eccentric': {
    regression: ['nordic-curl-eccentric'],
    alternative: ['tempo-calf-raise'],
  },

  // --- Final balance additions -----------------------------------------------
  'plyometric-squat-jump': {
    regression: ['squat-jump', 'bodyweight-squat'],
    alternative: ['squat-jump'],
  },
  'archer-push-up': {
    regression: ['decline-push-up', 'diamond-push-up'],
    alternative: ['plyo-push-up-knee-down'],
  },
  'single-leg-box-squat': {
    progression: ['pistol-squat-progression', 'bulgarian-split-squat'],
    regression: ['bodyweight-squat', 'reverse-lunge'],
    alternative: ['bulgarian-split-squat'],
  },
  'hollow-hold-rock': {
    regression: ['hollow-hold'],
    alternative: ['hollow-hold', 'bicycle-crunch'],
  },
  'plyo-push-up-knee-down': {
    regression: ['knee-push-up', 'push-up'],
    alternative: ['archer-push-up', 'push-up-plus'],
  },
  'curtsy-lunge-with-reach': {
    regression: ['reverse-lunge'],
    alternative: ['reverse-lunge', '90-90-hip-switch'],
  },
  'bear-crawl-to-crab-walk-transition': {
    regression: ['inchworm-walk-out', 'shadow-boxing'],
    alternative: ['inchworm-walk-out', 'sprawling-lunge'],
  },
};

/**
 * Empty-relation fallback. Returning fresh arrays (not a shared literal) keeps
 * callers from accidentally mutating the graph.
 */
const EMPTY = (): RelationSet => ({ progression: [], regression: [], alternative: [] });

type RelationSet = {
  progression: string[];
  regression: string[];
  alternative: string[];
};

/** Relations for one exercise, always as owned arrays. */
export const seedRelationsFor = (slug: string): RelationSet => {
  const entry = EXERCISE_RELATIONS[slug];
  if (!entry) return EMPTY();
  return {
    progression: [...(entry.progression ?? [])],
    regression: [...(entry.regression ?? [])],
    alternative: [...(entry.alternative ?? [])],
  };
};
