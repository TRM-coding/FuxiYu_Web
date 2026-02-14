import { useEffect, useMemo, useRef, useState } from 'react';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/**
 * Mobile top-bar auto hide/reveal interaction.
 * - Scroll down: bar gradually moves up and disappears.
 * - Scroll up: bar gradually moves down and reappears.
 *
 * It uses transform + negative margin-bottom so content can naturally move up,
 * avoiding clip/cut behavior.
 */
export default function useAutoHideTopBar(options = {}) {
  const {
    mobileMaxWidth = 768,
    minDelta = 0.5,
    hideSpeed = 1,
    revealSpeed = 1,
    extraHideOffset = 18,
  } = options;

  const barRef = useRef(null);
  const [barHeight, setBarHeight] = useState(0);

  const hiddenOffsetRef = useRef(0);
  const barHeightRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const latestScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  const enabledRef = useRef(false);

  const applyVars = (offset, height) => {
    const node = barRef.current;
    if (!node) return;
    const progress = height > 0 ? clamp(offset / height, 0, 1) : 0;
    node.style.setProperty('--auto-hide-offset', `${offset}px`);
    node.style.setProperty('--auto-hide-progress', `${progress}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(`(max-width: ${mobileMaxWidth}px)`);
    const updateEnabled = () => {
      enabledRef.current = !!media.matches;
      if (!enabledRef.current) {
        hiddenOffsetRef.current = 0;
        applyVars(0, barHeightRef.current || 0);
      }
    };

    updateEnabled();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateEnabled);
      return () => media.removeEventListener('change', updateEnabled);
    }

    media.addListener(updateEnabled);
    return () => media.removeListener(updateEnabled);
  }, [mobileMaxWidth]);

  useEffect(() => {
    const node = barRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries && entries[0];
      if (!entry) return;
      const h = entry.contentRect?.height || 0;
      setBarHeight(h);
      barHeightRef.current = h;
      const maxOffset = h + Math.max(0, Number(extraHideOffset) || 0);
      const next = clamp(hiddenOffsetRef.current, 0, maxOffset);
      hiddenOffsetRef.current = next;
      applyVars(next, h);
    });

    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lastScrollYRef.current = window.scrollY || 0;
    latestScrollYRef.current = lastScrollYRef.current;

    const process = () => {
      tickingRef.current = false;
      const height = barHeightRef.current;
      if (!enabledRef.current || height <= 0) return;
      const maxOffset = height + Math.max(0, Number(extraHideOffset) || 0);

      const prevY = lastScrollYRef.current;
      const currY = latestScrollYRef.current;
      const delta = currY - prevY;
      lastScrollYRef.current = currY;

      if (Math.abs(delta) < minDelta) return;

      let next = hiddenOffsetRef.current;
      if (currY <= 0) {
        next = 0;
      } else if (delta > 0) {
        next += delta * hideSpeed;
      } else {
        next += delta * revealSpeed;
      }

      next = clamp(next, 0, maxOffset);

      if (Math.abs(next - hiddenOffsetRef.current) > 0.2) {
        hiddenOffsetRef.current = next;
        applyVars(next, height);
      }
    };

    const onScroll = () => {
      latestScrollYRef.current = window.scrollY || 0;
      if (!tickingRef.current) {
        tickingRef.current = true;
        window.requestAnimationFrame(process);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideSpeed, revealSpeed, minDelta, extraHideOffset]);

  const style = useMemo(() => ({
    '--auto-hide-offset': '0px',
    '--auto-hide-progress': '0',
  }), []);

  return {
    barRef,
    barStyle: style,
    hiddenOffset: hiddenOffsetRef.current,
    barHeight,
  };
}
