// Tilt Maze: the same maze for every phone (made from a seed), start top-left, exit bottom-right.
export const MAZE = { cols: 6, rows: 9 };

function rng(seed) {
  let h = seed >>> 0 || 1;
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >>> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
}

// walls[y][x] = { n, e, s, w } (true = wall). dist[y][x] = steps to the exit.
export function makeMaze(seed, cols = MAZE.cols, rows = MAZE.rows) {
  const rnd = rng(seed);
  const walls = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: true, e: true, s: true, w: true })));
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  const DIRS = [['n', 0, -1, 's'], ['e', 1, 0, 'w'], ['s', 0, 1, 'n'], ['w', -1, 0, 'e']];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = DIRS.filter(([, dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny][nx];
    });
    if (!opts.length) { stack.pop(); continue; }
    const [d, dx, dy, back] = opts[Math.floor(rnd() * opts.length)];
    walls[y][x][d] = false;
    walls[y + dy][x + dx][back] = false;
    seen[y + dy][x + dx] = true;
    stack.push([x + dx, y + dy]);
  }
  // Distance to the exit, for the progress bar on the big screen.
  const dist = Array.from({ length: rows }, () => Array(cols).fill(Infinity));
  const q = [[cols - 1, rows - 1]];
  dist[rows - 1][cols - 1] = 0;
  while (q.length) {
    const [x, y] = q.shift();
    for (const [d, dx, dy] of DIRS) {
      if (walls[y][x][d]) continue;
      const nx = x + dx, ny = y + dy;
      if (dist[ny][nx] > dist[y][x] + 1) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); }
    }
  }
  return { cols, rows, walls, dist, max: dist[0][0] };
}
