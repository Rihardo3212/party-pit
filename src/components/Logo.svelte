<script>
  let { size = 1 } = $props();
</script>

<div class="logo" style="--s:{size}" aria-label="Party Pit">
  <span class="w one">PARTY</span>
  <span class="bolt">🎉</span>
  <span class="w two">PIT</span>
</div>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: 0.12em;
    font-family: var(--font-display);
    font-size: min(calc(3.4rem * var(--s)), calc(9.6 * var(--vw)));
    line-height: 1;
    transform: rotate(-4deg);
    user-select: none;
  }
  .w {
    letter-spacing: 0.01em;
    -webkit-text-stroke: calc(0.035em) #2a0a16;
    paint-order: stroke fill;
  }
  /* layered shadows give the letters a chunky 3D extrusion */
  .one {
    color: #fff;
    text-shadow:
      0 0.025em 0 #ff3b4f, 0 0.05em 0 #ff3b4f, 0 0.075em 0 #e22a40, 0 0.1em 0 #c91d34,
      0 0.125em 0 #b3122a, 0 0.15em 0 #2a0a16, 0 0.2em 0.25em rgba(0, 0, 0, 0.35);
  }
  .two {
    color: #ffc400;
    text-shadow:
      0 0.025em 0 #ff9d00, 0 0.05em 0 #ff8a00, 0 0.075em 0 #f07800, 0 0.1em 0 #d96800,
      0 0.125em 0 #b35500, 0 0.15em 0 #2a0a16, 0 0.2em 0.25em rgba(0, 0, 0, 0.35);
  }
  .bolt {
    font-size: 0.85em;
    display: inline-block;
    filter: drop-shadow(0 0.08em 0 #2a0a16);
    animation: zap 1.6s ease-in-out infinite;
  }
  @keyframes zap {
    0%, 100% { transform: rotate(-12deg) scale(1); }
    50% { transform: rotate(10deg) scale(1.18); }
  }
</style>
