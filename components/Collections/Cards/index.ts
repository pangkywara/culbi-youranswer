import { Skia } from '@shopify/react-native-skia';
import { SHADER_HELPERS } from './helpers.sksl';
import { COMMON_TIER } from './common.sksl';
import { RARE_TIER }   from './rare.sksl';
import { EPIC_TIER }   from './epic.sksl';
import { LEGENDS_TIER } from './legends.sksl';
import { MYTHIC_TIER } from './mythic.sksl';
import { SECRET_TIER } from './secret.sksl';

const HOLO_MAIN = `
  uniform float2 resolution;
  uniform float2 pointer;
  uniform float  opacity;
  uniform float  mode;
  uniform float  fromCenter;

  ${SHADER_HELPERS}

  half4 main(float2 fc) {
    float2 uv   = fc / resolution;
    float2 p    = pointer / resolution;
    float  dist = distance(uv, p);
    half3 color = half3(0.0);
    float alpha = 0.0;

    // We just stack the if/else if blocks. 
    // Ensure EACH string starts with 'if' or 'else if'.
    ${COMMON_TIER}
    ${RARE_TIER}
    ${EPIC_TIER}
    ${LEGENDS_TIER}
    ${MYTHIC_TIER}
    ${SECRET_TIER}

    return half4(color, clamp(alpha, 0.0, 1.0));
  }
`;

// Glare is simple, we keep it here
const GLARE_SRC = `
  uniform float2 resolution;
  uniform float2 pointer;
  uniform float  opacity;
  half4 main(float2 fc) {
    float2 uv = fc / resolution;
    float dist = distance(uv, pointer / resolution);
    float inner = 1.0 - smoothstep(0.0, 0.15, dist);
    float outer = 1.0 - smoothstep(0.15, 0.9, dist);
    return half4(half3(inner * 0.85 + outer * 0.12), (inner * 0.75 + outer * 0.15) * opacity * 0.55);
  }
`;


// ── Lazy singleton effects ────────────────────────────────────────────────────
// IMPORTANT: Do NOT call Skia.RuntimeEffect.Make() at module level.
// Skia's native bridge may not be initialised at module evaluation time,
// which would throw, prevent this module from loading, and cause Expo Router
// to silently drop any screen that (transitively) imports it.
// Instead, initialise on first call inside a React component render/effect.

let _holoEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;
let _glareEffect: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;

/** Returns the cached holographic shader effect, creating it lazily on first call. */
export function getHoloEffect(): NonNullable<ReturnType<typeof Skia.RuntimeEffect.Make>> {
  if (!_holoEffect) _holoEffect = Skia.RuntimeEffect.Make(HOLO_MAIN);
  return _holoEffect!;
}

/** Returns the cached glare shader effect, creating it lazily on first call. */
export function getGlareEffect(): NonNullable<ReturnType<typeof Skia.RuntimeEffect.Make>> {
  if (!_glareEffect) _glareEffect = Skia.RuntimeEffect.Make(GLARE_SRC);
  return _glareEffect!;
}