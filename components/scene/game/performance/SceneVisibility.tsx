"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Stop GPU/frame callbacks in hidden tabs without resetting the day/night clock. */
export function SceneVisibility() {
  const { get, setFrameloop, invalidate } = useThree();
  useEffect(() => {
    const original = get().frameloop;
    const switchMode = (mode: typeof original) => {
      const state = get();
      if (state.frameloop === mode) return;
      const elapsed = state.clock.elapsedTime;
      setFrameloop(mode);
      state.clock.elapsedTime = elapsed;
      if (mode !== "never") invalidate();
    };
    const update = () => switchMode(document.hidden ? "never" : original);
    document.addEventListener("visibilitychange", update); update();
    return () => { document.removeEventListener("visibilitychange", update); switchMode(original); };
  }, [get,setFrameloop,invalidate]);
  return null;
}
