import {
  btn,
  camera,
  clamp,
  cos,
  flr,
  max,
  min,
  music,
  pal,
  rectfill,
  rnd,
  sfx,
  sin,
  spr,
  start,
  v,
  print,
  map,
  abs,
  sign,
  mget,
  fget,
} from "./engine.js";

// -- globals --
// -------------

let frames = 0;
let seconds = 0;
let minutes = 0;
let start_game = false;
let deaths = 0;
let max_djump = 0;
let music_timer = 0;
let sfx_timer = 0;
let freeze = 0;
let shake = 0;
let room = v(0, 0);
const objects: any[] = [];
const types: any[] = [];
let will_restart = false;
let delay_restart = 0;
const got_fruit: boolean[] = [];
let has_dashed = false;
let has_key = false;
let pause_player = false;
let flash_bg = false;
let new_bg = false;
let start_game_flash = 0;

const k_left = 0;
const k_right = 1;
const k_up = 2;
const k_down = 3;
const k_jump = 4;
const k_dash = 5;

// -- entry point --
// -----------------

function init() {
  title_screen();
}

function title_screen() {
  got_fruit.length = 0;
  for (let i = 0; i < 30; i++) {
    got_fruit.push(false);
  }
  frames = 0;
  deaths = 0;
  max_djump = 1;
  start_game = false;
  start_game_flash = 0;
  music(40, 0, 7);

  load_room(7, 3);
}

function begin_game() {
  frames = 0;
  seconds = 0;
  minutes = 0;
  music_timer = 0;
  start_game = false;
  music(0, 0, 7);
  load_room(0, 0);
}

function level_index() {
  return (room.x % 8) + room.y * 8;
}

function is_title() {
  return level_index() == 31;
}

// -- effects --
// -------------

const clouds: any[] = [];
for (let i = 0; i <= 16; i++) {
  clouds.push({
    x: rnd(128),
    y: rnd(128),
    spd: 1 + rnd(4),
    w: 32 + rnd(32),
  });
}

const particles: any[] = [];
for (let i = 0; i <= 24; i++) {
  particles.push({
    x: rnd(128),
    y: rnd(128),
    s: 0 + flr(rnd(5) / 4),
    spd: 0.25 + rnd(5),
    off: rnd(1),
    c: 6 + flr(0.5 + rnd(1)),
  });
}

const dead_particles: any[] = [];

// -- player entity --
// -------------------

const player = {
  init() {
    this.p_jump = false;
    this.p_dash = false;
    this.grace = 0;
    this.jbuffer = 0;
    this.djump = max_djump;
    this.dash_time = 0;
    this.dash_effect_time = 0;
    this.dash_target = { x: 0, y: 0 };
    this.dash_accel = { x: 0, y: 0 };
    this.hitbox = { x: 1, y: 3, w: 6, h: 5 };
    this.spr_off = 0;
    this.was_on_ground = false;
    create_hair(this);
  },
  update() {
    if (pause_player) return;

    const input = (btn(k_right) && 1) || (btn(k_left) && -1) || 0;

    // -- spikes collide
    if (
      spikes_at(
        this.x + this.hitbox.x,
        this.y + this.hitbox.y,
        this.hitbox.w,
        this.hitbox.h,
        this.spd.x,
        this.spd.y
      )
    ) {
      kill_player(this);
    }

    // -- bottom death
    if (this.y > 128) {
      kill_player(this);
    }

    const on_ground = this.is_solid(0, 1);
    const on_ice = this.is_ice(0, 1);

    // -- smoke particles
    if (on_ground && !this.was_on_ground) {
      init_object(smoke, this.x, this.y + 4);
    }

    const jump = btn(k_jump) && !this.p_jump;
    this.p_jump = btn(k_jump);
    if (jump) {
      this.jbuffer = 4;
    } else if (this.jbuffer > 0) {
      this.jbuffer -= 1;
    }

    const dash = btn(k_dash) && !this.p_dash;
    this.p_dash = btn(k_dash);

    if (on_ground) {
      this.grace = 6;
      if (this.djump < max_djump) {
        psfx(54);
        this.djump = max_djump;
      }
    } else if (this.grace > 0) {
      this.grace -= 1;
    }

    this.dash_effect_time -= 1;
    if (this.dash_time > 0) {
      init_object(smoke, this.x, this.y);
      this.dash_time -= 1;
      this.spd.x = appr(this.spd.x, this.dash_target.x, this.dash_accel.x);
      this.spd.y = appr(this.spd.y, this.dash_target.y, this.dash_accel.y);
    } else {
      // -- move
      const maxrun = 1;
      let accel = 0.6;
      const deccel = 0.15;

      if (!on_ground) {
        accel = 0.4;
      } else if (on_ice) {
        accel = 0.05;
        if (input == ((this.flip.x && -1) || 1)) {
          accel = 0.05;
        }
      }

      if (abs(this.spd.x) > maxrun) {
        this.spd.x = appr(this.spd.x, sign(this.spd.x) * maxrun, deccel);
      } else {
        this.spd.x = appr(this.spd.x, input * maxrun, accel);
      }

      // --facing
      if (this.spd.x != 0) {
        this.flip.x = this.spd.x < 0;
      }

      // -- gravity
      let maxfall = 2;
      let gravity = 0.21;

      if (abs(this.spd.y) <= 0.15) {
        gravity *= 0.5;
      }

      // -- wall slide
      if (input != 0 && this.is_solid(input, 0) && !this.is_ice(input, 0)) {
        maxfall = 0.4;
        if (rnd(10) < 2) {
          init_object(smoke, this.x + input * 6, this.y);
        }
      }

      if (!on_ground) {
        this.spd.y = appr(this.spd.y, maxfall, gravity);
      }

      // -- jump
      if (this.jbuffer > 0) {
        if (this.grace > 0) {
          // -- normal jump
          psfx(1);
          this.jbuffer = 0;
          this.grace = 0;
          this.spd.y = -2;
          init_object(smoke, this.x, this.y + 4);
        } else {
          // -- wall jump
          const wall_dir =
            (this.is_solid(-3, 0) && -1) || (this.is_solid(3, 0) && 1) || 0;
          if (wall_dir != 0) {
            psfx(2);
            this.jbuffer = 0;
            this.spd.y = -2;
            this.spd.x = -wall_dir * (maxrun + 1);
            if (!this.is_ice(wall_dir * 3, 0)) {
              init_object(smoke, this.x + wall_dir * 6, this.y);
            }
          }
        }
      }
      // -- dash
      const d_full = 5;
      const d_half = d_full * 0.70710678118;

      if (this.djump > 0 && dash) {
        init_object(smoke, this.x, this.y);
        this.djump -= 1;
        this.dash_time = 4;
        has_dashed = true;
        this.dash_effect_time = 10;
        const v_input = (btn(k_up) && -1) || (btn(k_down) && 1) || 0;
        if (input != 0) {
          if (v_input != 0) {
            this.spd.x = input * d_half;
            this.spd.y = v_input * d_half;
          } else {
            this.spd.x = input * d_full;
            this.spd.y = 0;
          }
        } else if (v_input != 0) {
          this.spd.x = 0;
          this.spd.y = v_input * d_full;
        } else {
          this.spd.x = (this.flip.x && -1) || 1;
          this.spd.y = 0;
        }

        psfx(3);
        freeze = 2;
        shake = 6;
        this.dash_target.x = 2 * sign(this.spd.x);
        this.dash_target.y = 2 * sign(this.spd.y);
        this.dash_accel.x = 1.5;
        this.dash_accel.y = 1.5;

        if (this.spd.y < 0) {
          this.dash_target.y *= 0.75;
        }

        if (this.spd.y != 0) {
          this.dash_accel.x *= 0.70710678118;
        }
        if (this.spd.x != 0) {
          this.dash_accel.y *= 0.70710678118;
        } else if (dash && this.djump <= 0) {
          psfx(9);
          init_object(smoke, this.x, this.y);
        }
      }

      // -- animation
      this.spr_off += 0.25;
      if (!on_ground) {
        if (this.is_solid(input, 0)) {
          this.spr = 5;
        } else {
          this.spr = 3;
        }
      } else if (btn(k_down)) {
        this.spr = 6;
      } else if (btn(k_up)) {
        this.spr = 7;
      } else if (this.spd.x == 0 || (!btn(k_left) && !btn(k_right))) {
        this.spr = 1;
      } else {
        this.spr = 1 + (this.spr_off % 4);
      }

      // -- next level
      if (this.y < -4 && level_index() < 30) {
        next_room();
      }

      // -- was on the ground
      this.was_on_ground = on_ground;
    }
  },

  draw() {
    // clamp in screen
    if (this.x < -1 || this.x > 121) {
      this.x = clamp(this.x, -1, 121);
      this.spd.x = 0;
    }

    set_hair_color(this.djump);
    draw_hair(this, (this.flip.x && -1) || 1);
    spr(this.spr, this.x, this.y, 1, 1, this.flip.x, this.flip.y);
    unset_hair_color();
  },
};

function psfx(num: number) {
  if (sfx_timer <= 0) {
    sfx(num);
  }
}

function create_hair(obj: any) {
  obj.hair = [];
  for (let i = 0; i < 5; i++) {
    obj.hair.push({ x: obj.x, y: obj.y, size: max(1, min(2, 3 - i)) });
  }
}

function set_hair_color(djump: number) {
  pal(
    8,
    (djump == 1 && 8) || (djump == 2 && 7 + flr((frames / 3) % 2) * 4) || 12
  );
}

function draw_hair(obj: any, facing: any) {
  let last = {
    x: obj.x + 4 - facing * 2,
    y: obj.y + ((btn(k_down) && 4) || 3),
  };
  obj.hair.forEach((h: any) => {
    h.x += (last.x - h.x) / 1.5;
    h.y += (last.y + 0.5 - h.y) / 1.5;
    // circfill(h.x, h.y, h.size, 8); TODO:
    last = h;
  });
}

function unset_hair_color() {
  pal(8, 8);
}

const player_spawn = {
  tile: 1,
  init(this: any) {
    sfx(4);
    this.spr = 3;
    this.target = { x: this.x, y: this.y };
    this.y = 128;
    this.spd = { x: 0, y: -4 };
    this.state = 0;
    this.delay = 0;
    this.solids = false;
    this.flip = { x: 0, y: 0 };
    create_hair(this);
  },
  update(this: any) {
    // jumping up
    if (this.state == 0) {
      if (this.y < this.target.y + 16) {
        this.state = 1;
        this.delay = 3;
      }
      // falling
    } else if (this.state == 1) {
      this.spd.y += 0.5;
      if (this.spd.y > 0 && this.delay > 0) {
        this.spd.y = 0;
        this.delay -= 1;
      }
      if (this.spd.y > 0 && this.y > this.target.y) {
        this.y = this.target.y;
        this.spd = { x: 0, y: 0 };
        this.state = 2;
        this.delay = 5;
        shake = 5;
        init_object(smoke, this.x, this.y + 4);
        sfx(5);
      }
      // landing
    } else if (this.state == 2) {
      this.delay -= 1;
      this.spr = 6;
      if (this.delay < 0) {
        destroy_object(this);
        init_object(player, this.x, this.y);
      }
    }
  },
  draw(this: any) {
    set_hair_color(max_djump);
    draw_hair(this, 1);
    spr(this.spr, this.x, this.y, 1, 1, this.flip.x, this.flip.y);
    unset_hair_color();
  },
};
types.push(player_spawn);

const spring = {
  tile: 18,
  init(this: any) {
    this.hide_in = 0;
    this.hide_for = 0;
  },
  update(this: any) {
    if (this.hide_for > 0) {
      this.hide_for -= 1;
      if (this.hide_for <= 0) {
        this.spr = 18;
        this.delay = 0;
      }
    } else if (this.spr == 18) {
      const hit = this.collide(player, 0, 0);
      if (hit && hit.spd.y >= 0) {
        this.spr = 19;
        hit.y = this.y - 4;
        hit.spd.x *= 0.2;
        hit.spd.y = -3;
        hit.djump = max_djump;
        this.delay = 10;
        init_object(smoke, this.x, this.y);

        // breakable below us
        const below = this.collide(fall_floor, 0, 1);
        if (below) {
          break_fall_floor(below);
        }

        psfx(8);
      }
    } else if (this.delay > 0) {
      this.delay -= 1;
      if (this.delay <= 0) {
        this.spr = 18;
      }
    }
    // begin hiding
    if (this.hide_in > 0) {
      this.hide_in -= 1;
      if (this.hide_in <= 0) {
        this.hide_for = 60;
        this.spr = 0;
      }
    }
  },
};
types.push(spring);

function break_spring(obj: any) {
  obj.hide_in = 15;
}

const balloon = {
  tile: 22,
  init(this: any) {
    this.offset = rnd(1);
    this.start = this.y;
    this.timer = 0;
    this.hitbox = { x: -1, y: -1, w: 10, h: 10 };
  },
  update(this: any) {
    if (this.spr == 22) {
      this.offset += 0.01;
      this.y = this.start + sin(this.offset) * 2;
      const hit = this.collide(player, 0, 0);
      if (hit && hit.djump < max_djump) {
        psfx(6);
        init_object(smoke, this.x, this.y);
        hit.djump = max_djump;
        this.spr = 0;
        this.timer = 60;
      }
    } else if (this.timer > 0) {
      this.timer -= 1;
    } else {
      psfx(7);
      init_object(smoke, this.x, this.y);
      this.spr = 22;
    }
  },
  draw(this: any) {
    if (this.spr == 22) {
      spr(13 + ((this.offset * 8) % 3), this.x, this.y + 6);
      spr(this.spr, this.x, this.y);
    }
  },
};
types.push(balloon);

const fall_floor = {
  tile: 23,
  init() {
    this.state = 0;
    this.solid = true;
  },
  update(this: any) {
    // idling
    if (this.state == 0) {
      if (
        this.check(player, 0, -1) ||
        this.check(player, -1, 0) ||
        this.check(player, 1, 0)
      ) {
        break_fall_floor(this);
      }
      // shaking
    } else if (this.state == 1) {
      this.delay -= 1;
      if (this.delay <= 0) {
        this.state = 2;
        this.delay = 60; // how long it hides for
        this.collideable = false;
      }
      // invisible, waiting to reset
    } else if (this.state == 2) {
      this.delay -= 1;
      if (this.delay <= 0 && !this.check(player, 0, 0)) {
        psfx(7);
        this.state = 0;
        this.collideable = true;
        init_object(smoke, this.x, this.y);
      }
    }
  },
  draw(this: any) {
    if (this.state != 2) {
      if (this.state != 1) {
        spr(23, this.x, this.y);
      } else {
        spr(23 + (15 - this.delay) / 5, this.x, this.y);
      }
    }
  },
};
types.push(fall_floor);

function break_fall_floor(obj: any) {
  if (obj.state === 0) {
    psfx(15);
    obj.state = 1;
    obj.delay = 15; // how long until it falls
    init_object(smoke, obj.x, obj.y);
    const hit = obj.collide(spring, 0, -1);
    if (hit) {
      break_spring(hit);
    }
  }
}

const smoke = {
  init() {
    this.spr = 29;
    this.spd.y = -0.1;
    this.spd.x = 0.3 + rnd(0.2);
    this.x += -1 + rnd(2);
    this.y += -1 + rnd(2);
    this.flip.x = maybe();
    this.flip.y = maybe();
    this.solids = false;
  },
  update() {
    this.spr += 0.2;
    if (this.spr > 31) {
      destroy_object(this);
    }
  },
};

const fruit = {
  tile: 26,
  if_not_fruit: true,
  init(this: any) {
    this.start = this.y;
    this.off = 0;
  },
  update(this: any) {
    const hit = this.collide(player, 0, 0);
    if (hit) {
      hit.djump = max_djump;
      sfx_timer = 20;
      sfx(13);
      got_fruit[1 + level_index()] = true;
      init_object(lifeup, this.x, this.y);
      destroy_object(this);
    }
    this.off += 1;
    this.y = this.start + sin(this.off / 40) * 2.5;
  },
};
types.push(fruit);

const fly_fruit = {
  tile: 28,
  if_not_fruit: true,
  init(this: any) {
    this.start = this.y;
    this.fly = false;
    this.step = 0.5;
    this.solids = false;
    this.sfx_delay = 8;
  },
  update(this: any) {
    // ly away
    if (this.fly) {
      if (this.sfx_delay > 0) {
        this.sfx_delay -= 1;
        if (this.sfx_delay <= 0) {
          sfx_timer = 20;
          sfx(14);
        }
      }
      this.spd.y = appr(this.spd.y, -3.5, 0.25);
      if (this.y < -16) {
        destroy_object(this);
      }
      // wait
      else if (has_dashed) {
        this.fly = true;
      }
      this.step += 0.05;
      this.spd.y = sin(this.step) * 0.5;
    }
    // collect
    const hit = this.collide(player, 0, 0);
    if (hit) {
      hit.djump = max_djump;
      sfx_timer = 20;
      sfx(13);
      got_fruit[1 + level_index()] = true;
      init_object(lifeup, this.x, this.y);
      destroy_object(this);
    }
  },
  draw(this: any) {
    let off = 0;
    if (!this.fly) {
      const dir = sin(this.step);
      if (dir < 0) {
        off = 1 + max(0, sign(this.y - this.start));
      } else off = (off + 0.25) % 3;
    }
    spr(45 + off, this.x - 6, this.y - 2, 1, 1, true, false);
    spr(this.spr, this.x, this.y);
    spr(45 + off, this.x + 6, this.y - 2);
  },
};
types.push(fly_fruit);

const lifeup = {
  init() {
    this.spd.y = -0.25;
    this.duration = 30;
    this.x -= 2;
    this.y -= 4;
    this.flash = 0;
    this.solids = false;
  },
  update() {
    this.duration -= 1;
    if (this.duration <= 0) {
      destroy_object(this);
    }
  },
  draw() {
    this.flash += 0.5;

    print("1000", this.x - 2, this.y, 7 + (this.flash % 2));
  },
};

const fake_wall = {
  tile: 64,
  if_not_fruit: true,
  update(this: any) {
    this.hitbox = { x: -1, y: -1, w: 18, h: 18 };
    const hit = this.collide(player, 0, 0);
    if (hit && hit.dash_effect_time > 0) {
      hit.spd.x = -sign(hit.spd.x) * 1.5;
      hit.spd.y = -1.5;
      hit.dash_time = -1;
      sfx_timer = 20;
      sfx(16);
      destroy_object(this);
      init_object(smoke, this.x, this.y);
      init_object(smoke, this.x + 8, this.y);
      init_object(smoke, this.x, this.y + 8);
      init_object(smoke, this.x + 8, this.y + 8);
      init_object(fruit, this.x + 4, this.y + 4);
    }
    this.hitbox = { x: 0, y: 0, w: 16, h: 16 };
  },
  draw(this: any) {
    spr(64, this.x, this.y);
    spr(65, this.x + 8, this.y);
    spr(80, this.x, this.y + 8);
    spr(81, this.x + 8, this.y + 8);
  },
};
types.push(fake_wall);

const key = {
  tile: 8,
  if_not_fruit: true,
  update(this: any) {
    const was = flr(this.spr);
    this.spr = 9 + (sin(frames / 30) + 0.5) * 1;
    const is = flr(this.spr);
    if (is == 10 && is != was) {
      this.flip.x = !this.flip.x;
    }
    if (this.check(player, 0, 0)) {
      sfx(23);
      sfx_timer = 10;
      destroy_object(this);
      has_key = true;
    }
  },
};
types.push(key);

const chest = {
  tile: 20,
  if_not_fruit: true,
  init(this: any) {
    this.x -= 4;
    this.start = this.x;
    this.timer = 20;
  },
  update(this: any) {
    if (has_key) {
      this.timer -= 1;
      this.x = this.start - 1 + rnd(3);
      if (this.timer <= 0) {
        sfx_timer = 20;
        sfx(16);
        init_object(fruit, this.x, this.y - 4);
        destroy_object(this);
      }
    }
  },
};
types.push(chest);

const platform = {
  init() {
    this.x -= 4;
    this.solids = false;
    this.hitbox.w = 16;
    this.last = this.x;
  },
  update() {
    this.spd.x = this.dir * 0.65;
    if (this.x < -16) {
      this.x = 128;
    } else if (this.x > 128) {
      this.x = -16;
    }
    if (!this.check(player, 0, 0)) {
      const hit = this.collide(player, 0, -1);
      if (hit) {
        hit.move_x(this.x - this.last, 1);
      }
    }
    this.last = this.x;
  },
  draw() {
    spr(11, this.x, this.y - 1);
    spr(12, this.x + 8, this.y - 1);
  },
};

const message = {
  tile: 86,
  last: 0,
  draw(this: any) {
    this.text =
      "-- celeste mountain --#this memorial to those# perished on the climb";
    if (this.check(player, 4, 0)) {
      if (this.index < this.text.length) {
        this.index += 0.5;
        if (this.index >= this.last + 1) {
          this.last += 1;
          sfx(35);
        }
      }
      this.off = { x: 8, y: 96 };
      for (let i = 0; i < this.index; i++) {
        if (this.text[i] != "#") {
          rectfill(
            this.off.x - 2,
            this.off.y - 2,
            this.off.x + 7,
            this.off.y + 6,
            7
          );
          print(this.text[i], this.off.x, this.off.y, 0);
          this.off.x += 5;
        } else {
          this.off.x = 8;
          this.off.y += 7;
        }
      }
    } else {
      this.index = 0;
      this.last = 0;
    }
  },
};
types.push(message);

const big_chest = {
  tile: 96,
  init(this: any) {
    this.state = 0;
    this.hitbox.w = 16;
  },
  draw(this: any) {
    if (this.state == 0) {
      const hit = this.collide(player, 0, 8);
      if (hit && hit.is_solid(0, 1)) {
        music(-1, 500, 7);
        sfx(37);
        pause_player = true;
        hit.spd.x = 0;
        hit.spd.y = 0;
        this.state = 1;
        init_object(smoke, this.x, this.y);
        init_object(smoke, this.x + 8, this.y);
        this.timer = 60;
        this.particles = {};
      }
      spr(96, this.x, this.y);
      spr(97, this.x + 8, this.y);
    } else if (this.state === 1) {
      this.timer -= 1;
      shake = 5;
      flash_bg = true;
      if (this.timer <= 45 && this.particles.length < 50) {
        this.particles.push({
          x: 1 + rnd(14),
          y: 0,
          h: 32 + rnd(32),
          spd: 8 + rnd(8),
        });
      }
      if (this.timer < 0) {
        this.state = 2;
        this.particles = {};
        flash_bg = false;
        new_bg = true;
        init_object(orb, this.x + 4, this.y + 4);
        pause_player = false;
      }
      this.particles.forEach((p: any) => {
        p.y += p.spd;
        // TODO: implement line
        // line(
        //   this.x + p.x,
        //   this.y + 8 - p.y,
        //   this.x + p.x,
        //   min(this.y + 8 - p.y + p.h, this.y + 8),
        //   7
        // );
      });
    }
    spr(112, this.x, this.y + 8);
    spr(113, this.x + 8, this.y + 8);
  },
};
types.push(big_chest);

const orb = {
  init() {
    this.spd.y = -4;
    this.solids = false;
    this.particles = {};
  },
  draw() {
    this.spd.y = appr(this.spd.y, 0, 0.5);
    const hit = this.collide(player, 0, 0);
    if (this.spd.y == 0 && hit) {
      music_timer = 45;
      sfx(51);
      freeze = 10;
      shake = 10;
      destroy_object(this);
      max_djump = 2;
      hit.djump = 2;
    }

    spr(102, this.x, this.y);
    const off = frames / 30;
    for (let i = 0; i < 8; i++) {
      // TODO: circfill
      // circfill(
      //   this.x + 4 + cos(off + i / 8) * 8,
      //   this.y + 4 + sin(off + i / 8) * 8,
      //   1,
      //   7
      // );
    }
  },
};

const flag = {
  tile: 118,
  init(this: any) {
    this.x += 5;
    this.score = 0;
    this.show = false;
    for (let i = 1; i < got_fruit.length; i++) {
      if (got_fruit[i]) {
        this.score += 1;
      }
    }
  },
  draw(this: any) {
    this.spr = 118 + ((frames / 5) % 3);
    spr(this.spr, this.x, this.y);
    if (this.show) {
      rectfill(32, 2, 96, 31, 0);
      spr(26, 55, 6);
      print("x" + this.score, 64, 9, 7);
      draw_time(49, 16);
      print("deaths:" + deaths, 48, 24, 7);
    } else if (this.check(player, 0, 0)) {
      sfx(55);
      sfx_timer = 30;
      this.show = true;
    }
  },
};
types.push(flag);

const room_title = {
  init() {
    this.delay = 5;
  },
  draw() {
    this.delay -= 1;
    if (this.delay < -30) {
      destroy_object(this);
    } else if (this.delay < 0) {
      rectfill(24, 58, 104, 70, 0);
      //rect(26,64-10,102,64+10,7)
      //print("---",31,64-2,13)
      if (room.x == 3 && room.y == 1) {
        print("old site", 48, 62, 7);
      } else if (level_index() == 30) {
        print("summit", 52, 62, 7);
      } else {
        const level = (1 + level_index()) * 100;
        print(level + " m", 52 + ((level < 1000 && 2) || 0), 62, 7);
      }
      // print("---",86,64-2,13)

      draw_time(4, 4);
    }
  },
};

// -- object functions --
// -----------------------

function init_object(type: any, x: number, y: number) {
  if (type.if_not_fruit && got_fruit[1 + level_index()]) {
    return;
  }
  const obj: any = {};
  obj.type = type;
  obj.collideable = true;
  obj.solids = true;

  obj.spr = type.tile;
  obj.flip = { x: false, y: false };

  obj.x = x;
  obj.y = y;
  obj.hitbox = { x: 0, y: 0, w: 8, h: 8 };

  obj.spd = { x: 0, y: 0 };
  obj.rem = { x: 0, y: 0 };

  obj.is_solid = function (ox: number, oy: number) {
    if (oy > 0 && !obj.check(platform, ox, 0) && obj.check(platform, ox, oy)) {
      return true;
    } else {
      return (
        solid_at(
          obj.x + obj.hitbox.x + ox,
          obj.y + obj.hitbox.y + oy,
          obj.hitbox.w,
          obj.hitbox.h
        ) ||
        obj.check(fall_floor, ox, oy) ||
        obj.check(fake_wall, ox, oy)
      );
    }
  };

  obj.is_ice = function (ox: number, oy: number) {
    return ice_at(
      obj.x + obj.hitbox.x + ox,
      obj.y + obj.hitbox.y + oy,
      obj.hitbox.w,
      obj.hitbox.h
    );
  };

  obj.collide = function (type: any, ox: number, oy: number) {
    let other;
    for (let i = 0; i < objects.length; i++) {
      other = objects[i];
      if (
        other &&
        other.type == type &&
        other != obj &&
        other.collideable &&
        other.x + other.hitbox.x + other.hitbox.w > obj.x + obj.hitbox.x + ox &&
        other.y + other.hitbox.y + other.hitbox.h > obj.y + obj.hitbox.y + oy &&
        other.x + other.hitbox.x < obj.x + obj.hitbox.x + obj.hitbox.w + ox &&
        other.y + other.hitbox.y < obj.y + obj.hitbox.y + obj.hitbox.h + oy
      ) {
        return other;
      }
    }
    return null;
  };

  obj.check = function (type: any, ox: number, oy: number) {
    return !!obj.collide(type, ox, oy);
  };

  obj.move = function (ox: number, oy: number) {
    let amount;
    // [x] get move amount
    obj.rem.x += ox;
    amount = flr(obj.rem.x + 0.5);
    obj.rem.x -= amount;
    obj.move_x(amount, 0);

    // [y] get move amount
    obj.rem.y += oy;
    amount = flr(obj.rem.y + 0.5);
    obj.rem.y -= amount;
    obj.move_y(amount);
  };

  obj.move_x = function (amount: number, start: number) {
    if (obj.solids) {
      const step = sign(amount);
      for (let i = start; i <= abs(amount); i++) {
        if (!obj.is_solid(step, 0)) {
          obj.x += step;
        } else {
          obj.spd.x = 0;
          obj.rem.x = 0;
          break;
        }
      }
    } else {
      obj.x += amount;
    }
  };

  obj.move_y = function (amount: number) {
    if (obj.solids) {
      const step = sign(amount);
      for (let i = 0; i < abs(amount); i++) {
        if (!obj.is_solid(0, step)) {
          obj.y += step;
        } else {
          obj.spd.y = 0;
          obj.rem.y = 0;
          break;
        }
      }
    } else {
      obj.y += amount;
    }
  };

  objects.push(obj);
  if (obj.type.init) {
    obj.type.init.apply(obj);
  }
  return obj;
}

function destroy_object(obj: any) {
  for (let i = 0; i < objects.length; i++) {
    if (obj === objects[i]) {
      objects.splice(i, 1);
    }
  }
}

function kill_player(obj: any) {
  sfx_timer = 12;
  sfx(0);
  deaths += 1;
  shake = 10;
  destroy_object(obj);
  dead_particles.length = 0;
  for (let dir = 0; dir < 8; dir++) {
    const angle = dir / 8;
    dead_particles.push({
      x: obj.x + 4,
      y: obj.y + 4,
      t: 10,
      spd: {
        x: sin(angle) * 3,
        y: cos(angle) * 3,
      },
    });
    restart_room();
  }
}

// -- room functions --
// --------------------

function restart_room() {
  will_restart = true;
  delay_restart = 15;
}

function next_room() {
  if (room.x == 2 && room.y == 1) {
    music(30, 500, 7);
  } else if (room.x == 3 && room.y == 1) {
    music(20, 500, 7);
  } else if (room.x == 4 && room.y == 2) {
    music(30, 500, 7);
  } else if (room.x == 5 && room.y == 3) {
    music(30, 500, 7);
  }

  if (room.x == 7) {
    load_room(0, room.y + 1);
  } else {
    load_room(room.x + 1, room.y);
  }
}

function load_room(x: number, y: number) {
  has_dashed = false;
  has_key = false;

  // --remove existing objects
  objects.forEach(destroy_object);

  // --current room
  room = v(x, y);

  // -- entities
  for (let tx = 0; tx < 16; tx++) {
    for (let ty = 0; ty < 16; ty++) {
      const tile = tile_at(tx, ty);
      if (tile == 11) {
        init_object(platform, tx * 8, ty * 8).dir = -1;
      } else if (tile == 12) {
        init_object(platform, tx * 8, ty * 8).dir = 1;
      } else {
        types.forEach(function (type) {
          if (type.tile == tile) {
            init_object(type, tx * 8, ty * 8);
          }
        });
      }
    }
  }

  if (!is_title()) {
    init_object(room_title, 0, 0);
  }
}

// -- update function --
// -----------------------

function update() {
  frames = (frames + 1) % 30;
  if (frames == 0 && level_index() < 30) {
    seconds = (seconds + 1) % 60;
    if (seconds <= 0) {
      minutes += 1;
    }
  }

  if (music_timer > 0) {
    music_timer -= 1;
    if (music_timer <= 0) {
      music(10, 0, 7); // TODO: implement the other parameters in the engine, they do nothing right now.
    }
  }

  if (sfx_timer > 0) {
    sfx_timer -= 1;
  }

  // cancel if freeze
  if (freeze > 0) {
    freeze -= 1;
    return;
  }

  // screenshake
  if (shake > 0) {
    shake -= 1;
    camera(0, 0);
    if (shake > 0) {
      camera(-2 + rnd(5), -2 + rnd(5));
    }
  }

  // restart (soon)
  if (will_restart && delay_restart > 0) {
    delay_restart -= 1;
    if (delay_restart <= 0) {
      will_restart = false;
      load_room(room.x, room.y);
    }
  }

  //  update each object
  objects.forEach((obj) => {
    obj.move(obj.spd.x, obj.spd.y);
    if (obj.type.update) {
      obj.type.update.apply(obj);
    }
  });

  //  start game
  if (is_title()) {
    if (!start_game && (btn(k_jump) || btn(k_dash))) {
      music(-1);
      start_game_flash = 50;
      start_game = true;
      sfx(38);
    }
    if (start_game) {
      start_game_flash -= 1;
      if (start_game_flash <= -30) {
        begin_game();
      }
    }
  }
}

// -- drawing functions --
// -----------------------
function draw() {
  if (freeze > 0) {
    return;
  }

  // 	reset all palette values
  pal();

  //  start game flash
  if (start_game) {
    let c = 10;
    if (start_game_flash > 10) {
      if (frames % 10 < 5) {
        c = 7;
      }
    } else if (start_game_flash > 5) {
      c = 2;
    } else if (start_game_flash > 0) {
      c = 1;
    } else {
      c = 0;
    }
    if (c < 10) {
      pal(6, c);
      pal(12, c);
      pal(13, c);
      pal(5, c);
      pal(1, c);
      pal(7, c);
    }
  }

  // clear screen
  let bg_col = 0;
  if (flash_bg) {
    bg_col = frames / 5;
  } else if (new_bg) {
    bg_col = 2;
  }
  rectfill(0, 0, 128, 128, bg_col);

  // clouds
  if (!is_title()) {
    clouds.forEach((c) => {
      c.x += c.spd;
      rectfill(
        c.x,
        c.y,
        c.x + c.w,
        c.y + 4 + (1 - c.w / 64) * 12,
        (new_bg && 14) || 1
      );
      if (c.x > 128) {
        c.x = -c.w;
        c.y = rnd(128 - 8);
      }
    });
  }

  // draw bg terrain
  map(room.x * 16, room.y * 16, 0, 0, 16, 16, 4);

  //  platforms/big chest
  objects.forEach((o) => {
    if (o.type === platform || o.type === big_chest) {
      draw_object(o);
    }
  });

  // draw terrain
  const off = (is_title() && -4) || 0;
  map(room.x * 16, room.y * 16, off, 0, 16, 16, 2);

  // draw objects
  objects.forEach((o) => {
    if (o.type !== platform && o.type !== big_chest) {
      draw_object(o);
    }
  });

  // draw fg terrain
  map(room.x * 16, room.y * 16, 0, 0, 16, 16, 8);

  // particles
  particles.forEach((p) => {
    p.x += p.spd;
    p.y += sin(p.off);
    p.off += min(0.05, p.spd / 32);
    rectfill(p.x, p.y, p.x + p.s, p.y + p.s, p.c);
    if (p.x > 128 + 4) {
      p.x = -4;
      p.y = rnd(128);
    }
  });

  // dead particles
  // NOTE: I think I don't like updating things here as we are drawing not updating
  for (let i = 0; i < dead_particles.length; ) {
    const p = dead_particles[i];
    p.x += p.spd.x;
    p.y += p.spd.y;
    p.t -= 1;
    if (p.t <= 0) {
      dead_particles.splice(i, 1);
    } else {
      i++;
    }
    rectfill(
      p.x - p.t / 5,
      p.y - p.t / 5,
      p.x + p.t / 5,
      p.y + p.t / 5,
      14 + (p.t % 2)
    );
  }

  // draw outside of the screen for screenshake
  rectfill(-5, -5, -1, 133, 0);
  rectfill(-5, -5, 133, -1, 0);
  rectfill(-5, 128, 133, 133, 0);
  rectfill(128, -5, 133, 133, 0);

  // credits
  if (is_title()) {
    print("x+c", 58, 80, 5);
    print("matt thorson", 42, 96, 5);
    print("noel berry", 46, 102, 5);
  }

  if (level_index() == 30) {
    let p;
    for (let i = 0; i < objects.length; i++) {
      if (objects[i].type == player) {
        p = objects[i];
        break;
      }
    }
    if (p) {
      const diff = min(24, 40 - abs(p.x + 4 - 64));
      rectfill(0, 0, diff, 128, 0);
      rectfill(128 - diff, 0, 128, 128, 0);
    }
  }
}

function draw_object(obj: any) {
  if (obj.type.draw) {
    obj.type.draw.apply(obj);
  } else if (obj.spr > 0) {
    // spr(obj.spr, obj.x, obj.y, 1, 1, obj.flip.x, obj.flip.y); // TODO: implement last two parameters in engine, crashing now
  }
}

function draw_time(x: number, y: number) {
  const s = seconds;
  const m = minutes % 60;
  const h = flr(minutes / 60);

  rectfill(x, y, x + 32, y + 6, 0);
  print(
    ((h < 10 && "0" + h) || h) +
      ":" +
      ((m < 10 && "0" + m) || m) +
      ":" +
      ((s < 10 && "0" + s) || s),
    x + 1,
    y + 1,
    7
  );
}

// -- helper functions --
// ----------------------

function appr(val: number, target: number, amount: number) {
  if (val > target) {
    return max(val - amount, target);
  } else {
    return min(val + amount, target);
  }
}

function maybe() {
  return rnd(1) < 0.5;
}

function solid_at(x: number, y: number, w: number, h: number) {
  return tile_flag_at(x, y, w, h, 0);
}

function ice_at(x: number, y: number, w: number, h: number) {
  return tile_flag_at(x, y, w, h, 4);
}

function tile_flag_at(
  x: number,
  y: number,
  w: number,
  h: number,
  flag: number
) {
  for (let i = max(0, flr(x / 8)); i <= min(15, (x + w - 1) / 8); i++) {
    for (let j = max(0, flr(y / 8)); j <= min(15, (y + h - 1) / 8); j++) {
      if (fget(tile_at(i, j), flag)) {
        return true;
      }
    }
  }
  return false;
}

function tile_at(x: number, y: number) {
  return mget(room.x * 16 + x, room.y * 16 + y);
}

function spikes_at(
  x: number,
  y: number,
  w: number,
  h: number,
  xspd: number,
  yspd: number
) {
  for (let i = max(0, flr(x / 8)); i <= min(15, (x + w - 1) / 8); i++) {
    for (let j = max(0, flr(y / 8)); j <= min(15, (y + h - 1) / 8); j++) {
      const tile = tile_at(i, j);
      if (
        tile == 17 &&
        ((y + h - 1) % 8 >= 6 || y + h == j * 8 + 8) &&
        yspd >= 0
      ) {
        return true;
      } else if (tile == 27 && y % 8 <= 2 && yspd <= 0) {
        return true;
      } else if (tile == 43 && x % 8 <= 2 && xspd <= 0) {
        return true;
      } else if (
        tile == 59 &&
        ((x + w - 1) % 8 >= 6 || x + w == i * 8 + 8) &&
        xspd >= 0
      ) {
        return true;
      }
    }
  }
  return false;
}

export async function run() {
  await start({
    name: "celeste",
    sfxCount: 63,
    musicCount: 1,
    init,
    update,
    draw,
  });
}
