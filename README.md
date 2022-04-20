# Overview

The idea behind jsocho is implementing a game engine with the same API as Pico-8 but in TypeScript.
To do this I will translate Pico-8 games while I implement the engine.
The objective is learning:
- Translating games will help to lear how games are made [(learning by copying)](https://www.artofmanliness.com/career-wealth/career/want-to-become-a-better-writer-copy-the-work-of-others/). At first, translations will be 1 to 1, but improvements will be made as there are no actual limits like in Pico-8.
- Building the engine will also be a learning oportunity. It will use canvas initially, but it could be improved with WebGPU latter on.

To get started just

```
npm i
npm run dev
```
Then host and open `index.html`, use Live Server VSCode extention for ease of use.

## Status
- Mine is fully translated and working.
- Pieces of Cake (poc) is WIP, it uses a lot of tricks to save on tokens, so it's way harder to translate. I will work on it interminatelly and I will focus on easier games for now.
- Celeste is the one I'm currently translating.
  
## Pico-8 Manual
https://www.lexaloffle.com/pico-8.php?page=resources

## How assets work
As of today assets used in the games should be exported using Pico-8 and put in a folder inside the assets folder with the name of the game:
- png for the sprites and another one for the bitmap font (sprites.png, font.png) 
- wav files for sound effects and music (sfxN.wav, musicN.wav)
- map data in a text file (map.txt)

To export the assests with Pico-8 load the game and load it in Pico-8:
- Go to the game you want to download in BBS and download the cart png.
- Put the downloaded cart in the carts folder. Type `folder` in Pico-8 to open the carts folder.
After loading the game just press `esc` and type `export sprites.png`, `export sfx%d.wav`, then press `esc` go to the music tab and press `esc` again to type `export music%d.wav`.
All the files should be in the carts folder.
Type `save gameName` to generate a `p8` file which can be opened to copy the map data and source code.

## Extra additions to the engine
Vectors are a common used thing, so utilities for working with them were added, use `v()` to create vectors. All operations start with `v_`.
`counterSet` and `counterGet` do not exist in Pico-8 and were added when translating mine. poc solves this issues with coroutings, which is quite cool, but harder to understand. The corouting implementation is already translated using generator functions. I should probably write a little bit about this latter on, maybe when I finish translating poc.
