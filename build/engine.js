//     "#000000",
//     "#1d2b53",
//     "#7e2553",
//     "#008751",
//     "#ab5236",
//     "#5f574f",
//     "#c2c3c7",
//     "#fff1e8",
//     "#ff004d",
//     "#ffa300",
//     "#ffec27",
//     "#00e436",
//     "#29adff",
//     "#83769c",
//     "#ff77a8",
//     "#ffccaa"
function palCreate() {
    let result = [];
    for (let i = 0; i < 16; i++) {
        result.push(i);
    }
    return result;
}
const ColorsRGB = [
    [0, 0, 0],
    [29, 43, 83],
    [126, 37, 83],
    [0, 135, 81],
    [171, 82, 54],
    [95, 87, 79],
    [194, 195, 199],
    [255, 241, 232],
    [255, 0, 77],
    [255, 163, 0],
    [255, 236, 39],
    [0, 228, 54],
    [41, 173, 255],
    [131, 118, 156],
    [255, 119, 168],
    [255, 204, 170]
];
const _state = {
    camera: { x: 0, y: 0 },
    drawPaletteRemap: palCreate(),
    transparentColors: [true],
    displayPaletteRemap: palCreate(),
    buttons: {},
    counters: {}
};
const canvas = document.getElementById('canvas');
canvas.width = 128;
canvas.height = 128;
canvas.style.width = `${128 * 4}px`;
canvas.style.height = `${128 * 4}px`;
const canvasCtx = canvas.getContext('2d');
if (!canvasCtx)
    throw new Error("Failed to _canvas.getContext");
const bufferCanvas = document.createElement('canvas');
bufferCanvas.width = 128;
bufferCanvas.height = 128;
const ctx = bufferCanvas.getContext('2d');
if (!ctx)
    throw new Error("Failed to _bufferCanvas.getContext");
const bufferImageData = ctx.getImageData(0, 0, bufferCanvas.width, bufferCanvas.height);
const pixelbuffer = bufferImageData.data;
const pixelStride = 4;
const lineStride = 4 * bufferCanvas.width;
const spriteSizePx = 8;
const audioCtx = new AudioContext();
let assets;
async function start(name, sfxCount, musicCount, update, draw, targetFPS) {
    assets = await loadAssets(name, sfxCount, musicCount); // TODO: progress callbacks?
    const msPerFrame = 1000 / targetFPS;
    const updateIntervalId = window.setInterval(() => {
        update();
        countersUpdate();
        window.requestAnimationFrame(() => {
            draw();
            applyDisplayPaletteRemapping();
            ctx.putImageData(bufferImageData, 0, 0);
            canvasCtx.drawImage(bufferCanvas, 0, 0, canvas.width, canvas.height);
        });
    }, msPerFrame);
}
async function loadAssets(name, sfxCount, musicCount) {
    const datas = await Promise.all([
        loadImageData(`assets/${name}/font.png`),
        loadImageData(`assets/${name}/sprites.png`),
        loadAudios(name, audioCtx, sfxCount, musicCount),
        loadMap(name)
    ]);
    const assets = {
        fontPixels: datas[0].data,
        spritesPixels: datas[1].data,
        sfxs: datas[2].sfxBuffers,
        musics: datas[2].musicBuffers
    };
    return assets;
}
const max = Math.max;
const min = Math.min;
function mid(x, y, z) {
    if (x > y) { // y, x
        if (y > z) { // z, y, x
            return y;
        }
        else if (x > z) { // y, z, x
            return z;
        }
        else {
            return x; // y, x, z
        }
    }
    else { // x, y
        if (x > z) { // z, x, y
            return x;
        }
        else if (y > z) { // x, z, y
            return z;
        }
        else { // x, y, z
            return y;
        }
    }
}
function clamp(n, low, high) {
    let result = n;
    if (n < low) {
        result = low;
    }
    else if (n > high) {
        result = high;
    }
    return result;
}
const flr = Math.floor;
function round(x) {
    return flr(x + 0.5);
}
const ceil = Math.ceil;
const sqrt = Math.sqrt;
const abs = Math.abs;
const cos = (n) => Math.cos(n * 2 * Math.PI);
const sin = (n) => -Math.sin(n * 2 * Math.PI);
// (inclusive of 0, but not x)
function rnd(x = 1) {
    return Math.random() * x;
}
function rndf(l, h) {
    return l + rnd(h - l);
}
function rndi(l, h) {
    return flr(rndf(l, h + 1));
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
function v(x, y) {
    if (Array.isArray(x)) {
        if (x.length !== 2)
            throw new Error("invalid array size for V2");
        const result = [...x];
        result.x = x[0];
        result.y = x[1];
        return result;
    }
    else if (y !== undefined) {
        const result = [x, y];
        result.x = x;
        result.y = y;
        return result;
    }
    else {
        throw new Error("missing parameter y in V2");
    }
}
function vma(magnitude, angle) {
    return v(cos(angle) * magnitude, sin(angle) * magnitude);
}
function v_add(v1, v2) {
    return v([v1.x + v2.x, v1.y + v2.y]);
}
function v_sub(v1, v2) {
    return v(v1.x - v2.x, v1.y - v2.y);
}
function v_mul(v1, m) {
    return v(v1.x * m, v1.y * m);
}
function v_div(v1, d) {
    return v(v1.x / d, v1.y / d);
}
function v_neg(v1) {
    return v(-v1.x, -v1.y);
}
// dot product
function v_dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
}
// normalization
function v_norm(v1) {
    const len = sqrt(v1.x * v1.x + v1.y * v1.y);
    return v(v1.x / len, v1.y / len);
}
// rotation
function v_rotr(v1) {
    return v(-v1.y, v1.x);
}
function v_lensq(v1) {
    return v1.x * v1.x + v1.y * v1.y;
}
function v_len(v1) {
    return sqrt(v1.x * v1.x + v1.y * v1.y);
}
function v_str(v1) {
    return `v(${v1.x}, ${v1.y})`;
}
function v_lerp(a, b, t) {
    return v_add(a, v_mul(v_sub(b, a), t));
}
function sfx(n) {
    let sampleSource = audioCtx.createBufferSource();
    sampleSource.buffer = assets.sfxs[n];
    sampleSource.connect(audioCtx.destination);
    sampleSource.start();
}
function music(n) {
    let sampleSource = audioCtx.createBufferSource();
    sampleSource.buffer = assets.musics[n];
    sampleSource.connect(audioCtx.destination);
    sampleSource.start();
}
function cls(color = 0) {
    for (let i = 0; i < pixelbuffer.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            pixelbuffer[i + j] = ColorsRGB[color][j];
        }
        pixelbuffer[i + 3] = 255; // remove transparency
    }
}
function print(str, x, y, color) {
    const glyphOrder = "ññññññññññññññññ" +
        "ññññññññññññññññ" +
        ` !"#$%&'()*+,-./` +
        "0123456789=;<=>?" +
        "@ABCDEFGHIJKLMNO" +
        "PQRSTUVWXYZ[\\]^_" +
        "\`abcdefghijklmno" +
        "pqrstuvwxyz{|}~∎" +
        "ññññññññññññññññ" +
        "ññññññññññññññññ" +
        "ññññññññññññññññ" +
        "ññññññññññññññññ" +
        "ññññññññññññññññ" +
        "ññññññññññññññññ" +
        "ññññññññññññññññ" +
        "ññññññññññññññññ";
    const tileWidth = 7;
    const tileHeight = 5;
    const glyphSeparationX = 1;
    const glyphSeparationY = 3;
    x = flr(x);
    y = flr(y);
    for (let c = 0; c < str.length; c++) {
        let ch = str[c];
        // Find character index in _font.bitmap using _font.glyphOrder
        let pos = 32; // 32 === space
        for (let g = 0; g < glyphOrder.length; g++) {
            if (glyphOrder[g] === ch) {
                pos = g;
            }
        }
        let gx = (pos % 16) * (tileWidth + glyphSeparationX);
        let gy = flr(pos / 16) * (tileHeight + glyphSeparationY);
        copyRectMasked(gx, gy, x + (c * 4), y, tileWidth, tileHeight, assets.fontPixels, pixelbuffer, 7, color);
    }
}
function printc(str, cx, y, color) {
    const halfStrScreenLengthPx = str.length * 2;
    let x = cx - halfStrScreenLengthPx;
    print(str, x, y, color);
}
function spr(n, dx, dy, w = 1, h = 1) {
    dx = flr(dx);
    dy = flr(dy);
    let spritesPerRow = 16;
    let sx = (n % spritesPerRow) * spriteSizePx;
    let sy = flr(n / spritesPerRow) * spriteSizePx;
    let sizeX = w * spriteSizePx;
    let sizeY = h * spriteSizePx;
    copyRect(sx, sy, dx, dy, sizeX, sizeY, assets.spritesPixels, pixelbuffer);
}
function rect(x0, y0, x1, y1, color = 0 /* Black */) {
    x0 = flr(x0);
    y0 = flr(y0);
    x1 = flr(x1);
    y1 = flr(y1);
    for (let x = x0; x < x1 + 1; x++) {
        putPixel(x, y0, color, pixelbuffer);
        putPixel(x, y1, color, pixelbuffer);
    }
    for (let y = y0; y < y1 + 1; y++) {
        putPixel(x0, y, color, pixelbuffer);
        putPixel(x1, y, color, pixelbuffer);
    }
}
function rectfill(x0, y0, x1, y1, color = 0 /* Black */) {
    x0 = flr(x0);
    y0 = flr(y0);
    x1 = flr(x1);
    y1 = flr(y1);
    for (let y = y0; y < y1 + 1; y++) {
        for (let x = x0; x < x1 + 1; x++) {
            putPixel(x, y, color, pixelbuffer);
        }
    }
}
function camera(x, y) {
    _state.camera = { x: -flr(x), y: -flr(y) };
}
function pal(c0, c1, p = 0) {
    if (c0 === undefined) {
        _state.drawPaletteRemap = palCreate();
        _state.displayPaletteRemap = palCreate();
    }
    else {
        if (c1 === undefined) {
            throw new Error("missing parameter c1 in call to pal");
        }
        if (p === 1) {
            _state.drawPaletteRemap[c0] = c1;
        }
        else {
            _state.displayPaletteRemap[c0] = c1;
        }
    }
}
function palt(c, t) {
    _state.transparentColors[c] = t;
}
let _map = [[]];
function map(cell_x, cell_y, sx, sy, cell_w, cell_h) {
    for (let cy = 0; cy < cell_h; cy++) {
        let y = sy + cy * spriteSizePx;
        for (let cx = 0; cx < cell_w; cx++) {
            let s = _map[cell_x + cx][cell_y + cy];
            let x = sx + cx * spriteSizePx;
            spr(s, x, y);
        }
    }
}
function btn(n) {
    let map = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX'];
    if (n === undefined) {
        let result = 0;
        for (let i = 0; i < 6; i++) {
            if (_state.buttons[map[i]]) {
                result = (result | (1 << i));
            }
        }
        return result;
    }
    else {
        return !!_state.buttons[map[n]];
    }
}
function dget(i) {
    return window.localStorage.getItem(String(i));
}
function dset(i, value) {
    window.localStorage.setItem(String(i), value);
}
window.addEventListener('click', function clickListener(e) {
    audioCtx.resume();
});
window.addEventListener('keydown', function keydownListener(e) {
    _state.buttons[e.code] = true;
});
window.addEventListener('keyup', function keydownListener(e) {
    _state.buttons[e.code] = false;
});
function putPixel(x, y, color, dData) {
    x = x + _state.camera.x;
    y = y + _state.camera.y;
    if (x < 0 || x >= bufferCanvas.width)
        return;
    if (y < 0 || y >= bufferCanvas.height)
        return;
    let i = x * pixelStride + y * lineStride;
    let colorRGB = ColorsRGB[color];
    for (let j = 0; j < 3; j++) {
        dData[i + j] = colorRGB[j];
    }
}
function copyRect(sx, sy, dx, dy, sizeX, sizeY, sData, dData) {
    for (let y = 0; y < sizeY; y++) {
        let sLineStride = (sy + y) * lineStride;
        for (let x = 0; x < sizeX; x++) {
            let s = (sx + x) * pixelStride + sLineStride;
            let sColorRGB = [];
            for (let j = 0; j < 3; j++) {
                sColorRGB.push(sData[s + j]);
            }
            let colorAfterMapping = _state.drawPaletteRemap[colorFromRGB(sColorRGB)];
            if (_state.transparentColors[colorAfterMapping])
                continue;
            putPixel(dx + x, dy + y, colorAfterMapping, dData);
        }
    }
}
function copyRectMasked(sx, sy, dx, dy, sizeX, sizeY, sData, dData, maskColor, outColor) {
    for (let y = 0; y < sizeY; y++) {
        let sLineStride = (sy + y) * lineStride;
        for (let x = 0; x < sizeX; x++) {
            let s = (sx + x) * pixelStride + sLineStride;
            let sColorRGB = [];
            for (let j = 0; j < 3; j++) {
                sColorRGB.push(sData[s + j]);
            }
            if (colorFromRGB(sColorRGB) === maskColor) {
                putPixel(dx + x, dy + y, outColor, dData);
            }
        }
    }
}
function colorFromRGB(rgb) {
    for (let c = 0; c < ColorsRGB.length; c++) {
        let colorRGB = ColorsRGB[c];
        let same = true;
        for (let j = 0; j < 3; j++) {
            same &&= colorRGB[j] === rgb[j];
        }
        if (same) {
            return c;
        }
    }
    throw new Error("Color not found " + rgb);
}
function applyDisplayPaletteRemapping() {
    for (let i = 0; i < pixelbuffer.length; i += 4) {
        let colorRGB = [];
        for (let j = 0; j < 3; j++) {
            colorRGB.push(pixelbuffer[i + j]);
        }
        let colorAfterRemap = _state.displayPaletteRemap[colorFromRGB(colorRGB)];
        let colorAfterRGB = ColorsRGB[colorAfterRemap];
        for (let j = 0; j < 3; j++) {
            pixelbuffer[i + j] = colorAfterRGB[j];
        }
    }
}
async function loadImage(path) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        function errorHandler() {
            reject(new Error("Failed to load image: " + path));
        }
        img.addEventListener('error', errorHandler, { once: true });
        img.addEventListener('load', () => {
            resolve(img);
            img.removeEventListener('error', errorHandler);
        }, { once: true });
        img.src = path;
    });
}
async function loadImageData(path) {
    const img = await loadImage(path);
    const buffer = document.createElement('canvas');
    buffer.width = img.naturalWidth;
    buffer.height = img.naturalHeight;
    let bufferCtx = buffer.getContext('2d');
    if (!bufferCtx)
        throw new Error("Failed to buffer.getContext while loading image " + path);
    bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
    bufferCtx.drawImage(img, 0, 0, buffer.width, buffer.height);
    let imageData = bufferCtx.getImageData(0, 0, buffer.width, buffer.height);
    return imageData;
}
async function loadMap(name) {
    let response = await fetch(`assets/${name}/map.txt`);
    let mapStr = await response.text();
    mapStr = mapStr.replace(/(\r\n|\n|\r)/gm, "");
    for (let i = 0; i < mapStr.length; i += 2) {
        let mapWidth = 128;
        let x = i / 2 % mapWidth;
        let y = flr(i / 2 / mapWidth);
        if (!_map[x])
            _map[x] = [];
        _map[x][y] = parseInt(mapStr.slice(i, i + 2), 16);
    }
}
async function loadAudioFile(audioContext, filepath) {
    let response = await fetch(filepath);
    let arrayBuffer = await response.arrayBuffer();
    let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}
async function loadAudios(name, audioContext, sfxCount, musicCount) {
    let promises = [];
    for (let i = 0; i < sfxCount; i++) {
        let filename = `assets/${name}/sfx${i}.wav`;
        let promise = loadAudioFile(audioContext, filename);
        promises.push(promise);
    }
    for (let i = 0; i < musicCount; i++) {
        let filename = `assets/${name}/music${i}.wav`;
        let promise = loadAudioFile(audioContext, filename);
        promises.push(promise);
    }
    let buffers = await Promise.all(promises);
    let sfxBuffers = buffers.slice(0, sfxCount);
    let musicBuffers = buffers.slice(-musicCount);
    return { sfxBuffers, musicBuffers };
}
function counterSet(name, v) {
    _state.counters[name] = v;
}
function counterGet(name) {
    return _state.counters[name];
}
function countersUpdate() {
    let keys = Object.keys(_state.counters);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (_state.counters[key] > 0) {
            _state.counters[key] -= 1;
        }
        else {
            delete _state.counters[key];
        }
    }
}
export { 
// entry point
start, 
// input
btn, 
// math
flr, ceil, round, rnd, rndi, rndf, clamp, lerp, min, max, sin, cos, sqrt, abs, 
// vector
v, vma, v_add, v_sub, v_mul, v_div, v_neg, v_dot, v_norm, v_rotr, v_lensq, v_len, v_str, v_lerp, 
// graphics
camera, cls, spr, map, print, printc, rect, rectfill, pal, palt, 
// audio
sfx, music, 
// cartdata
dset, dget, 
// misc
counterGet, counterSet, };
//# sourceMappingURL=engine.js.map