import GameScene from "@/components/scene/GameScene";
import { renderLinkedBillboardText } from "@/components/classic/renderLinkedBillboardText";
import { INTRO_BILLBOARD_TEXT, INTRO_TEXT_LINKS } from "@/components/scene/game/config/introBillboardCopy";
import { PUBLICATION_BODY_TEXT, PUBLICATION_TEXT_LINKS } from "@/components/scene/game/config/publicationsBillboardCopy";
import {
  githubProfileUrl,
  googleScholarProfileUrl,
  linkedinProfileUrl,
} from "@/components/scene/game/config/socialLinks";
import { spawnBillboardLayout } from "@/components/scene/game/config/spawnBillboardLayout";

export default function HomePage() {
  const { photo, introText: intro, publications: pub } = spawnBillboardLayout;
  const pubText = pub.text ?? {};

  const sectionBaseStyle = {
    ["--fb-body" as string]: intro.color ?? "#000000",
    ["--fb-link" as string]: intro.linkColor ?? "#004182",
  };

  const introRowStyle = {
    ...sectionBaseStyle,
  };

  const publicationRowStyle = {
    ["--fb-body" as string]: pubText.bodyFill ?? intro.color ?? "#000000",
    ["--fb-link" as string]: pubText.link ?? intro.linkColor ?? "#004182",
    ["--pub-heading" as string]: pubText.headingFill ?? "#000000",
  };

  return (
    <main id="top">
      <section className="desktop-scene" aria-label="Interactive 3D portfolio world">
        <GameScene />
      </section>

      <section id="fallback" className="fallback fallback--spawn-matched" style={sectionBaseStyle}>
        <div className="fallback-inner">
          <div className="fallback-matched-column">
            <p className="fallback-billboard-kicker">Classic view — same copy and links as the spawn wall</p>

            <div className="fallback-spawn-row fallback-spawn-row--intro" style={introRowStyle}>
              <div className="fallback-spawn-intro">
                <div className="fallback-spawn-intro-body">
                  {renderLinkedBillboardText(
                    INTRO_BILLBOARD_TEXT,
                    INTRO_TEXT_LINKS.map(({ start, end, href }) => ({ start, end, href })),
                    "intro",
                  )}
                </div>
              </div>
              <div className="fallback-spawn-sidebar">
                <div className="fallback-spawn-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.texturePath} alt="" width={560} height={560} />
                </div>
                <div className="fallback-social-row" role="group" aria-label="Social links">
                  <a
                    className="fallback-social-link"
                    href={linkedinProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/textures/world/linkedin-logo.svg" alt="" width={24} height={24} />
                  </a>
                  <a
                    className="fallback-social-link"
                    href={googleScholarProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Google Scholar"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/textures/world/google-scholar-logo.svg" alt="" width={24} height={24} />
                  </a>
                  <a
                    className="fallback-social-link"
                    href={githubProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/textures/world/github-logo.svg" alt="" width={24} height={24} />
                  </a>
                </div>
              </div>
            </div>

            <div className="fallback-spawn-row fallback-publication-row" style={publicationRowStyle}>
              <div className="fallback-publication-grid">
                <h2 className="fallback-publications-heading">Publications</h2>
                <div className="fallback-publication-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pub.gif.path} alt="" width={512} height={512} />
                </div>
                <div className="fallback-publication-copy">
                  <div className="fallback-spawn-intro-body fallback-publication-body">
                    {renderLinkedBillboardText(
                      PUBLICATION_BODY_TEXT,
                      PUBLICATION_TEXT_LINKS.map(({ start, end, href }) => ({ start, end, href })),
                      "pub",
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
