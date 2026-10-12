/**
 * Exercise catalog seed.
 *
 * Reference data, not user data — shipping it in the bundle is correct.
 * Every entry is bodyweight-only. Where bodyweight cannot deliver a
 * pull-up-equivalent stimulus the entry says so in `safetyNotes`/`description`
 * rather than implying equivalence.
 *
 * Difficulty is calibrated for an otherwise-healthy adult with no training
 * background: `intermediate` assumes a base of ~8 weeks of consistent work.
 */
import type { Exercise } from '@/lib/domain/types';
import { exerciseId } from '@/lib/domain/ids';
import { EXERCISE_RELATIONS } from '@/lib/domain/exercise-relations';

const CREATED = '2026-01-01T00:00:00.000Z';

/**
 * Relations are authored once in `exercise-relations.ts` and injected below,
 * so they are excluded here rather than repeated on all 55 entries.
 */
type Seed = Omit<
  Exercise,
  | 'id'
  | 'createdAt'
  | 'equipmentRequired'
  | 'slug'
  | 'progressionExercises'
  | 'regressionExercises'
  | 'alternativeExercises'
> &
  Partial<Pick<Exercise, 'slug'>>;

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const seeds: Seed[] = [
  // --- Push ---------------------------------------------------------------
  {
    name: 'Push-Up',
    description:
      'The reference horizontal press for home training. Scales from a wall push to a full floor push by changing hand and body height.',
    bodyParts: ['chest', 'shoulders', 'arms'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'deltoids'],
    difficulty: 'beginner',
    exerciseType: 'push_up',
    instructions: [
      'Place hands on the floor slightly wider than shoulder width, fingers spread.',
      'Walk the feet back until the body forms a straight line from head to heels.',
      'Bend the elbows to about 45 degrees from the torso and lower the chest.',
      'Press the floor away until the elbows lock out, without letting the hips sag.',
    ],
    formCues: [
      'Squeeze the glutes so the hips stay level with the shoulders.',
      'Elbows point back at roughly 45 degrees, not straight out to the sides.',
      'Look at a spot just ahead of the hands, not at the floor.',
    ],
    commonMistakes: [
      'Letting the hips sag or pike, which shifts load away from the chest.',
      'Flaring the elbows to 90 degrees, which strains the shoulder.',
      'Half repping at the bottom, where the chest never touches the floor.',
    ],
    breathingInstruction:
      'Inhale as you lower, exhale as you press up. Do not hold your breath at the bottom.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'Stop if you feel sharp pain in the shoulder or wrist. If a full push-up is too hard, use wall or incline push-ups rather than dropping to the knees with a sagging hip.',
  },
  {
    name: 'Incline Push-Up',
    description:
      'A wall or counter-height push-up. The vertical angle reduces the load, making it the standard entry point rather than a lesser exercise.',
    bodyParts: ['chest', 'shoulders', 'arms'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'deltoids'],
    difficulty: 'beginner',
    exerciseType: 'push_up',
    instructions: [
      'Stand facing a wall or sturdy counter, feet a step back from it.',
      'Place hands on the surface at chest height and walk the feet back to a straight line.',
      'Lower the chest toward the surface, keeping the body rigid.',
      'Press away to a straight arm.',
    ],
    formCues: ['Keep a straight line from heels to head.', 'Lower under control, not by dropping.'],
    commonMistakes: ['Feet drifting too close, making it too easy.'],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 15,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'Use a wall or counter that cannot slide. Do not lean on a rolling surface.',
  },
  {
    name: 'Pike Push-Up',
    description:
      'The closest bodyweight approximation to an overhead press. It builds shoulder pressing strength, but it does not reproduce the loaded range of a machine press.',
    bodyParts: ['shoulders', 'arms', 'chest'],
    primaryMuscles: ['deltoids'],
    secondaryMuscles: ['triceps', 'chest', 'rotator_cuff'],
    difficulty: 'intermediate',
    exerciseType: 'push_up',
    instructions: [
      'From a push-up position, walk the feet in toward the hands and lift the hips high.',
      'Set the hands slightly wider than shoulder width, fingers forward or rotated slightly out.',
      'Lower the crown of the head toward the floor between or just in front of the hands.',
      'Press back up to the starting pike.',
    ],
    formCues: [
      'Hips stay high; the movement is a vertical press, not a push-up with bent hips.',
      'Neck stays neutral — look at the floor slightly ahead of the hands.',
    ],
    commonMistakes: [
      'Letting the hips drop, which turns the movement into an incline push-up.',
      'Craning the neck to look forward.',
    ],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 75,
    safetyNotes:
      'Stop at any sharp pain at the front of the shoulder. If the hands are uncomfortable, use parallette-style hands on the floor rather than a spiked surface.',
  },
  {
    name: 'Handstand Wall Drill',
    description:
      'Progressive shoulder strength and balance toward a freestanding handstand. The wall removes balance as a limiting factor so the shoulders and core can be trained honestly.',
    bodyParts: ['shoulders', 'arms', 'core'],
    primaryMuscles: ['deltoids'],
    secondaryMuscles: ['triceps', 'abs', 'forearms'],
    difficulty: 'advanced',
    exerciseType: 'balance',
    instructions: [
      'Face a wall and place the hands on the floor about 20 cm from it.',
      'Kick one foot up to the wall, then the other, until stacked over the hands.',
      'Hold with the hips stacked over the shoulders and the ribs pulled down.',
      'Come down one foot at a time.',
    ],
    formCues: [
      'Push the floor away hard to create shoulder elevation.',
      'Squeeze the glutes and quads to keep the line vertical.',
    ],
    commonMistakes: [
      'Arching the lower back to get the hips up, which loads the lumbar spine.',
      'Sticking the elbows out, which limits the pressing position.',
    ],
    breathingInstruction: 'Exhale during the kick-up, then breathe slowly during holds.',
    recommendedSets: 5,
    recommendedReps: 5,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 90,
    safetyNotes:
      'This is a shoulder-balance drill, not a spinal-loading exercise. Do not attempt it with any neck injury. Come down immediately if the lower back arches.',
  },
  {
    name: 'Bodyweight Triceps Extension',
    description:
      'Elbow-extension strength without weights. The angle of the upper arm changes the difficulty, so a floor variation is much harder than a wall variation.',
    bodyParts: ['arms'],
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['abs'],
    difficulty: 'intermediate',
    exerciseType: 'other',
    instructions: [
      'Start in a push-up position with the hands slightly behind shoulder level.',
      'Keeping the elbows bent and pointing back, bend only at the elbows to lower the chest.',
      'Extend the elbows to press back up.',
    ],
    formCues: [
      'The upper arms stay fixed; only the forearms move.',
      'Hips do not rise or fall during the set.',
    ],
    commonMistakes: ['Letting the elbows flare, which turns it into a normal push-up.'],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes: 'Keep the wrists under the shoulders and neutral. Stop at any wrist pain.',
  },
  {
    name: 'Wall Triceps Extension',
    description:
      'The accessible version of the bodyweight triceps extension: face away from a wall and lower only the upper body below the hands.',
    bodyParts: ['arms'],
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Stand facing away from a wall with the feet about a step forward.',
      'Place the hands on the wall at waist height and lean the body forward into a straight line.',
      'Bend the elbows to lower the body toward a right angle, keeping the upper arms against the wall.',
      'Press back up.',
    ],
    formCues: ['Only the body below the hands moves.'],
    commonMistakes: ['Arching the lower back to lower further.'],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'Do not lower so far that the lower back rounds. A partial range is safer than a deep one.',
  },
  {
    name: 'Plank Shoulder Tap',
    description:
      'Anti-rotation core work that also loads one shoulder at a time, so it trains the trunk to resist twisting under uneven load.',
    bodyParts: ['core', 'shoulders', 'chest'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'deltoids', 'chest'],
    difficulty: 'intermediate',
    exerciseType: 'plank',
    instructions: [
      'Set up in a forearm plank with the feet slightly wider than the hips.',
      'Shift weight into the right forearm and lift the left hand to tap the right shoulder.',
      'Replace the hand and repeat on the other side.',
    ],
    formCues: [
      'Hips stay level; the body does not rotate toward the tapping hand.',
      'Press the floor away with the supporting arm to stop the shoulder from collapsing.',
    ],
    commonMistakes: ['Hips rocking side to side with each tap.', 'Rounding the lower back.'],
    breathingInstruction: 'Exhale as you tap, inhale as you replace.',
    recommendedSets: 3,
    recommendedReps: 20,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'If the lower back sags, return to a static forearm plank first.',
  },
  // --- Pull ---------------------------------------------------------------
  {
    name: 'Prone Y-T-W Raise',
    description:
      'A face-down floor drill for the mid and upper back. Be honest about what this is: it trains the muscles that hold the shoulders back, but it cannot deliver the pulling volume of rows or pull-ups. It is a supplement to those, not a replacement.',
    bodyParts: ['back', 'shoulders'],
    primaryMuscles: ['rhomboids', 'traps'],
    secondaryMuscles: ['rear_deltoids', 'erector_spine'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Lie face down on the floor with arms extended forward.',
      'Lift the arms a few centimetres off the floor, palms down, forming a Y.',
      'Draw the shoulder blades together and down, then hold for 2 seconds.',
      'Repeat, then sweep the arms out to a T for the second letter, and back for the W.',
    ],
    formCues: [
      'Movement comes from the shoulder blades, not from throwing the arms up.',
      'The neck stays down; you are looking at the floor the whole time.',
      'Lift only a few centimetres — height is not the goal.',
    ],
    commonMistakes: [
      'Yanking the arms up with momentum.',
      'Craning the neck to look forward, which compresses the neck extensors.',
      'Holding the breath and arching the lower back.',
    ],
    breathingInstruction: 'Inhale as the arms lower, exhale as you lift and hold.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'This is a low-load back exercise, not a substitute for a real pulling movement. Do not turn it into a hyperextension by lifting the legs and chest at the same time.',
  },
  {
    name: 'Superman Hold',
    description:
      'Spinal endurance for the posterior chain. Useful for posture and for balancing out a lot of pushing and sitting work.',
    bodyParts: ['back', 'core', 'full_body'],
    primaryMuscles: ['erector_spine', 'glutes'],
    secondaryMuscles: ['traps', 'hamstrings'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Lie face down with arms extended overhead and legs straight.',
      'Lift the arms, chest, and legs a few centimetres off the floor at the same time.',
      'Hold for the target time, breathing throughout.',
    ],
    formCues: [
      'Lift from the upper back rather than by pulling on the neck.',
      'Gaze stays down at the floor throughout.',
    ],
    commonMistakes: ['Lifting the legs high, which turns the lower back into a lever.', 'Holding the breath.'],
    breathingInstruction: 'Keep breathing steadily throughout the hold. Do not hold your breath.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 45,
    safetyNotes: 'Stop at any lower back pain. Keep the legs low rather than pushing height.',
  },
  {
    name: 'Reverse Snow Angel',
    description:
      'Thoracic mobility and upper-back range work. The prone position is a genuine limitation: without a pull-up bar there is no unloaded way to hang and decompress the spine.',
    bodyParts: ['back', 'shoulders'],
    primaryMuscles: ['traps', 'rhomboids'],
    secondaryMuscles: ['erector_spine'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Lie face down, arms out to the sides in a T, palms down.',
      'Keeping the legs and hips still, sweep the arms up and back to bring the hands toward each other.',
      'Open back out to the start, then reverse the path.',
    ],
    formCues: ['Movement is slow and comes from the upper back, not the neck.'],
    commonMistakes: ['Rushing the range.', 'Lifting the legs to create momentum.'],
    breathingInstruction: 'Exhale as the arms sweep up, inhale on the way down.',
    recommendedSets: 2,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Stay well within a comfortable range. This is mobility, not a stretch contest.',
  },
  {
    name: 'Quadruped Rock-Back',
    description:
      'A safe, equipment-free way to train the lats and upper back in a lengthened position, which most bodyweight pulling cannot reach.',
    bodyParts: ['back', 'shoulders'],
    primaryMuscles: ['lats'],
    secondaryMuscles: ['traps', 'rhomboids', 'abs'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Set up on hands and knees with hands under the shoulders.',
      'Press the floor away and shift the hips back toward the heels, keeping the arms long.',
      'Return to all fours without dropping the hips.',
    ],
    formCues: [
      'The hands stay planted and the arms stay straight — this is a hip hinge, not a sit-up.',
      'Press the floor away to keep the shoulders active.',
    ],
    commonMistakes: ['Bending the elbows and turning it into a push-up.', 'Rounding the back.'],
    breathingInstruction: 'Inhale as the hips shift back, exhale to return.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Keep the neck in line with the spine. Do not force the hip shift if the knees or wrists object.',
  },
  {
    name: 'Doorway or Table Row (Self-Resisted Isometric)',
    description:
      'An isometric back contraction using a fixed surface. It is a genuine option with no equipment at home, but it produces far less back volume than an actual row, so treat it as a warm-up or a supplement.',
    bodyParts: ['back'],
    primaryMuscles: ['lats', 'rhomboids'],
    secondaryMuscles: ['biceps', 'traps'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Sit on the floor facing a sturdy table edge, knees bent, feet flat.',
      'Loop a towel around the table leg and hold both ends in your hands.',
      'Sit up tall and pull the elbows back, squeezing the shoulder blades together.',
      'Hold the contraction for the target time, then release slowly.',
    ],
    formCues: [
      'Ribs stay down; the movement is a shoulder-blade retraction, not a lean back.',
      'Pull with the elbows, not by lifting the shoulders.',
    ],
    commonMistakes: ['Leaning back to use body weight.', 'Shrugging the shoulders.'],
    breathingInstruction: 'Exhale during the pull, breathe slowly during the hold. Do not hold your breath.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 15,
    recommendedRestSeconds: 45,
    safetyNotes:
      'Use a table bolted down or a low, heavy, non-sliding piece of furniture. A free-standing lightweight table can tip. This is an isometric, so it builds less back than a dynamic row.',
  },
  {
    name: 'Prone Scapular Retraction',
    description:
      'Isolates the shoulder blades. A good default back exercise when nothing else is available, and safe for most beginners.',
    bodyParts: ['back', 'shoulders'],
    primaryMuscles: ['rhomboids', 'traps'],
    secondaryMuscles: [],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Lie face down with the arms bent and the hands beside the ribs.',
      'Draw the shoulder blades together and slightly down.',
      'Hold 2 seconds, then relax completely.',
    ],
    formCues: ['Elbows stay bent and close to the body.'],
    commonMistakes: ['Shrugging instead of retracting.'],
    breathingInstruction: 'Exhale on the retraction, inhale on the release.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Small, pain-free range only.',
  },
  // --- Legs and hips -------------------------------------------------------
  {
    name: 'Bodyweight Squat',
    description:
      'The fundamental lower-body pattern. Depth is limited by ankle and hip mobility, and the load stays below what a loaded barbell squat provides, so progress comes from tempo and reps rather than weight.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'abs'],
    difficulty: 'beginner',
    exerciseType: 'bodyweight_squat',
    instructions: [
      'Stand with feet about shoulder width, toes turned slightly out.',
      'Take a breath, brace the core, and push the hips back and down.',
      'Descend until the thighs are at least parallel, or to your comfortable depth.',
      'Drive through the whole foot to stand up.',
    ],
    formCues: [
      'Knees track over the toes.',
      'Chest stays up and the lower back stays neutral.',
      'Spread the floor with the feet to keep the knees from caving.',
    ],
    commonMistakes: [
      'Heels lifting off the floor.',
      'Rounding the lower back to get lower.',
      'Knees collapsing inward on the way up.',
    ],
    breathingInstruction: 'Inhale at the top or mid-descent, exhale as you stand.',
    recommendedSets: 3,
    recommendedReps: 15,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'Depth is not the goal — quality is. Do not round the lower back to reach depth, and do not go below a depth you can control.',
  },
  {
    name: 'Split Squat',
    description:
      'Single-leg work that exposes and corrects side-to-side imbalances. Harder than a bilateral squat at the same nominal difficulty, because balance and the weaker leg both cost you.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'adductors'],
    difficulty: 'intermediate',
    exerciseType: 'lunge',
    instructions: [
      'Step one foot forward about two foot lengths and stand tall.',
      'Lower the back knee toward the floor, keeping the front heel down.',
      'Drive up through the front heel to return to standing.',
      'Complete all reps on one side, then switch.',
    ],
    formCues: [
      'The front shin stays roughly vertical.',
      'Torso stays upright, hips square to the front.',
    ],
    commonMistakes: ['Pushing off the back foot.', 'Leaning forward over the front thigh.'],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'Hold a wall for balance if needed. The back knee should not slam into the floor; lower within a range you control.',
  },
  {
    name: 'Reverse Lunge',
    description:
      'Knee-friendly alternative to the forward lunge, because the leading knee is not driven forward over the toes.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    difficulty: 'beginner',
    exerciseType: 'lunge',
    instructions: [
      'Stand tall with feet hip width.',
      'Step one foot straight back and lower the back knee toward the floor.',
      'Push through the front heel to return.',
      'Switch legs after the set.',
    ],
    formCues: ['Torso stays tall.', 'The front knee tracks over the middle toes.'],
    commonMistakes: ['Leaning forward.', 'Stepping back too short, which over-loads the front knee.'],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes: 'Keep the step long enough that the front shin stays near vertical.',
  },
  {
    name: 'Bulgarian Split Squat',
    description:
      'A demanding single-leg squat progression. The rear foot is elevated on a low stable surface, which requires one piece of household furniture and no purchased equipment.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'abs'],
    difficulty: 'advanced',
    exerciseType: 'lunge',
    instructions: [
      'Stand with the front foot about two foot lengths ahead of a low, stable step or chair.',
      'Rest the top of the rear foot on the step.',
      'Lower the back knee toward the floor, keeping the torso upright.',
      'Drive up through the front heel.',
    ],
    formCues: [
      'The front shin stays close to vertical.',
      'The hips stay square to the front rather than rotating open.',
    ],
    commonMistakes: [
      'Stepping too close to the step, which jams the front knee.',
      'Twisting the hips toward the working leg.',
    ],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'Use a low, stable, non-rolling surface and test it before loading it. Skip this if the balance demand is too high for a solid position.',
  },
  {
    name: 'Wall Sit',
    description:
      'Quadriceps endurance with almost no balance demand, which makes it a good fit for a beginner or a session with a time cap.',
    bodyParts: ['legs'],
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'abs'],
    difficulty: 'beginner',
    exerciseType: 'bodyweight_squat',
    instructions: [
      'Stand with the back flat against a wall.',
      'Walk the feet forward and slide down until the knees are bent to about 90 degrees.',
      'Keep the lower back flat against the wall and hold.',
    ],
    formCues: ['Thighs roughly parallel to the floor.', 'Weight in the heels.'],
    commonMistakes: ['Arching the lower back to get lower.', 'Holding the breath.'],
    breathingInstruction: 'Breathe continuously throughout the hold.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 30,
    recommendedRestSeconds: 45,
    safetyNotes: 'Slide only as far as you can hold without arching the back. Lower quad depth is fine.',
  },
  {
    name: 'Pistol Squat Progression',
    description:
      'Progressive single-leg loading using bodyweight. The honest version is a slow, controlled single-leg squat to a chair, not an unsupported free-standing pistol.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'adductors', 'abs'],
    difficulty: 'advanced',
    exerciseType: 'bodyweight_squat',
    instructions: [
      'Stand in front of a chair, on one leg, with the other foot lifted in front of the body.',
      'Lower slowly until the butt just touches the chair, keeping the working heel down.',
      'Pause, then stand back up on the same leg without sitting.',
    ],
    formCues: [
      'The working knee tracks over the middle toes.',
      'The free leg stays lifted, not swinging.',
    ],
    commonMistakes: ['Falling backwards onto the chair and sitting.', 'Letting the knee cave inward.'],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 6,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'Have a wall or counter within reach. This progression is not appropriate for anyone with knee pain or poor balance — use a regular split squat instead.',
  },
  {
    name: 'Standing Calf Raise',
    description: 'Calf strength and ankle resilience using any flat surface as a reference.',
    bodyParts: ['legs'],
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Stand with the ball of the foot on the edge of a step, the heel hanging free.',
      'Rise onto the balls of the feet as high as possible.',
      'Lower until the heels drop below the level of the step.',
    ],
    formCues: ['Rise and lower slowly.', 'Keep the knees straight for the gastrocnemius.'],
    commonMistakes: ['Bouncing out of the bottom.', 'Using the hands for momentum.'],
    breathingInstruction: 'Exhale as you rise, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 15,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Hold a wall for balance. Stop at any sharp calf or Achilles pain.',
  },
  {
    name: 'Glute Bridge',
    description:
      'Hip extension and trunk control from the floor. Unloads the spine, which makes it a good default for days when the back is not up to a standing load.',
    bodyParts: ['glutes', 'core'],
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'abs', 'erector_spine'],
    difficulty: 'beginner',
    exerciseType: 'bridge',
    instructions: [
      'Lie on your back with knees bent and heels close to the buttock.',
      'Press through the heels and lift the hips until the body forms a straight line.',
      'Squeeze the glutes for a second at the top, then lower under control.',
    ],
    formCues: [
      'The ribs stay down — do not arch the lower back to lift higher.',
      'Drive with the glutes, not by pushing the hips with the lower back.',
    ],
    commonMistakes: ['Hyperextending the lower back at the top.', 'Pushing through the toes.'],
    breathingInstruction: 'Exhale as the hips rise, inhale as they lower.',
    recommendedSets: 3,
    recommendedReps: 15,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'Stop at any lower back or hip pain. A smaller range is fine.',
  },
  {
    name: 'Single-Leg Glute Bridge',
    description:
      'Unilateral version of the bridge, which removes the stronger side from the equation and is harder than it looks.',
    bodyParts: ['glutes'],
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings', 'abs'],
    difficulty: 'intermediate',
    exerciseType: 'bridge',
    instructions: [
      'Lie on your back with knees bent.',
      'Extend one leg, keeping the foot flat on the floor for balance.',
      'Drive through the planted heel and lift the hips.',
      'Lower under control and switch legs.',
    ],
    formCues: ['The pelvis stays level — it should not tip to the lifted side.'],
    commonMistakes: ['Rotating the pelvis up toward the free leg.'],
    breathingInstruction: 'Exhale up, inhale down.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'Keep the foot lightly on the floor for balance rather than lifting it high.',
  },
  {
    name: 'Fire Hydrant',
    description:
      'Hip rotator and glute work on all fours. Targets the side of the hip that most desk and sitting routines neglect.',
    bodyParts: ['glutes', 'legs'],
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['adductors', 'abs'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Set up on hands and knees with hands under the shoulders.',
      'Keeping the knee bent at 90 degrees, lift one knee out to the side.',
      'Return under control and repeat, then switch sides.',
    ],
    formCues: ['The pelvis stays square and level.', 'Movement comes from the hip, not the lower back.'],
    commonMistakes: ['Lifting the leg so high the lower back takes over.', 'Rotating the torso.'],
    breathingInstruction: 'Exhale as the knee lifts, inhale as it returns.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Keep the range pain-free, especially with any hip or lower back history.',
  },
  {
    name: 'Clamshell',
    description:
      'Hip rotator strength in a low-risk position. Often the safest way to start loading the hip external rotators without aggravating the joint.',
    bodyParts: ['glutes', 'legs'],
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Lie on your side with the knees bent to about 45 degrees.',
      'Keep the feet together and the pelvis stacked.',
      'Rotate the top knee upward like a clam opening its shell.',
      'Lower without letting the pelvis roll back.',
    ],
    formCues: ['The hips stay stacked — no backward roll.'],
    commonMistakes: ['Letting the pelvis roll back, which removes the hip work.'],
    breathingInstruction: 'Exhale as the knee opens, inhale as it closes.',
    recommendedSets: 3,
    recommendedReps: 15,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Skip or reduce this if it causes pain at the front of the hip joint.',
  },
  {
    name: 'Thigh-Lift Hydrant Hold',
    description: 'Isometric glute hold that is easier to load than a repetition-based bridge.',
    bodyParts: ['glutes'],
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Stand on one leg with a slight bend in the knee.',
      'Hold onto a wall for balance if needed.',
      'Squeeze the glute on the standing leg and hold.',
    ],
    formCues: ['Stand tall; the hold comes from the glute, not from leaning.'],
    commonMistakes: ['Leaning to the side to rest weight off the working leg.'],
    breathingInstruction: 'Breathe steadily during the hold.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 30,
    safetyNotes: 'Keep a hand on a wall until balance is reliable.',
  },
  // --- Core ----------------------------------------------------------------
  {
    name: 'Dead Bug',
    description:
      'Anti-extension core work that teaches the trunk to stay still while the limbs move. Low spinal load, so it suits almost any starting point.',
    bodyParts: ['core'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'hip_flexors'],
    difficulty: 'beginner',
    exerciseType: 'crunch',
    instructions: [
      'Lie on your back with the arms straight up and the knees over the hips.',
      'Press the lower back gently into the floor.',
      'Lower one arm overhead and the opposite leg toward the floor, keeping the back flat.',
      'Return and switch sides.',
    ],
    formCues: [
      'The lower back stays in contact with the floor the whole time.',
      'Only the limbs move; the ribcage and pelvis stay fixed.',
    ],
    commonMistakes: ['Letting the lower back arch off the floor.'],
    breathingInstruction: 'Exhale as the limbs extend, inhale as they return.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'Reduce the range if the back lifts. This is always scaled down, never up.',
  },
  {
    name: 'Plank',
    description:
      'A straight-line isometric for the trunk. Learn it as a position, not a race — a rigid hold for 20 seconds beats a 60-second sagging one.',
    bodyParts: ['core'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'deltoids', 'glutes'],
    difficulty: 'beginner',
    exerciseType: 'plank',
    instructions: [
      'Set the forearms on the floor directly under the shoulders.',
      'Extend the legs back, resting on the balls of the feet.',
      'Squeeze the glutes and brace the core so the body forms one straight line.',
      'Breathe normally and hold.',
    ],
    formCues: [
      'A straight line from the ears to the heels — no hips high, no hips low.',
      'Push the floor away with the forearms to spread the shoulder blades.',
      'Tuck the pelvis slightly rather than arching the lower back.',
    ],
    commonMistakes: [
      'Hips piking up, which turns it into a pike push-up.',
      'Lower back sagging, which loads the spine instead of the core.',
      'Holding the breath.',
    ],
    breathingInstruction: 'Breathe continuously throughout the hold. Do not hold your breath.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 30,
    recommendedRestSeconds: 45,
    safetyNotes:
      'End the hold when the position degrades, not when the clock runs out. Come out to the knees if the back starts to sag.',
  },
  {
    name: 'Forearm Plank with Reach',
    description: 'Plank variation that adds a shoulder and thoracic component without adding spinal load.',
    bodyParts: ['core', 'shoulders'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'deltoids'],
    difficulty: 'intermediate',
    exerciseType: 'plank',
    instructions: [
      'Set up in a forearm plank.',
      'Without shifting the hips, slowly reach one arm forward and back.',
      'Alternate arms while holding the plank position.',
    ],
    formCues: ['The hips do not move at all as the arm travels.'],
    commonMistakes: ['Hips rotating toward the reaching arm.'],
    breathingInstruction: 'Exhale as the arm reaches forward.',
    recommendedSets: 3,
    recommendedReps: 16,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'Regress to a static plank if the position cannot be held.',
  },
  {
    name: 'Side Plank',
    description:
      'Anti-side-bending core work on one arm, which is harder than it appears. A good default for oblique and hip stability work.',
    bodyParts: ['core'],
    primaryMuscles: ['obliques'],
    secondaryMuscles: ['abs', 'deltoids', 'glutes'],
    difficulty: 'intermediate',
    exerciseType: 'plank',
    instructions: [
      'Lie on your side with the elbow directly under the shoulder.',
      'Stack the feet, or stagger them for more stability.',
      'Lift the hips so the body forms a straight line, then hold.',
    ],
    formCues: [
      'The body is one straight line — no hip dip or hip hike.',
      'Push the floor away with the supporting forearm.',
    ],
    commonMistakes: ['Hips sinking toward the floor.', 'Rolling forward onto the shoulder.'],
    breathingInstruction: 'Breathe continuously during the hold.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 40,
    safetyNotes: 'Drop the top leg to the floor for support if the shoulder cannot take the load. Stop at shoulder pain.',
  },
  {
    name: 'Hollow Hold',
    description:
      'A demanding anti-extension position. Only attempt it once a solid straight-body plank is comfortable, since it loads the lower back far more.',
    bodyParts: ['core'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['hip_flexors'],
    difficulty: 'advanced',
    exerciseType: 'plank',
    instructions: [
      'Lie on your back and press the lower back flat into the floor.',
      'Lift the shoulder blades and legs off the floor, arms by the sides.',
      'Hold the shape, keeping the lower back in contact with the floor.',
    ],
    formCues: ['The lower back never leaves the floor.'],
    commonMistakes: ['Hips rising and the lower back arching off the floor.'],
    breathingInstruction: 'Exhale on setup, then breathe continuously during the hold.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 45,
    safetyNotes:
      'Not for anyone with a lower back injury. If the lower back cannot stay flat, the position is too advanced — return to a plank or a dead bug.',
  },
  {
    name: 'Bicycle Crunch',
    description:
      'Rotation plus flexion, targeting the obliques while the legs move. Common, and effective when the rotation comes from the ribs rather than the elbow driving the knee.',
    bodyParts: ['core'],
    primaryMuscles: ['obliques'],
    secondaryMuscles: ['abs', 'hip_flexors'],
    difficulty: 'intermediate',
    exerciseType: 'crunch',
    instructions: [
      'Lie on your back with the hands lightly behind the head and the legs lifted.',
      'Rotate the ribcage toward one knee while the opposite leg extends.',
      'Return through the middle and switch sides.',
    ],
    formCues: [
      'The rotation comes from bringing the elbow to the knee, not from yanking the neck.',
      'The lower back stays in contact with the floor.',
    ],
    commonMistakes: ['Pulling on the neck with the hands.', 'Swinging the legs with momentum.'],
    breathingInstruction: 'Exhale as you rotate toward the knee.',
    recommendedSets: 3,
    recommendedReps: 20,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'If neck discomfort is an issue, keep the hands off the head. Skip with any neck or back injury.',
  },
  {
    name: 'Mountain Climber',
    description:
      'A dynamic core movement that also raises the heart rate, so it counts as conditioning as well as core work. Slow the tempo to make it a core exercise rather than a cardio one.',
    bodyParts: ['core', 'full_body'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'deltoids', 'full_body'],
    difficulty: 'beginner',
    exerciseType: 'mountain_climber',
    instructions: [
      'Set up in a tall plank with the hands under the shoulders.',
      'Drive one knee toward the chest without lifting the hips.',
      'Switch legs, keeping the shoulders stacked over the hands.',
    ],
    formCues: [
      'Hips stay level and slightly elevated — do not bounce them up and down.',
      'Weight is in the hands, not the toes.',
    ],
    commonMistakes: ['Hips bouncing high with each rep.', 'Rounding the back.'],
    breathingInstruction: 'Exhale as the knee drives in.',
    recommendedSets: 3,
    recommendedReps: 20,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'Drop to a slower tempo or to a standing knee drive if the wrists or back object.',
  },
  {
    name: 'Standing Knee Raise',
    description:
      'The standing equivalent of a dead bug, and a better default for anyone whose back or wrists dislike floor work.',
    bodyParts: ['core'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'hip_flexors'],
    difficulty: 'beginner',
    exerciseType: 'crunch',
    instructions: [
      'Stand tall with the hands lightly on the hips.',
      'Lift one knee toward the chest without leaning back.',
      'Lower under control and switch sides.',
    ],
    formCues: ['The torso stays upright — the hip folds, the back does not arch.'],
    commonMistakes: ['Leaning back to bring the knee up.'],
    breathingInstruction: 'Exhale as the knee lifts.',
    recommendedSets: 3,
    recommendedReps: 20,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Hold a wall for balance if needed.',
  },
  // --- Conditioning -------------------------------------------------------
  {
    name: 'Burpee',
    description:
      'A full-body conditioning staple. The jump is optional and should be dropped whenever it is uncomfortable or the wrists cannot take it — the rest of the movement still works.',
    bodyParts: ['full_body'],
    primaryMuscles: ['full_body'],
    secondaryMuscles: ['chest', 'quads', 'glutes', 'abs'],
    difficulty: 'intermediate',
    exerciseType: 'burpee',
    instructions: [
      'Stand with feet shoulder width.',
      'Squat down, place the hands on the floor, and jump or step the feet back into a plank.',
      'Optional: lower the chest to the floor.',
      'Jump or step the feet back in, stand up, and optionally jump with the arms overhead.',
    ],
    formCues: [
      'The lower back stays neutral in the plank — bring the knees in if the back sags.',
      'Land softly on the balls of the feet.',
    ],
    commonMistakes: [
      'Rounding the back during the plank phase.',
      'Skipping the chest-to-floor phase, which removes the difficulty.',
    ],
    breathingInstruction: 'Exhale as you stand and jump.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'Drop the jump entirely if you have any joint impact concern, are new to training, or are on a hard surface with no footwear. Do not burpee rapidly into a fatigued state.',
  },
  {
    name: 'Step Jack',
    description:
      'A low-impact stand-in for jumping jacks. The right default when jumping is not an option, and it raises the heart rate without landing forces.',
    bodyParts: ['full_body'],
    primaryMuscles: ['full_body'],
    secondaryMuscles: ['deltoids', 'calves'],
    difficulty: 'beginner',
    exerciseType: 'jump',
    instructions: [
      'Stand with the feet together and the arms at the sides.',
      'Step one foot out to the side while raising the opposite arm overhead.',
      'Return and repeat on the other side.',
    ],
    formCues: ['Stay tall; the arms reach up and the feet step out.'],
    commonMistakes: ['Stomping rather than stepping.'],
    breathingInstruction: 'Exhale as the arms reach up.',
    recommendedSets: 3,
    recommendedReps: 30,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes: 'No landing impact, so this is a good substitute on hard floors or with joint concerns.',
  },
  {
    name: 'High-Knee March',
    description: 'Upright cardio that is easy to scale and puts almost no load on the wrists or back.',
    bodyParts: ['full_body', 'legs'],
    primaryMuscles: ['full_body'],
    secondaryMuscles: ['quads', 'hip_flexors', 'calves'],
    difficulty: 'beginner',
    exerciseType: 'locomotion',
    instructions: [
      'Stand tall and march in place, driving one knee to hip height.',
      'Swing the opposite arm as you lift the knee.',
      'Maintain a steady pace and breathe rhythmically.',
    ],
    formCues: ['Stay on the balls of the feet with a light, quick cadence.'],
    commonMistakes: ['Leaning back as the knee comes up.'],
    breathingInstruction: 'Breathe in for two steps, out for two.',
    recommendedSets: 3,
    recommendedReps: 40,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 30,
    safetyNotes: 'Hold a wall for balance. Low impact and easy to slow down.',
  },
  {
    name: 'Squat Jump',
    description:
      'Power work with real landing forces. Listed for completeness, but it is the one movement here that most beginners should avoid.',
    bodyParts: ['legs', 'full_body'],
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'calves', 'full_body'],
    difficulty: 'advanced',
    exerciseType: 'jump',
    instructions: [
      'Stand with feet shoulder width.',
      'Sit back into a squat, then drive explosively upward and leave the floor.',
      'Land softly, absorbing through the hips and knees.',
    ],
    formCues: ['Land quietly with the knees tracking over the toes.'],
    commonMistakes: ['Landing with straight legs.', 'Exhausting into the jump.'],
    breathingInstruction: 'Exhale on takeoff, inhale on landing.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'Not appropriate if you have any joint, impact, or back concerns, or if you are new to training. A regular bodyweight squat trains the same muscles with far less risk.',
  },
  {
    name: 'Shadow Boxing',
    description:
      'Continuous low-impact conditioning that also works on coordination and pacing. The default cardio choice in a small space.',
    bodyParts: ['full_body'],
    primaryMuscles: ['full_body'],
    secondaryMuscles: ['deltoids', 'abs', 'calves'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Stand in a staggered stance with the hands up.',
      'Throw controlled straight punches while shifting the weight rhythmically.',
      'Keep moving for the full interval.',
    ],
    formCues: [
      'Rotate through the hips and the rear heel.',
      'Keep the chin tucked and the hands up between combinations.',
    ],
    commonMistakes: ['Punching with only the arm.', 'Standing flat-footed and square to the front.'],
    breathingInstruction: 'Exhale with every punch. Do not hold your breath.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 60,
    recommendedRestSeconds: 45,
    safetyNotes: 'No impact. Keep the punches controlled — this is conditioning, not a power drill.',
  },
  {
    name: 'Inchworm Walk-Out',
    description:
      'Loaded posterior-chain work using body weight only. Harder on the hamstrings and back than it looks, so it should be built up gradually.',
    bodyParts: ['back', 'legs', 'core'],
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['erector_spine', 'deltoids', 'abs'],
    difficulty: 'intermediate',
    exerciseType: 'other',
    instructions: [
      'Stand tall, then hinge forward and place the hands on the floor.',
      'Walk the hands out to a tall plank, one hand at a time.',
      'Hold the plank briefly, then walk the feet toward the hands and stand.',
    ],
    formCues: [
      'Take short steps so the hips stay relatively high.',
      'The back stays flat and long as you fold.',
    ],
    commonMistakes: [
      'Rounding the back when the hamstrings run out of length.',
      'Forcing the walk-out past a tight hamstring, which rounds the spine.',
    ],
    breathingInstruction: 'Exhale as the hands walk out.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'Stop before the lower back rounds. Bent knees are a legitimate and preferable option to a rounded spine.',
  },
  {
    name: 'Sprawling Lunge',
    description:
      'A moving, floor-to-lunge pattern that raises the heart rate while training the single-leg and upper-body positions at the same time.',
    bodyParts: ['full_body', 'legs'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['chest', 'abs', 'full_body'],
    difficulty: 'intermediate',
    exerciseType: 'locomotion',
    instructions: [
      'From a standing position, step one foot back and lower the hands to the floor inside the front foot.',
      'Bring the back foot up toward the hands into a low runner’s lunge.',
      'Stand up and switch legs.',
    ],
    formCues: ['The front heel stays down and the front shin stays near vertical.'],
    commonMistakes: ['Hands placed far outside the front foot.'],
    breathingInstruction: 'Exhale as you stand up.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes: 'Keep the hands on a mat or carpet if the floor is hard.',
  },
  // --- Mobility and recovery ----------------------------------------------
  {
    name: 'Cat-Cow',
    description:
      'The standard spinal mobility warm-up. Cheap, safe, and effective at taking the spine through its full flexion and extension range.',
    bodyParts: ['back', 'core'],
    primaryMuscles: ['erector_spine'],
    secondaryMuscles: ['abs', 'abs'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Set up on hands and knees, hands under the shoulders, knees under the hips.',
      'Inhale and drop the belly, lifting the chest and tailbone (cow).',
      'Exhale and round the spine, tucking the chin and drawing the navel in (cat).',
      'Move slowly between the two.',
    ],
    formCues: [
      'The movement is led by the spine, segment by segment.',
      'Move with the breath rather than faster than it.',
    ],
    commonMistakes: ['Rushing through the range.', 'Moving only the lower back.'],
    breathingInstruction: 'Inhale into cow, exhale into cat. The breath drives the movement.',
    recommendedSets: 2,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 0,
    safetyNotes: 'A comfortable range only. Stop if the neck or back is painful.',
  },
  {
    name: 'World’s Greatest Stretch',
    description:
      'A flowing lunge that takes the hips, hamstrings, and thoracic spine through their ranges in one sequence. Good before or after a session.',
    bodyParts: ['full_body', 'back', 'legs'],
    primaryMuscles: ['glutes', 'hip_flexors'],
    secondaryMuscles: ['hamstrings', 'thoracic_spine', 'deltoids'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Step into a deep lunge with the front foot ahead of the hand.',
      'Place the same-side hand on the floor inside the front foot and the other on the back thigh.',
      'Rotate the chest toward the front knee, following the raised hand with your eyes.',
      'Hold, then return to the lunge and switch sides.',
    ],
    formCues: [
      'The back knee rests on the floor for support.',
      'Rotation comes from the mid and upper back, not from forcing the twist.',
    ],
    commonMistakes: ['Rushing the rotation.', 'Letting the back knee lift.'],
    breathingInstruction: 'Inhale to lengthen, exhale as you rotate.',
    recommendedSets: 2,
    recommendedReps: 6,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 0,
    safetyNotes: 'Hold the floor or a wall if the balance is not there yet.',
  },
  {
    name: '90/90 Hip Switch',
    description:
      'Rotation for the hips in a seated position. More demanding on the hips than it looks, so ease into the range rather than forcing it.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['glutes', 'adductors'],
    secondaryMuscles: ['hip_flexors'],
    difficulty: 'intermediate',
    exerciseType: 'stretch',
    instructions: [
      'Sit on the floor with both knees bent 90 degrees.',
      'Place both hands behind you for support.',
      'Rotate both knees to one side, then the other, keeping the feet planted.',
    ],
    formCues: ['Sit tall rather than collapsing into the hands.'],
    commonMistakes: ['Rushing between sides.', 'Letting the lower back round.'],
    breathingInstruction: 'Breathe slowly and hold briefly at each end range.',
    recommendedSets: 2,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 0,
    safetyNotes: 'Skip this if it causes sharp pain at the hip joint. Keep the range conservative.',
  },
  {
    name: 'Thoracic Rotation on Floor',
    description: 'Upper-back rotation and breathing position. Directly counters the effect of hours of sitting.',
    bodyParts: ['back', 'shoulders'],
    primaryMuscles: ['rhomboids', 'traps'],
    secondaryMuscles: ['obliques'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Lie on your back with the arms out to the sides and the knees bent.',
      'Drop both knees to one side while keeping the shoulders down.',
      'Hold, then switch sides.',
    ],
    formCues: ['The shoulders stay heavy on the floor — the knees move, the upper back does not.'],
    commonMistakes: ['Lifting the shoulders to force more rotation.'],
    breathingInstruction: 'Breathe into the side you are rotating toward.',
    recommendedSets: 2,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 0,
    safetyNotes: 'Gentle and pain-free. Do not force the knees to the floor.',
  },
  {
    name: 'Child’s Pose to Reach',
    description:
      'A back and shoulder stretch that also lengthens the lats — one of the few reliable ways to get a lat stretch without a bar to hang from.',
    bodyParts: ['back', 'shoulders'],
    primaryMuscles: ['lats', 'traps'],
    secondaryMuscles: ['erector_spine'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Kneel and sit the hips back toward the heels.',
      'Walk the hands forward and let the chest sink toward the floor.',
      'Reach one arm at a time further forward, alternating sides.',
    ],
    formCues: ['Hips move back toward the heels rather than staying high.'],
    commonMistakes: ['Hips staying up, which reduces the lat stretch.'],
    breathingInstruction: 'Breathe deeply into the lower back, which moves with each inhale.',
    recommendedSets: 2,
    recommendedReps: 6,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 0,
    safetyNotes: 'Rest the forehead on a folded towel or a block if the floor is hard.',
  },
  {
    name: 'Wall Ankle Rocks',
    description: 'Ankle mobility to support squat depth, using a wall as a depth reference. Nothing fancy, and effective.',
    bodyParts: ['legs'],
    primaryMuscles: ['calves'],
    secondaryMuscles: ['quads', 'hip_flexors'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Stand facing a wall, one foot about a fist from the wall.',
      'Keep the heel down and drive the knee forward to touch the wall.',
      'Rock back to a straight leg, then forward again.',
    ],
    formCues: ['The heel stays in contact with the floor throughout.'],
    commonMistakes: ['Lifting the heel to gain depth.'],
    breathingInstruction: 'Slow, steady breathing. Hold briefly at each end.',
    recommendedSets: 2,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 0,
    safetyNotes: 'Reduce the range with any ankle or Achilles history.',
  },
  {
    name: 'Leg Swings',
    description:
      'Dynamic hip and hamstring warm-up. A good first thing before squats or lunges, and a safe opener for stiff hips.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['hip_flexors', 'hamstrings'],
    secondaryMuscles: ['glutes', 'calves'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Stand tall holding a wall for balance.',
      'Swing one leg forward and back under control.',
      'Complete the set, then switch legs.',
    ],
    formCues: ['The movement comes from the hip; the knee stays mostly straight.'],
    commonMistakes: ['Swinging with the torso, turning it into a windmill.'],
    breathingInstruction: 'Breathe steadily; do not hold your breath at the end range.',
    recommendedSets: 2,
    recommendedReps: 15,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 0,
    safetyNotes: 'Keep the range easy. Swinging is a warm-up, not a stretch contest.',
  },
  {
    name: 'Deep Squat Hold',
    description:
      'An active, loaded squat position that teaches the ankles, hips, and pelvis to be comfortable low. Uncomfortable at first — that is normal, and range improves.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['abs', 'calves', 'adductors'],
    difficulty: 'intermediate',
    exerciseType: 'bodyweight_squat',
    instructions: [
      'Stand with the feet a little wider than the shoulders, toes turned out.',
      'Sink into a deep squat, keeping the heels down.',
      'Place the elbows inside the knees and use the arms to drive them apart.',
      'Hold the position.',
    ],
    formCues: [
      'The whole foot stays in contact with the floor.',
      'The lower back stays long; do not round to go lower.',
    ],
    commonMistakes: ['Heels lifting.', 'Rounding the lower back.', 'Leaning too far forward.'],
    breathingInstruction: 'Breathe continuously during the hold. Do not hold your breath.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 30,
    recommendedRestSeconds: 45,
    safetyNotes:
      'Stay on the edge of your comfortable range. Coming up onto the toes to finish a deep hold defeats the purpose, and a rounded lower back is not an acceptable trade.',
  },
  {
    name: 'Wall Push-Up',
    description:
      'The lowest-load press in the library, and a genuine starting point rather than a lesser version. A wall leaves the chest working at a steep upward angle, so the arms press a manageable weight.',
    bodyParts: ['chest', 'shoulders', 'arms'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'deltoids'],
    difficulty: 'beginner',
    exerciseType: 'push_up',
    instructions: [
      'Stand facing a wall, feet close to it, and place both palms flat on the wall at chest height.',
      'Keep the body in one straight line, inclined upward toward the wall.',
      'Bend the elbows to bring the chest toward the wall.',
      'Press away until the arms are straight, then repeat with control.',
    ],
    formCues: [
      'Glides are fine here; the body angle is what sets the load, not speed.',
      'Hands at chest height, not waist height, or the arms do the work instead of the chest.',
    ],
    commonMistakes: [
      'Letting the hips drift toward the wall so the body breaks its straight line.',
    ],
    breathingInstruction: 'Inhale toward the wall, exhale as you press away.',
    recommendedSets: 3,
    recommendedReps: 15,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'Ideal first press for anyone returning to exercise after a break. Nothing here loads a joint heavily, so move on once it feels easy rather than staying here.',
  },
  {
    name: 'Knee Push-Up',
    description:
      'A floor press with the knees down. It reduces the lever arm compared to a full push-up, which makes it a reasonable bridge once a wall press is comfortable.',
    bodyParts: ['chest', 'shoulders', 'arms'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'deltoids'],
    difficulty: 'beginner',
    exerciseType: 'push_up',
    instructions: [
      'Kneel on a mat and place the hands on the floor slightly wider than the shoulders.',
      'Extend one leg back at a time until only the knees and hands support the body.',
      'Keep the hips level with the shoulders and lower the chest between the hands.',
      'Press the floor away to a straight arm, then return the knees down before resting.',
    ],
    formCues: [
      'Squeeze the glutes on the way down so the lower back does not arch.',
      'Only the knees rest between reps, so the torso stays under tension.',
    ],
    commonMistakes: [
      'Hips sagging toward the floor, which pulls the load off the chest and onto the lower back.',
    ],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'A sagging hip is the only way to injure this. If the hips drop, go back to a wall or incline push-up rather than pressing through the lower back.',
  },
  {
    name: 'Wide Push-Up',
    description:
      'A push-up with the hands spread wider than the shoulders. It shifts emphasis toward the chest and the outer shoulder, and shortens the arc the chest travels.',
    bodyParts: ['chest', 'shoulders', 'arms'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['deltoids', 'triceps'],
    difficulty: 'beginner',
    exerciseType: 'push_up',
    instructions: [
      'Place the hands well outside shoulder width, fingers spread and turned slightly out.',
      'Walk the feet back to a straight line from head to heels.',
      'Lower the chest between the hands with the elbows tracking outward at a shallow angle.',
      'Press the floor away to a straight arm.',
    ],
    formCues: [
      'Hands wider than the shoulders, not merely shoulder width.',
      'Keep the glutes engaged so the hips do not sag between the shoulders.',
    ],
    commonMistakes: [
      'Letting the hands creep inward until it quietly becomes a normal push-up.',
      'Flaring the elbows straight out to shoulder height, which stresses the front of the shoulder.',
    ],
    breathingInstruction: 'Inhale as you lower, exhale as you press up.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'Stop if the front of the shoulder pinches at the bottom. Bring the hands in to shoulder width rather than pushing through the joint.',
  },
  {
    name: 'Diamond Push-Up',
    description:
      'A push-up with the hands close together beneath the chest, which loads the triceps more heavily than any other press in the library.',
    bodyParts: ['chest', 'shoulders', 'arms'],
    primaryMuscles: ['triceps'],
    secondaryMuscles: ['chest', 'deltoids'],
    difficulty: 'intermediate',
    exerciseType: 'push_up',
    instructions: [
      'Place the hands together on the floor beneath the sternum, thumbs and index fingers touching to form a diamond.',
      'Walk the feet back to a straight line.',
      'Keeping the elbows close to the body, lower until the chest approaches the hands.',
      'Press the floor away, keeping the arms close to the ribs the whole way.',
    ],
    formCues: [
      'Elbows stay within a hand-width of the torso, not flared out.',
      'Shoulders stay packed down away from the ears throughout.',
    ],
    commonMistakes: [
      'Letting the elbows drift out, which turns the exercise back into a normal push-up.',
      'Hips piking up because the chest is too close to the floor.',
    ],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 75,
    safetyNotes:
      'Triceps loading is high, so the wrist and elbow take more. Anyone with wrist pain should use a regular push-up instead.',
  },
  {
    name: 'Decline Push-Up',
    description:
      'A push-up with the feet elevated on a chair or bed, raising the head above the feet. The steeper angle increases the load on the chest and shoulders.',
    bodyParts: ['chest', 'shoulders', 'arms'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['deltoids', 'triceps'],
    difficulty: 'intermediate',
    exerciseType: 'push_up',
    instructions: [
      'Stand with the feet behind you and place the toes on a stable chair, bed edge, or step.',
      'Walk the hands forward until the body forms a straight, downward-sloping line.',
      'Lower the chest toward the floor between the hands.',
      'Press the floor away to a straight arm.',
    ],
    formCues: [
      'The body must stay in one line; the steeper the better once the position is stable.',
      'Push away from the hands, not up through the shoulders.',
    ],
    commonMistakes: [
      'Letting the hips sag, which at this angle shifts most of the load into the lower back.',
      'Using a surface that slides under the feet.',
    ],
    breathingInstruction: 'Inhale down, exhale up.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 75,
    safetyNotes:
      'Confirm the elevated surface will not slide before you begin. Keep the hips locked; this position makes a sagging back easier and more punishing than in a level push-up.',
  },
  {
    name: 'Push-Up Plus',
    description:
      'A push-up that ends with a deliberate scapular protraction, pushing the floor away and rounding the upper back at the top. It adds a small amount of upper-back work to the press.',
    bodyParts: ['chest', 'shoulders', 'back', 'arms'],
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'rhomboids', 'deltoids'],
    difficulty: 'beginner',
    exerciseType: 'push_up',
    instructions: [
      'Set up in a standard push-up position with the body in a straight line.',
      'Lower the chest to the floor under control.',
      'Press up to a straight arm, then deliberately push the floor away and round the upper back.',
      'Let the shoulder blades spread back together, then return to neutral and repeat.',
    ],
    formCues: [
      'The extra movement happens at the very top, only after the arm is straight.',
      'Let the upper back round. Rounding is the point of the exercise.',
    ],
    commonMistakes: [
      'Rounding the lower back instead of the upper back.',
      'Adding a shoulder shrug on top of the press.',
    ],
    breathingInstruction: 'Exhale as you press up and push the floor away. Inhale down.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The final protraction can pinch the shoulder if it is forced. Keep the range of motion small and stop if the front of the shoulder hurts.',
  },
  {
    name: 'Bird Dog',
    description:
      'A quadruped control drill that trains the spine to stay still while the limbs move. It is a stability staple and the gentlest way to learn to load the core without holding a position.',
    bodyParts: ['core', 'back', 'full_body'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['erector_spine', 'glutes', 'rhomboids'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Set up on hands and knees with the wrists under the shoulders and the knees under the hips.',
      'Brace the core so the lower back holds a neutral position.',
      'Extend one arm forward and the opposite leg back until both are level with the torso.',
      'Hold for two seconds without letting the hips rotate, then return and switch sides.',
    ],
    formCues: [
      'Reach long rather than high, so the hip stays level with the shoulder.',
      'Keep the lower back completely still; any arch means the range is too long.',
    ],
    commonMistakes: [
      'Rotating the hips open to get the leg higher, which removes the anti-rotation demand.',
      'Lifting the leg so high the lower back arches.',
    ],
    breathingInstruction: 'Exhale as you extend, inhale as you return. Do not hold your breath during the two-second hold.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'The flat back is the whole exercise. If the lower back rounds or arches, lift the leg less. Stop if you feel anything sharp in the lower back.',
  },

  // ---------------------------------------------------------------------------
  // Targeted additions for thin muscles and a stiffer difficulty ladder.
  // ---------------------------------------------------------------------------

  // --- Adductors -------------------------------------------------------------
  {
    name: 'Side-Lying Adductor Raise',
    description:
      'An isolation hold for the inner thigh, done lying on your side with the top leg propped forward on a chair or the floor. It is the only beginner-friendly way to load the adductors without equipment.',
    bodyParts: ['legs'],
    primaryMuscles: ['adductors'],
    secondaryMuscles: ['glutes'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Lie on your side with the top leg crossed over and planted in front of you on a chair or the floor.',
      'Extend the bottom leg along the floor with the foot flexed.',
      'Lift the bottom leg a few centimetres and hold for the set time, keeping the knee straight.',
      'Lower under control and repeat on the same side, then switch.',
    ],
    formCues: [
      'Keep the knee of the lifting leg straight; any bend shifts the work to the hip flexor.',
      'Point the toes of the lifting foot toward the shin to keep the inner thigh engaged.',
    ],
    commonMistakes: [
      'Bending the knee to make it easier, which turns it into a hip-flexor exercise.',
      'Letting the bottom knee rest on the floor between reps and resting.',
    ],
    breathingInstruction:
      'Breathe steadily throughout the hold. Do not hold your breath.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 45,
    safetyNotes:
      'The inner thigh has little padding; use a mat. If you feel a muscle cramp, stop and stretch gently before continuing.',
  },
  {
    name: 'Copenhagen Plank',
    description:
      'A side plank where the top leg is anchored to a chair or bench, forcing the adductors of the bottom leg to hold the hips high. It is the gold-standard bodyweight adductor exercise and is clearly intermediate.',
    bodyParts: ['legs', 'core'],
    primaryMuscles: ['adductors'],
    secondaryMuscles: ['obliques', 'glutes'],
    difficulty: 'intermediate',
    exerciseType: 'plank',
    instructions: [
      'Set a chair or bench at hip height. Place the top leg on it at the knee or shin.',
      'Get into a side plank on the forearm, with the bottom leg hanging free.',
      'Drive the bottom hip up until the body is in a straight line.',
      'Hold for the set time without letting the hips drop or rotate.',
    ],
    formCues: [
      'Keep the elbow directly under the shoulder to protect it.',
      'Imagine pulling the bottom knee up to meet the top leg; that is where the work lives.',
    ],
    commonMistakes: [
      'Letting the hips sag toward the floor, which removes the adductor load.',
      'Rotating the chest open so the work shifts to the obliques.',
    ],
    breathingInstruction:
      'Breathe steadily throughout the hold. A shallow breath is fine if a full breath makes you lose the position.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The adductors and obliques both cramp easily under load. Stop and stretch if the inner thigh cramps.'
  },

  // --- Erector spinae ----------------------------------------------------------
  {
    name: 'Prone Cobra',
    description:
      'A gentle back extension where the chest and arms lift off the floor without using the hands to push. It teaches the lower back to work without the arms and is the safest entry point.',
    bodyParts: ['back'],
    primaryMuscles: ['erector_spine'],
    secondaryMuscles: ['glutes', 'rhomboids'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Lie face down with the hands at the sides, palms down, and the forehead on the floor.',
      'Lift the chest, arms, and forehead off the floor by squeezing the lower back and glutes.',
      'Hold the top for a breath without using the hands to push.',
      'Lower under control and repeat.',
    ],
    formCues: [
      'Reach long rather than high; think length, not height.',
      'Keep the neck neutral by looking down at the floor, not forward.',
    ],
    commonMistakes: [
      'Using the hands to push the chest up, which turns it into a push-up.',
      'Craning the neck up to get the chest higher, which loads the neck instead.',
    ],
    breathingInstruction: 'Exhale as you lift, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'The neck should stay in line with the spine; craning the head up to get the chest higher loads the neck instead. Stop if the lower back pinches.'
  },
  {
    name: 'Reverse Hyperextension',
    description:
      'A floor-based hip hinge where the hips lift off the floor by extending the lower back and glutes. It is the honest floor replacement for a loaded back extension and sits clearly at intermediate.',
    bodyParts: ['back', 'glutes'],
    primaryMuscles: ['erector_spine', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    difficulty: 'intermediate',
    exerciseType: 'other',
    instructions: [
      'Lie face down with the hips at the edge of a bench or sofa.',
      'Hang the legs off the edge with the toes touching the floor.',
      'Grip the sides of the bench and hinge the hips up off the edge by squeezing the lower back and glutes.',
      'Lower under control and repeat.',
    ],
    formCues: [
      'Keep the knees slightly bent; straight knees transfer the work to the hamstrings.',
      'The lift should stop when the hips are level with the bench; do not arch beyond that.',
    ],
    commonMistakes: [
      'Lifting with a jerking motion, which can strain the lower back.',
      'Arching the neck to get the hips higher, which loads the neck instead.',
    ],
    breathingInstruction: 'Exhale as you lift, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The hips at the edge of the bench are a leverage point; if you feel a pinch, stop and adjust the position. A slow, controlled motion is the only safe way to do this.',
  },

  // --- Calves -----------------------------------------------------------------
  {
    name: 'Single-Leg Calf Raise',
    description:
      'A unilateral calf raise that doubles the load on each leg and reveals any left–right differences. It is the honest intermediate progression from the two-leg version.',
    bodyParts: ['legs'],
    primaryMuscles: ['calves'],
    secondaryMuscles: ['glutes'],
    difficulty: 'intermediate',
    exerciseType: 'other',
    instructions: [
      'Stand on the edge of a step with one foot, using a wall for light balance if needed.',
      'Rise up onto the toes of the standing foot as high as possible.',
      'Lower under control until the heel drops below the step level.',
      'Complete all reps on one side, then switch.',
    ],
    formCues: [
      'Keep the knee of the working leg straight; any bend shifts the work to the soleus.',
      'Imagine pressing the big toe into the step to keep the foot from rolling out.',
    ],
    commonMistakes: [
      'Bending the knee to make it easier, which turns it into a two-muscle exercise.',
      'Using the free leg to push off the floor, which hides a strength difference.',
    ],
    breathingInstruction: 'Exhale as you rise, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'The Achilles tendon is the only thing between you and the floor; do not bounce at the bottom. A step is the minimum equipment; a staircase works.',
  },
  {
    name: 'Tempo Calf Raise',
    description:
      'A calf raise done with a four-second lowering phase to load the tendon and muscle through a longer period of tension. It is the honest advanced progression when single-leg raises get easy.',
    bodyParts: ['legs'],
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
    difficulty: 'advanced',
    exerciseType: 'other',
    instructions: [
      'Stand on the edge of a step on two feet.',
      'Rise up onto the toes in one second.',
      'Take four full seconds to lower the heels below the step level.',
      'Rise again without pausing at the top or the bottom.',
    ],
    formCues: [
      'The four-second countdown should feel like an eternity; that is the point.',
      'Keep the knees still; any bend at the knee unloads the calves.',
    ],
    commonMistakes: [
      'Dropping the heels quickly, which removes the load on the tendon.',
      'Pausing at the top, which turns it into two separate exercises.',
    ],
    breathingInstruction:
      'Breathe normally; a short hold at the top is fine, but the four-second lower should not interrupt breathing.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 75,
    safetyNotes:
      'The eccentric load is high. If you have any Achilles pain, do the two-leg version less aggressively until it clears up.',
  },

  // --- Obliques ----------------------------------------------------------------
  {
    name: 'Windshield Wipers',
    description:
      'A supine core exercise where the legs sweep from side to side like wipers, loading the obliques through a rotational arc. It is the gentlest floor entry for the obliques.',
    bodyParts: ['core'],
    primaryMuscles: ['obliques'],
    secondaryMuscles: ['abs'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Lie on your back with the arms out to the sides and the knees bent at 90 degrees.',
      'Keep the knees together and let them drop slowly to one side.',
      'Pause at the bottom, then pull the knees back up to the start using the obliques.',
      'Lower to the other side under control.',
    ],
    formCues: [
      'Keep the shoulders welded to the floor; if a shoulder lifts, the range is too wide.',
      'Think of the knees as a single block, not as two legs swinging independently.',
    ],
    commonMistakes: [
      'Letting the shoulders lift off the floor, which turns it into a spinal twist.',
      'Letting the knees drop with gravity, which removes the obliques from the lowering phase.',
    ],
    breathingInstruction: 'Exhale as you pull the knees up, inhale as you lower them.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'Keep the movement slow. This is a controlled arc, not a spinal twist. Stop if the lower back clicks or you feel a deep pinch.'
  },
  {
    name: 'Side Plank with Leg Lift',
    description:
      'A side plank with the top leg raised during the hold to add a glute load and force the obliques to work harder against the extra lever. It is a straight upgrade from the side plank.',
    bodyParts: ['core', 'glutes'],
    primaryMuscles: ['obliques', 'glutes'],
    secondaryMuscles: ['abs'],
    difficulty: 'intermediate',
    exerciseType: 'plank',
    instructions: [
      'Get into a side plank on the forearm.',
      'Raise the top leg a few centimetres and hold it there.',
      'Hold the position for the set time without letting the hips drop.',
      'Switch sides after the set.',
    ],
    formCues: [
      'Keep the elbow directly under the shoulder to protect it.',
      'Imagine holding a coin between the top inner thighs to keep the hips high.',
    ],
    commonMistakes: [
      'Letting the hips sag toward the floor, which unloads the obliques.',
      'Lifting the top leg so high the hip flexor takes over.',
    ],
    breathingInstruction:
      'Breathe steadily throughout the hold. A shallow breath is fine if a full breath makes you lose the position.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 25,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The shoulder takes more load than in a regular side plank. Stop if the shoulder feels strained.',
  },

  // --- Hamstrings ---------------------------------------------------------------
  {
    name: 'Single-Leg Glute Bridge March',
    description:
      'A glute bridge with the top position held while the feet alternate marching. It adds the hamstrings to the glute load by creating a longer moment arm and is the honest intermediate step.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['erector_spine'],
    difficulty: 'intermediate',
    exerciseType: 'bridge',
    instructions: [
      'Set up as for a regular glute bridge and lift the hips to the top position.',
      'Keep the hips level and lift one foot off the floor, straightening the knee only slightly.',
      'Place it back down and lift the other foot, alternating for the set count.',
      'Keep the hips at full height throughout; do not let them drop between reps.',
    ],
    formCues: [
      'Imagine a tray of drinks on the hips; level hips are the whole exercise.',
      'Press the standing heel into the floor to keep the hamstring engaged.',
    ],
    commonMistakes: [
      'Letting the hips drop as the feet move, which removes the isometric load.',
      'Straightening the lifted knee fully, which turns it into a quad exercise.',
    ],
    breathingInstruction: 'Breathe steadily throughout the march.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The hamstring cramp is a sign you are lifting the leg too fast. Slow the march down if that happens.',
  },
  {
    name: 'Nordic Curl Eccentric',
    description:
      'A kneeling hamstring exercise where you use your arms to catch yourself as you lower. It is the only bodyweight exercise that loads the hamstrings through a full range of motion and is clearly advanced.',
    bodyParts: ['legs'],
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['glutes', 'calves'],
    difficulty: 'advanced',
    exerciseType: 'other',
    instructions: [
      'Kneel on a padded surface and anchor your ankles under a sofa or have a partner hold them.',
      'Cross your arms in front of the chest or place the hands under the shoulders in a push-up position.',
      'Lower the torso down with only the hamstrings, catching yourself with the arms at the bottom.',
      'Push up with the arms to return to the kneeling start; the hamstrings only work on the way down.',
    ],
    formCues: [
      'Keep the hips extended; any hinge at the hips removes the hamstring load.',
      'Imagine pulling the body down with the hamstrings, not just resisting gravity.',
    ],
    commonMistakes: [
      'Bending at the hips to touch the floor sooner, which hides the hamstring weakness.',
      'Using the arms to push up on the way up, which removes the concentric work entirely.',
    ],
    breathingInstruction: 'Inhale as you lower, exhale as you push up.',
    recommendedSets: 3,
    recommendedReps: 5,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'This is a high-load eccentric. If you have any hamstring history, start with one or two reps and build up slowly. A partner is a safer anchor than a sofa.',
  },

  // --- Hip flexors ----------------------------------------------------------------
  {
    name: 'Standing Knee Drive',
    description:
      'A standing hip-flexor drill that mimics the top of a sprint stride. It loads the hip flexors without lying down and transfers better to walking and climbing than a floor exercise.',
    bodyParts: ['legs'],
    primaryMuscles: ['hip_flexors'],
    secondaryMuscles: ['glutes'],
    difficulty: 'beginner',
    exerciseType: 'other',
    instructions: [
      'Stand tall with the feet hip-width apart.',
      'Drive one knee up toward the chest as high as the hip allows without leaning back.',
      'Lower under control and repeat with the same leg, then switch.',
    ],
    formCues: [
      'Keep the standing leg straight and the torso upright; lean back only if the knee rises above hip height.',
      'Imagine driving the knee into a wall in front of you.',
    ],
    commonMistakes: [
      'Leaning back to get the knee higher, which transfers the work to the lower back.',
      'Swinging the leg up, which uses momentum instead of the hip flexors.',
    ],
    breathingInstruction: 'Exhale as you drive the knee up, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 12,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'A wall for light balance is fine and does not reduce the training effect. Stop if you feel a pinch in the hip.',
  },
  {
    name: 'Mountain Climber (Slow)',
    description:
      'A mountain climber done at half speed with a pause at the top of each drive. It removes the cardio crossover and isolates the hip flexors, which is what most people actually use the exercise for.',
    bodyParts: ['core', 'legs'],
    primaryMuscles: ['hip_flexors', 'abs'],
    secondaryMuscles: ['abs'],
    difficulty: 'intermediate',
    exerciseType: 'other',
    instructions: [
      'Set up in a push-up position.',
      'Drive one knee toward the chest and hold it for two seconds.',
      'Return to the start and repeat with the other leg at the same slow tempo.',
    ],
    formCues: [
      'Keep the hips still; only the legs should move.',
      'Drive the knee to the nose, not just the chest.',
    ],
    commonMistakes: [
      'Letting the hips bounce up and down, which introduces the shoulders uninvited.',
      'Rushing the tempo, which hides hip-flexor weakness.',
    ],
    breathingInstruction: 'Exhale as you drive, inhale as you return.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'The shoulders bear the full body for the whole set. Stop if the wrist or shoulder feels strained.'
  },

  // --- Delts -----------------------------------------------------------------------
  {
    name: 'Wall Walk',
    description:
      'A handstand progression where you walk your feet up the wall into a tall plank. It loads the shoulders and chest with bodyweight at a manageable angle and is the clear intermediate step from the pike push-up.',
    bodyParts: ['shoulders', 'chest'],
    primaryMuscles: ['deltoids', 'triceps'],
    secondaryMuscles: ['abs'],
    difficulty: 'intermediate',
    exerciseType: 'push_up',
    instructions: [
      'Start in a plank with the feet against the base of a wall.',
      'Walk the feet up the wall as you simultaneously walk the hands toward the wall.',
      'Stop when the hips are over the hands or at the maximum comfortable height.',
      'Walk back down under control.',
    ],
    formCues: [
      'Move the hands and feet together; one without the other leaves the hips behind.',
      'Keep the elbows locked; a bent elbow unloads the shoulder.',
    ],
    commonMistakes: [
      'Walking the hands in without the feet, which leaves the hips too far back.',
      'Letting the lower back arch, which transfers the load to the lower back.',
    ],
    breathingInstruction: 'Breathe steadily; do not hold your breath at the top.',
    recommendedSets: 3,
    recommendedReps: 4,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'The wall is your safety net. Face it the whole time so the wall is behind you, not in front.',
  },
  {
    name: 'Handstand Hold (Wall)',
    description:
      'A static wall-supported handstand that loads the shoulders isometrically at full bodyweight. It is the honest advanced progression and requires the wall walk as a prerequisite.',
    bodyParts: ['shoulders'],
    primaryMuscles: ['deltoids'],
    secondaryMuscles: ['triceps', 'abs'],
    difficulty: 'advanced',
    exerciseType: 'plank',
    instructions: [
      'Start in a wall-walk finish position, as close to the wall as comfortable.',
      'Lift one foot off the wall to find the balance point.',
      'Hold for the set time or until the balance fails.',
      'Bring the foot back to the wall, rest, and descend with the walk-down.',
    ],
    formCues: [
      'Press the floor away to keep the shoulders shrugged up toward the ears.',
      'Look at the wall, not the floor, to keep the neck neutral.',
    ],
    commonMistakes: [
      'Letting the lower back arch into a banana shape, which loads the lower back.',
      'Holding the breath, which fatigues the shoulders faster without training them.',
    ],
    breathingInstruction: 'Breathe steadily throughout the hold.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 30,
    recommendedRestSeconds: 90,
    safetyNotes:
      'The shoulder and wrist are the only things between you and the floor. Do not attempt this cold.',
  },

  // --- Lats -----------------------------------------------------------------------
  {
    name: 'Doorway Row (Wide Grip)',
    description:
      'A horizontal row done in a doorway with a wider grip to bias the lats. It is the safest intermediate progression from the inverted row and requires only a doorway.',
    bodyParts: ['back'],
    primaryMuscles: ['lats'],
    secondaryMuscles: ['rhomboids', 'biceps'],
    difficulty: 'intermediate',
    exerciseType: 'other',
    instructions: [
      'Stand in a doorway with the arms at shoulder height, gripping the frame with a wide grip.',
      'Walk the feet forward until the body is at a comfortable incline.',
      'Pull the chest toward the frame until it touches.',
      'Lower under control and repeat.',
    ],
    formCues: [
      'Think of pulling the chest to the frame, not the chin.',
      'Keep the elbows slightly lower than shoulder height to load the lats, not the traps.',
    ],
    commonMistakes: [
      'Pulling with the arms only, which removes the back from the exercise.',
      'Letting the hips sag forward, which makes the row easier instead of harder.',
    ],
    breathingInstruction: 'Exhale as you pull, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The doorway frame is the only anchor. Test it with a gentle tug before you commit your bodyweight to it.',
  },
  {
    name: 'Prone Snow Angel',
    description:
      'A floor drill where the arms sweep overhead and back like a snow angel while lying face down. It loads the lats and lower traps isometrically and is a finishing drill for the back day.',
    bodyParts: ['back'],
    primaryMuscles: ['lats', 'erector_spine'],
    secondaryMuscles: ['rhomboids'],
    difficulty: 'beginner',
    exerciseType: 'stretch',
    instructions: [
      'Lie face down with the arms at the sides and the forehead on the floor.',
      'Sweep the arms overhead in a wide arc until the thumbs touch above the head.',
      'Sweep back down under control to the start.',
    ],
    formCues: [
      'Keep the arms straight; any bend unloads the lats.',
      'Keep the chest on the floor; a lift transfers the work to the lower back.',
    ],
    commonMistakes: [
      'Letting the arms bend, which turns it into a shoulder exercise.',
      'Lifting the chest, which hides a tight thoracic spine.',
    ],
    breathingInstruction: 'Breathe steadily throughout the sweep.',
    recommendedSets: 2,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 45,
    safetyNotes:
      'A hard floor makes this uncomfortable; use a mat. Stop if the lower back feels a deep ache that does not ease when you stop.'
  },

  // --- Delts (advanced second) ------------------------------------------------------
  {
    name: 'Decline Pike Push-Up',
    description:
      'A pike push-up with the feet elevated to increase the load on the shoulders. It is the final bodyweight step before a handstand push-up and is the honest advanced progression.',
    bodyParts: ['shoulders', 'chest'],
    primaryMuscles: ['deltoids', 'triceps'],
    secondaryMuscles: [],
    difficulty: 'advanced',
    exerciseType: 'push_up',
    instructions: [
      'Set up in a pike position with the feet on a chair or bench.',
      'Lower the head toward the floor by bending the elbows.',
      'Press up to a straight arm.',
    ],
    formCues: [
      'Keep the hips high; a sagging hip hides shoulder weakness.',
      'Think of pressing the floor away to keep the shoulders shrugged up.',
    ],
    commonMistakes: [
      'Letting the hips drop toward the floor, which turns it into an incline push-up.',
      'Letting the lower back arch, which transfers load to the lower back.',
    ],
    breathingInstruction: 'Exhale as you press up, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 75,
    safetyNotes:
      'The head is closer to the floor than in a regular push-up. Keep the neck neutral and look at the floor to keep it aligned.'
  },

  // --- Obliques (advanced second) ----------------------------------------------------
  {
    name: 'Suitcase Carry March',
    description:
      'A marching drill with a heavy water bottle in one hand to load the obliques on the opposite side. It is the honest advanced progression the catalog previously lacked.',
    bodyParts: ['core', 'legs'],
    primaryMuscles: ['obliques'],
    secondaryMuscles: ['abs', 'glutes'],
    difficulty: 'advanced',
    exerciseType: 'other',
    instructions: [
      'Hold a heavy water bottle in one hand at the side.',
      'March in place with high knees for the set time.',
      'Keep the shoulders level; do not lean away from the weight.',
      'Switch hands after the set.',
    ],
    formCues: [
      'Level shoulders are the whole exercise; any lean is a failure.',
      'Drive the knees high to keep the hip flexors busy, but let the obliques do the work.',
    ],
    commonMistakes: [
      'Leaning away from the weight, which removes the anti-rotation demand.',
      'Letting the hips rotate, which transfers the work to the lower back.',
    ],
    breathingInstruction: 'Breathe steadily throughout the march.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 30,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The bottle is the only weight. Test the grip before you start; a slipping bottle is a tripping hazard.',
  },

  // --- Hip flexors (advanced second) --------------------------------------------------
  {
    name: 'L-Sit Progression',
    description:
      'A seated compression hold where you press the floor away to lift the hips. It is the final bodyweight step for the hip flexors and is a clear advanced entry.',
    bodyParts: ['core', 'legs'],
    primaryMuscles: ['hip_flexors', 'abs'],
    secondaryMuscles: ['triceps', 'deltoids'],
    difficulty: 'advanced',
    exerciseType: 'other',
    instructions: [
      'Sit on the floor with the legs extended and the hands flat by the hips.',
      'Press the floor away to lift the hips and legs as high as the hip flexors allow.',
      'Hold for the set time or until the hips start to drop.',
      'Lower under control and rest.',
    ],
    formCues: [
      'Keep the knees locked; a bent knee unloads the hip flexors.',
      'Think of pressing the floor away with the hands, not leaning back.',
    ],
    commonMistakes: [
      'Bending the knees to make it easier, which turns it into a triceps exercise.',
      'Leaning back, which transfers the work to the lower back.',
    ],
    breathingInstruction: 'Breathe steadily; do not hold your breath.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 15,
    recommendedRestSeconds: 75,
    safetyNotes:
      'The hip flexors are the only thing keeping you up. Stop if you feel a cramp; a cramp is a sign you have reached your current limit.',
  },

  // --- Hamstrings (advanced third) ----------------------------------------------------
  {
    name: 'Single-Leg Nordic Curl Eccentric',
    description:
      'The one-leg version of the Nordic curl. It doubles the load and is the honest final step for the hamstrings in a bodyweight catalog.',
    bodyParts: ['legs'],
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: ['glutes'],
    difficulty: 'advanced',
    exerciseType: 'other',
    instructions: [
      'Set up as for the Nordic curl eccentric but with one ankle anchored.',
      'Lower the torso down with only that leg, catching yourself with the arms at the bottom.',
      'Push up with the arms to return.',
    ],
    formCues: [
      'Keep the hips extended; any hinge at the hips unloads the hamstring.',
      'The free leg should stay still; a swing uses momentum.',
    ],
    commonMistakes: [
      'Letting the hips hinge, which hides the hamstring weakness.',
      'Using the arms to push up, which removes the concentric work entirely.',
    ],
    breathingInstruction: 'Inhale as you lower, exhale as you push up.',
    recommendedSets: 3,
    recommendedReps: 3,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 120,
    safetyNotes:
      'This is a very high-load eccentric. Do it only if the two-leg version feels easy, and start with one rep. A partner is the only safe anchor.',
  },

  // --- Adductors (advanced third) ------------------------------------------------------
  {
    name: 'Copenhagen Plank (Full)',
    description:
      'A full Copenhagen plank with the arm extended. It is the honest advanced step and the final entry for the adductors.',
    bodyParts: ['legs', 'core'],
    primaryMuscles: ['adductors', 'obliques'],
    secondaryMuscles: ['glutes'],
    difficulty: 'advanced',
    exerciseType: 'plank',
    instructions: [
      'Set up as for the intermediate Copenhagen plank but with the hand on the floor, arm straight.',
      'Hold for the set time without letting the hips drop.',
    ],
    formCues: [
      'Keep the hips high; a sagging hip removes the adductor load.',
      'Press the floor away with the bottom arm to keep the shoulder stable.',
    ],
    commonMistakes: [
      'Letting the hips sag, which unloads the adductors.',
      'Bending the bottom arm, which unloads the shoulder.',
    ],
    breathingInstruction: 'Breathe steadily throughout the hold.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 20,
    recommendedRestSeconds: 90,
    safetyNotes:
      'The shoulder is under full bodyweight. Stop if you feel a pinch. Warm the shoulder and wrist before this.',
  },

  // --- Final intermediate/advanced additions for difficulty balance ------------
  {
    name: 'Plyometric Squat Jump',
    description:
      'An explosive squat jump that develops reactive strength and rate of force development. It is the honest power progression beyond bent-knee strength work.',
    bodyParts: ['legs', 'full_body'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['calves', 'hamstrings'],
    difficulty: 'advanced',
    exerciseType: 'jump',
    instructions: [
      'Drop into a squat, then explode up as high as possible.',
      'Land softly on the balls of the feet, immediately sinking into the next squat.',
      'Minimise ground contact time; keep the torso upright.',
      'Reset completely before the next rep.',
    ],
    formCues: [
      'Land like a cat, not a sack of potatoes.',
      'Reset fully between reps; a rhythmic bounce wastes energy and shocks the knees.',
    ],
    commonMistakes: [
      'Landing stiff on straight knees, which shocks the joints.',
      'Bouncing without a reset, which turns it into cardio instead of power training.',
    ],
    breathingInstruction: 'Inhale on the way down, exhale sharply as you jump.',
    recommendedSets: 3,
    recommendedReps: 6,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'The knees must track over the toes. The Achilles absorbs the landing; if you feel a sharp pain there, stop and check the tendon before continuing.',
  },
  {
    name: 'Archer Push-Up',
    description:
      'A wide push-up where one arm takes most of the load while the other arm extends to the side. It is the final bodyweight step before one-arm push-up work.',
    bodyParts: ['chest', 'shoulders'],
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['deltoids', 'abs'],
    difficulty: 'advanced',
    exerciseType: 'push_up',
    instructions: [
      'Set up in a wide-arm push-up position.',
      'Lower to one side, keeping the other arm straight and sliding along the floor.',
      'Press up with the working arm, keeping the assisting arm extended.',
      'Alternate sides with control.',
    ],
    formCues: [
      'The assisting arm only balances; the working arm does the press.',
      'Keep the elbow of the working arm close to the ribs to protect the shoulder.',
    ],
    commonMistakes: [
      'Letting the assisting arm bear too much weight, which halves the training effect.',
      'Letting the hips rotate, which reduces the chest engagement.',
    ],
    breathingInstruction: 'Exhale as you press, inhale as you lower.',
    recommendedSets: 3,
    recommendedReps: 6,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'This is shoulder-intensive. Never do it cold, and never force the assist arm into a painful range.',
  },
  {
    name: 'Single-Leg Box Squat',
    description:
      'A squat down to a chair on one leg that teaches control through a full unilateral range. The box removes the fear factor while keeping the strength demand real.',
    bodyParts: ['legs', 'glutes'],
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
    difficulty: 'intermediate',
    exerciseType: 'bodyweight_squat',
    instructions: [
      'Stand on one leg in front of a chair or box.',
      'Lower the hips back and down until the glute touches the chair lightly.',
      'Immediately stand back up on the same leg without pausing on the chair.',
    ],
    formCues: [
      'Touch the chair, do not sit on it.',
      'Keep the knee tracking over the toes; any caving inward is a red flag.',
    ],
    commonMistakes: [
      'Sitting on the chair, which unloads the muscles at the bottom of the range.',
      'Letting the knee drift inward, which transfers the load to the knee joint.',
    ],
    breathingInstruction: 'Inhale as you lower, exhale as you stand.',
    recommendedSets: 3,
    recommendedReps: 6,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 75,
    safetyNotes:
      'The knee must track the toes. If you feel it cave, stop and strengthen the glutes before continuing.',
  },
  {
    name: 'Hollow Hold Rock',
    description:
      'A dynamic hollow-body drill where the body rocks back and forth while maintaining the hollow shape. It teaches the core to produce force and is the honest advanced progression.',
    bodyParts: ['core'],
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques', 'erector_spine'],
    difficulty: 'advanced',
    exerciseType: 'other',
    instructions: [
      'Set up in a hollow hold position with the arms by the ears and the legs straight.',
      'Rock gently back to full extension without letting the shape break.',
      'Return to the hollow position and repeat for the set count.',
    ],
    formCues: [
      'The body should rock as one unit; any hip or shoulder wobble breaks the shape.',
      'Keep the back flat on the floor at all times.',
    ],
    commonMistakes: [
      'Letting the lower back arch off the floor during the rock, which defeats the purpose.',
      'Letting the legs separate, which makes the hollow position unstable.',
    ],
    breathingInstruction: 'Breathe steadily; the rocking tempo should not interrupt breathing.',
    recommendedSets: 3,
    recommendedReps: 10,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 75,
    safetyNotes:
      'The lower back must stay on the floor throughout. If you feel it lift, shorten the range or regress to a regular hollow hold.',
  },
  {
    name: 'Plyo Push-Up (Knee-Down)',
    description:
      'A plyometric push-up where you push explosively enough for the hands to leave the floor. It is the most honest measure of upper-body power in a bodyweight catalog.',
    bodyParts: ['chest', 'shoulders'],
    primaryMuscles: ['chest', 'triceps'],
    secondaryMuscles: ['abs', 'deltoids'],
    difficulty: 'advanced',
    exerciseType: 'push_up',
    instructions: [
      'Set up in a knee push-up position.',
      'Explode up so the hands leave the floor for a moment.',
      'Land soft in the same position, ready for the next rep.',
    ],
    formCues: [
      'The power comes from the chest and triceps, not the hips.',
      'Land with bent elbows, not straight-armed impact.',
    ],
    commonMistakes: [
      'Pushing with the hips to fling the torso, which moves the load away from the target muscles.',
      'Landing with straight elbows, which shocks the wrist and elbow joints.',
    ],
    breathingInstruction: 'Exhale sharply as you explode up.',
    recommendedSets: 3,
    recommendedReps: 5,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 90,
    safetyNotes:
      'The wrist and shoulder are the weak link. Stop immediately if you feel any sharp pain. Only attempt this if regular push-ups feel easy.',
  },
  {
    name: 'Curtsy Lunge with Reach',
    description:
      'A curtsy lunge with an overhead reach to load the obliques and hip stabilisers through a lateral plane of motion. It is the only catalog exercise that challenges the body in the frontal plane.',
    bodyParts: ['legs', 'core'],
    primaryMuscles: ['glutes', 'adductors'],
    secondaryMuscles: ['obliques', 'calves'],
    difficulty: 'intermediate',
    exerciseType: 'lunge',
    instructions: [
      'Step one leg back and across your body into a curtsy.',
      'As you lunge, reach both arms overhead and lean slightly away from the working side.',
      'Press through the front heel to stand; switch sides.',
    ],
    formCues: [
      'The reach should go up and away, not across; think of filling your ribcage with air.',
      'Keep the front knee tracking over the toes.',
    ],
    commonMistakes: [
      'Letting the reach become a side bend, which unloads the obliques.',
      'Letting the back foot drag, which reduces the glute load.',
    ],
    breathingInstruction: 'Exhale as you stand, inhale as you lunge.',
    recommendedSets: 3,
    recommendedReps: 8,
    recommendedDurationSeconds: null,
    recommendedRestSeconds: 60,
    safetyNotes:
      'The knee must track the toes in the frontal plane too. If you feel the knee cave inward, the range is too deep.',
  },
  {
    name: 'Bear Crawl to Crab Walk Transition',
    description:
      'A floor drill that links two locomotion patterns — bear crawl forward and crab walk backward — to load the shoulders, core, and hip flexors through a transition. It is the honest advanced locomotion entry.',
    bodyParts: ['full_body'],
    primaryMuscles: ['deltoids', 'hip_flexors'],
    secondaryMuscles: ['abs', 'triceps', 'glutes'],
    difficulty: 'advanced',
    exerciseType: 'locomotion',
    instructions: [
      'Bear crawl forward for five steps, keeping the hips low and level.',
      'Transition to a crab walk position (back up, feet flat, hands behind).',
      'Crab walk backward for five steps without letting the hips sink.',
      'Transition back and repeat.',
    ],
    formCues: [
      'Keep the hips level in both modes; any rotation is a loss of control.',
      'In the crab walk, press the floor away hard to keep the shoulders stable.',
    ],
    commonMistakes: [
      'Letting the hips drop in the crab walk, which unloads the shoulder.',
      'Rushing the transition, which lets form collapse under speed.',
    ],
    breathingInstruction: 'Breathe steadily; the transition should feel like a breath hold.',
    recommendedSets: 3,
    recommendedReps: null,
    recommendedDurationSeconds: 30,
    recommendedRestSeconds: 90,
    safetyNotes:
      'The shoulder and wrist are under full load in both modes. Stop if you feel any pinch. Warm the shoulders thoroughly before this.',
  },
];


export const SEED_EXERCISES: Exercise[] = seeds.map((seed) => {
  const slug = seed.slug ?? slugify(seed.name);
  const relations = EXERCISE_RELATIONS[slug];
  return {
    ...seed,
    slug,
    // Derived from the slug so localStorage and Postgres agree on the id.
    id: exerciseId(slug),
    equipmentRequired: 'none',
    progressionExercises: [...(relations?.progression ?? [])],
    regressionExercises: [...(relations?.regression ?? [])],
    alternativeExercises: [...(relations?.alternative ?? [])],
    createdAt: CREATED,
  };
});

/**
 * Fails loudly at module load if a relation points at a slug the catalog does
 * not contain. A dead link in the detail page is worse than a build failure,
 * and this is reference data that only changes by hand.
 */
const validateRelations = (): void => {
  const known = new Set(SEED_EXERCISES.map((e) => e.slug));
  const problems: string[] = [];
  const orphan = SEED_EXERCISES.filter(
    (e) =>
      !EXERCISE_RELATIONS[e.slug] &&
      (e.progressionExercises.length > 0 ||
        e.regressionExercises.length > 0 ||
        e.alternativeExercises.length > 0),
  );
  for (const exercise of SEED_EXERCISES) {
    for (const [direction, targets] of [
      ['progression', exercise.progressionExercises],
      ['regression', exercise.regressionExercises],
      ['alternative', exercise.alternativeExercises],
    ] as const) {
      if (targets.includes(exercise.slug)) {
        problems.push(`${exercise.slug}.${direction} links to itself`);
      }
      for (const target of targets) {
        if (!known.has(target)) {
          problems.push(`${exercise.slug}.${direction} -> unknown slug "${target}"`);
        }
      }
    }
  }
  if (orphan.length > 0) {
    problems.push(...orphan.map((e) => `${e.slug} has relations but no entry in the graph`));
  }
  if (problems.length > 0) {
    throw new Error(`Invalid exercise relations:\n  ${problems.join('\n  ')}`);
  }
};

// Only in development. This module is imported by client components, where
// `process` is not reliably defined at runtime, so the check must never run in
// a browser bundle. `npm run build` runs in development mode is false, so the
// build itself is not a safety net either: the ranking suite covers this instead.
if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
  validateRelations();
}

export const seedExerciseBySlug = (slug: string): Exercise | undefined =>
  SEED_EXERCISES.find((e) => e.slug === slug);
