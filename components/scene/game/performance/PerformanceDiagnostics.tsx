"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { metrics, percentile } from "./metrics";

/** Add ?perf=1 to display local-only diagnostics. Samples exclude hidden-tab time. */
export function PerformanceDiagnostics() {
  const panel = useRef<HTMLPreElement | null>(null);
  const samples = useRef<number[]>([]);
  const lastUpdate = useRef(0);
  const { gl } = useThree();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("perf") !== "1") return;
    metrics.enabled = true;
    const autoReset = gl.info.autoReset;
    gl.info.autoReset = false;
    metrics.samples.clear(); metrics.counts.clear();
    const element = document.createElement("pre");
    element.id = "performance-diagnostics";
    element.style.cssText = "position:fixed;top:8px;left:8px;z-index:10000;background:#000d;color:#fff;padding:12px;font:12px monospace;pointer-events:none;max-width:95vw;white-space:pre-wrap";
    document.body.appendChild(element); panel.current = element;
    const reset = () => { samples.current = []; lastUpdate.current = 0; };
    document.addEventListener("visibilitychange", reset);
    return () => { metrics.enabled = false; gl.info.autoReset = autoReset; element.remove(); panel.current = null; document.removeEventListener("visibilitychange", reset); };
  }, [gl]);
  useFrame((_state, delta) => {
    if (!panel.current || document.hidden) return;
    if (samples.current.length >= 300) samples.current.shift();
    if (delta < 1) samples.current.push(delta * 1000);
    const render = { calls: gl.info.render.calls, triangles: gl.info.render.triangles };
    gl.info.reset();
    const now = performance.now();
    if (now - lastUpdate.current < 1000) return;
    lastUpdate.current = now;
    const frames = samples.current;
    panel.current.textContent = JSON.stringify({
      frames: frames.length,
      frameMs: { median: +percentile(frames, .5).toFixed(2), p95: +percentile(frames, .95).toFixed(2), over50: frames.filter(x => x > 50).length },
      // Previous completed renderer frame (not a mid-frame counter).
      render,
      memory: gl.info.memory, dpr: gl.getPixelRatio(),
      viewport: [gl.domElement.clientWidth, gl.domElement.clientHeight],
      cpuMs: Object.fromEntries([...metrics.samples].map(([key, values]) => [key, { median: +percentile(values, .5).toFixed(3), p95: +percentile(values, .95).toFixed(3) }])),
      work: Object.fromEntries(metrics.counts),
    }, null, 2);
  }, -100);
  return null;
}
