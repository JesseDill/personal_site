import GameScene from "@/components/scene/GameScene";

export default function HomePage() {
  return (
    <main>
      <section className="desktop-scene" aria-label="Interactive 3D portfolio world">
        <GameScene />
      </section>

      <section id="fallback" className="fallback">
        <h1>Portfolio fallback</h1>
        <p>
          Prefer a traditional site flow? Use this lightweight version with direct links to content sections.
        </p>
        <div className="fallback-grid">
          <article>
            <h2>Resume</h2>
            <p>Experience summary, achievements, and downloadable resume links.</p>
          </article>
          <article>
            <h2>Projects</h2>
            <p>Case studies with architecture notes, outcomes, and implementation details.</p>
          </article>
          <article>
            <h2>Research</h2>
            <p>Experiments around AI, 3D interaction, and product discovery workflows.</p>
          </article>
          <article>
            <h2>Contact</h2>
            <p>hello@example.com • LinkedIn • GitHub</p>
          </article>
        </div>
      </section>
    </main>
  );
}
