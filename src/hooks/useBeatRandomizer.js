import { useEffect, useRef } from "react";

// Fires onTrigger on a bass onset from the shared audio analysis, gated by:
// - sensitivity: how far the bass flux must spike above its running average
//   (higher = only the hardest hits count)
// - cooldownMs: minimum time between triggers, so it can't machine-gun;
//   stretched in quiet passages and shortened in loud ones
export function useBeatRandomizer({ enabled, getFrame, sensitivity, cooldownMs, onTrigger }) {
  const rafRef = useRef(null);
  const lastTriggerRef = useRef(0);

  const enabledRef = useRef(enabled);
  const sensitivityRef = useRef(sensitivity);
  const cooldownRef = useRef(cooldownMs);
  const getFrameRef = useRef(getFrame);
  const onTriggerRef = useRef(onTrigger);

  enabledRef.current = enabled;
  sensitivityRef.current = sensitivity;
  cooldownRef.current = cooldownMs;
  getFrameRef.current = getFrame;
  onTriggerRef.current = onTrigger;

  useEffect(() => {
    function loop(now) {
      // always sample so the shared envelopes keep tracking while disabled
      const { onset, energy } = getFrameRef.current(now);

      if (enabledRef.current && onset > 0) {
        // default sensitivity 1.6 maps to the base onset ratio of ~2.5
        const threshold = 2.5 * (sensitivityRef.current / 1.6);
        const cooldown = cooldownRef.current * (1.6 - energy);
        if (onset > threshold && now - lastTriggerRef.current > cooldown) {
          lastTriggerRef.current = now;
          onTriggerRef.current();
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
}
