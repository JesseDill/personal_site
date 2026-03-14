import GameScene from "@/components/scene/GameScene";

const fallbackSections = [
  {
    id: "about-section",
    eyebrow: "Spawn Cabin",
    title: "About",
    body: "Use this section for the recruiter-friendly introduction: your role focus, specialties, and the kinds of teams or products you want to work on next.",
  },
  {
    id: "resume-section",
    eyebrow: "Resume Keep",
    title: "Resume",
    body: "Add the fastest possible scan here: current title, years of experience, a few impact bullets, and a downloadable resume PDF.",
  },
  {
    id: "projects-section",
    eyebrow: "Projects Forge",
    title: "Projects",
    body: "Turn your strongest work into short case studies with screenshots, outcomes, architecture notes, and links to live demos or source.",
  },
  {
    id: "research-section",
    eyebrow: "Research Lab",
    title: "Research",
    body: "Feature experiments, papers, prototypes, or technical investigations that show how you think through ambiguous problems.",
  },
  {
    id: "contact-section",
    eyebrow: "Contact Portal",
    title: "Contact",
    body: "Make outreach easy with direct email, LinkedIn, GitHub, and any scheduling link or preferred way to start a conversation.",
  },
] as const;

export default function HomePage() {
  return (
    <main id="top">
      <section className="desktop-scene" aria-label="Interactive 3D portfolio world">
        <GameScene />
      </section>

      <section id="fallback" className="fallback">
        <div className="fallback-inner">
          <header className="fallback-hero">
            <p className="fallback-kicker">Straight-to-the-point mode</p>
            <h2>Classic portfolio layout</h2>
            <p>
              Every landmark in the world maps to a section here, so the playful 3D shell never gets in the way of
              someone who just wants the resume version.
            </p>
          </header>

          <div className="fallback-grid">
            {fallbackSections.map((section) => (
              <article key={section.id} id={section.id}>
                <p className="section-kicker">{section.eyebrow}</p>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
                {section.id === "contact-section" ? (
                  <div className="section-actions">
                    <a className="section-link" href="mailto:hello@example.com">
                      hello@example.com
                    </a>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
