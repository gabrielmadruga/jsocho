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
if (!ctx)
    throw new Error("Failed to create AudioContext");
let assets;
async function start(update, draw) {
    assets = await loadAssets(); // TODO: progress callbacks?
    const targetFPS = 30;
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
async function loadAssets() {
    const datas = await Promise.all([
        loadImageData('assets/font.png'),
        loadImageData('assets/sprites.png'),
        loadAudios(audioCtx, 5, 1),
        loadMap()
    ]);
    const assets = {
        fontPixels: datas[0].data,
        spritesPixels: datas[1].data,
        sfxs: datas[2].sfxBuffers,
        musics: datas[2].musicBuffers
    };
    return assets;
}
let max = Math.max;
let min = Math.min;
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
let flr = Math.floor;
let ceil = Math.ceil;
let sqrt = Math.sqrt;
let abs = Math.abs;
let cos = (n) => Math.cos(n * 2 * Math.PI);
let sin = (n) => -Math.sin(n * 2 * Math.PI);
function rnd(x) {
    return Math.random() * x;
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
function text(str, x, y, color) {
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
function textc(str, cx, y, color) {
    const halfStrScreenLengthPx = str.length * 2;
    let x = cx - halfStrScreenLengthPx;
    text(str, x, y, color);
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
function palReset() {
    _state.drawPaletteRemap = palCreate();
    _state.displayPaletteRemap = palCreate();
}
function pal(c0, c1, p) {
    if (p === 1) {
        _state.drawPaletteRemap[c0] = c1;
    }
    else {
        _state.displayPaletteRemap[c0] = c1;
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
async function loadMap() {
    let response = await fetch("assets/map.txt");
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
async function loadAudios(audioContext, sfxCount, musicCount) {
    let promises = [];
    for (let i = 0; i < sfxCount; i++) {
        let filename = `assets/sfx${i}.wav`;
        let promise = loadAudioFile(audioContext, filename);
        promises.push(promise);
    }
    for (let i = 0; i < musicCount; i++) {
        let filename = `assets/music${i}.wav`;
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
flr, rnd, clamp, min, max, sin, cos, 
// graphics
camera, cls, spr, map, text, textc, rectfill, pal, palt, palReset, 
// audio
sfx, music, 
// misc
counterGet, counterSet, };
//# sourceMappingURL=engine.js.map