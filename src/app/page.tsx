import Timeline from '@/components/effects/timeline';
import { FeaturedExercises } from '@/components/landing/FeaturedExercises';
import { Hero } from '@/components/landing/Hero';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingNav } from '@/components/landing/LandingNav';
import { SampleWeek } from '@/components/landing/SampleWeek';
import { Testimonials } from '@/components/landing/Testimonials';
import { WhyItWorks } from '@/components/landing/WhyItWorks';

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg perspective-1000" style={{ perspective: '1000px' }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-bg"
      >
        Skip to content
      </a>
      <LandingNav />
      <main id="main">
        <Hero />
        <WhyItWorks />
        <SampleWeek />
        <FeaturedExercises />
        <Testimonials />
        <Timeline title="FlexAtHome Storyline" periodLabel="2020-2026" textColor="#0f0f12" mutedTextColor="#3f3f46" activeColor="#ff5f00" backgroundColor="#ffffff" imageUrl="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1600&q=80" imageAlt="Training" />
      </main>
      <LandingFooter />
    </div>
  );
}
