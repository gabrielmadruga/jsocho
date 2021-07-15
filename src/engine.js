//---------------
// Engine
//---------------
let _state = {};
_state.camera = { x: 0, y: 0 };
_state.drawPaletteReMapping = [];
_state.displayPaletteReMapping = [];
_initStateColors();

let _canvas = document.getElementById('canvas');
_canvas.width = 128;
_canvas.height = 128;
_canvas.style.width = `${128 * 4}px`;
_canvas.style.height = `${128 * 4}px`;
let _canvasCtx = _canvas.getContext('2d');

let _bufferCanvas = document.createElement('canvas');
_bufferCanvas.width = 128;
_bufferCanvas.height = 128;
let _ctx = _bufferCanvas.getContext('2d');
let _bufferImageData = _ctx.getImageData(0, 0, _bufferCanvas.width, _bufferCanvas.height);
let _pixelbuffer = _bufferImageData.data;
let _pixelStride = 4;
let _lineStride = 4 * _bufferCanvas.width;

// let AudioContext = window.AudioContext || window.webkitAudioContext;
let _audioCtx = new AudioContext();
let _sfxs;
let _musics;
_loadAudios(_audioCtx, 5, 1).then(({ sfxBuffers, musicBuffers }) => {
    _sfxs = sfxBuffers;
    _musics = musicBuffers;
});


// 0  black   1  dark_blue   2  dark_purple   3  dark_green
// 4  brown   5  dark_gray   6  light_gray    7  white
// 8  red     9  orange     10  yellow       11  green
// 12  blue   13  indigo     14  pink         15  peach
let _colorPalette = [
    "#000000",
    "#1d2b53",
    "#7e2553",
    "#008751",
    "#ab5236",
    "#5f574f",
    "#c2c3c7",
    "#fff1e8",
    "#ff004d",
    "#ffa300",
    "#ffec27",
    "#00e436",
    "#29adff",
    "#83769c",
    "#ff77a8",
    "#ffccaa"
];
let _colorPaletteRGB = [
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


let _font = {};
_font.glyphOrder = `
ññññññññññññññññ
ññññññññññññññññ
 !"#$%&'()*+,-./
0123456789:;<=>?
@ABCDEFGHIJKLMNO
PQRSTUVWXYZ[\\]^_
\`abcdefghijklmno
pqrstuvwxyz{|}~∎
ññññññññññññññññ
ññññññññññññññññ
ññññññññññññññññ
ññññññññññññññññ
ññññññññññññññññ
ññññññññññññññññ
ññññññññññññññññ
ññññññññññññññññ
`.replaceAll('\n', '');
_font.tileWidth = 7;
_font.tileHeight = 5;
_font.glyphSeparationX = 1;
_font.glyphSeparationY = 3;
_loadImageData('assets/font.png').then(function onFontImageDataLoaded(data) {
    _font.pixels = data.data;
}, function onFontImageDataLoadError(error) {
    console.error(error);
});


let _spriteSizePx = 8;
_sprites = {};
_loadImageData('assets/sprites.png').then(function onSpritesImageDataLoaded(data) {
    _sprites.pixels = data.data;
}, function onSpritesImageDataLoadError(error) {
    console.error(error);
});


let _targetFPS = 30;
let _msPerFrame = 1000 / _targetFPS;
let _updateIntervalId = window.setInterval(() => {
    _update();
    window.requestAnimationFrame(() => {
        _draw();
        _applyDisplayPaletteRemapping();
        _ctx.putImageData(_bufferImageData, 0, 0);
        _canvasCtx.drawImage(_bufferCanvas, 0, 0, _canvas.width, _canvas.height);
    });
}, _msPerFrame);


// Math
let max = Math.max;
let min = Math.min;
function mid(x, y, z) {
    if (x > y) { // y, x
        if (y > z) { // z, y, x
            return y;
        } else if (x > z) { // y, z, x
            return z;
        } else {
            return x; // y, x, z
        }
    } else { // x, y
        if (x > z) { // z, x, y
            return x;
        } else if (y > z) { // x, z, y
            return z;
        } else { // x, y, z
            return y;
        }
    }
}
function clamp(n, low, high) {
    let result = n;
    if (n < low) {
        result = low;
    } else if (n > high) {
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


// Returns the cosine of x, where 1.0 indicates a full turn
// sin is inverted to suit screenspace
// e.g.sin(0.25) returns - 1

// If you'd prefer radian-based trig functions without the y inversion,
// paste the following snippet near the start of your program:

// cos1 = cos function cos(angle) return cos1(angle / (3.1415 * 2)) end
// sin1 = sin function sin(angle) return -sin1(angle / (3.1415 * 2)) end


// atan2 dx dy

// Converts dx, dy into an angle from 0..1
// As with cos / sin, angle is taken to run anticlockwise in screenspace
// e.g.atan(1, -1) returns 0.125


// srand x
// Sets the random number seed
// The seed is automatically randomized on cart startup

// Returns a random number n, where 0 <= n < x
// If you want an integer, use flr(rnd(x))
function rnd(x) {
    return Math.random() * x;
}


// Audio

// sfx n [channel [offset [length]]]

//   play sfx n on channel (0..3) from note offset (0..31) for length notes
//   n -1 to stop sound on that channel
//   n -2 to release sound on that channel from looping
//   Any music playing on the channel will be halted
//   offset in number of notes (0..31)

//   channel -1 (default) to automatically choose a channel that is not being used
//   channel -2 to stop the sound from playing on any channel
function sfx(n) {
    let sampleSource = _audioCtx.createBufferSource();
    sampleSource.buffer = _sfxs[n];
    sampleSource.connect(_audioCtx.destination);
    sampleSource.start();
}

// music [n [fade_len [channel_mask]]]

//   play music starting from pattern n (0..63)
//   n -1 to stop music
//   fade_len in ms (default: 0)
//   channel_mask specifies which channels to reserve for music only
//     e.g. to play on channels 0..2: 1+2+4 = 7

//   Reserved channels can still be used to play sound effects on, but only when that
//   channel index is explicitly requested by sfx().
function music(n) {
    let sampleSource = _audioCtx.createBufferSource();
    sampleSource.buffer = _musics[n];
    sampleSource.connect(_audioCtx.destination);
    sampleSource.start();
}


// Graphics
function cls(color = 0) {
    for (let i = 0; i < _pixelbuffer.length; i += 4) {
        for (let j = 0; j < 3; j++) {
            _pixelbuffer[i + j] = _colorPaletteRGB[color][j];
        }
        _pixelbuffer[i + 3] = 255; // remove transparency
    }
}

function print(str, x, y, color) {
    str = String(str);
    x = flr(x);
    y = flr(y);
    for (let c = 0; c < str.length; c++) {
        let ch = str[c];
        // Find character index in _font.bitmap using _font.glyphOrder
        let pos = 32; // 32 === space
        for (let g = 0; g < _font.glyphOrder.length; g++) {
            if (_font.glyphOrder[g] === ch) {
                pos = g;
            }
        }
        let gx = (pos % 16) * (_font.tileWidth + _font.glyphSeparationX);
        let gy = flr(pos / 16) * (_font.tileHeight + _font.glyphSeparationY)
        _copyRectMasked(gx, gy, x + (c * 4), y,
            _font.tileWidth, _font.tileHeight,
            _font.pixels, _pixelbuffer, 7, color);
    }
}

function printc(str, cx, y, color) {
    let x = cx - (str.length) * 2; // * 2 porque cada char deberia ser de 4px y hay que dividir entre 2
    print(str, x, y, color);
}

// spr n x y [w h] [flip_x] [flip_y]
// draw sprite n (0..255) at position x,y
// width and height are 1,1 by default and specify how many sprites wide to blit.
// Colour 0 drawn as transparent by default (see palt())
// flip_x=true to flip horizontally
// flip_y=true to flip vertically
function spr(n, dx, dy, w = 1, h = 1) {
    dx = flr(dx);
    dy = flr(dy);
    let spritesPerRow = 16;
    let sx = (n % spritesPerRow) * _spriteSizePx;
    let sy = flr(n / spritesPerRow) * _spriteSizePx;
    let sizeX = w * _spriteSizePx;
    let sizeY = h * _spriteSizePx;
    _copyRect(sx, sy, dx, dy, sizeX, sizeY, _sprites.pixels, _pixelbuffer)
}

function rectfill(x0, y0, x1, y1, color = 0) {
    x0 = flr(x0);
    y0 = flr(y0);
    x1 = flr(x1);
    y1 = flr(y1);
    for (let y = y0; y < y1 + 1; y++) {
        for (let x = x0; x < x1 + 1; x++) {
            _putPixel(x, y, color, _pixelbuffer);
        }
    }
}

// camera [x y]
// Set a screen offset of -x, -y for all drawing operations
// camera() to reset
function camera(x, y) {
    if (x === undefined) {
        x = 0;
        y = 0;
    } else {
        x = -flr(x);
        y = -flr(y);

    }
    _state.camera = { x, y };
}

function pal(c0, c1, p) {
    if (c0 === undefined) {
        _initStateColors();
    } else if (p === 1) {
        _state.displayPaletteReMapping[c0] = c1;
    } else {
        _state.drawPaletteReMapping[c0] = c1;
    }
}

function palt(c, t) {
    _state.transparentColors[c] = t;
}

// map cell_x cell_y sx sy cell_w cell_h [layers]
// 		Draw section of map (starting from cell_x, cell_y) at screen position sx, sy (pixels)
// 		MAP(0, 0, 20, 20, 4, 2) -- draws a 4x2 blocks of cells starting from 0,0 in the map, to the screen at 20,20
// 		If cell_w and cell_h are not specified, defaults to 128,32 (the top half of the map)
// 		To draw the whole map (including the bottom half shared with the spritesheet), use:
// 		MAP(0, 0, 0, 0, 128,64)
// 		Layers is an 8-bit bitfield. When it is specified, only sprites with matching flags are drawn.
// 		For example, when layers is 0x5, only sprites with flag 0 and 2 are drawn.
// 		Sprite 0 is taken to mean "empty" and not drawn. To disable this behaviour, use: POKE(0x5F36, 0x8)
function map(cell_x, cell_y, sx, sy, cell_w, cell_h) {
    for (let cy = 0; cy < cell_h; cy++) {
        let y = sy + cy * _spriteSizePx;
        for (let cx = 0; cx < cell_w; cx++) {
            let s = _map[cell_x + cx][cell_y + cy];
            let x = sx + cx * _spriteSizePx;
            spr(s, x, y);
        }
    }
}



// Input
// btn [i] [p]

// get button i state for player p (default 0)
// i: 0..5: left right up down button_o button_x
// p: player index 0..7

// Instead of using a number for i, it is also possible to use a button glyph.
// (In the coded editor, use Shift-L R U D O X)

// If no parameters supplied, returns a bitfield of all 12 button states for player 0 & 1
//   // P0: bits 0..5  P1: bits 8..13

// Default keyboard mappings to player buttons:

//   player 0: [DPAD]: cursors, [O]: Z C N   [X]: X V M
//   player 1: [DPAD]: SFED,    [O]: LSHIFT  [X]: TAB W  Q A
function btn(n, p) {
    let map = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyZ', 'KeyX'];
    let result = 0;
    if (n === undefined) {
        for (let i = 0; i < 6; i++) {
            let bit = _btn[map[i]] && (1 << i);
            result = result | bit;
        }
    } else {
        result = Boolean(_btn[map[n]]);
    }
    return result;
}

let _btn = {};
window.addEventListener('keydown', function keydownListener(e) {
    _btn[e.code] = true;
});
window.addEventListener('keyup', function keydownListener(e) {
    _btn[e.code] = false;
});

function _initStateColors() {
    for (let i = 0; i < 16; i++) {
        _state.drawPaletteReMapping[i] = i;
        _state.displayPaletteReMapping[i] = i;
    }
    _state.transparentColors = [true];
}


function _loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => {
            resolve(img);
            img.removeEventListener('error', reject);
        }, { once: true });
        img.addEventListener('error', reject, { once: true });
        img.src = url;
    });
}

async function _loadImageData(url) {
    let img = await _loadImage(url);
    let buffer = document.createElement('canvas');
    buffer.width = img.naturalWidth;
    buffer.height = img.naturalHeight;
    let bufferCtx = buffer.getContext('2d');
    bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
    bufferCtx.drawImage(img, 0, 0, buffer.width, buffer.height);
    let imageData = bufferCtx.getImageData(0, 0, buffer.width, buffer.height);
    return imageData;
}

function _putPixel(x, y, color, dData) {
    x = x + _state.camera.x;
    y = y + _state.camera.y;
    if (x < 0 || x >= _bufferCanvas.width) return;
    if (y < 0 || y >= _bufferCanvas.height) return;
    let i = x * _pixelStride + y * _lineStride;
    let colorRGB = _colorPaletteRGB[color];
    for (let j = 0; j < 3; j++) {
        dData[i + j] = colorRGB[j];
    }
}

function _copyRect(sx, sy, dx, dy, sizeX, sizeY, sData, dData) {
    for (let y = 0; y < sizeY; y++) {
        let sLineStride = (sy + y) * _lineStride;
        for (let x = 0; x < sizeX; x++) {
            let s = (sx + x) * _pixelStride + sLineStride;
            let sColorRGB = [];
            for (let j = 0; j < 3; j++) {
                sColorRGB.push(sData[s + j]);
            }
            let colorAfterMapping = _state.drawPaletteReMapping[_colorFromRGB(sColorRGB)];
            if (_state.transparentColors[colorAfterMapping]) continue;
            _putPixel(dx + x, dy + y, colorAfterMapping, dData);
        }
    }
}

function _copyRectMasked(sx, sy, dx, dy, sizeX, sizeY, sData, dData, maskColor, outColor) {
    for (let y = 0; y < sizeY; y++) {
        let sLineStride = (sy + y) * _lineStride;
        for (let x = 0; x < sizeX; x++) {
            let s = (sx + x) * _pixelStride + sLineStride;
            let sColorRGB = [];
            for (let j = 0; j < 3; j++) {
                sColorRGB.push(sData[s + j]);
            }
            if (_colorFromRGB(sColorRGB) === maskColor) {
                _putPixel(dx + x, dy + y, outColor, dData);
            }
        }
    }
}

function _colorFromRGB(rgb) {
    for (let c = 0; c < _colorPaletteRGB.length; c++) {
        let colorRGB = _colorPaletteRGB[c];
        let same = true;
        for (let j = 0; j < 3; j++) {
            same &= colorRGB[j] === rgb[j];
        }
        if (same) {
            return c
        }
    }
    console.error("Color not found " + rgb);
}

function _applyDisplayPaletteRemapping() {
    // for (let y = 0; y < _bufferCanvas.height; y++) {
    //     for (let x = 0; x < _bufferCanvas.width; x++) {
    //         let p = x * _pixelStride + (y * _lineStride);
    //         let colorRGB = [];
    //         for (let j = 0; j < 3; j++) {
    //             colorRGB.push(_pixelbuffer[p + j]);
    //         }
    //         let colorAfterMapping = _state.displayPaletteReMapping[_colorFromRGB(colorRGB)];
    //         let i = x * _pixelStride + y * _lineStride;
    //         colorRGB = _colorPaletteRGB[colorAfterMapping];
    //         for (let j = 0; j < 3; j++) {
    //             _pixelbuffer[i + j] = colorRGB[j];
    //         }
    //     }
    // }
    for (let i = 0; i < _pixelbuffer.length; i += 4) {
        let colorRGB = [];
        for (let j = 0; j < 3; j++) {
            colorRGB.push(_pixelbuffer[i + j]);
        }
        let colorAfterMapping = _state.displayPaletteReMapping[_colorFromRGB(colorRGB)];
        let colorAfterRGB = _colorPaletteRGB[colorAfterMapping];
        for (let j = 0; j < 3; j++) {
            _pixelbuffer[i + j] = colorAfterRGB[j];
        }
    }
}

async function _loadAudioFile(audioContext, filepath) {
    let response = await fetch(filepath);
    let arrayBuffer = await response.arrayBuffer();
    let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
}

async function _loadAudios(audioContext, sfxCount, musicCount) {
    let promises = [];
    for (let i = 0; i < sfxCount; i++) {
        let filename = `assets/sfx${i}.wav`;
        let promise = _loadAudioFile(audioContext, filename);
        promises.push(promise);
    }

    for (let i = 0; i < musicCount; i++) {
        let filename = `assets/music${i}.wav`;
        let promise = _loadAudioFile(audioContext, filename);
        promises.push(promise);
    }
    let buffers = await Promise.all(promises);
    let sfxBuffers = buffers.slice(0, sfxCount);
    let musicBuffers = buffers.slice(-musicCount);
    return { sfxBuffers, musicBuffers };
}