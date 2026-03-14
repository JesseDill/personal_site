export type InteractionId = "about" | "resume" | "projects" | "research" | "contact";

export type InteractionContent = {
  title: string;
  strapline: string;
  body: string;
  cta?: { href: string; label: string };
};

export const interactionContent: Record<InteractionId, InteractionContent> = {
  about: {
    title: "Spawn Cabin",
    strapline: "Start here",
    body: "Give visitors the 30-second version of who you are, what you build, and the kind of problems you love solving.",
    cta: { href: "#about-section", label: "Open classic overview" },
  },
  resume: {
    title: "Resume Keep",
    strapline: "Fast facts for hiring teams",
    body: "Point people toward your resume PDF, a concise experience summary, and a few proof points that make the scan easy.",
    cta: { href: "#resume-section", label: "Jump to resume section" },
  },
  projects: {
    title: "Projects Forge",
    strapline: "Ship the case studies here",
    body: "Feature a small set of flagship builds with architecture notes, metrics, screenshots, and links to code or demos.",
    cta: { href: "#projects-section", label: "Jump to projects" },
  },
  research: {
    title: "Research Lab",
    strapline: "Explorations and experiments",
    body: "Use this room for papers, prototypes, and experiments around AI systems, interaction design, and 3D workflows.",
    cta: { href: "#research-section", label: "Jump to research" },
  },
  contact: {
    title: "Contact Portal",
    strapline: "Give visitors the fastest exit ramp",
    body: "Make the handoff obvious with direct email, LinkedIn, GitHub, or a scheduling link so nobody has to hunt for it.",
    cta: { href: "#contact-section", label: "Jump to contact links" },
  },
};
