<script>
  // Lewis, the presenter: an original cartoon game-show host.
  // level (0..1) opens the mouth; talking makes him bob; idle he breathes and blinks.
  let { level = 0, talking = false, size = 160 } = $props();

  const open = $derived(talking ? Math.min(1, level * 1.3) : 0);
  // Mouth: a grin when quiet, an open "O" that grows with the voice.
  const mouthH = $derived(3 + open * 15);
  const mouthW = $derived(22 - open * 5);
</script>

<div class="lewis" class:talking style="--size:{size}px; --bob:{open}">
  <svg viewBox="0 0 200 220" aria-hidden="true">
    <!-- shadow -->
    <ellipse cx="100" cy="212" rx="62" ry="7" fill="rgba(0,0,0,0.28)" />

    <!-- jacket -->
    <path d="M30 216 C30 168 58 146 100 146 C142 146 170 168 170 216 Z" fill="#7b3fe4" />
    <path d="M30 216 C30 176 54 156 80 150 L100 196 L120 150 C146 156 170 176 170 216 Z" fill="#6a2fd0" />
    <!-- sparkles on the jacket -->
    <g fill="#ffd84d" class="spark">
      <circle cx="52" cy="186" r="2.2" /><circle cx="66" cy="200" r="1.6" /><circle cx="146" cy="184" r="2.2" />
      <circle cx="136" cy="202" r="1.6" /><circle cx="158" cy="204" r="1.4" /><circle cx="44" cy="206" r="1.4" />
    </g>
    <!-- shirt and lapels -->
    <path d="M80 150 L100 196 L120 150 Z" fill="#fff" />
    <path d="M80 150 L92 178 L78 172 Z" fill="#5521b5" />
    <path d="M120 150 L108 178 L122 172 Z" fill="#5521b5" />
    <!-- bow tie -->
    <g transform="translate(100 158)">
      <path d="M0 0 L-17 -9 L-17 9 Z" fill="#ff3b4f" />
      <path d="M0 0 L17 -9 L17 9 Z" fill="#ff3b4f" />
      <circle r="4.5" fill="#d61f37" />
    </g>

    <!-- his free hand: waves about while he talks -->
    <g class="hand">
      <circle cx="40" cy="184" r="12" fill="#f2b48a" />
      <path d="M33 176 q-3 -10 2 -12 q4 0 4 8 M41 172 q0 -11 5 -11 q4 1 2 11" fill="#f2b48a" stroke="#e29c72" stroke-width="1.5" />
    </g>

    <!-- microphone in his hand -->
    <g class="mic">
      <rect x="163" y="140" width="6" height="42" rx="3" fill="#2b2240" transform="rotate(8 166 160)" />
      <circle cx="166" cy="134" r="11" fill="#c9c4ea" />
      <circle cx="166" cy="134" r="11" fill="url(#grill)" />
      <circle cx="162" cy="182" r="12" fill="#f2b48a" />
    </g>

    <!-- head -->
    <g class="head">
      <ellipse cx="100" cy="92" rx="54" ry="58" fill="#f6c39b" />
      <!-- ears -->
      <ellipse cx="46" cy="98" rx="9" ry="13" fill="#eeb088" />
      <ellipse cx="154" cy="98" rx="9" ry="13" fill="#eeb088" />
      <!-- the quiff -->
      <path d="M46 84 C42 46 70 26 104 28 C136 30 160 48 154 82 C146 66 132 58 112 58 C90 58 70 64 58 86 Z" fill="#4a2c1d" />
      <path d="M70 40 C84 14 128 12 146 34 C128 26 102 26 82 44 Z" fill="#5d3825" />
      <path d="M96 30 C112 22 132 26 140 36" stroke="#7a4b31" stroke-width="3" fill="none" stroke-linecap="round" />
      <!-- eyebrows: up when talking -->
      <g class="brows" style="transform: translateY({-open * 4}px)">
        <path d="M66 76 Q78 68 90 75" stroke="#4a2c1d" stroke-width="5" fill="none" stroke-linecap="round" />
        <path d="M110 75 Q122 68 134 76" stroke="#4a2c1d" stroke-width="5" fill="none" stroke-linecap="round" />
      </g>
      <!-- eyes -->
      <g class="eyes">
        <ellipse cx="79" cy="91" rx="7" ry="8" fill="#2b2240" />
        <ellipse cx="121" cy="91" rx="7" ry="8" fill="#2b2240" />
        <circle cx="81.5" cy="88" r="2.4" fill="#fff" />
        <circle cx="123.5" cy="88" r="2.4" fill="#fff" />
      </g>
      <!-- cheeks and nose -->
      <circle cx="64" cy="112" r="9" fill="#ff8a7a" opacity="0.45" />
      <circle cx="136" cy="112" r="9" fill="#ff8a7a" opacity="0.45" />
      <ellipse cx="100" cy="106" rx="7" ry="5.5" fill="#e9a57c" />
      <!-- moustache -->
      <path d="M100 116 C92 112 78 114 72 122 C82 121 92 122 100 119 C108 122 118 121 128 122 C122 114 108 112 100 116 Z" fill="#4a2c1d" />
      <!-- mouth -->
      {#if open > 0.05}
        <ellipse cx="100" cy={128 + mouthH / 2} rx={mouthW} ry={mouthH} fill="#5a1530" />
        <ellipse cx="100" cy={128 + mouthH * 1.1} rx={mouthW * 0.55} ry={mouthH * 0.45} fill="#ff6b81" />
        <rect x={100 - mouthW * 0.7} y="126" width={mouthW * 1.4} height="4" rx="2" fill="#fff" />
      {:else}
        <path d="M76 126 Q100 146 124 126 Q100 134 76 126 Z" fill="#5a1530" />
        <path d="M80 127 Q100 133 120 127 L119 130 Q100 135 81 130 Z" fill="#fff" />
      {/if}
    </g>

    <defs>
      <pattern id="grill" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.9" fill="#7d77a3" />
      </pattern>
    </defs>
  </svg>
</div>

<style>
  .lewis { width: var(--size); aspect-ratio: 200 / 220; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35)); }
  svg { width: 100%; height: 100%; overflow: visible; }
  .head { transform-origin: 100px 140px; transition: transform 0.08s; }
  .talking .head { transform: translateY(calc(var(--bob) * -5px)) rotate(calc(var(--bob) * 3deg)); }
  .lewis:not(.talking) .head { animation: breathe 3.2s ease-in-out infinite; }
  .brows { transition: transform 0.1s; }
  .eyes { transform-origin: 100px 91px; animation: blink 4.6s infinite; }
  .mic { transform-origin: 162px 182px; transition: transform 0.12s; }
  .talking .mic { transform: rotate(-6deg) translateY(-3px); }
  .spark { animation: twinkle 1.8s ease-in-out infinite; }
  .hand { transform-origin: 46px 200px; transition: transform 0.3s cubic-bezier(0.2, 1.6, 0.4, 1); }
  .talking .hand { animation: gesture 2.4s ease-in-out infinite; }
  .talking svg { animation: sway 1.8s ease-in-out infinite; transform-origin: 50% 100%; }
  .lewis:not(.talking) .hand { animation: idlehand 5s ease-in-out infinite; }
  @keyframes gesture {
    0%, 100% { transform: translate(0, 0) rotate(0); }
    20% { transform: translate(-6px, -34px) rotate(-18deg); }
    35% { transform: translate(-2px, -26px) rotate(-8deg); }
    50% { transform: translate(-8px, -40px) rotate(-24deg); }
    70% { transform: translate(0, -12px) rotate(4deg); }
  }
  @keyframes idlehand { 0%, 80%, 100% { transform: none; } 88% { transform: translate(-3px, -14px) rotate(-12deg); } }
  @keyframes sway { 0%, 100% { transform: rotate(-1.5deg); } 50% { transform: rotate(1.5deg) translateY(-2px); } }
  @keyframes breathe { 50% { transform: translateY(-3px) rotate(-1.5deg); } }
  @keyframes blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.1); } }
  @keyframes twinkle { 50% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) {
    .head, .eyes, .spark, .hand, svg { animation: none !important; }
  }
</style>
