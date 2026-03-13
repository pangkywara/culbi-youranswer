import React from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

/**
 * RARITY ENGINE 6.0: UNIQUE IDENTITY
 * Every rarity now has a specific visual personality and "feel".
 */
interface RarityProfile {
  h1: number;
  h2: number;
  tier: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  pCount: number;
  blur: number;
  mixMode: string;
  glowPower: number;
}

function getRarityProfile(hex: string): RarityProfile {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { h1: 0, h2: 0, tier: "COMMON", pCount: 0, blur: 40, mixMode: 'screen', glowPower: 0.3 };

  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), diff = max - min;
  const sat = max === 0 ? 0 : diff / max;

  // Hue Logic
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const d = (max / 255) - (min / 255);
  let h = 0;
  if (d !== 0) {
    if (max/255 === rN) h = ((gN - bN) / d) % 6;
    else if (max/255 === gN) h = (bN - rN) / d + 2;
    else h = (rN - gN) / d + 4;
  }
  const hue = Math.round((h * 60 + 360) % 360);

  // 1. COMMON: Satin Silver/White
  if (diff < 30) {
    return { h1: hue, h2: hue, tier: "COMMON", pCount: 12, blur: 30, mixMode: 'overlay', glowPower: 0.2 };
  }
  // 2. LEGENDARY: High-Energy Prismatic
  if (sat > 0.85) {
    return { h1: hue, h2: (hue + 45) % 360, tier: "LEGENDARY", pCount: 60, blur: 90, mixMode: 'plus-lighter', glowPower: 0.9 };
  }
  // 3. EPIC: Deep Neon Glow
  if (sat > 0.65) {
    return { h1: hue, h2: (hue + 25) % 360, tier: "EPIC", pCount: 35, blur: 65, mixMode: 'screen', glowPower: 0.6 };
  }
  // 4. RARE: Balanced Ambient
  return { h1: hue, h2: hue, tier: "RARE", pCount: 20, blur: 50, mixMode: 'screen', glowPower: 0.4 };
}

function buildHtml(profile: RarityProfile, initialEnergy = 0): string {
  const { h1, h2, tier, pCount, blur, mixMode, glowPower } = profile;
  const isCommon = tier === "COMMON";
  const isLegendary = tier === "LEGENDARY";

  // Rarity-specific saturation and lightness
  const s = isCommon ? "2%" : "98%";
  const l = isCommon ? "95%" : "70%";

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; background: transparent; overflow: hidden; }

  #master {
    position: absolute; inset: 0;
    pointer-events: none;
    mix-blend-mode: ${mixMode};
    transform: translate3d(0,0,0);
  }

  .edge {
    position: absolute; opacity: 0; filter: blur(${blur}px);
    transition: opacity 0.6s ease, transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform, opacity;
  }
  
  /* Unique Edge Layouts per Tier */
  .bottom { left: -40%; right: -40%; bottom: -20%; height: ${isLegendary ? '85%' : '70%'}; 
            background: radial-gradient(ellipse at 50% 100%, hsla(${h1},${s},${l},${glowPower}), transparent 80%); }
  
  .side   { top: -30%; bottom: -30%; width: 60%; 
            background: radial-gradient(ellipse at center, hsla(${h2},${s},${l},${glowPower * 0.7}), transparent 80%); }
  
  .top    { left: -40%; right: -40%; top: -20%; height: 60%; 
            background: radial-gradient(ellipse at 50% 0%, hsla(${h1},${s},${l},${glowPower * 0.8}), transparent 80%); }

  .particle {
    position: absolute;
    width: ${isCommon ? '1.5px' : '2.5px'}; 
    height: ${isCommon ? '1.5px' : '2.5px'};
    background: white; border-radius: 50%;
    box-shadow: 0 0 12px hsla(${h1},100%,80%,0.9);
    filter: blur(0.6px);
    will-change: transform;
    opacity: 0;
  }
</style>
</head>
<body>
  <div id="master">
    <div id="glow-bottom" class="edge bottom"></div>
    <div id="glow-left"   class="edge side" style="left: -30%;"></div>
    <div id="glow-right"  class="edge side" style="right: -30%;"></div>
    <div id="glow-top"    class="edge top"></div>
    <div id="p-field"></div>
  </div>

  <script>
    (function() {
      const master = document.getElementById('master');
      const pField = document.getElementById('p-field');
      const els = { bottom: document.getElementById('glow-bottom'), left: document.getElementById('glow-left'), right: document.getElementById('glow-right'), top: document.getElementById('glow-top') };
      
      let targetEnergy = ${initialEnergy};
      let currentEnergy = ${initialEnergy};
      const particles = [];

      for(let i=0; i<${pCount}; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        pField.appendChild(p);
        particles.push({
          el: p,
          x: Math.random() * 100,
          y: Math.random() * 110,
          s: (0.15 + Math.random() * 0.5) * (${isCommon ? 0.5 : 1}),
          phase: Math.random() * 10
        });
      }

      function update() {
        // Linear Interpolation (LERP) for energy stabilization
        currentEnergy += (targetEnergy - currentEnergy) * 0.12;

        // Kinetic Flow Damping at 100%
        let v;
        if (currentEnergy < 0.8) v = 0.5 + (currentEnergy * 3.5);
        else v = 3.3 - ((currentEnergy - 0.8) * 12.5);
        v = Math.max(0.35, v);

        master.style.opacity = currentEnergy > 0.01 ? 1 : 0.12;

        particles.forEach(p => {
          p.y -= p.s * v;
          if (p.y < -15) { p.y = 115; p.x = Math.random() * 100; }
          
          const sway = Math.sin(Date.now() * 0.0008 + p.phase) * (${isLegendary ? 5 : 2});
          const scale = (0.5 + currentEnergy * 0.7) * (${isCommon ? 0.8 : 1});
          
          p.el.style.transform = 'translate3d(' + (p.x + sway) + 'vw, ' + p.y + 'vh, 0) scale(' + scale + ')';
          p.el.style.opacity = (0.1 + currentEnergy * 0.85).toFixed(2);
        });

        requestAnimationFrame(update);
      }
      update();

      window.setEnergy = function(e) {
        targetEnergy = Math.max(0, Math.min(1, e));
        
        const bE = Math.min(1, currentEnergy / 0.45);
        const sE = Math.max(0, Math.min(1, (currentEnergy - 0.3) / 0.45));
        const tE = Math.max(0, Math.min(1, (currentEnergy - 0.6) / 0.4));

        els.bottom.style.opacity = (0.1 + bE * 0.9).toFixed(3);
        els.bottom.style.transform = 'translate3d(0, ' + (55 - bE * 55) + 'px, 0)';
        els.left.style.opacity = (sE * 0.75).toFixed(3);
        els.right.style.opacity = (sE * 0.75).toFixed(3);
        els.top.style.opacity = (tE * 0.7).toFixed(3);
        els.top.style.transform = 'translate3d(0, ' + (-55 + tE * 55) + 'px, 0)';
      };

      window.setEnergy(targetEnergy);
    })();
  </script>
</body>
</html>`;
}

export function UnicornBackground({ webViewRef, glowColor, initialEnergy = 0 }: UnicornBackgroundProps) {
  const profile = getRarityProfile(glowColor);
  const html = buildHtml(profile, initialEnergy);

  return (
    <View style={styles.container} pointerEvents="none">
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ html }}
        originWhitelist={["*"]}
        scrollEnabled={false}
        androidLayerType="hardware"
        javaScriptEnabled
      />
    </View>
  );
}

interface UnicornBackgroundProps {
  webViewRef: React.RefObject<WebView | null>;
  glowColor: string;
  initialEnergy?: number;
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject },
  webview: { flex: 1, backgroundColor: "transparent" },
});