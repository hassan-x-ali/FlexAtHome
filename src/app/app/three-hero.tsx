export default function ThreeHero() {
  return (
    <section className="relative h-[70vh] overflow-hidden bg-gradient-to-b from-[#1a0b2e] via-[#0f0f14] to-[#05050a] flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
      <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 50% 30%, #c084fc 0%, transparent 70%)' }} />
      <div className="relative z-10 text-center px-6" style={{ transform: 'rotateX(5deg) translateZ(40px)' }}>
        <h1 className="text-6xl md:text-9xl font-black tracking-tighter mb-6 bg-gradient-to-b from-[#fff] via-[#c084fc] to-[#4c1d95] bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(192,132,252,0.3)]">
          FlexAtHome
        </h1>
        <p className="text-xl md:text-3xl font-light text-[#94a3b8] tracking-wide">3D Timeline · 2020-2026</p>
      </div>
    </section>
  );
}
