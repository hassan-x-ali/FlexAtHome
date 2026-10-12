'use client';

import { Save, X } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useProfileGate } from '@/components/onboarding/FirstRunGate';
import { Button, Card, Input, Skeleton, SkeletonGroup } from '@/components/ui';
import { cloudStatus, getBackend } from '@/lib/storage';
import {
  ageRangeLabels,
  fitnessLevelLabels,
  genderLabels,
  intensityLabels,
  primaryGoalLabels,
  profileUpdateSchema,
} from '@/lib/domain/validation';
import { formatMinutes, formatDate } from '@/lib/ui/format';
import { resetLocalData } from '@/lib/storage/local/backend';
import type { Profile } from '@/lib/domain/types';

type EditableProfile = Profile & {
  fullName: string;
  ageRange: Profile['ageRange'];
  gender: Profile['gender'];
  fitnessLevel: Profile['fitnessLevel'];
  primaryGoal: Profile['primaryGoal'];
  preferredIntensity: Profile['preferredIntensity'];
  preferredDuration: number;
  workoutDaysPerWeek: number;
  movementsToAvoid: string[];
};

export const ProfileView = () => {
  const router = useRouter();
  const { profile, loading, refresh } = useProfileGate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  if (loading || !profile) {
    return (
      <SkeletonGroup label="Loading profile">
        <div className="rounded-lg border border-line bg-card p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4" lines={[0.8, 0.8, 0.8, 0.8, 0.8]} />
        </div>
      </SkeletonGroup>
    );
  }

  const beginEdit = () => {
    setDraft({ ...profile });
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
    setError(null);
  };

  const handleChange = (key: keyof EditableProfile, value: unknown) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: value });
  };

  const save = async () => {
    if (!draft) return;
    const result = profileUpdateSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const backend = getBackend();
      await backend.profiles.save(draft);
      await refresh();
      setEditing(false);
      setDraft(null);
      if (!cloudStatus()) {
        alert('Saved locally only. Profile sync will work after cloud credentials are configured.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    const confirmed = window.confirm(
      'Delete everything saved on this device, including your profile, plan, and history? This cannot be undone.',
    );
    if (!confirmed) return;

    setResetting(true);
    setResetError(null);
    try {
      await getBackend().auth.signOut();
      resetLocalData();
      refresh();
      setResetDone(true);
      router.push('/auth/sign-in');
    } catch (error) {
      setResetError(error instanceof Error ? error.message : String(error));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl">{draft?.fullName ?? profile.fullName}</h1>
          <p className="mt-1.5 text-sm text-muted">
            Set up {formatDate(profile.createdAt)}
            {profile.onboardingCompletedAt
              ? ` · onboarded ${formatDate(profile.onboardingCompletedAt)}`
              : null}
          </p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit}><X className="h-4 w-4" /> Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}><Save className="h-4 w-4" /> Save</Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={beginEdit}>Edit profile</Button>
        )}
      </header>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-400">{error}</p>
      ) : null}

      <Card>
        <h2 className="text-sm font-bold">Your answers</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
          {editing && draft ? (
            <>
              <InlineField label="Full name">
                <Input label="Full name" value={draft.fullName} onChange={(e) => handleChange('fullName', e.target.value)} />
              </InlineField>
              <InlineField label="Age range">
                <select
                  value={draft.ageRange}
                  onChange={(e) => handleChange('ageRange', e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2"
                >
                  {Object.entries(ageRangeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Gender">
                <select
                  value={draft.gender ?? ''}
                  onChange={(e) => handleChange('gender', e.target.value === '' ? null : e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2"
                >
                  <option value="">Prefer not to say</option>
                  {Object.entries(genderLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Level">
                <select
                  value={draft.fitnessLevel}
                  onChange={(e) => handleChange('fitnessLevel', e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2"
                >
                  {Object.entries(fitnessLevelLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Goal">
                <select
                  value={draft.primaryGoal}
                  onChange={(e) => handleChange('primaryGoal', e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2"
                >
                  {Object.entries(primaryGoalLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Days per week">
                <Input label="Days per week" type="number" min={1} max={7} value={draft.workoutDaysPerWeek} onChange={(e) => handleChange('workoutDaysPerWeek', Number(e.target.value))} />
              </InlineField>
              <InlineField label="Session length (minutes)">
                <Input label="Session length" type="number" min={5} max={120} value={draft.preferredDuration} onChange={(e) => handleChange('preferredDuration', Number(e.target.value))} />
              </InlineField>
              <InlineField label="Style">
                <select
                  value={draft.preferredIntensity}
                  onChange={(e) => handleChange('preferredIntensity', e.target.value)}
                  className="w-full rounded-md border border-line bg-surface px-3 py-2"
                >
                  {Object.entries(intensityLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </InlineField>
              <InlineField label="Avoiding" className="sm:col-span-2">
                <Input label="Avoiding" value={(draft.movementsToAvoid ?? []).join(', ')} onChange={(e) => handleChange('movementsToAvoid', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
              </InlineField>
            </>
          ) : (
            <>
              <Row label="Age range">{ageRangeLabels[profile.ageRange] ?? profile.ageRange}</Row>
              <Row label="Gender">
                {profile.gender ? (genderLabels[profile.gender] ?? profile.gender) : 'Not given'}
              </Row>
              <Row label="Level">{fitnessLevelLabels[profile.fitnessLevel]}</Row>
              <Row label="Goal">{primaryGoalLabels[profile.primaryGoal]}</Row>
              <Row label="Days per week">{profile.workoutDaysPerWeek}</Row>
              <Row label="Session length">{formatMinutes(profile.preferredDuration)}</Row>
              <Row label="Style">{intensityLabels[profile.preferredIntensity]}</Row>
              <Row label="Avoiding">
                {profile.movementsToAvoid.length > 0
                  ? profile.movementsToAvoid.join(', ')
                  : 'Nothing specific'}
              </Row>
            </>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-bold">Storage</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          {cloudStatus() === 'active'
            ? 'Your data is stored in the cloud and syncs across your devices.'
            : 'Your data is stored on this device only. It works offline and nothing is uploaded. Adding Supabase credentials to the environment enables cloud sync.'}
        </p>
        {cloudStatus() === 'active' && (
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm">Change password</Button>
            <Button variant="secondary" size="sm" onClick={() => getBackend().auth.signOut()}>Logout</Button>
            <Button variant="danger" size="sm">Delete account</Button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-bold">Reset</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-muted">
          Clearing your data removes your profile, plan, and workout history from this browser.
          There is no undo.
        </p>
        {resetError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-400">
            {resetError}
          </p>
        ) : null}
        {resetDone ? (
          <p role="status" className="mt-3 text-sm font-medium text-accent">
            Local data cleared.
          </p>
        ) : null}
        <Button
          variant="danger"
          size="sm"
          className="mt-4"
          onClick={onReset}
          disabled={resetting}
        >
          {resetting ? 'Clearing…' : 'Clear local data'}
        </Button>
      </Card>
    </div>
  );
};

const InlineField = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`border-b border-line pb-2 last:border-0 ${className}`}>
    <label className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</label>
    <div className="mt-1.5">
      {children}
    </div>
  </div>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
    <dd className="text-right text-sm font-medium">{children}</dd>
  </div>
);