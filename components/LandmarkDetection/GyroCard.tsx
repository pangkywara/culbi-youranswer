import {
  getRarityConfig,
  type Rarity,
} from "@/components/Collections/Cards/constants";
import { Gyroscope, type GyroscopeMeasurement } from "expo-sensors";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { WebView } from "react-native-webview";
import { UnicornBackground } from "./UnicornBackground";

const { width: SW, height: SH } = Dimensions.get("screen");
const CARD_W = Math.min(Math.round(SW * 0.78), 340);
const CARD_H = Math.round(CARD_W * 1.4);

// Orientation limits exactly matching Card.svelte orientate()
const LIMIT_X = 16; // gamma limit
const LIMIT_Y = 18; // beta limit

// 2 slow 360° spins while rising from below, then settle
const SPIN_DURATION = 1200; // ms per spin — slow
const SPIN_COUNT = 2;
const RISE_DURATION = SPIN_DURATION * SPIN_COUNT; // 2400ms
const SETTLE_DURATION = 600;
const ENTRANCE_TOTAL = RISE_DURATION + SETTLE_DURATION; // 3000ms

// Spring constants matching Card.svelte springInteractSettings
const SPRING_STIFFNESS = 0.066;
const SPRING_DAMPING   = 0.25;

// Simple spring class mimicking svelte/motion spring for JS thread use
class JsSpring {
  private x: number;
  private y: number;
  private vx = 0;
  private vy = 0;
  stiffness: number;
  damping: number;
  constructor(x: number, y: number, stiffness = SPRING_STIFFNESS, damping = SPRING_DAMPING) {
    this.x = x; this.y = y;
    this.stiffness = stiffness; this.damping = damping;
  }
  setTarget(tx: number, ty: number) {
    // Euler integration (called ~16ms)
    const ax = (tx - this.x) * this.stiffness;
    const ay = (ty - this.y) * this.stiffness;
    this.vx = (this.vx + ax) * (1 - this.damping);
    this.vy = (this.vy + ay) * (1 - this.damping);
    this.x += this.vx;
    this.y += this.vy;
    return { x: this.x, y: this.y };
  }
  get() { return { x: this.x, y: this.y }; }
  snap(x: number, y: number) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; }
}

/** Distinct haptic patterns per rarity (called once on card reveal) */
async function playRevealHaptics(rarity: Rarity) {
  switch (rarity) {
    case "Secret":
      // Heavy x3 with gap — like a camera shutter
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(80);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(80);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "Mythic":
      // Notification success + heavy flutter
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await delay(120);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(60);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case "Legends":
      // Long rising sequence
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await delay(100);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await delay(100);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "Epic":
      // Double heavy thump
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await delay(150);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case "Rare":
      // Medium + success
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await delay(200);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    default:
      // Common — single light
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Rarity → Pokemon CSS data-rarity mapping ─────────────────────────
function rarityToDataAttr(rarity: Rarity): string {
  switch (rarity) {
    case "Secret":  return "rare secret";
    case "Mythic":  return "rare rainbow";
    case "Legends": return "rare rainbow alt";
    case "Epic":    return "rare holo cosmos";
    case "Rare":    return "rare holo";
    default:        return "common";
  }
}

// ── Build self-contained WebView HTML for the card ────────────────────
function buildCardHtml(opts: {
  imageUri: string;
  rarity: Rarity;
  glowColor: string;
  badgeColor: string;
  label: string;
}): string {
  const dataRarity = rarityToDataAttr(opts.rarity);
  const glowHsl = opts.glowColor.startsWith("#") ? opts.glowColor : "hsl(175,100%,90%)";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%; height: 100%;
  background: transparent;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
img { image-rendering: optimizeQuality; }
:root {
  --pointer-x: 50%; --pointer-y: 50%;
  --pointer-from-center: 0;
  --pointer-from-top: 0.5; --pointer-from-left: 0.5;
  --card-opacity: 0;
  --rotate-x: 0deg; --rotate-y: 0deg;
  --background-x: 50%; --background-y: 50%;
  --card-glow: ${glowHsl};
  --card-edge: hsl(47,100%,78%);
  --card-radius: 4.55% / 3.5%;
  --card-aspect: 0.718;
  --space: 5%; --angle: 133deg; --glittersize: 25%;
  --red: #f80e35; --yellow: #eedf10; --green: #21e985;
  --blue: #0dbde9; --violet: #c929f1;
  --sunpillar-1: hsl(2,100%,73%); --sunpillar-2: hsl(53,100%,69%);
  --sunpillar-3: hsl(93,100%,69%); --sunpillar-4: hsl(176,100%,76%);
  --sunpillar-5: hsl(228,100%,74%); --sunpillar-6: hsl(283,100%,73%);
  --sunpillar-clr-1: var(--sunpillar-1); --sunpillar-clr-2: var(--sunpillar-2);
  --sunpillar-clr-3: var(--sunpillar-3); --sunpillar-clr-4: var(--sunpillar-4);
  --sunpillar-clr-5: var(--sunpillar-5); --sunpillar-clr-6: var(--sunpillar-6);
  --clip: inset(9.85% 8% 52.85% 8%);
}
.card {
  -webkit-transform: translate3d(0px, 0px, 0.01px);
  transform: translate3d(0px, 0px, 0.01px);
  pointer-events: none;
  will-change: transform;
  transform-style: preserve-3d;
  outline: 1px solid transparent;
  aspect-ratio: var(--card-aspect);
  border-radius: var(--card-radius);
  width: ${CARD_W}px;
}
.card, .card * { outline: 1px solid transparent; }
.card__translater, .card__rotator {
  display: grid;
  perspective: 600px;
  will-change: transform, box-shadow;
  transform-origin: center;
  transform-style: preserve-3d;
}
.card__translater {
  width: auto; position: relative;
}
.card__rotator {
  transform: rotateY(var(--rotate-x)) rotateX(var(--rotate-y));
  transform-style: preserve-3d;
  pointer-events: auto;
  transition: box-shadow 0.4s ease, opacity 0.33s ease-out;
  box-shadow:
    0 0 3px -1px white, 0 0 3px 1px var(--card-edge),
    0 0 12px 2px var(--card-glow), 0px 10px 20px -5px black,
    0 0 40px -30px var(--card-glow), 0 0 50px -20px var(--card-glow);
  border: none; background: transparent; padding: 0;
  aspect-ratio: var(--card-aspect); border-radius: var(--card-radius);
}
.card__rotator * {
  width: 100%; display: grid; grid-area: 1/1;
  aspect-ratio: var(--card-aspect); border-radius: var(--card-radius);
  image-rendering: optimizeQuality;
  transform-style: preserve-3d;
  pointer-events: none; overflow: hidden;
}
.card__rotator img { height: auto; }
.card__rotator img:not(.card__back) {
  transform: translate3d(0px, 0px, 0.01px);
}
.card__front {
  opacity: 1;
  transform: translate3d(0px, 0px, 0.01px);
  backface-visibility: hidden;
  background: #1a1a2e;
}
.card__front, .card__front * { backface-visibility: hidden; }
.card__art {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; border-radius: var(--card-radius); display: block;
}
.card__shine {
  position: absolute; inset: 0;
  transform: translateZ(1px); overflow: hidden; z-index: 3;
  border-radius: var(--card-radius);
  background: transparent; background-size: cover; background-position: center;
  filter: brightness(.85) contrast(2.75) saturate(.65);
  mix-blend-mode: color-dodge;
  opacity: var(--card-opacity);
}
.card__shine::before, .card__shine::after {
  content: ""; position: absolute; inset: 0; border-radius: var(--card-radius);
  grid-area: 1/1; transform: translateZ(1px);
  --sunpillar-clr-1: var(--sunpillar-5); --sunpillar-clr-2: var(--sunpillar-6);
  --sunpillar-clr-3: var(--sunpillar-1); --sunpillar-clr-4: var(--sunpillar-2);
  --sunpillar-clr-5: var(--sunpillar-3); --sunpillar-clr-6: var(--sunpillar-4);
}
.card__shine::after {
  transform: translateZ(1.2px);
  --sunpillar-clr-1: var(--sunpillar-6); --sunpillar-clr-2: var(--sunpillar-1);
  --sunpillar-clr-3: var(--sunpillar-2); --sunpillar-clr-4: var(--sunpillar-3);
  --sunpillar-clr-5: var(--sunpillar-4); --sunpillar-clr-6: var(--sunpillar-5);
}
.card__glare {
  position: absolute; inset: 0;
  transform: translateZ(1.41px); overflow: hidden; z-index: 4;
  border-radius: var(--card-radius);
  background-image: radial-gradient(
    farthest-corner circle at var(--pointer-x) var(--pointer-y),
    hsla(0,0%,100%,0.8) 10%, hsla(0,0%,100%,0.65) 20%, hsla(0,0%,0%,0.5) 90%
  );
  opacity: var(--card-opacity); mix-blend-mode: overlay;
}
/* RARE HOLO */
[data-rarity="rare holo"] .card__shine {
  --scanlines-space: 1px; --scanlines-light: #666; --scanlines-dark: black;
  --bars: 3%; --bar-color: hsla(0,0%,70%,1); --bar-bg: hsla(0,0%,0%,1);
  clip-path: var(--clip);
  background-image:
    repeating-linear-gradient(110deg,
      var(--violet),var(--blue),var(--green),var(--yellow),var(--red),
      var(--violet),var(--blue),var(--green),var(--yellow),var(--red),
      var(--violet),var(--blue),var(--green),var(--yellow),var(--red)
    ),
    repeating-linear-gradient(90deg,
      var(--scanlines-dark) 0px,var(--scanlines-dark) 2px,
      var(--scanlines-light) 2px,var(--scanlines-light) 4px
    );
  background-position:
    calc(((50% - var(--background-x))*2.6) + 50%) calc(((50% - var(--background-y))*3.5) + 50%),
    center center;
  background-size: 400% 400%, cover;
  background-blend-mode: overlay;
  filter: brightness(1.1) contrast(1.1) saturate(1.2);
  mix-blend-mode: color-dodge;
}
[data-rarity="rare holo"] .card__shine::before {
  background-image:
    repeating-linear-gradient(90deg,
      var(--bar-bg) calc(var(--bars)*2),var(--bar-color) calc(var(--bars)*3),
      var(--bar-bg) calc(var(--bars)*3.5),var(--bar-color) calc(var(--bars)*4),
      var(--bar-bg) calc(var(--bars)*5),var(--bar-bg) calc(var(--bars)*14)
    ),
    repeating-linear-gradient(90deg,
      var(--bar-bg) calc(var(--bars)*2),var(--bar-color) calc(var(--bars)*3),
      var(--bar-bg) calc(var(--bars)*3.5),var(--bar-color) calc(var(--bars)*4),
      var(--bar-bg) calc(var(--bars)*5),var(--bar-bg) calc(var(--bars)*10)
    );
  background-position:
    calc((((50% - var(--background-x))*1.65)+50%)+(var(--background-y)*0.5)) var(--background-x),
    calc((((50% - var(--background-x))*-0.9)+50%)-(var(--background-y)*0.75)) var(--background-y);
  background-size: 200% 200%, 200% 200%;
  background-blend-mode: screen;
  filter: brightness(1.15) contrast(1.1);
  mix-blend-mode: hard-light;
}
[data-rarity="rare holo"] .card__shine::after {
  background-image: radial-gradient(
    farthest-corner circle at var(--pointer-x) var(--pointer-y),
    hsla(0,0%,90%,0.8) 0%,hsla(0,0%,78%,0.1) 25%,hsl(0,0%,0%) 90%
  );
  background-size: cover; mix-blend-mode: luminosity;
  filter: brightness(0.6) contrast(4);
}
[data-rarity="rare holo"] .card__glare {
  opacity: calc(var(--card-opacity)*.8);
  filter: brightness(0.8) contrast(1.5); mix-blend-mode: overlay;
}
/* COSMOS HOLO */
[data-rarity="rare holo cosmos"] .card__shine {
  --space: 4%; clip-path: var(--clip);
  background-image:
    repeating-linear-gradient(82deg,
      hsl(53,65%,60%) calc(var(--space)*1),hsl(93,56%,50%) calc(var(--space)*2),
      hsl(176,54%,49%) calc(var(--space)*3),hsl(228,59%,55%) calc(var(--space)*4),
      hsl(283,60%,55%) calc(var(--space)*5),hsl(326,59%,51%) calc(var(--space)*6),
      hsl(326,59%,51%) calc(var(--space)*7),hsl(283,60%,55%) calc(var(--space)*8),
      hsl(228,59%,55%) calc(var(--space)*9),hsl(176,54%,49%) calc(var(--space)*10),
      hsl(93,56%,50%) calc(var(--space)*11),hsl(53,65%,60%) calc(var(--space)*12)
    ),
    radial-gradient(farthest-corner circle at var(--pointer-x) var(--pointer-y),
      hsla(180,100%,89%,0.5) 5%,hsla(180,14%,57%,0.3) 40%,hsl(0,0%,0%) 130%
    );
  background-blend-mode: multiply;
  background-position:
    calc(10%+(var(--pointer-from-left)*80%)) calc(10%+(var(--pointer-from-top)*80%)),
    center center;
  background-size: 400% 900%, cover;
  filter: brightness(1) contrast(1) saturate(.8); mix-blend-mode: color-dodge;
}
[data-rarity="rare holo cosmos"] .card__shine::before {
  background-image:
    repeating-linear-gradient(82deg,
      hsl(53,65%,60%) calc(var(--space)*1),hsl(93,56%,50%) calc(var(--space)*2),
      hsl(176,54%,49%) calc(var(--space)*3),hsl(228,59%,55%) calc(var(--space)*4),
      hsl(283,60%,55%) calc(var(--space)*5),hsl(326,59%,51%) calc(var(--space)*6),
      hsl(326,59%,51%) calc(var(--space)*7),hsl(283,60%,55%) calc(var(--space)*8),
      hsl(228,59%,55%) calc(var(--space)*9),hsl(176,54%,49%) calc(var(--space)*10),
      hsl(93,56%,50%) calc(var(--space)*11),hsl(53,65%,60%) calc(var(--space)*12)
    );
  background-blend-mode: multiply;
  background-position: calc(15%+(var(--pointer-from-left)*70%)) calc(15%+(var(--pointer-from-top)*70%));
  background-size: 400% 900%;
  filter: brightness(1.25) contrast(1.75) saturate(.8); mix-blend-mode: overlay;
}
[data-rarity="rare holo cosmos"] .card__shine::after {
  background-image:
    repeating-linear-gradient(82deg,
      hsl(53,65%,60%) calc(var(--space)*1),hsl(93,56%,50%) calc(var(--space)*2),
      hsl(176,54%,49%) calc(var(--space)*3),hsl(228,59%,55%) calc(var(--space)*4),
      hsl(283,60%,55%) calc(var(--space)*5),hsl(326,59%,51%) calc(var(--space)*6),
      hsl(326,59%,51%) calc(var(--space)*7),hsl(283,60%,55%) calc(var(--space)*8),
      hsl(228,59%,55%) calc(var(--space)*9),hsl(176,54%,49%) calc(var(--space)*10),
      hsl(93,56%,50%) calc(var(--space)*11),hsl(53,65%,60%) calc(var(--space)*12)
    );
  background-blend-mode: multiply;
  background-position: calc(20%+(var(--pointer-from-left)*60%)) calc(20%+(var(--pointer-from-top)*60%));
  background-size: 400% 900%;
  filter: brightness(1.25) contrast(1.75) saturate(.8); mix-blend-mode: color-dodge;
}
/* SECRET RARE */
[data-rarity="rare secret"] .card__shine {
  background-image:
    conic-gradient(var(--sunpillar-clr-4),var(--sunpillar-clr-5),
      var(--sunpillar-clr-6),var(--sunpillar-clr-1),var(--sunpillar-clr-4)),
    radial-gradient(farthest-corner circle at var(--pointer-x) var(--pointer-y),
      hsla(150,0%,0%,.98) 10%,hsla(0,0%,95%,.15) 90%
    );
  background-size: cover, cover; background-blend-mode: overlay;
  mix-blend-mode: color-dodge;
  filter: brightness(calc(0.4+(var(--pointer-from-center)*0.2))) contrast(1) saturate(2.7);
}
[data-rarity="rare secret"] .card__shine::before {
  background-image:
    linear-gradient(45deg,hsl(46,95%,50%),hsl(52,100%,69%)),
    radial-gradient(farthest-corner circle at var(--pointer-x) var(--pointer-y),
      hsla(10,20%,90%,0.95) 10%,hsl(0,0%,0%) 70%
    );
  background-size: cover, cover; background-blend-mode: multiply;
  mix-blend-mode: lighten;
  filter: brightness(1.25) contrast(1.25) saturate(0.35); opacity: .8;
}
[data-rarity="rare secret"] .card__glare {
  background-image: radial-gradient(
    farthest-corner circle at var(--pointer-x) var(--pointer-y),
    hsla(45,8%,80%,0.3) 0%,hsl(22,15%,12%) 180%
  );
  filter: brightness(1.3) contrast(1.5); mix-blend-mode: hard-light;
}
/* RAINBOW HOLO */
[data-rarity="rare rainbow"] .card__shine {
  --r-clr-1:hsl(0,57%,37%);--r-clr-2:hsl(40,53%,39%);--r-clr-3:hsl(90,60%,35%);
  --r-clr-4:hsl(180,60%,35%);--r-clr-5:hsl(180,60%,35%);
  --r-clr-6:hsl(210,57%,39%);--r-clr-7:hsl(280,55%,31%);
  background-image:
    linear-gradient(-45deg,var(--r-clr-1),var(--r-clr-5)),
    linear-gradient(-30deg,
      var(--r-clr-1),var(--r-clr-2),var(--r-clr-3),var(--r-clr-4),var(--r-clr-5),
      var(--r-clr-6),var(--r-clr-7),var(--r-clr-1),var(--r-clr-2),var(--r-clr-3),
      var(--r-clr-4),var(--r-clr-5),var(--r-clr-6),var(--r-clr-7),var(--r-clr-1)
    );
  background-blend-mode: luminosity; background-size: 200% 200%, 400% 400%;
  background-position:
    calc(25%+(50%*var(--pointer-from-left))) calc(25%+(50%*var(--pointer-from-top))),
    calc(25%+(var(--pointer-x)/2)) calc(25%+(var(--pointer-y)/2));
  filter: brightness(calc((var(--pointer-from-center)*0.25)+0.6)) contrast(2.2) saturate(0.75);
}
[data-rarity="rare rainbow"] .card__shine::after {
  background-image:
    linear-gradient(-60deg,
      var(--r-clr-1),var(--r-clr-2),var(--r-clr-3),var(--r-clr-4),var(--r-clr-5),
      var(--r-clr-6),var(--r-clr-7),var(--r-clr-1),var(--r-clr-2),var(--r-clr-3),
      var(--r-clr-4),var(--r-clr-5),var(--r-clr-6),var(--r-clr-7),var(--r-clr-1)
    );
  background-blend-mode: soft-light; background-size: 400% 400%;
  background-position: var(--pointer-x) var(--pointer-y);
  filter: brightness(calc((var(--pointer-from-center)*0.3)+0.55)) contrast(2) saturate(1);
  mix-blend-mode: color-dodge;
}
[data-rarity="rare rainbow"] .card__glare {
  background-image: radial-gradient(
    farthest-corner circle at var(--pointer-x) var(--pointer-y),
    hsl(0,0%,80%),hsla(187,10%,85%,0.25) 30%,hsl(197,6%,25%) 120%
  );
  filter: brightness(.9) contrast(1.75);
  opacity: calc(var(--pointer-from-center)*0.9); mix-blend-mode: hard-light;
}
/* RAINBOW ALT */
[data-rarity="rare rainbow alt"] .card__shine {
  --r-clr-1:hsl(0,57%,37%);--r-clr-2:hsl(40,53%,39%);--r-clr-3:hsl(90,60%,35%);
  --r-clr-4:hsl(180,60%,35%);--r-clr-5:hsl(180,60%,35%);
  --r-clr-6:hsl(210,57%,39%);--r-clr-7:hsl(280,55%,31%);
  background-image:
    repeating-linear-gradient(var(--angle),
      hsla(283,49%,60%,0.75) calc(var(--space)*1),hsla(2,70%,58%,0.75) calc(var(--space)*2),
      hsla(53,67%,53%,0.75) calc(var(--space)*3),hsla(93,56%,52%,0.75) calc(var(--space)*4),
      hsla(176,38%,50%,0.75) calc(var(--space)*5),hsla(228,100%,77%,0.75) calc(var(--space)*6),
      hsla(283,49%,61%,0.75) calc(var(--space)*7)
    ),
    linear-gradient(-30deg,
      var(--r-clr-1),var(--r-clr-2),var(--r-clr-3),var(--r-clr-4),var(--r-clr-5),
      var(--r-clr-6),var(--r-clr-7),var(--r-clr-1)
    );
  background-size: 200% 400%, 400% 400%;
  background-position: 0% calc(var(--background-y)*1),calc(var(--background-x)*1.5) calc(var(--background-y)*1.5);
  background-blend-mode: luminosity;
  filter: brightness(calc((var(--pointer-from-center)*0.3)+0.3)) contrast(3) saturate(1.8);
}
[data-rarity="rare rainbow alt"] .card__shine::after {
  background-image:
    linear-gradient(-60deg,
      var(--r-clr-1),var(--r-clr-2),var(--r-clr-3),var(--r-clr-4),var(--r-clr-5),
      var(--r-clr-6),var(--r-clr-7),var(--r-clr-1)
    );
  background-blend-mode: overlay; background-size: 400% 400%;
  background-position: calc(var(--background-x)*-1.5) calc(var(--background-y)*-1.5);
  filter: brightness(calc((var(--pointer-from-center)*0.5)+0.6)) contrast(3) saturate(1);
  mix-blend-mode: color-dodge;
  opacity: calc(1.2+(var(--pointer-from-center)/2)*-1);
}
[data-rarity="rare rainbow alt"] .card__glare {
  background-image: radial-gradient(
    farthest-corner circle at var(--pointer-x) var(--pointer-y),
    hsla(50,20%,90%,0.75) 0%,hsla(150,20%,30%,0.65) 45%,hsla(0,0%,0%,1) 100%
  );
  filter: brightness(.9) contrast(2); opacity: calc(var(--card-opacity)*0.75);
}
[data-rarity="common"] .card__shine { background: none; opacity: 0; }
/* Badge & title */
.badge {
  position: absolute; top: 14px; right: 14px;
  padding: 5px 12px; border-radius: 8px;
  background: ${opts.badgeColor}; color: #fff;
  font-family: -apple-system, sans-serif; font-size: 11px;
  font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
  z-index: 10; pointer-events: none;
}
.title-overlay {
  position: absolute; bottom: 14px; left: 14px;
  background: rgba(0,0,0,0.45); padding: 4px 10px;
  border-radius: 6px; z-index: 10; pointer-events: none;
}
.title-label {
  font-family: -apple-system, sans-serif; font-size: 9px;
  font-weight: 700; color: rgba(255,255,255,0.7);
  letter-spacing: 2px; text-transform: uppercase;
}
</style>
</head>
<body>
<div class="card" data-rarity="${dataRarity}">
  <div class="card__translater">
  <div class="card__rotator">
    <div class="card__front">
      <img class="card__art" src="${opts.imageUri}" alt="card" crossorigin="anonymous" />
      <div class="card__shine"></div>
      <div class="card__glare"></div>
      <div class="badge">${opts.label.toUpperCase()}</div>
      <div class="title-overlay"><span class="title-label">Collectible Card</span></div>
    </div>
  </div>
  </div>
</div>
<script>
(function() {
  var root = document.documentElement;

  // ── Helpers matching Card.svelte's Math.js ──────────────────────────
  function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }
  function round(v, p) { p = p === undefined ? 3 : p; return parseFloat(v.toFixed(p)); }
  function adjust(value, fromMin, fromMax, toMin, toMax) {
    return round(toMin + (toMax - toMin) * (value - fromMin) / (fromMax - fromMin));
  }

  // ── Springs matching Card.svelte springInteractSettings ─────────────
  var STIFF = 0.066, DAMP = 0.25;
  function makeSpring(x, y) {
    return { x: x, y: y, vx: 0, vy: 0, tx: x, ty: y };
  }
  function tickSpring(s) {
    var ax = (s.tx - s.x) * STIFF;
    var ay = (s.ty - s.y) * STIFF;
    s.vx = (s.vx + ax) * (1 - DAMP);
    s.vy = (s.vy + ay) * (1 - DAMP);
    s.x += s.vx;
    s.y += s.vy;
  }

  var springRotate    = makeSpring(0, 0);
  var springGlare     = makeSpring(50, 50);
  var springBg        = makeSpring(50, 50);
  var targetRotate    = { x: 0, y: 0 };
  var targetGlare     = { x: 50, y: 50 };
  var targetBg        = { x: 50, y: 50 };
  var cardOpacity     = 0;
  var opacityTarget   = 0;
  var rafRunning      = false;

  function applyVars() {
    var pfc = clamp(Math.sqrt(
      (springGlare.y - 50) * (springGlare.y - 50) +
      (springGlare.x - 50) * (springGlare.x - 50)
    ) / 50, 0, 1);
    root.style.setProperty('--pointer-x',           round(springGlare.x, 1) + '%');
    root.style.setProperty('--pointer-y',           round(springGlare.y, 1) + '%');
    root.style.setProperty('--pointer-from-center', pfc.toFixed(3));
    root.style.setProperty('--pointer-from-top',    (springGlare.y / 100).toFixed(3));
    root.style.setProperty('--pointer-from-left',   (springGlare.x / 100).toFixed(3));
    root.style.setProperty('--card-opacity',        cardOpacity.toFixed(3));
    root.style.setProperty('--rotate-x',            round(springRotate.x, 2) + 'deg');
    root.style.setProperty('--rotate-y',            round(springRotate.y, 2) + 'deg');
    root.style.setProperty('--background-x',        round(springBg.x, 1) + '%');
    root.style.setProperty('--background-y',        round(springBg.y, 1) + '%');
  }

  function loop() {
    springRotate.tx = targetRotate.x; springRotate.ty = targetRotate.y;
    springGlare.tx  = targetGlare.x;  springGlare.ty  = targetGlare.y;
    springBg.tx     = targetBg.x;     springBg.ty     = targetBg.y;
    tickSpring(springRotate);
    tickSpring(springGlare);
    tickSpring(springBg);
    // lerp opacity
    cardOpacity += (opacityTarget - cardOpacity) * 0.08;
    applyVars();
    rafRunning = true;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ── Called from React Native gyroscope ──────────────────────────────
  // degX = relative gamma (left/right tilt), degY = relative beta (fwd/back tilt)
  // Both already clamped to [-LIMIT_X/Y, +LIMIT_X/Y] in native code
  window.updateTilt = function(degX, degY) {
    // Exact replication of Card.svelte orientate():
    // background: adjust(degrees.x, -limitX, limitX, 37, 63)
    // rotate:     degrees.x * -1 (for x), degrees.y (for y)
    // glare:      adjust(degrees.x, -limitX, limitX, 0, 100)
    var LX = ${LIMIT_X}, LY = ${LIMIT_Y};
    targetBg.x     = adjust(degX, -LX, LX, 37, 63);
    targetBg.y     = adjust(degY, -LY, LY, 33, 67);
    targetRotate.x = round(degX * -1);
    targetRotate.y = round(degY);
    targetGlare.x  = adjust(degX, -LX, LX, 0, 100);
    targetGlare.y  = adjust(degY, -LY, LY, 0, 100);
  };

  window.revealShine = function() {
    opacityTarget = 1;
  };
})();
</script>
</body>
</html>`;
}

// ── Component ─────────────────────────────────────────────────────────
interface GyroCardProps {
  imageUri: string;
  rarity: Rarity;
  onDismiss: () => void;
}

export function GyroCard({ imageUri, rarity, onDismiss }: GyroCardProps) {
  const cfg = getRarityConfig(rarity);
  const cardWebViewRef = useRef<WebView | null>(null);
  const auraWebViewRef = useRef<WebView | null>(null);

  // entrance animation shared values
  const translateY    = useSharedValue(SH * 0.7);
  const rotateY       = useSharedValue(0);
  const opacity       = useSharedValue(0);
  const entranceDone  = useSharedValue(0);

  // track WebView load to prevent white flash on entrance
  const [cardLoaded, setCardLoaded] = useState(false);
  const handleCardLoad = useCallback(() => setCardLoaded(true), []);

  // gyro state (JS thread refs, not shared values)
  const gyroX = useRef(0);
  const gyroY = useRef(0);
  const [gyroAvailable, setGyroAvailable] = useState(true);

  const dismissRef = useRef(onDismiss);
  useEffect(() => { dismissRef.current = onDismiss; }, [onDismiss]);
  const handleDismiss = useCallback(() => dismissRef.current(), []);

  // ── Entrance animation (waits for WebView to load) ─────────────────
  useEffect(() => {
    if (!cardLoaded) return;

    // Play rarity-specific haptic pattern on reveal
    playRevealHaptics(rarity);

    opacity.value = withTiming(1, { duration: 300 });

    // Rise from below over the full spin time
    translateY.value = withSequence(
      withTiming(0, { duration: RISE_DURATION, easing: Easing.out(Easing.cubic) }),
      withSpring(0, { damping: 14, stiffness: 120, mass: 0.5 }),
    );

    // 2 slow 360° spins on Y axis
    rotateY.value = withSequence(
      withTiming(360 * SPIN_COUNT, {
        duration: RISE_DURATION,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(0, { duration: 0 }),
    );

    // unlock gyro after entrance finishes
    entranceDone.value = withDelay(ENTRANCE_TOTAL, withTiming(1, { duration: 0 }));

    // Reveal holographic shine after entrance settles
    const timer = setTimeout(() => {
      cardWebViewRef.current?.injectJavaScript(
        'window.revealShine && window.revealShine(); void 0;'
      );
    }, ENTRANCE_TOTAL);

    return () => clearTimeout(timer);
  }, [cardLoaded]);

  // ── Gyroscope ──────────────────────────────────────────────────────
  // Replicates Card.svelte orientate(): integrates gyro angular rates into
  // relative orientation deltas (gamma≈degX, beta≈degY) then injects them.
  // Springs live inside the WebView JS loop for smooth CSS updates.
  useEffect(() => {
    let sub: ReturnType<typeof Gyroscope.addListener> | null = null;

    Gyroscope.isAvailableAsync().then((available) => {
      if (!available) { setGyroAvailable(false); return; }
      Gyroscope.setUpdateInterval(16);

      sub = Gyroscope.addListener((data: GyroscopeMeasurement) => {
        if (entranceDone.value < 1) return;

        const dt = 0.016;
        // Integrate rad/s → degrees, matching gamma/beta orientation axes
        gyroX.current = Math.min(Math.max(
          gyroX.current + data.y * dt * 57.3, -LIMIT_X
        ), LIMIT_X);
        gyroY.current = Math.min(Math.max(
          gyroY.current - data.x * dt * 57.3, -LIMIT_Y
        ), LIMIT_Y);
        // Smooth return to center (simulates orientation delta decaying)
        gyroX.current *= 0.97;
        gyroY.current *= 0.97;

        // Send pre-clamped degree values; spring math runs inside WebView RAF
        cardWebViewRef.current?.injectJavaScript(
          `window.updateTilt(${gyroX.current.toFixed(2)},${gyroY.current.toFixed(2)}); void 0;`
        );
      });
    });

    return () => { sub?.remove(); };
  }, []);

  // ── Animated styles ────────────────────────────────────────────────
  const cardWrapStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { perspective: 1200 },
      { translateY: translateY.value },
      { rotateY: `${interpolate(rotateY.value, [0, 720], [0, 720])}deg` },
    ],
  }));

  const dismissOpacity = useAnimatedStyle(() => ({
    opacity: entranceDone.value,
  }));

  const html = buildCardHtml({
    imageUri,
    rarity,
    glowColor: cfg.glowColor,
    badgeColor: cfg.badgeColor,
    label: cfg.label,
  });

  return (
    <View style={s.root}>
      {/* Persistent full-energy aura from the power-shake phase */}
      <UnicornBackground
        webViewRef={auraWebViewRef}
        glowColor={cfg.glowColor}
        initialEnergy={1}
      />

      {/* Card with Pokemon CSS holographic effects */}
      <Animated.View style={[s.cardWrap, cardWrapStyle]}>
        <WebView
          ref={cardWebViewRef}
          style={s.cardWebView}
          source={{ html }}
          originWhitelist={["*"]}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled
          onMessage={() => {}}
          onLoadEnd={handleCardLoad}
        />
      </Animated.View>

      {/* Dismiss hint */}
      <Animated.Text
        entering={FadeIn.delay(ENTRANCE_TOTAL + 400).duration(500)}
        style={s.hint}
      >
        {gyroAvailable ? "Tilt your phone to explore" : "Tap outside to close"}
      </Animated.Text>

      {/* Tap-outside-to-dismiss overlay (active only after entrance) */}
      <Animated.View
        style={[s.dismissZone, dismissOpacity]}
        onTouchEnd={(e) => {
          const { pageX, pageY } = e.nativeEvent;
          const cardLeft = (SW - CARD_W) / 2;
          const cardTop  = SH * 0.04;
          const inside =
            pageX > cardLeft && pageX < cardLeft + CARD_W &&
            pageY > cardTop  && pageY < cardTop  + CARD_H;
          if (!inside) runOnJS(handleDismiss)();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    width: SW,
    height: SH,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: SH * 0.08,
    overflow: "hidden",
  },
  cardWrap: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.4,
    elevation: 20,
    zIndex: 10,
  },
  cardWebView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  hint: {
    position: "absolute",
    bottom: 28,
    color: "rgba(255,255,255,0.38)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
    zIndex: 11,
  },
  dismissZone: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9,
  },
});

