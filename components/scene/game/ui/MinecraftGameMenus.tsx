"use client";

import { assetPath } from "@/lib/assetPrefix";

type MinecraftTitleScreenProps = {
  activePanel: boolean;
  onRequestPointerLock: () => void;
};

/** First visit / after “Quit to title” — centered stone-style panel with device choice. */
export function MinecraftTitleScreen({ activePanel, onRequestPointerLock }: MinecraftTitleScreenProps) {
  const titleBackgroundImage = `url(${assetPath("/textures/world/dirt.svg")})`;
  return (
    <>
      <div className="mc-title-dim" style={{ backgroundImage: titleBackgroundImage }} aria-hidden="true" />
      <div className="mc-menu-root mc-menu-root--title" data-ui-layer="true" aria-label="Welcome">
        <h1 className="mc-menu-brand">Hi there!</h1>
        <p className="mc-menu-tagline">
          Features on this site were originally built with desktops in mind; please specify your viewing device below.
        </p>
        <div className="mc-menu-column">
          <button
            id="enter-world"
            type="button"
            className="mc-stone-button mc-stone-button--wide"
            disabled={activePanel}
            aria-describedby="mc-title-hint"
            onClick={() => {
              if (!activePanel) onRequestPointerLock();
            }}
          >
            {activePanel ? "Close panel to continue" : "Desktop"}
          </button>
          <div className="mc-menu-row">
            <a className="mc-stone-button mc-stone-button--half" href="#fallback">
              Mobile
            </a>
          <a className="mc-stone-button mc-stone-button--half" href="mailto:jessedill123@gmail.com">
            Contact
          </a>
        </div>
        <p id="mc-title-hint" className="mc-menu-hint">
          {activePanel
            ? "Close the landmark panel, then choose Desktop to return."
            : "Choose Desktop to capture the mouse and explore with WASD. Press Esc to pause."}
        </p>
      </div>
    </div>
    </>
  );
}

type MinecraftDeathScreenProps = {
  onRespawn: () => void;
  onReturnToTitle: () => void;
};

/** Health reached 0 — red-tinted overlay with respawn / title actions. */
export function MinecraftDeathScreen({ onRespawn, onReturnToTitle }: MinecraftDeathScreenProps) {
  return (
    <>
      <div className="mc-death-dim" aria-hidden="true" />
      <div className="mc-menu-root mc-menu-root--death" data-ui-layer="true" role="dialog" aria-modal="true" aria-label="You died">
        <h2 className="mc-menu-heading mc-menu-heading--death">You died!</h2>
        <div className="mc-menu-column">
          <button type="button" className="mc-stone-button mc-stone-button--wide" onClick={onRespawn}>
            Respawn
          </button>
          <button type="button" className="mc-stone-button mc-stone-button--wide" onClick={onReturnToTitle}>
            Title screen
          </button>
        </div>
      </div>
    </>
  );
}

type MinecraftPauseMenuProps = {
  activePanel: boolean;
  onQuitToTitle: () => void;
  onRequestPointerLock: () => void;
};

/** Esc pause — dimmed world, centered game menu (Minecraft-style). */
export function MinecraftPauseMenu({ activePanel, onQuitToTitle, onRequestPointerLock }: MinecraftPauseMenuProps) {
  return (
    <>
      <div className="mc-pause-dim" aria-hidden="true" />
      <div className="mc-menu-root mc-menu-root--pause" data-ui-layer="true" role="dialog" aria-label="Game menu">
        <h2 className="mc-menu-heading">Game menu</h2>
        <div className="mc-menu-column">
          <button
            id="enter-world"
            type="button"
            className="mc-stone-button mc-stone-button--wide"
            disabled={activePanel}
            onClick={() => {
              if (!activePanel) onRequestPointerLock();
            }}
          >
            Back to Game
          </button>

          <div className="mc-menu-row">
            <a className="mc-stone-button mc-stone-button--half" href="#fallback">
              Mobile
            </a>
            <a className="mc-stone-button mc-stone-button--half" href="mailto:jessedill123@gmail.com">
              Contact
            </a>
          </div>

          <a className="mc-stone-button mc-stone-button--wide" href="#fallback">
            Options…
          </a>

          <button type="button" className="mc-stone-button mc-stone-button--wide" onClick={onQuitToTitle}>
            Quit to title
          </button>

          {activePanel ? (
            <p className="mc-menu-hint mc-menu-hint--warn">Close the open panel first to resume the world.</p>
          ) : null}
        </div>
      </div>
    </>
  );
}
