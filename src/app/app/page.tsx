import Timeline from '@/components/effects/timeline';
export default function TimelinePage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <main className="pt-24 pb-16 px-6 md:px-12">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-4">Product Storyline</h1>
        <p className="text-muted text-xl max-w-2xl mb-12">2020-2026 · FlexAtHome journey.</p>
        <Timeline title="FlexAtHome Storyline" periodLabel="2020-2026" textColor="#0f0f12" mutedTextColor="#3f3f46" activeColor="#ff5f00" backgroundColor="#ffffff" imageUrl="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80" imageAlt="Fitness" />
      </main>
    </div>
  );
}
