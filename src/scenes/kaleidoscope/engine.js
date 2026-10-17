// Abstract kaleidoscope: several independent layers (arcs, petals, particle
// chains, sparkles) drawn once into a wedge, then mirrored and rotated
// around the center N times to build full radial symmetry — the classic
// kaleidoscope trick — over a reactive full-screen color wash. The
// `wrongness` param deliberately breaks that perfection: each wedge sits at a
// slightly wrong angle/scale/offset, mirrors don't quite line up, lines are
// wobbly and hand-drawn, sizes are uneven and wedges occasionally drop out.
import { rand, rgba, lerpRgba } from "../../lib/color";
import { motionDrive, applyShake, drawFlash } from "../../lib/audioDynamics";

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function chaosWobble(time, chaos, seed) {
  return chaos * (0.6 * Math.sin(time * 2.3 + seed) + 0.4 * Math.sin(time * 5.1 + seed * 1.7));
}

function makeParticle() {
  return {
    angleSpeed: rand(0.05, 0.3) * (Math.random() < 0.5 ? 1 : -1),
    anglePhase: rand(0, Math.PI * 2),
    baseRadius: rand(0.15, 0.85),
    radiusSpeed: rand(0.1, 0.5),
    radiusPhase: rand(0, Math.PI * 2),
    wobbleAmp: rand(0.05, 0.25),
    hueOffset: rand(0, 1),
    chaosSeed: rand(0, 100),
    sizeMul: rand(0.35, 1.9),
    bend: rand(-1, 1),
    // the chain snaps here, so links form short clusters instead of one long zigzag
    breakBefore: Math.random() < 0.35,
  };
}

function makeShape() {
  return {
    baseR: rand(0.3, 1),
    speed: rand(0.05, 0.3),
    phase: rand(0, Math.PI * 2),
    hueOffset: rand(0, 1),
    jitter: [rand(-1, 1), rand(-1, 1), rand(-1, 1), rand(-1, 1), rand(-1, 1), rand(-1, 1)],
  };
}

function makeArc() {
  return {
    baseR: rand(0.15, 1),
    // about half the arcs are short ticks, which mirror into small brackets
    spreadFrac: Math.random() < 0.5 ? rand(0.03, 0.1) : rand(0.15, 0.5),
    centerFrac: rand(0, 1),
    driftSpeed: rand(0.02, 0.15) * (Math.random() < 0.5 ? 1 : -1),
    hueOffset: rand(0, 1),
    seed: rand(0, 100),
    widthErr: rand(-0.6, 1.6),
  };
}

// a small crystal-like object: a few short arms, each with a mirrored pair of
// barbs, so it is symmetric in itself before the wedge mirroring multiplies it
function makeMotif() {
  return {
    radiusFrac: rand(0.12, 0.9),
    angleFrac: rand(0.15, 0.85),
    driftSpeed: rand(0.05, 0.2),
    driftPhase: rand(0, Math.PI * 2),
    arms: 2 + Math.floor(Math.random() * 4),
    size: rand(0.025, 0.07),
    barbPos: rand(0.35, 0.75),
    barbLen: rand(0.25, 0.55),
    barbAngle: rand(0.4, 1.1),
    spin: rand(0.1, 0.4) * (Math.random() < 0.5 ? 1 : -1),
    hueOffset: rand(0, 1),
    seed: rand(0, 100),
  };
}

// a radial light-speed streak, flowing along the fold
function makeStreak() {
  return {
    angleFrac: rand(0.05, 0.95),
    u: Math.random(),
    len: rand(0.04, 0.14),
    speed: rand(0.7, 1.4),
    hueOffset: rand(0, 1),
  };
}

// fold/tunnel mapping: radius fraction <-> "depth" u, exponential so things
// creep near the center and rush past the edge, like flying down a tunnel
const FOLD_K = 2.5;
const FOLD_E = Math.exp(FOLD_K) - 1;
function rfToU(rf) {
  return Math.log(1 + Math.max(0, rf) * FOLD_E) / FOLD_K;
}
function uToRf(u) {
  return (Math.exp(FOLD_K * u) - 1) / FOLD_E;
}
function frac(x) {
  return x - Math.floor(x);
}

// per-wedge placement error, so the symmetry is never exact
function makeSegmentError() {
  return {
    angle: rand(-1, 1),
    scale: rand(-1, 1),
    dx: rand(-1, 1),
    dy: rand(-1, 1),
    mirrorAngle: rand(-1, 1),
    mirrorScale: rand(-1, 1),
    seed: rand(0, 100),
  };
}

// cheap smooth-ish noise in -1..1
function wonk(x, seed) {
  return 0.6 * Math.sin(x * 1.7 + seed) + 0.4 * Math.sin(x * 4.3 + seed * 2.1);
}

function makeSparkle() {
  return {
    angleSpeed: rand(0.2, 0.8) * (Math.random() < 0.5 ? 1 : -1),
    anglePhase: rand(0, Math.PI * 2),
    radiusSpeed: rand(0.3, 1),
    radiusPhase: rand(0, Math.PI * 2),
    chaosSeed: rand(0, 100),
    flickerSeed: rand(0, 100),
  };
}

function makeBgBlob(group) {
  return {
    group,
    orbitSpeed: rand(0.15, 0.4) * (Math.random() < 0.5 ? 1 : -1),
    orbitPhase: rand(0, Math.PI * 2),
    orbitR: rand(0.15, 0.4),
    pulsePhase: rand(0, Math.PI * 2),
  };
}

function syncArray(arr, count, factory) {
  if (count > arr.length) {
    for (let i = arr.length; i < count; i++) arr.push(factory());
  } else {
    arr.length = count;
  }
}

// A pre-rendered radial-gradient sprite stamped via drawImage, instead of a
// live ctx.shadowBlur per particle. shadowBlur has a steep fixed cost per
// call in Canvas2D (it re-rasterizes to an offscreen buffer and blurs it
// every time), so doing it once per particle per segment per mirror was the
// single biggest cost in this scene. Stamping a cached sprite is orders of
// magnitude cheaper and looks the same.
function makeGlowSprite(hex) {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, rgba(hex, 1));
  grad.addColorStop(0.4, rgba(hex, 0.5));
  grad.addColorStop(1, rgba(hex, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export function createEngine() {
  let width = 0;
  let height = 0;
  let time = 0;
  let particles = [];
  let shapes = [];
  let arcs = [];
  let sparkles = [];
  let motifs = [];
  let streaks = [];
  // fold travel: `flow` is the accumulated tunnel depth, `flowVel` eases
  // toward the Fold knob so turning it never makes the pattern jump
  let flow = 0;
  let flowVel = 0;
  let bgBlobs = [];
  const segErrors = new Array(20).fill(0).map(() => makeSegmentError());
  const spriteCache = { hexA: null, hexB: null, spriteA: null, spriteB: null };

  function ensureSprites(colorA, colorB) {
    if (spriteCache.hexA !== colorA) {
      spriteCache.spriteA = makeGlowSprite(colorA);
      spriteCache.hexA = colorA;
    }
    if (spriteCache.hexB !== colorB) {
      spriteCache.spriteB = makeGlowSprite(colorB);
      spriteCache.hexB = colorB;
    }
  }

  function resize(w, h, params) {
    width = w;
    height = h;
    particles = new Array(params.particlesPerWedge).fill(0).map(() => makeParticle());
    shapes = new Array(params.shapeCount).fill(0).map(() => makeShape());
    arcs = new Array(params.arcCount).fill(0).map(() => makeArc());
    sparkles = new Array(params.sparkleCount).fill(0).map(() => makeSparkle());
    motifs = new Array(params.motifCount ?? 4).fill(0).map(() => makeMotif());
    streaks = new Array(params.streakCount ?? 6).fill(0).map(() => makeStreak());
    bgBlobs = [makeBgBlob("A"), makeBgBlob("A"), makeBgBlob("B"), makeBgBlob("B")];
  }

  function update(dt, params, levels) {
    // rotation, hue cycling and particle orbits all ride this audio-driven clock
    const drive = motionDrive(levels, params.audioReactivity);
    time += (dt / 60) * drive;
    const fold = params.fold ?? 0;
    // a kick gives the tunnel a little jump to light speed
    const flowTarget = fold * 0.22 * drive + Math.sign(fold) * levels.punch * 0.25 * params.audioReactivity;
    flowVel += (flowTarget - flowVel) * Math.min(1, 0.05 * dt);
    flow += (flowVel * dt) / 60;
    const streakCount = params.streakCount ?? 6;
    if (streakCount !== streaks.length) syncArray(streaks, streakCount, makeStreak);
    if (params.particlesPerWedge !== particles.length) syncArray(particles, params.particlesPerWedge, makeParticle);
    if (params.shapeCount !== shapes.length) syncArray(shapes, params.shapeCount, makeShape);
    if (params.arcCount !== arcs.length) syncArray(arcs, params.arcCount, makeArc);
    if (params.sparkleCount !== sparkles.length) syncArray(sparkles, params.sparkleCount, makeSparkle);
    const motifCount = params.motifCount ?? 4;
    if (motifCount !== motifs.length) syncArray(motifs, motifCount, makeMotif);
  }

  // moves a radius fraction along the tunnel; returns [rf, fade]. With no
  // fold travel it is the identity, so the still pattern looks as before.
  // Elements fade in at the center and out at the rim so the wrap never pops.
  function folded(rf) {
    const u = frac(rfToU(rf) + flow);
    const fadeIn = Math.min(1, u / 0.12);
    const fadeOut = Math.min(1, (1 - u) / 0.08);
    const amount = Math.min(1, Math.abs(flowVel) * 20 + Math.abs(flow) * 20);
    return [uToRf(u), 1 - amount * (1 - Math.min(fadeIn, fadeOut))];
  }

  function drawBackgroundWash(ctx, params, levels, cx, cy) {
    if (params.backgroundIntensity <= 0) return;
    const overall = levels.overall || 0;
    const t = time * params.backgroundSpeed;
    const reach = Math.hypot(width, height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < bgBlobs.length; i++) {
      const b = bgBlobs[i];
      const angle = t * b.orbitSpeed + b.orbitPhase;
      const bx = cx + Math.cos(angle) * reach * b.orbitR;
      const by = cy + Math.sin(angle * 0.85) * reach * b.orbitR * 0.7;
      const pulse = 0.6 + 0.4 * Math.sin(t * 0.6 + b.pulsePhase);
      const r = reach * (0.35 + 0.15 * pulse);
      const hex = b.group === "A" ? params.colorA : params.colorB;
      const alpha = params.backgroundIntensity * (0.4 + 0.6 * overall * params.audioReactivity) * 0.5;

      const grad = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      grad.addColorStop(0, rgba(hex, alpha));
      grad.addColorStop(1, rgba(hex, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawArcs(ctx, params, levels, halfWedge, maxRadius) {
    const mid = levels.mid || 0;
    const react = params.audioReactivity;
    const w = params.wrongness;
    const boil = Math.floor(time * 6);
    for (let i = 0; i < arcs.length; i++) {
      const a = arcs[i];
      const [rf, fade] = folded(a.baseR);
      const r = rf * maxRadius;
      const spread = halfWedge * a.spreadFrac;
      const center = a.centerFrac * halfWedge + Math.sin(time * a.driftSpeed) * halfWedge * 0.1;
      const mixT = clamp01(0.5 + 0.5 * Math.sin(time * params.hueSpeed * 1.2) + a.hueOffset * 0.3 - 0.15);
      const col = lerpRgba(params.colorA, params.colorB, mixT, (0.15 + 0.35 * mid * react) * fade);

      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(0.4, (1.5 + 2.5 * mid * react) * (1 + a.widthErr * w));
      ctx.beginPath();
      const steps = 14;
      for (let k = 0; k <= steps; k++) {
        const ang = center - spread / 2 + (spread * k) / steps;
        // "boil": the wobble re-rolls a few times a second like hand-drawn animation
        const rr = r * (1 + w * 0.09 * wonk(k + boil * 2.3, a.seed));
        const px = rr * Math.cos(ang);
        const py = rr * Math.sin(ang);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }

  function drawShapes(ctx, params, levels, halfWedge, maxRadius) {
    const bass = levels.bass || 0;
    const react = params.audioReactivity;
    const w = params.wrongness;
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      const angle = ((i + 0.5) / shapes.length) * halfWedge;
      const spread = (halfWedge / shapes.length) * 0.9 * (0.5 + 0.5 * Math.sin(time * s.speed + s.phase));
      const [rf, fade] = folded(0.25 + 0.65 * s.baseR);
      const radius = maxRadius * rf * (1 + bass * react * 0.35);
      const a1 = angle - spread / 2;
      const a2 = angle + spread / 2;
      const j = s.jitter;
      const off = radius * 0.12 * w;
      const x1 = radius * Math.cos(a1) + j[0] * off;
      const y1 = radius * Math.sin(a1) + j[1] * off;
      const x2 = radius * Math.cos(a2) + j[2] * off;
      const y2 = radius * Math.sin(a2) + j[3] * off;
      const x0 = j[4] * off * 0.5;
      const y0 = j[5] * off * 0.5;

      const mixT = clamp01(0.5 + 0.5 * Math.sin(time * params.hueSpeed + s.hueOffset * Math.PI * 2));
      const col = lerpRgba(params.colorA, params.colorB, mixT, (0.08 + 0.22 * bass * react) * fade);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawParticleChain(ctx, params, levels, halfWedge, maxRadius, sprites) {
    const mixT = 0.5 + 0.5 * Math.sin(time * params.hueSpeed * 2);
    const bass = levels.bass || 0;
    const mid = levels.mid || 0;
    const treble = levels.treble || 0;
    const react = params.audioReactivity;
    const chaos = params.chaos;
    const w = params.wrongness;

    let prevX = 0;
    let prevY = 0;
    let havePrev = false;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const angleFrac = clamp01(
        0.5 + 0.5 * Math.sin(time * p.angleSpeed + p.anglePhase) + chaosWobble(time, chaos * 0.2, p.chaosSeed)
      );
      const angle = angleFrac * halfWedge;
      const radiusFrac = clamp01(
        p.baseRadius +
          Math.sin(time * p.radiusSpeed + p.radiusPhase) * p.wobbleAmp * params.wobble * (1 + bass * react) +
          chaosWobble(time, chaos * 0.15, p.chaosSeed + 7)
      );
      const [rf, fade] = folded(radiusFrac);
      const radius = rf * maxRadius;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      const size = Math.max(0.4, params.particleSize * (1.4 + 2.2 * treble * react) * (1 + (p.sizeMul - 1) * w));
      const localMix = clamp01(mixT + p.hueOffset * 0.4 - 0.2);
      const alpha = Math.min(1, 0.45 + 0.4 * mid * react) * fade;
      const col = lerpRgba(params.colorA, params.colorB, localMix, alpha);

      // glow halo: a cached sprite stamped via drawImage, not a live shadowBlur
      const glowR = size * (2.2 + 1.8 * params.glow);
      const sprite = localMix < 0.5 ? sprites.spriteA : sprites.spriteB;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - glowR, y - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = 1;

      // sharp core dot on top, no shadow
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // a link across the tunnel wrap would slash through the whole wedge
      if (havePrev && !p.breakBefore && Math.abs(radius - Math.hypot(prevX, prevY)) < maxRadius * 0.4) {
        ctx.strokeStyle = lerpRgba(params.colorA, params.colorB, localMix, 0.25 * Math.min(1, params.glow));
        ctx.lineWidth = 1;
        // links sag/bow instead of running dead straight
        const mx = (prevX + x) / 2;
        const my = (prevY + y) / 2;
        const bow = p.bend * w * 0.35;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.quadraticCurveTo(mx - (y - prevY) * bow, my + (x - prevX) * bow, x, y);
        ctx.stroke();
      }
      prevX = x;
      prevY = y;
      havePrev = true;
    }
  }

  function drawSparkles(ctx, params, levels, halfWedge, maxRadius) {
    const treble = levels.treble || 0;
    const react = params.audioReactivity;
    const chaos = params.chaos;

    for (let i = 0; i < sparkles.length; i++) {
      const sp = sparkles[i];
      const angleFrac = clamp01(0.5 + 0.5 * Math.sin(time * sp.angleSpeed + sp.anglePhase) + chaosWobble(time, chaos, sp.chaosSeed));
      const angle = angleFrac * halfWedge;
      const [rf, fade] = folded(clamp01(0.5 + 0.5 * Math.sin(time * sp.radiusSpeed + sp.radiusPhase)));
      const radius = rf * maxRadius;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      const flicker = 0.4 + 0.6 * Math.abs(Math.sin(time * 4 + sp.flickerSeed));
      const size = 0.5 + 1.8 * treble * react * flicker;
      const alpha = Math.min(1, (0.2 + 0.6 * treble * react) * flicker) * fade;
      if (size <= 0.1 || alpha <= 0.02) continue;

      const col = lerpRgba(params.colorA, params.colorB, flicker, alpha);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMotifs(ctx, params, levels, halfWedge, maxRadius) {
    const mid = levels.mid || 0;
    const react = params.audioReactivity;
    const w = params.wrongness;
    const boil = Math.floor(time * 6);
    ctx.lineCap = "round";
    for (let i = 0; i < motifs.length; i++) {
      const m = motifs[i];
      const drift = Math.sin(time * m.driftSpeed + m.driftPhase);
      const angle = clamp01(m.angleFrac + drift * 0.12) * halfWedge;
      const [rf, fade] = folded(clamp01(m.radiusFrac + drift * 0.05));
      const radius = rf * maxRadius;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      // perspective: motifs grow as they rush toward the rim
      const depthScale = 1 + (Math.min(1, Math.abs(flowVel) * 20) * (rf - m.radiusFrac)) * 1.2;
      const len = maxRadius * m.size * (1 + mid * react * 0.5) * Math.max(0.2, depthScale);
      const mixT = clamp01(0.5 + 0.5 * Math.sin(time * params.hueSpeed * 1.5 + m.hueOffset * Math.PI * 2));

      ctx.strokeStyle = lerpRgba(params.colorA, params.colorB, mixT, (0.3 + 0.4 * mid * react) * fade);
      ctx.lineWidth = Math.max(0.6, 1 + 1.5 * mid * react);
      ctx.beginPath();
      const rot = angle + time * m.spin;
      for (let k = 0; k < m.arms; k++) {
        const a = rot + (k / m.arms) * Math.PI * 2 + w * 0.08 * wonk(k + boil, m.seed);
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const ex = x + ca * len;
        const ey = y + sa * len;
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        // mirrored barbs either side of the arm
        const bx = x + ca * len * m.barbPos;
        const by = y + sa * len * m.barbPos;
        const bl = len * m.barbLen;
        for (const side of [1, -1]) {
          const ba = a + m.barbAngle * side;
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl);
        }
      }
      ctx.stroke();
    }
  }

  // light-speed streaks: radial dashes that stretch as they fly out (or
  // shrink as they fall in); only visible while the tunnel is moving
  function drawStreaks(ctx, params, levels, halfWedge, maxRadius) {
    const vis = Math.min(1, Math.abs(flowVel) * 6);
    if (vis <= 0.01 || streaks.length === 0) return;
    const react = params.audioReactivity;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.6, 1 + (levels.treble || 0) * react);
    for (let i = 0; i < streaks.length; i++) {
      const st = streaks[i];
      const u = frac(st.u + flow * st.speed);
      const r0 = uToRf(u) * maxRadius;
      const r1 = uToRf(Math.min(1.2, u + st.len)) * maxRadius;
      const fade = Math.min(1, u / 0.15) * Math.min(1, (1 - u) / 0.1 + 0.3);
      const ang = st.angleFrac * halfWedge;
      const mixT = clamp01(0.5 + 0.5 * Math.sin(time * params.hueSpeed + st.hueOffset * Math.PI * 2));
      ctx.strokeStyle = lerpRgba(params.colorA, params.colorB, mixT, 0.55 * vis * fade);
      ctx.beginPath();
      ctx.moveTo(r0 * Math.cos(ang), r0 * Math.sin(ang));
      ctx.lineTo(r1 * Math.cos(ang), r1 * Math.sin(ang));
      ctx.stroke();
    }
  }

  function drawWedgeContent(ctx, params, levels, halfWedge, maxRadius, sprites) {
    drawStreaks(ctx, params, levels, halfWedge, maxRadius);
    drawArcs(ctx, params, levels, halfWedge, maxRadius);
    drawMotifs(ctx, params, levels, halfWedge, maxRadius);
    drawShapes(ctx, params, levels, halfWedge, maxRadius);
    drawSparkles(ctx, params, levels, halfWedge, maxRadius);
    drawParticleChain(ctx, params, levels, halfWedge, maxRadius, sprites);
  }

  function drawCenterGlow(ctx, params, levels, cx, cy) {
    const overall = levels.overall || 0;
    const r = Math.min(width, height) * (0.05 + overall * params.audioReactivity * 0.06);
    if (r <= 0) return;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, lerpRgba(params.colorA, params.colorB, 0.5, 0.5 + 0.3 * overall));
    grad.addColorStop(1, lerpRgba(params.colorA, params.colorB, 0.5, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw(ctx, baseParams, levels) {
    const cx = width / 2;
    const cy = height / 2;
    const react = baseParams.audioReactivity;
    const energy = levels.energy * react;

    // quiet: smooth, long trails, calm; loud: chaotic, jittery, crisp and glowing
    const params = {
      ...baseParams,
      chaos: baseParams.chaos * (0.3 + 1.7 * energy) + levels.punch * 0.4 * react,
      wobble: baseParams.wobble * (0.6 + 0.9 * energy),
      glow: baseParams.glow * (0.7 + 0.6 * energy + levels.punch * 0.5 * react),
      trailFade: Math.min(1, baseParams.trailFade * (0.7 + 0.8 * energy)),
    };

    ctx.fillStyle = `rgba(2, 0, 6, ${params.trailFade})`;
    ctx.fillRect(0, 0, width, height);

    drawBackgroundWash(ctx, params, levels, cx, cy);

    const bass = levels.bass || 0;
    // hard-capped regardless of slider/preset value: segments * mirror * layer
    // counts multiply fast, and canvas shadowBlur is expensive per draw call
    const segments = Math.min(20, Math.max(2, Math.round(params.segments)));
    const wedgeAngle = (Math.PI * 2) / segments;
    const halfWedge = wedgeAngle / 2;
    // half-diagonal so the pattern reaches every corner of the screen, not just the shorter side
    const maxRadius = Math.hypot(width, height) / 2;
    // the chaos sway scales with the Rotation knob, so 0 holds perfectly still
    const sway = Math.min(1, Math.abs(params.rotationSpeed) * 4);
    const globalRotation =
      time * params.rotationSpeed * 0.3 + chaosWobble(time * 0.5, params.chaos * 0.6 * sway, 42);
    const zoom = 1 + (bass * 0.15 + levels.punch * 0.12) * react;

    ensureSprites(params.colorA, params.colorB);

    ctx.save();
    const hitFx = react * (baseParams.hitFx ?? 1);
    applyShake(ctx, levels, hitFx);
    // the whole pattern wanders slightly off-center
    const wander = params.wrongness * Math.min(width, height) * 0.025;
    ctx.translate(cx + Math.sin(time * 0.31) * wander, cy + Math.sin(time * 0.23 + 1) * wander);
    ctx.scale(zoom, zoom);
    ctx.globalCompositeOperation = "lighter";

    const w = params.wrongness;
    for (let s = 0; s < segments; s++) {
      const e = segErrors[s];
      // a wedge now and then flickers out entirely
      if (w > 0 && Math.sin(time * 1.3 + e.seed * 3) > 1 - 0.03 * w) continue;
      const drift = Math.sin(time * 0.7 + e.seed);
      ctx.save();
      ctx.translate((e.dx * 14 + drift * 4) * w, (e.dy * 14 - drift * 3) * w);
      ctx.rotate(globalRotation + s * wedgeAngle + (e.angle * 0.25 + drift * 0.06) * wedgeAngle * w);
      const sc = 1 + (e.scale * 0.14 + drift * 0.03) * w;
      ctx.scale(sc, sc);
      drawWedgeContent(ctx, params, levels, halfWedge, maxRadius, spriteCache);
      if (params.mirror) {
        ctx.save();
        ctx.rotate(e.mirrorAngle * 0.1 * w);
        ctx.scale(1 + e.mirrorScale * 0.1 * w, -1);
        drawWedgeContent(ctx, params, levels, halfWedge, maxRadius, spriteCache);
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.restore();

    drawCenterGlow(ctx, params, levels, cx, cy);
    drawFlash(ctx, width, height, params.colorB, levels, hitFx);
  }

  return { resize, update, draw };
}
