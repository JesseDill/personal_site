"use client";

type MinecraftTitleScreenProps = {
  activePanel: boolean;
};

/** First visit / after “Quit to title” — centered stone-style panel with Enter World. */
export function MinecraftTitleScreen({ activePanel }: MinecraftTitleScreenProps) {
  return (
    <div className="mc-menu-root mc-menu-root--title" data-ui-layer="true" aria-label="Portfolio title">
      <h1 className="mc-menu-brand">Portfolio Craft</h1>
      <p className="mc-menu-tagline">
        Explore a voxel world of projects and links — or use the classic layout below.
      </p>
      <div className="mc-menu-column">
        <button
          id="enter-world"
          type="button"
          className="mc-stone-button mc-stone-button--wide"
          disabled={activePanel}
          aria-describedby="mc-title-hint"
        >
          {activePanel ? "Close panel to enter" : "Enter World"}
        </button>
        <div className="mc-menu-row">
          <a className="mc-stone-button mc-stone-button--half" href="#fallback">
            Portfolio site
          </a>
          <a className="mc-stone-button mc-stone-button--half" href="mailto:hello@example.com">
            Contact
          </a>
        </div>
        <p id="mc-title-hint" className="mc-menu-hint">
          {activePanel
            ? "Close the landmark panel, then click Enter World to return."
            : "Click to capture the mouse and walk with WASD. Press Esc to pause."}
        </p>
      </div>
    </div>
  );
}

type MinecraftPauseMenuProps = {
  activePanel: boolean;
  onQuitToTitle: () => void;
};

/** Esc pause — dimmed world, centered game menu (Minecraft-style). */
export function MinecraftPauseMenu({ activePanel, onQuitToTitle }: MinecraftPauseMenuProps) {
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
          >
            Back to Game
          </button>

          <div className="mc-menu-row">
            <a className="mc-stone-button mc-stone-button--half" href="#fallback">
              Portfolio site
            </a>
            <a className="mc-stone-button mc-stone-button--half" href="mailto:hello@example.com">
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
