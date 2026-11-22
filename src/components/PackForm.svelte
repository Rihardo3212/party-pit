<script>
  // Inside Jokes: write questions (and their right answer) in the lobby. Everyone can add; you can remove your own.
  import { MAX_PACK, MAX_Q, MAX_A, packList } from '../engine/jokes.js';
  import { sfx } from '../lib/sound.js';

  let { s, id, send, isCtrl = false } = $props();
  let q = $state('');
  let a = $state('');
  const list = $derived(packList(s));
  const mine = $derived(list.filter((x) => x.by === id));
  const full = $derived(list.length >= MAX_PACK);

  function add(e) {
    e.preventDefault();
    if (!q.trim() || !a.trim() || full) return;
    sfx.pop();
    navigator.vibrate?.(30);
    send('packAdd', { q: q.trim(), a: a.trim() });
    q = '';
    a = '';
  }
  function del(x) {
    sfx.pick();
    send('packDel', { id: x.id });
  }
</script>

<form class="card stack pack" onsubmit={add}>
  <div class="phead">
    <h3>🤫 Write a question</h3>
    <span class="count pill">{list.length} / {MAX_PACK}</span>
  </div>
  <input class="field" bind:value={q} maxlength={MAX_Q} placeholder="Who always forgets their keys?" />
  <input class="field" bind:value={a} maxlength={MAX_A} placeholder="The right answer" />
  <button class="btn teal block" disabled={!q.trim() || !a.trim() || full}>➕ Add it</button>
  {#if mine.length}
    <ul class="mine">
      {#each mine as x (x.id)}
        <li class="pop-in"><span class="qq">{x.q}</span><b>{x.a}</b><button type="button" class="x" aria-label="Remove" onclick={() => del(x)}>✕</button></li>
      {/each}
    </ul>
  {/if}
  {#if isCtrl && list.length > mine.length}
    <p class="muted small">+{list.length - mine.length} from your friends (secret!)</p>
  {:else if !mine.length}
    <p class="muted small">Write as many as you like. Others' questions stay secret.</p>
  {/if}
</form>

<style>
  .pack { text-align: left; gap: 0.5rem; }
  .phead { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .count { font-weight: 900; }
  .btn.teal { --c: #14b8a6; }
  .mine { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; max-height: 30vh; overflow: auto; }
  .mine li { display: flex; align-items: center; gap: 0.5rem; background: var(--surface-hi); border-radius: 14px; padding: 0.35rem 0.4rem 0.35rem 0.7rem; }
  .qq { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9rem; }
  .mine b { color: #14b8a6; font-size: 0.9rem; white-space: nowrap; }
  .x { width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 59, 79, 0.18); color: #ff3b4f; font-weight: 900; flex: none; }
  .small { font-size: 0.85rem; margin: 0; }
</style>
