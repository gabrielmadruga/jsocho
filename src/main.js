

// the size of the board we'll be playing on in tiles
let board_w = 16;
let board_h = 15;

// sprites
let s_block = 1;
let s_empty = 2;
let s_mine = 3;
let s_flag = 6;

// text colors (for # of mines)
let text_colors = [3, 4, 2, 0, 0, 0, 0, 0];

// a table of all offsets to a field's neighbours
let directions = [
  { x: -1, y: -1 }, { x: -1, y: 0 },
  { x: -1, y: 1 }, { x: 0, y: -1 },
  { x: 0, y: 1 }, { x: 1, y: -1 },
  { x: 1, y: 0 }, { x: 1, y: 1 }
];

// color map for explosion
let flash_duration = 8;
let flash_map = [
  [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [6, 6, 6, 6, 7, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [5, 13, 8, 11, 9, 6, 7, 7, 14, 10, 7, 11, 12, 12, 15, 7],
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
];

// -----------------------------
// counters
// -----------------------------
let counters = {};
function start_counter(name, v) {
  counters[name] = v;
}
function ctr(name) {
  return counters[name];
}
function update_ctrs() {
  let keys = Object.keys(counters);
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    if (counters[key] > 0) {
      counters[key] -= 1;
    } else {
      counters[key] = undefined;
    }
  }
}


// -----------------------------
// various helpers
// -----------------------------

// gets a random field that fulfils a condition
function random_field(obj, cond) {
  let x, y;
  do {
    x = flr(rnd(board_h));
    y = flr(rnd(board_h));
  } while (!cond(obj[x][y]))
  return { x, y };
}

// gets a field at coordinates or nil if out of bounds
function safe_get(obj, x, y) {
  if (obj[x] && obj[x][y]) {
    return obj[x][y]
  } else {
    return null;
  }
}

// gets all neighbours of the field at x, y
function get_neighbours(board, x, y) {
  let result = [];
  for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
    let d = directions[dirIndex];
    let n = safe_get(board, x + d.x, y + d.y)
    if (n) {
      result.push(n);
    }
  }
  return result
}

// -----------------------------
// game logic
// -----------------------------

function start_game(mine_count) {
  board = make_board(mine_count);
  player = {
    x: flr(board_w / 2),
    y: flr(board_h / 2)
  };
  game = {
    blown_up: false,
    flags: 0,
    mines_found: 0,
    mines_needed: mine_count,
    seconds: 0
  };
  make_first_visit(board)
  state = 'game'
}

function status(game) {
  if (game.blown_up) {
    return 'lost';
  } else if (game.mines_found == game.mines_needed && game.flags == game.mines_needed) {
    return 'won';
  } else {
    return 'playing';
  }
}

function make_board(mine_cnt) {
  // initialize empty board
  let b = [];
  for (let x = 0; x < board_w; x++) {
    b[x] = [];
    for (let y = 0; y < board_h; y++) {
      b[x][y] = {
        mine: false,
        visited: false,
        flagged: false,
      }
    }
  }
  // sprinkle mines
  for (let m = 0; m < mine_cnt; m++) {
    let r = random_field(b, function notMined(field) {
      return !field.mine
    });
    b[r.x][r.y].mine = true;
  }
  // calculate how many of each field's neighbours are mines
  for (let x = 0; x < board_w; x++) {
    for (let y = 0; y < board_h; y++) {
      let neighbours = get_neighbours(b, x, y);
      // count mines among them
      let total = 0
      for (let nIndex = 0; nIndex < neighbours.length; nIndex++) {
        if (neighbours[nIndex].mine) {
          total += 1;
        }
      }
      // store for later
      b[x][y].mines = total;
    }
  }

  return b
}

function make_first_visit(b) {
  let r = random_field(b, function isValidFirstVisit(f) {
    return f.mines === 0 && !f.mine;
  });
  visit(null, b, r.x, r.y);
}

function visit(g, b, x, y) {
  let f = safe_get(b, x, y);
  let shouldSkip = !f || f.visited || f.flagged;
  if (shouldSkip) return;

  if (f.mine) {
    blow_up(g);
    return null;
  } else {
    f.visited = true;
    // when visiting fields with 0 mine neighbours, we recursively visit them
    if (f.mines === 0) {
      for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
        let d = directions[dirIndex];
        visit(g, b, x + d.x, y + d.y);
      }
      return 1;
    } else {
      return 2;
    }
  }
}

function flag(g, b, x, y) {
  let f = b[x][y];
  if (f.visited) return;
  f.flagged = !f.flagged;
  if (f.flagged) {
    g.flags += 1;
    if (f.mine) {
      g.mines_found += 1;
    }
    if (status(g) === 'won') {
      win(g);
    }
    sfx(3);
  } else {
    g.flags -= 1;
    if (f.mine) {
      g.mines_found -= 1;
    }
    sfx(4);
  }
}

function blow_up(g) {
  sfx(0);
  start_counter('shake', 20);
  start_counter('flash', flash_duration);
  g.blown_up = true;
}

function win(g) {
  start_counter('ditty', 6);
  start_counter('boardwipe', 32);
}


// ------------------------------
// input
// ------------------------------
let delay = 0;
let prev_input = 0;
function parse_input() {
  // movement (only move every 3rd frame)
  let current_input = btn();
  let dx = 0;
  let dy = 0;
  if (delay === 0) {
    if (btn(0)) dx -= 1;
    if (btn(1)) dx += 1;
    if (btn(2)) dy -= 1;
    if (btn(3)) dy += 1;
  }

  // actions
  let action = null;
  if (prev_input < 16) {
    if (btn(4)) action = "first"
    if (btn(5)) action = "second"
  }

  // handle repeating
  let isSomethingPressed = current_input !== 0;
  let wasSomethingPressed = prev_input !== 0;
  if (isSomethingPressed && delay === 0) {
    if (wasSomethingPressed) {
      delay = 2; // wait 2 frames
    } else {
      delay = 7; // wait 7 frames
    }
  }

  if (!isSomethingPressed) delay = 0;
  delay = clamp(delay - 1, 0, 8);
  prev_input = current_input;

  return {
    dx,
    dy,
    action
  };
}


//-----------------------------
// game main loop
//-----------------------------

function update_game() {
  let st = status(game);
  let inp = parse_input();

  if (st !== 'playing') { // only quitting possible
    if (inp.action) state = 'menu';
    return;
  }

  // nope, still playing
  let p = player;
  p.x = clamp(p.x + inp.dx, 0, board_w - 1);
  p.y = clamp(p.y + inp.dy, 0, board_h - 1);

  if (inp.action === 'first') {
    let snd = visit(game, board, p.x, p.y);
    if (snd) sfx(snd);
  }
  if (inp.action === 'second') {
    flag(game, board, p.x, p.y);
  }
  // count time
  if (t % 30 === 0) game.seconds += 1;
}

//-----------------------------
// drawing the menu
//-----------------------------

difficulties = [
  { n: 'easy', m: 24 },
  { n: 'normal', m: 48 },
  { n: 'hard', m: 64 },
  { n: 'unfair', m: 96 }
];
let diff = 1;

function draw_menu() {
  cls();

  // background
  for (let fIndex = 0; fIndex < floaters.length; fIndex++) {
    let f = floaters[fIndex];
    map(8, 0, f.x, f.y, 2, 2);
  }

  // draw logo
  map(0, 0, 36, 15, 8, 4);

  // difficulty chooser
  let d = difficulties[diff];
  printc('difficulty:', 64, 64, 13);
  printc(d.n, 64, 72, 15);

  let offset = (t % 16 < 8) ? 0 : 1;
  if (diff > 0) spr(16, 27 - offset, 72)
  if (diff < 3) spr(17, 96 + offset, 72)

  // intro info
  printc('z to explore, x to flag mines', 64, 105, 5);
  printc('pick your difficulty', 64, 111, 5);
  printc('then press z or x to start', 64, 117, 5);
}

floaters = []
for (let i = -1; i < 15; i++) {
  floaters.push({
    x: i * 8,
    y: rnd(140),
    v: rnd(0.5) + 0.5
  });
}

function update_floaters() {
  for (let fIndex = 0; fIndex < floaters.length; fIndex++) {
    let f = floaters[fIndex];
    if (f.y < -16) {
      f.y = 128 + rnd(32);
      f.v = rnd(0.5) + 0.5;
    }
    f.y -= f.v;
  }
}

function update_menu() {
  update_floaters();
  let inp = parse_input();
  if (inp.action) {
    let d = difficulties[diff];
    start_game(d.m);
  }
  if (inp.dx !== 0) {
    diff = clamp(diff + inp.dx, 0, 3);
    sfx(2);
  }
}

//-----------------------------
// drawing the game
//-----------------------------
function draw_board(g, b) {
  let state = status(g);
  let bw = 32;

  if (state === 'won') {
    bw = ctr('boardwipe') || 0;
  }

  for (let x = 0; x < board_w; x++) {
    for (let y = 0; y < board_h; y++) {
      let f = b[x][y];
      //  choose the right sprite
      let s
      if (state == 'lost' && f.mine) {
        s = s_mine;
      } else if (f.visited) {
        s = s_empty;
      } else if (f.flagged) {
        s = s_flag;
      } else {
        s = s_block;
      }

      // TODO: study wiping
      //  bw implements board wipe
      if (x + y < bw) {
        // draw tile
        spr(s, x * 8, y * 8);
        // print mine number text
        if (f.visited && f.mines > 0) {
          let clr = text_colors[f.mines - 1];
          print(f.mines, x * 8 + 2, y * 8 + 2, clr);
        }
        // draw flag
        if (s === s_flag) {
          let frame = 32 + flr((t + x * 3 + y * 2) % 12 / 3);
          spr(frame, x * 8 - 1, y * 8 - 1);
        }
      }
    }
  }
}

function draw_player(g, p) {
  let s = status(g);
  if (s != 'playing') return;

  let bx = p.x * 8;
  let by = p.y * 8;
  spr(21, bx - 2, by - 2);
  spr(22, bx + 2, by - 2);
  spr(37, bx - 2, by + 2);
  spr(38, bx + 2, by + 2);
}

function draw_hud(g) {
  let st = status(g);
  let text;
  let clr;

  if (st === 'playing') {
    clr = 5;
    text = 'mines: ' + g.flags + '/' + g.mines_needed;
  } else if (st === 'lost') {
    clr = 8;
    text = 'kablam!';
  } else if (st === 'won') {
    clr = 3;
    text = 'you win!';
  }

  rectfill(35, 121, 92, 127, clr);
  rectfill(34, 122, 93, 126, clr);
  printc(text, 64, 122, 15);
}

function draw_win() {
  let minutes = flr(game.seconds / 60);
  let secs = game.seconds - minutes * 60;
  let secstr = (secs < 10) ? '0' + secs : secs;
  let tstr = minutes + ':' + secstr;

  map(11, 0, 64 - 8, 32, 2, 2);
  printc('you won!', 64, 56, 15);
  printc('your time:', 64, 72, 13);
  printc(tstr, 64, 80, 12);
}

function draw_game() {
  cls();

  // explosion flash
  let fl = ctr('flash');
  if (fl) {
    fl = flr(min((flash_duration - fl) / 2), 3);
    let clr = flash_map[fl];
    for (let c = 0; c < 16; c++) {
      pal(c, clr[c], 1);
    }
  }

  // shaking camera
  let shake = ctr('shake');
  if (shake) {
    let dx = sin(shake * 0.2) * shake * 0.2;
    let dy = cos(shake * 0.3) * shake * 0.2;
    camera(dx, dy);
  }

  // endgame ditty
  if (ctr('ditty') === 0) {
    music(0);
  }

  // game interface
  if (status(game) === 'won') {
    draw_win(game);
    draw_board(game, board);
  } else {
    draw_board(game, board);
    draw_player(game, player);
    draw_hud(game);
  }
}

//-----------------------------
// main stuff
//-----------------------------

let _map = [];
let _map_str = `
0708090a0b0c0d0e404143434400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
1718191a1b1c1d1e505152535400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
2728292a2b2c2d2e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
3738393a3b3c3d3e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
`.replaceAll('\n', '');
for (let i = 0; i < _map_str.length; i += 2) {
  let mapWidth = 128;
  let x = i / 2 % mapWidth;
  let y = flr(i / 2 / mapWidth);
  if (!_map[x]) _map[x] = [];
  _map[x][y] = parseInt(_map_str.slice(i, i + 2), 16);
}

let t = 0;
let state = 'menu';
function _update() {
  t += 1;
  update_ctrs();

  if (state === 'game') {
    update_game();
  } else {
    update_menu();
  }
}

function _draw() {
  camera(0, 0);
  pal();
  palt(0, false);
  palt(14, true);
  if (state === 'game') {
    draw_game();
  } else {
    draw_menu();
  }
}