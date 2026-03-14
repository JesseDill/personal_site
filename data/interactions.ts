export type InteractionId = "resume" | "projects" | "research" | "contact";

export const interactionContent: Record<
  InteractionId,
  { title: string; body: string; cta?: { href: string; label: string } }
> = {
  resume: {
    title: "Resume House",
    body: "Download a resume PDF, review career highlights, and get a quick snapshot of experience.",
    cta: { href: "#", label: "Resume (coming soon)" },
  },
  projects: {
    title: "Projects Room",
    body: "Walk through flagship projects with architecture, outcomes, and live demos.",
    cta: { href: "#", label: "Open project archive" },
  },
  research: {
    title: "Research Lab",
    body: "Explore experiments around AI systems, interaction design, and 3D workflows.",
  },
  contact: {
    title: "Contact Portal",
    body: "Start a conversation about collaborations, product consulting, or creative engineering.",
    cta: { href: "mailto:hello@example.com", label: "hello@example.com" },
  },
};
