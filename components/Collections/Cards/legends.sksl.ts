export const LEGENDS_TIER = `
    // ── 3: LEGENDS — RAINBOW HOLO ──
    //
    // 1:1 translation of rainbow-holo.css (unmasked variant):
    //
    //   card__shine:
    //     bg-layers: linear(-45°,clr1→clr5) + glitter(25%) + linear(-30°,7clrs×3)
    //     bg-blend: luminosity, soft-light
    //     bg-size: 200%, 25%, 400%
    //     filter: brightness(fc*0.25+0.5) contrast(2.2) saturate(0.75)
    //     overall: color-dodge (Skia Rect blendMode)
    //
    //   card__shine:before:
    //     foil(illusion-mask, 33% tile), brightness(2.5)
    //     opacity: (fromCenter+0.4)*0.5
    //     mix-blend-mode: darken
    //
    //   card__shine:after:
    //     glitter(25%) + linear(-60°,7clrs×3), soft-light blend
    //     filter: brightness(fc*0.3+0.55) contrast(2) saturate(1)
    //     mix-blend-mode: color-dodge
    //
    //   card__glare:
    //     radial(gray80%→teal25%α@30%→dark@120%) via hard-light
    //     filter: brightness(0.9) contrast(1.75)
    //     opacity: fromCenter * 0.9
    //
    else if (mode < 3.5) {

      // ──────────────────────────────────────────────────────────────────────────
      //  MAIN SHINE — 3 bg-layers composited bottom→top
      //  Layer 3 (base): rainbow -30°, 400%×400%
      //  Layer 2 (mid):  glitter 25%×25% (4× tile), soft-light
      //  Layer 1 (top):  -45° gradient clr1→clr5, 200%×200%, luminosity
      // ──────────────────────────────────────────────────────────────────────────

      // Layer 3 (base): linear-gradient(-30deg, 7 colors × 3 repeats + wrap)
      // bg-size: 400%×400%, bg-pos: (25%+pointer-x/2, 25%+pointer-y/2)
      float2 rb3Pos = float2(0.25 + p.x * 0.5, 0.25 + p.y * 0.5);
      float2 rb3Img = (uv + rb3Pos * 3.0) / 4.0;
      // CSS -30°: dir=(sin-30, -cos-30)=(-0.5, -0.866), length=1.366
      float rb3T = 0.5 + dot(rb3Img - 0.5, float2(-0.5, -0.866)) / 1.366;
      rb3T = clamp(rb3T, 0.0, 1.0);
      half3 rbBase = rbHoloColor(fract(rb3T * 3.0));

      // Layer 2 (mid): glitter (25%×25% = 4× tile), soft-light blend onto base
      float rbGlit1 = arGlitter(uv, float2(0.0, 0.0));
      half3 rbSoftLit = softLight3(rbBase, half3(rbGlit1));

      // Layer 1 (top): linear-gradient(-45deg, clr-1, clr-5)
      // bg-size: 200%×200%, bg-pos: (25%+50%*fromLeft, 25%+50%*fromTop)
      float2 rb1Img = (uv + float2(0.25 + 0.5 * p.x, 0.25 + 0.5 * p.y)) / 2.0;
      // CSS -45°: t = 1.0 - 0.5*(imgU+imgV)
      float rb1T = clamp(1.0 - 0.5 * (rb1Img.x + rb1Img.y), 0.0, 1.0);
      half3 rbClr1 = half3(0.581, 0.159, 0.159); // hsl(0,57%,37%)
      half3 rbClr5 = half3(0.140, 0.560, 0.560); // hsl(180,60%,35%)
      half3 rbDiag = mix(rbClr1, rbClr5, rb1T);

      // Luminosity blend: -45° gradient onto soft-lit result
      half3 rbMainShine = lumBlend(rbSoftLit, rbDiag);

      // ──────────────────────────────────────────────────────────────────────────
      //  :BEFORE — foil (illusion-mask, 33% tile)
      //  filter: brightness(2.5) contrast(1)
      //  opacity: (fromCenter + 0.4) * 0.5
      //  mix-blend-mode: darken
      // ──────────────────────────────────────────────────────────────────────────
      float2 rbFoilUV = fract(uv * 3.0);
      float rbFoilV = 0.5
        + 0.25 * sin(rbFoilUV.x * 18.85 + rbFoilUV.y * 6.283)
        + 0.15 * sin((rbFoilUV.x - rbFoilUV.y) * 25.13)
        + 0.10 * cos((rbFoilUV.x + rbFoilUV.y) * 12.57);
      // filter: brightness(2.5)
      rbFoilV = clamp(rbFoilV * 2.5, 0.0, 1.0);
      float rbFoilOp = clamp((fromCenter + 0.4) * 0.5, 0.0, 1.0);
      // Darken blend at opacity
      half3 rbDarken = min(rbMainShine, half3(rbFoilV));
      rbMainShine = mix(rbMainShine, rbDarken, rbFoilOp);

      // ──────────────────────────────────────────────────────────────────────────
      //  :AFTER — glitter(25%) + rainbow(-60°, 400%×400%)
      //  bg-blend: soft-light (glitter onto rainbow)
      //  filter: brightness(fc*0.3+0.55) contrast(2) saturate(1)
      //  mix-blend-mode: color-dodge onto main
      // ──────────────────────────────────────────────────────────────────────────

      // Rainbow at -60°, bg-size 400%×400%, bg-pos: pointer-x pointer-y
      float2 rbAftImg = (uv + p * 3.0) / 4.0;
      // CSS -60°: dir=(sin-60, -cos-60)=(-0.866, -0.5), length=1.366
      float rbAftT = 0.5 + dot(rbAftImg - 0.5, float2(-0.866, -0.5)) / 1.366;
      rbAftT = clamp(rbAftT, 0.0, 1.0);
      half3 rbAftRainbow = rbHoloColor(fract(rbAftT * 3.0));

      // Glitter soft-light onto rainbow
      float rbGlit2 = arGlitter(uv, float2(0.0, 0.0));
      half3 rbAftResult = softLight3(rbAftRainbow, half3(rbGlit2));

      // :after filter: brightness(fc*0.3+0.55) contrast(2) saturate(1)
      rbAftResult = cssFilter(rbAftResult, fromCenter * 0.2 + 0.45, 2.0, 1.0);

      // Color-dodge blend :after onto main
      rbMainShine = colorDodge3(rbMainShine, rbAftResult);

      // ──────────────────────────────────────────────────────────────────────────
      //  PARENT FILTER: brightness(fc*0.25+0.5) contrast(2.2) saturate(0.75)
      //  Applied to entire card__shine element after pseudo compositing
      // ──────────────────────────────────────────────────────────────────────────
      rbMainShine = cssFilter(rbMainShine, fromCenter * 0.25 + 0.5, 2.2, 0.75);

      // ──────────────────────────────────────────────────────────────────────────
      //  GLARE (baked — hard-light blend)
      //  radial: gray(80%) → teal(85%,25%α)@30% → dark(25%)@120%
      //  filter: brightness(0.9) contrast(1.75)
      //  opacity: fromCenter * 0.9
      // ──────────────────────────────────────────────────────────────────────────
      // Farthest-corner circle radius
      float rbFC = max(max(distance(p, float2(0,0)), distance(p, float2(1,0))),
                       max(distance(p, float2(0,1)), distance(p, float2(1,1))));
      float rbGN = dist / max(rbFC, 0.001);

      // Gray channel interpolation between 3 stops
      float rbGlGray = mix(0.80, 0.855, smoothstep(0.0, 0.30, rbGN));
      rbGlGray = mix(rbGlGray, 0.25, smoothstep(0.30, 1.20, rbGN));
      // Alpha channel: 1.0 → 0.25 @ 30% → 1.0 @ 120%
      float rbGlAlpha = mix(1.0, 0.25, smoothstep(0.0, 0.30, rbGN));
      rbGlAlpha = mix(rbGlAlpha, 1.0, smoothstep(0.30, 1.20, rbGN));

      // filter: brightness(0.9) contrast(1.75)
      rbGlGray = clamp((rbGlGray * 0.9 - 0.5) * 1.75 + 0.5, 0.0, 1.0);

      // Hard-light blend modulated by alpha × element opacity
      half3 rbGlHL = hardLight3(rbMainShine, half3(rbGlGray));
      float rbGlStr = rbGlAlpha * fromCenter * 0.9;
      color = mix(rbMainShine, rbGlHL, rbGlStr);
      alpha = opacity;
    }
`;