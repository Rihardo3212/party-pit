<script>
  // Lewis, the presenter: a posh blue alien blob with a top hat, a monocle and a grand moustache.
  // level (0..1) opens the mouth; talking makes him wobble like jelly; idle he breathes and blinks.
  let { level = 0, talking = false, size = 160 } = $props();

  const open = $derived(talking ? Math.min(1, level * 1.3) : 0);
  // Mouth: a small smile when quiet, an open "O" that grows with the voice.
  const mouthH = $derived(3 + open * 10);
  const mouthW = $derived(15 - open * 3);
</script>

<div class="lewis" class:talking style="--size:{size}px; --bob:{open}">
  <svg viewBox="0 0 200 220" aria-hidden="true">
    <!-- shadow -->
    <ellipse cx="100" cy="212" rx="66" ry="7" fill="rgba(0,0,0,0.28)" />

    <g class="blob">
      <!-- the jelly body, with drippy blobs along the bottom -->
      <path
        d="M38 208 C26 206 26 188 30 170 C34 142 40 112 54 94 C66 78 82 70 100 70 C120 70 136 78 148 94 C162 112 166 142 170 170 C174 190 172 206 160 208 C150 212 142 204 132 209 C120 214 112 206 100 210 C88 214 80 206 68 210 C56 214 48 206 38 208 Z"
        fill="#3d8bff"
      />
      <!-- soft shade on one side and a lighter tummy, so he looks round (flat colors, no gloss) -->
      <path d="M150 98 C164 118 168 146 170 170 C172 190 170 204 160 208 C152 186 156 140 150 98 Z" fill="#2f74e6" />
      <path d="M62 206 C60 184 74 168 100 168 C126 168 140 184 138 206 C126 212 114 206 100 210 C86 213 74 206 62 206 Z" fill="#7db8ff" />
      <ellipse cx="68" cy="100" rx="10" ry="6" fill="#ffffff" opacity="0.22" transform="rotate(-30 68 100)" />
      <!-- little spots, because he is from somewhere far away -->
      <g fill="#2f74e6">
        <circle cx="46" cy="150" r="4" /><circle cx="54" cy="134" r="2.6" /><circle cx="152" cy="132" r="3.2" />
      </g>

      <!-- bow tie -->
      <g transform="translate(100 171)">
        <path d="M0 0 L-16 -9 L-16 9 Z" fill="#ff3b4f" />
        <path d="M0 0 L16 -9 L16 9 Z" fill="#ff3b4f" />
        <circle r="4.5" fill="#d61f37" />
      </g>

      <!-- the face -->
      <g class="face">
        <!-- eyebrows: up when talking -->
        <g class="brows" style="transform: translateY({-open * 4}px)">
          <path d="M66 92 Q77 85 88 91" stroke="#16306e" stroke-width="4.5" fill="none" stroke-linecap="round" />
          <path d="M112 89 Q124 82 136 90" stroke="#16306e" stroke-width="4.5" fill="none" stroke-linecap="round" />
        </g>
        <!-- eyes -->
        <g class="eyes">
          <ellipse cx="78" cy="109" rx="12" ry="14" fill="#fff" />
          <ellipse cx="123" cy="108" rx="12" ry="14" fill="#fff" />
          <ellipse cx="80" cy="111" rx="6" ry="7.5" fill="#1b1640" />
          <ellipse cx="125" cy="110" rx="6" ry="7.5" fill="#1b1640" />
          <circle cx="82.5" cy="107.5" r="2.2" fill="#fff" />
          <circle cx="127.5" cy="106.5" r="2.2" fill="#fff" />
        </g>
        <!-- the monocle and its little gold chain -->
        <g class="monocle">
          <circle cx="123" cy="108" r="17" fill="#ffffff" opacity="0.14" />
          <circle cx="123" cy="108" r="17" fill="none" stroke="#ffc400" stroke-width="4" />
          <path d="M136 120 C146 132 150 146 144 160" stroke="#ffc400" stroke-width="2" fill="none" stroke-dasharray="3 2.5" stroke-linecap="round" />
        </g>
        <!-- cheeks -->
        <circle cx="60" cy="128" r="8" fill="#ff7ab0" opacity="0.4" />
        <circle cx="142" cy="128" r="8" fill="#ff7ab0" opacity="0.4" />
        <!-- mouth (under the moustache) -->
        {#if open > 0.05}
          <ellipse cx="100" cy={143 + mouthH / 2} rx={mouthW} ry={mouthH} fill="#3a0f3f" />
          <ellipse cx="100" cy={143 + mouthH * 1.1} rx={mouthW * 0.55} ry={mouthH * 0.45} fill="#ff6b9a" />
        {:else}
          <path d="M89 144 Q100 153 111 144" stroke="#3a0f3f" stroke-width="3.5" fill="none" stroke-linecap="round" />
        {/if}
        <!-- the grand handlebar moustache, curled at the ends -->
        <g class="stache">
          <path transform="translate(100 131) scale(1.35) translate(-100 -131)"
            d="M100 128 C92 124 80 124 72 131 C66 136 58 138 52 133 C50 130 53 126 57 128 C54 131 58 134 62 131 C70 125 78 136 100 136 C122 136 130 125 138 131 C142 134 146 131 143 128 C147 126 150 130 148 133 C142 138 134 136 128 131 C120 124 108 124 100 128 Z"
            fill="#0f0d2b" stroke="#0f0d2b" stroke-width="1.5" stroke-linejoin="round"
          />
        </g>
      </g>

      <!-- the top hat, worn at a jaunty angle -->
      <g class="hat">
        <g transform="rotate(-9 104 70)">
          <ellipse cx="104" cy="72" rx="40" ry="8" fill="#1e1a33" />
          <path d="M78 71 L81 24 C81 20 84 18 88 18 L120 18 C124 18 127 20 127 24 L130 71 Z" fill="#2b2547" />
          <rect x="79.5" y="56" width="49" height="10" fill="#7b3fe4" />
          <polygon points="117.0,55.5 118.4,59.1 122.2,59.3 119.3,61.7 120.2,65.4 117.0,63.4 113.8,65.4 114.7,61.7 111.8,59.3 115.6,59.1" fill="#ffc400" />
          <path d="M86 24 L86 52" stroke="#3a3360" stroke-width="3" stroke-linecap="round" />
        </g>
      </g>

      <!-- his free hand: a little blob hand that waves about while he talks -->
      <g class="hand">
        <circle cx="34" cy="172" r="12" fill="#3d8bff" />
        <circle cx="27" cy="162" r="4.5" fill="#3d8bff" />
        <circle cx="35" cy="159" r="4.5" fill="#3d8bff" />
        <circle cx="43" cy="162" r="4.5" fill="#3d8bff" />
      </g>

      <!-- microphone in his other hand -->
      <g class="mic">
        <rect x="163" y="140" width="6" height="42" rx="3" fill="#2b2240" transform="rotate(8 166 160)" />
        <circle cx="166" cy="134" r="11" fill="#c9c4ea" />
        <circle cx="166" cy="134" r="11" fill="url(#lewis-grill)" />
        <circle cx="163" cy="180" r="12" fill="#3d8bff" />
        <circle cx="155" cy="176" r="4.5" fill="#3d8bff" />
      </g>
    </g>

    <defs>
      <pattern id="lewis-grill" width="4" height="4" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="0.9" fill="#7d77a3" />
      </pattern>
    </defs>
  </svg>
</div>

<style>
  .lewis { width: var(--size); aspect-ratio: 200 / 220; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.35)); }
  svg { width: 100%; height: 100%; overflow: visible; }
  /* Jelly: he squashes and stretches from the bottom. */
  .blob { transform-origin: 100px 210px; transition: transform 0.08s; }
  .talking .blob { transform: scale(calc(1 + var(--bob) * 0.04), calc(1 - var(--bob) * 0.04)); }
  .lewis:not(.talking) .blob { animation: breathe 3.2s ease-in-out infinite; }
  .face { transition: transform 0.08s; }
  .talking .face { transform: translateY(calc(var(--bob) * -2px)); }
  .brows { transition: transform 0.1s; }
  .eyes { transform-origin: 100px 109px; animation: blink 4.6s infinite; }
  .hat { transform-origin: 104px 72px; transition: transform 0.15s; }
  .talking .hat { animation: tip 1.6s ease-in-out infinite; }
  .lewis:not(.talking) .hat { animation: lift 7s ease-in-out infinite; }
  .stache { transform-origin: 100px 130px; transition: transform 0.08s; }
  .talking .stache { transform: translateY(calc(var(--bob) * 2px)) scaleX(calc(1 + var(--bob) * 0.08)); }
  .monocle { transform-origin: 123px 108px; }
  .mic { transform-origin: 162px 182px; transition: transform 0.12s; }
  .talking .mic { transform: rotate(-6deg) translateY(-3px); }
  .hand { transform-origin: 40px 196px; transition: transform 0.3s cubic-bezier(0.2, 1.6, 0.4, 1); }
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
  @keyframes breathe { 50% { transform: scale(1.025, 0.975); } }
  @keyframes blink { 0%, 94%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.1); } }
  @keyframes tip { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-5deg) translateY(-3px); } }
  /* Now and then he lifts his hat, ever so politely. */
  @keyframes lift { 0%, 86%, 100% { transform: none; } 90%, 94% { transform: translateY(-10px) rotate(-6deg); } }
  @media (prefers-reduced-motion: reduce) {
    .blob, .eyes, .hat, .hand, svg { animation: none !important; }
  }
</style>
