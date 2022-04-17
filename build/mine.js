import { 
// entry point
start, 
// input
btn, 
// math
flr, rnd, clamp, min, sin, cos, 
// graphics
camera, cls, spr, map, print, printc, rectfill, pal, palt, 
// audio
sfx, music, 
// misc
counterGet, counterSet, } from "./engine.js";
// the size of the board we'll be playing on in tiles
const board_w = 16;
const board_h = 15;
// sprites
const s_block = 1;
const s_empty = 2;
const s_mine = 3;
const s_flag = 6;
// text colors (for # of mines)
const text_colors = [3, 4, 2, 0, 0, 0, 0, 0];
// a table of all offsets to a field's neighbours
const directions = [
    { x: -1, y: -1 },
    { x: -1, y: 0 },
    { x: -1, y: 1 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
];
// color map for explosion
const flash_duration = 8;
const flash_map = [
    [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
    [6, 6, 6, 6, 7, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
    [5, 13, 8, 11, 9, 6, 7, 7, 14, 10, 7, 11, 12, 12, 15, 7],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
];
let scene = "menu";
let board;
let game;
let playerPos;
let t = 0;
// -----------------------------
// various helpers
// -----------------------------
// gets a random field that fulfils a predicate
function randomField(pred) {
    let x, y;
    do {
        x = flr(rnd(board_w));
        y = flr(rnd(board_h));
    } while (!pred(board[x][y]));
    return { x, y };
}
function safeGet(x, y) {
    if (board[x] && board[x][y]) {
        return board[x][y];
    }
    else {
        return null;
    }
}
function neighbourFields(x, y) {
    const result = [];
    for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
        const d = directions[dirIndex];
        const n = safeGet(x + d.x, y + d.y);
        if (n) {
            result.push(n);
        }
    }
    return result;
}
// -----------------------------
// game logic
// -----------------------------
function startGame(mineCount) {
    game = {
        state: "playing",
        flags: 0,
        minesFound: 0,
        minesNeeded: mineCount,
        seconds: 0,
    };
    initBoard(mineCount);
    playerPos = {
        x: flr(board_w / 2),
        y: flr(board_h / 2),
    };
    makeFirstVisit(board);
}
function initBoard(mineCount) {
    // initialize empty board
    board = [];
    for (let x = 0; x < board_w; x++) {
        board[x] = [];
        for (let y = 0; y < board_h; y++) {
            board[x][y] = {
                mine: false,
                visited: false,
                flagged: false,
                mineCount: 0,
            };
        }
    }
    // sprinkle mines
    for (let m = 0; m < mineCount; m++) {
        const r = randomField(function notMined(field) {
            return !field.mine;
        });
        board[r.x][r.y].mine = true;
    }
    // calculate how many of each field's neighbours are mines
    for (let x = 0; x < board_w; x++) {
        for (let y = 0; y < board_h; y++) {
            const neighbours = neighbourFields(x, y);
            // count mines among them
            let total = 0;
            for (let nIndex = 0; nIndex < neighbours.length; nIndex++) {
                if (neighbours[nIndex].mine) {
                    total += 1;
                }
            }
            // store for later
            board[x][y].mineCount = total;
        }
    }
}
function makeFirstVisit(board) {
    const r = randomField(function isValidFirstVisit(f) {
        return f.mineCount === 0 && !f.mine;
    });
    visit(board, r.x, r.y);
}
function visit(b, x, y) {
    const f = safeGet(x, y);
    if (!f || f.visited || f.flagged)
        return null;
    if (f.mine) {
        sfx(0);
        counterSet("shake", 20);
        counterSet("flash", flash_duration);
        game.state = "lost";
        return null;
    }
    else {
        f.visited = true;
        // when visiting fields with 0 mine neighbours, we recursively visit them
        if (f.mineCount === 0) {
            for (let dirIndex = 0; dirIndex < directions.length; dirIndex++) {
                const d = directions[dirIndex];
                visit(b, x + d.x, y + d.y);
            }
            return 1;
        }
        else {
            return 2;
        }
    }
}
function flag(x, y) {
    const f = board[x][y];
    if (f.visited)
        return;
    f.flagged = !f.flagged;
    if (f.flagged) {
        game.flags += 1;
        if (f.mine) {
            game.minesFound += 1;
        }
        sfx(3);
    }
    else {
        game.flags -= 1;
        if (f.mine) {
            game.minesFound -= 1;
        }
        sfx(4);
    }
}
// ------------------------------
// input
// ------------------------------
let delay = 0;
let prev_input = 0;
function parse_input() {
    // movement (only move every 3rd frame)
    const current_input = btn();
    let dx = 0;
    let dy = 0;
    if (delay === 0) {
        if (btn(0))
            dx -= 1;
        if (btn(1))
            dx += 1;
        if (btn(2))
            dy -= 1;
        if (btn(3))
            dy += 1;
    }
    // actions
    let action = null;
    if (prev_input < 16) {
        if (btn(4))
            action = "first";
        if (btn(5))
            action = "second";
    }
    // handle repeating
    const isSomethingPressed = current_input !== 0;
    const wasSomethingPressed = prev_input !== 0;
    if (isSomethingPressed && delay === 0) {
        if (wasSomethingPressed) {
            delay = 2; // wait 2 frames
        }
        else {
            delay = 7; // wait 7 frames
        }
    }
    if (!isSomethingPressed)
        delay = 0;
    delay = clamp(delay - 1, 0, 8);
    prev_input = current_input;
    return {
        dx,
        dy,
        action,
    };
}
//-----------------------------
// game main loop
//-----------------------------
function updateGame() {
    if (game.minesFound == game.minesNeeded && game.flags == game.minesNeeded) {
        if (game.state !== "won") {
            counterSet("ditty", 6);
            counterSet("boardwipe", 32);
        }
        game.state = "won";
    }
    const inp = parse_input();
    if (game.state !== "playing") {
        // only quitting possible
        if (inp.action)
            scene = "menu";
        return;
    }
    // nope, still playing
    playerPos.x = clamp(playerPos.x + inp.dx, 0, board_w - 1);
    playerPos.y = clamp(playerPos.y + inp.dy, 0, board_h - 1);
    if (inp.action === "first") {
        const snd = visit(board, playerPos.x, playerPos.y);
        if (snd)
            sfx(snd);
    }
    if (inp.action === "second") {
        flag(playerPos.x, playerPos.y);
    }
    // count time
    if (t % 30 === 0)
        game.seconds += 1;
}
//-----------------------------
// drawing the menu
//-----------------------------
const difficulties = [
    { n: "easy", m: 24 },
    { n: "normal", m: 48 },
    { n: "hard", m: 64 },
    { n: "unfair", m: 96 },
];
let diff = 1;
function drawMenu() {
    cls();
    // background
    for (let fIndex = 0; fIndex < floaters.length; fIndex++) {
        const f = floaters[fIndex];
        map(8, 0, f.x, f.y, 2, 2);
    }
    // draw logo
    map(0, 0, 36, 15, 8, 4);
    // difficulty chooser
    const d = difficulties[diff];
    printc("difficulty:", 64, 64, 13);
    printc(d.n, 64, 72, 15);
    const offset = t % 16 < 8 ? 0 : 1;
    if (diff > 0)
        spr(16, 27 - offset, 72);
    if (diff < 3)
        spr(17, 96 + offset, 72);
    // intro info
    printc("z to explore, x to flag mines", 64, 105, 5);
    printc("pick your difficulty", 64, 111, 5);
    printc("then press z or x to start", 64, 117, 5);
}
const floaters = [];
for (let i = -1; i < 15; i++) {
    floaters.push({
        x: i * 8,
        y: rnd(140),
        v: rnd(0.5) + 0.5,
    });
}
function updateFloaters() {
    for (let fIndex = 0; fIndex < floaters.length; fIndex++) {
        const f = floaters[fIndex];
        if (f.y < -16) {
            f.y = 128 + rnd(32);
            f.v = rnd(0.5) + 0.5;
        }
        f.y -= f.v;
    }
}
function updateMenu() {
    updateFloaters();
    const inp = parse_input();
    if (inp.action) {
        scene = "game";
        const d = difficulties[diff];
        startGame(d.m);
    }
    if (inp.dx !== 0) {
        diff = clamp(diff + inp.dx, 0, 3);
        sfx(2);
    }
}
//-----------------------------
// drawing the game
//-----------------------------
function drawBoard() {
    let bw = 32;
    if (game.state === "won") {
        bw = counterGet("boardwipe") || 0;
    }
    for (let x = 0; x < board_w; x++) {
        for (let y = 0; y < board_h; y++) {
            const f = board[x][y];
            //  choose the right sprite
            let s;
            if (game.state == "lost" && f.mine) {
                s = s_mine;
            }
            else if (f.visited) {
                s = s_empty;
            }
            else if (f.flagged) {
                s = s_flag;
            }
            else {
                s = s_block;
            }
            //  bw implements board wipe
            if (x + y < bw) {
                // draw tile
                spr(s, x * 8, y * 8);
                // print mine number text
                if (f.visited && f.mineCount > 0) {
                    const clr = text_colors[f.mineCount - 1];
                    print(String(f.mineCount), x * 8 + 2, y * 8 + 2, clr);
                }
                // draw flag
                if (s === s_flag) {
                    const frame = 32 + flr(((t + x * 3 + y * 2) % 12) / 3);
                    spr(frame, x * 8 - 1, y * 8 - 1);
                }
            }
        }
    }
}
function drawPlayer() {
    if (game.state != "playing")
        return;
    const bx = playerPos.x * 8;
    const by = playerPos.y * 8;
    spr(21, bx - 2, by - 2);
    spr(22, bx + 2, by - 2);
    spr(37, bx - 2, by + 2);
    spr(38, bx + 2, by + 2);
}
function drawHud() {
    let text;
    let color;
    switch (game.state) {
        case "playing":
            color = 5 /* DarkGray */;
            text = "mines: " + game.flags + "/" + game.minesNeeded;
            break;
        case "lost":
            color = 8 /* Red */;
            text = "kablam!";
            break;
        case "won":
            color = 3 /* DarkGreen */;
            text = "you win!";
            break;
    }
    rectfill(35, 121, 92, 127, color);
    rectfill(34, 122, 93, 126, color);
    printc(text, 64, 122, 15);
}
function drawWin() {
    const minutes = flr(game.seconds / 60);
    const secs = game.seconds - minutes * 60;
    const secstr = secs < 10 ? "0" + secs : secs;
    const tstr = minutes + ":" + secstr;
    map(11, 0, 64 - 8, 32, 2, 2);
    printc("you won!", 64, 56, 15);
    printc("your time:", 64, 72, 13);
    printc(tstr, 64, 80, 12);
}
function drawGame() {
    cls();
    // explosion flash
    let fl = counterGet("flash");
    if (fl) {
        fl = flr(min((flash_duration - fl) / 2, 3));
        const clr = flash_map[fl];
        for (let c = 0; c < 16; c++) {
            pal(c, clr[c], 1);
        }
    }
    // shaking camera
    const shake = counterGet("shake");
    if (shake) {
        const dx = sin(shake * 0.2) * shake * 0.2;
        const dy = cos(shake * 0.3) * shake * 0.2;
        camera(dx, dy);
    }
    // endgame ditty
    if (counterGet("ditty") === 0) {
        music(0);
    }
    // game interface
    if (game.state === "won") {
        drawWin();
        drawBoard();
    }
    else {
        drawBoard();
        drawPlayer();
        drawHud();
    }
}
//-----------------------------
// main stuff
//-----------------------------
start("mine", 5, 1, update, draw, 30);
function update() {
    t += 1;
    if (scene === "menu") {
        updateMenu();
    }
    else {
        updateGame();
    }
}
function draw() {
    camera(0, 0);
    pal();
    palt(0, false);
    palt(14, true);
    if (scene === "menu") {
        drawMenu();
    }
    else {
        drawGame();
    }
}
//# sourceMappingURL=mine.js.map