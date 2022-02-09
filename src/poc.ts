
import {
    // types
    Color, Vec,
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
    counterGet, counterSet,
} from "./engine.js";

// TODO: cartdata("kzgpckv2")

//////////////////////////////
// helper functions
//////////////////////////////

// TODO: do I really need this? can't I init things in an ordered maner? related to properly typing the indexes and tags...
// adds an object to an index, creating a new array in the index if needed
function index_add(idx: { [key: string]: object[] }, prop: string, elem: object) {
    idx[prop] = idx[prop] || [];
    idx[prop].push(elem);
}

// calls a method on an object, if it exists
function event(e: any, evt: any, ...args: any[]) {
    let fn = e && e[evt];
    if (typeof fn === "function") {
        return fn(e, args)
    } else {
        return fn
    }
}

// sets everything in props onto the object o
function set(o: object, props: object) {
    Object.assign(o, props);
    return o;
}

// shallow copy object
function clone(o: object) {
    return { ...o };
}

// // merges two tables, second one overrides key from first
function merge(o1: object, o2: object) {
    return { ...o1, ...o2 }
}

type PrintPattern = { x: number, y: number, c: Color }[]

function printdsh(t: string, x: number, y: number, c1: Color, c2: Color, a: number) {
    const pattern = [
        { x: 0, y: 2, c: 2 },
        { x: -1, y: 2, c: 2 },
        { x: -1, y: 1, c: 2 },
        { x: -1, y: 0, c: 2 },
        { x: -1, y: -1, c: 2 },
        { x: 0, y: -1, c: 2 },
        { x: 1, y: -1, c: 2 },
        { x: 1, y: 0, c: 2 },
        { x: 1, y: 1, c: 2 },
        { x: 1, y: 2, c: 2 },
        { x: 0, y: 1, c: 1 },
        { x: 0, y: 0, c: 0 },
    ]
    printt(pattern, t, x, y, [c1, c2, 0], a)
}

function printt(pattern: PrintPattern, txt: string, x: number, y: number, colors: Color[], a: number) {
    x -= a * 4 * txt.length;
    for (let d_i = 0; d_i < pattern.length; d_i++) {
        const d = pattern[d_i];
        print(txt, x + d.x, y + d.y, colors[d.c]);
    }
}

function cutebox(x1: number, y1: number, x2: number, y2: number, cbg: Color, chl: Color, cbr: Color) {
    // shadow(x1, y2 + 2, x2, y2 + 2, 2);
    // shadow(x2 + 1, y2 + 1, x2 + 1, y2 + 1, 2);
    set_palette();
    rect(x1, y1 - 1, x2, y2 + 1, cbr);
    rect(x1 - 1, y1, x2 + 1, y2);
    rectfill(x1, y1, x2, y2, cbg);
    rectfill(x1, y1, x2, y1 + (y2 - y1) / 3, chl);
}

//////////////////////////////
// sequence helpers
//////////////////////////////

function min_by(seq: any[], key: (e: any) => number) {
    let mk = 32767;
    let me = null;
    for (let i = 0; i < seq.length; i++) {
        let e = seq[i];
        let k = key(e);
        if (k < mk) {
            mk = k;
            me = e;
        }
    }
    return { minValue: mk, minElement: me };
}

function sort_by(seq: any[], key: (e: any) => number) {
    // bubble sort, we're gonna sort small arrays anyway
    for (let j = seq.length - 1; j > 0; j--) {
        let sorted = true;
        for (let i = 1; i <= j; i++) {
            const a = seq[i - 1];
            const b = seq[i];
            if (key(b) < key(a)) {
                seq[i] = a;
                seq[i - 1] = b;
                sorted = false;
            }
        }
        if (sorted) break;
    }
    return seq
}


//////////////////////////////
// directions
//////////////////////////////

const dirs = [v(-1, 0), v(1, 0), v(0, -1), v(0, 1),];
const inverse = [1, 0, 3, 2,]; // TODO: name is missleading, as they are indexes

//////////////////////////////
// controlled randomness
//////////////////////////////

type Randomizer = {
    ctr: number,
    looseness: number,
    no_repeats: boolean,
    forced: any,
    es: number[],
    last: number[],
    force: (values: number[]) => void,
    next: (exclude: number) => number,
};

function randomizer(range: [number, number]) {
    const randomizer: Randomizer = {
        ctr: 0,
        looseness: 0.25,
        no_repeats: false,
        forced: [],
        es: [],
        last: [],
        force: randomizer_force,
        next: randomizer_next,
    };
    if (range) {
        for (let i = range[0]; i < range[1]; i++) {
            randomizer.es.push(i);
            randomizer.last.push(-1);
        }
    }
    return randomizer;
}

function randomizer_next(exclude: number): number {
    if (this.forced) {
        return this.forced.shift();
    }
    while (true) {
        const i = rnd(this.es.length);
        const prob = this.ctr - this.last[i];
        if (rnd() < prob) {
            const e = this.es[i];
            if (e !== exclude) {
                this.last[i] = this.ctr - (this.no_repeats && this.looseness || 0);
                this.ctr += this.looseness;
                return e;
            }
        }
    }
}

function randomizer_force(values: number[]) {
    this.forced = values;
}

// TODO:
// function force(randomizer: Randomizer, random_map) {
//  for k,f in pairs(random_map) {
//   obj[k.."rnd"]:force(f)
//  }
// }

//////////////////////////////
// palettes
//////////////////////////////

function init_palettes() {
    // poke addr val1, val2 .. -- Write one or more bytes to an address in base ram.
    // If more than one parameter is provided, they are written sequentially (max: 8192)
    // TODO:
    // let a = 0x5000;
    // for (let p = 0; p < 32; p++) {
    //     for (let c = 0; c < 16; c++) {
    //         poke(a, bor(sget(p, c), c === 13 && 0x80))
    //         a += 1;
    //     }
    // }
}

function set_palette(no: number = 0) {
    // memcpy dest_addr source_addr len  -- Copy len bytes of base ram from source to dest. Sections can be overlapping
    // shl x n -- shift left n bits (zeros come in from the right)
    // shl(flr(no), 4) is 2^no exept for 0. 0 = 0, 1 = 16, 2 = 32
    // TODO:
    // memcpy(0x5f00, 0x5000 + shl(flr(no), 4), 16);
}

//////////////////////////////
// entities
//////////////////////////////

// every entity has some basic properties
// entities have an embedded state that control how
// they display and how they update each frame
// if entity is in state "xx", its method "xx" will be called each frame
type Entity = {
    t: number,
    done: boolean,
    state: string,
    draw_order: number,
    llerp: number,
    pos: Vec,
    lpos?: Vec,
    pop: boolean,
    tags: string[],
    parent: Entity | null,
    children: Entity[],
    // r1: () => void,
    // r2: () => void,
    // r3: () => void,
    // r4: () => void,
    // r5: () => void,
    // r6: () => void,
    // r7: () => void,
    // r8: () => void,
    // r9: () => void,
    // layout: () => void,
    // sz: () => void,
}

function e_new() {
    const e: Entity = {
        t: 0,
        done: false,
        state: "idle",
        draw_order: 5,
        llerp: 0.15,
        pos: v(0, 0),
        pop: false,
        tags: [],
        parent: null,
        children: []
    };
    return e;
}

function e_become(e: Entity, new_state: string) {
    e.state = new_state;
    e.t = 0;
}

function e_is_a(e: Entity, tag: string) {
    return e.tags.indexOf(tag);
}


//////////////////////////////
// entity registry
//////////////////////////////

// entities are indexed for easy access.
// "entities" is a table with all active entities.
// "entities_with.<property>" holds all entities that have that property
// (used by various systems to find entities that move, collide, etc.)
// "entities_tagged.<tag>" holds all entities with a given tag,
// and is used for collisions, among other things.

type EntityIndex = { [key: string]: Entity[] };

const g_entities: Entity[] = [];
const g_entities_with: EntityIndex = {};
const g_entities_tagged: EntityIndex = {};

// a list of properties that need an "entities_with" index
//  Array<Extract< "r1" | "r2" | "r3" | "r4" | "r5" | "r6" | "r7" | "r8" | "r9" | "layout" | "sz", keyof Entity>>
let indexed_properties: string[] = ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "layout", "sz"];

// registers a new entity, making it appear in all
// indices and update each frame
function e_add(e: Entity) {
    g_entities.push(e);
    for (let p_i = 0; p_i < indexed_properties.length; p_i++) {
        const p = indexed_properties[p_i];
        if (e.hasOwnProperty(p)) index_add(g_entities_with, p, e)
    }
    for (let t_i = 0; t_i < e.tags.length; t_i++) {
        const t = e.tags[t_i];
        index_add(g_entities_tagged, t, e)
    }
    return e
}

// removes an entity, effectively making it disappear
function e_remove(e: Entity) {
    // remove with children
    if (e.children.length) {
        e.children.forEach(e_remove);
    }
    if (e.parent) {
        for (var i = 0; i < e.parent.children.length; i++) {
            if (e.parent.children[i] === e) {
                e.parent.children.splice(i, 1);
            }
        }
    }
    // unregister
    for (let i = 0; i < g_entities.length; i++) {
        if (e === g_entities[i]) {
            g_entities.splice(i, 1);
            break;
        }
    }

    for (let p_i = 0; p_i < indexed_properties.length; p_i++) {
        let p = indexed_properties[p_i];
        if ((e as any)[p]) {
            for (let i = 0; i < g_entities_with[p].length; i++) {
                if (e === g_entities_with[p][i]) {
                    g_entities_with[p].splice(i, 1);
                    break;
                }
            }
        }
    }
    for (let t_i = 0; t_i < e.tags.length; t_i++) {
        let t = e.tags[t_i];
        for (let i = 0; i < g_entities_tagged[t].length; i++) {
            if (e === g_entities_tagged[t][i]) {
                g_entities_tagged[t].splice(i, 1);
                break;
            }
        }
    }
}


//////////////////////////////
// system:
//  entity updating
//////////////////////////////

// updates all entities according to their state
function e_update_all() {
    for (let e_i = 0; e_i < g_entities.length; e_i++) {
        const ent = g_entities[e_i];
        // call the method with the name corresponding to this entity's current state (if it exists)
        const fn = (ent as any)[ent.state];
        if (fn) fn.apply(ent)
        // removed?
        if (ent.done) {
            e_remove(ent);
        } else {
            // advance clock
            ent.t += 1
        }
    }
}


//////////////////////////////
// system:
//  rendering the world
//////////////////////////////

function r_render_all() {
    // render each of the rendering layers
    for (let z = 1; z < 9; z++) {
        const prop = `r${z}`;
        let ordIndex: EntityIndex = {};
        let minOrd = 127;
        let maxOrd = 0;
        const entities_rz = g_entities_with[prop] || [];
        for (let ent_i = 0; ent_i < entities_rz.length; ent_i++) {
            const ent = entities_rz[ent_i];
            let order = ent.pos && flr(ent.pos.y) || 0;
            if (ent.pop) order = 0;
            index_add(ordIndex, String(order), ent);
            if (order < minOrd) minOrd = order;
            if (order > maxOrd) maxOrd = order;
        }
        for (let o = maxOrd; o >= minOrd; o--) {
            const p = String(o);
            if (ordIndex[p]) {
                for (let ent_i = 0; ent_i < ordIndex[p].length; ent_i++) {
                    let ent = ordIndex[p][ent_i];
                    (ent as any)[prop].apply(ent); // TODO: is there a way to type? seems way harder
                    set_palette();
                }
            }
        }
    }
}


//////////////////////////////
// system:
//  layout
//////////////////////////////

function l_do_layouts() {
    for (let e_i = 0; e_i < g_entities_with.layout.length; e_i++) {
        const e = g_entities_with.layout[e_i];
        for (let c_i = 0; c_i < e.children.length; c_i++) {
            const c = e.children[c_i];
            (e as any).layout(c, c_i);
        }
    }
}

function l_apply(e: Entity) {
    const lpos = e.lpos || e.pos;
    const diff = v_sub(e.pos, lpos);
    const diff_len_sq = v_dot(diff, diff);
    if (diff_len_sq < 0.25) { // TODO: why do this? and why clone lpos?
        e.pos = { ...lpos };
    } else {
        e.pos = v_lerp(e.pos, lpos, e.llerp);
    }
}


//////////////////////////////
// drawing from templates
//////////////////////////////

// function draw_from_template(tpl) {
//     for (let e_i = 0; e_i < tpl.length; e_i++) {
//         const e = tpl[e_i];
//         e.fn();
//     }
// }

// //////////////////////////////
// // drawing shadows
// //////////////////////////////

function shadow(x1: number, y1: number, x2: number, y2: number, plt: number) {
    if (x2 - x1 > 63) {
        shadow(x1, y1, x1 + 63, y2, plt);
        shadow(x1 + 64, y1, x2, y2, plt);
        return;
    }
    x1 = round(x1);
    x2 = round(x2);
    y1 = round(y1);
    y2 = round(y2);
    let al = 0;
    let ar = 0;
    if (x1 % 2 == 1) {
        x1 -= 1;
        al = 1;
    }
    if (x2 % 2 == 0) {
        x2 += 1;
        ar = 1;
    }
    // copy to spritemem
    local memw = (x2 - x1 + 1) / 2
    local saddr = 0x6000 + shl(y1, 6) + x1 / 2
    local daddr = 0x1800
    for y = y1, y2 do
        memcpy(daddr, saddr, memw)
    saddr += 64
    daddr += 64
    end
    // copy back to screen
    // with shifted palette
    set_palette(plt)
    palt(13, false)
    local w, h = x2 - x1 + 1 - al - ar, y2 - y1 + 1
    sspr(al, 96, w, h, x1 + al, y1)
    set_palette()
}

obfn.sh = shadow

//////////////////////////////
//////////////////////////////

// //////////////////////////////
// // generic children work
// //////////////////////////////

// function move(child,parent)
//  local prev=child.parent
//  if (prev) del(prev.children,child)
//  if (parent) index_add(parent,"children",child)
//  child.parent=parent
//  // remember when everything moved
//  // to allow ordering
//  child.moved_on=g_move_ctr
//  g_move_ctr+=0x0.001
// end

// function is_empty(parent)
//  return #(parent.children or {})==0
// end

//////////////////////////////
// background
//////////////////////////////

function background() {
    const bg: Entity & { r1: () => void } = {
        ...e_new(),
        r1: background_r1
    };
    return bg;
}

function background_r1() {
    // map part
    palt(13, false);
    map(0, 0, -4, -5, 17, 17);
    // "3d" hanging cloth
    for (let y = 0; y <= 8; y++) {
        set_palette((y + 8) / 4)
        palt(13, false)
        // TODO:
        // sspr(0, 88 + y * 2 % 8, 104, 1,
        //     12 + y, 99 + y, 104 - y * 2, 1);
    }
    rectfill(21, 108, 106, 108, 0);
    // table legs
    set_palette();
    spr(100, 28, 109, 2, 1);
    spr(116, 82, 109, 2, 1);
}

//////////////////////////////
// pointer
//////////////////////////////

type Pointer = Entity & {
    script: any,
    delay: number,
    mode: "keys" | "mouse" | "script",
    pmode: "keys" | "mouse" | "script",
    idle: () => void,
    choose: (os: any, interaction: string, cancellable?: boolean) => void,
}
function pointer() {
    const pointer: Pointer = {
        ...e_new(),
        pos: v(64, 64),
        script: {},
        delay: 15,
        mode: "keys",
        pmode: "keys",
        idle: pointer_idle,
        choose: pointer_choose
    };
    return pointer;
}

// TODO: add this: Pointer
function pointer_idle() {
    if (this.script) {
        if (g_inp.mmove) {
            this.mode = "mouse";
            this.pos = g_inp.mpos;
            this.lpos = g_inp.mpos;
        }
        for (let b = 0; b <= 5; b++) {
            if (g_inp["b" + b + "press"]) {
                this.mode = "keys";
            }
        }
    } else if (this.mode !== "script") {
        this.pmode = this.mode;
        this.mode = "script";
    }
    const mode = this.mode;
    if (this.options) {
        // who controls?
        if (mode === "script") {
            this.script_control();
        } else if (mode === "mouse") {
            this.mouse_control();
        } else if (mode === "keys") {
            this.key_control();
        }
        // lerp
        l_apply(this);
    }
}

function pointer_script_control() {
    if (this.prompt) {
        this.delay = 25
        if (g_inp.proceed) {
            this.prompt.dismiss();
            this.prompt = null;
        }
    }
    if (this.delay > 0) {
        this.delay -= 1
    } else {
        let op = this.s_pop();
        if (op) this.s_op(op);
    }
}

//  function pointer_key_control()
//   if #self.script==0 then
//    // moving
//    for d=1,4 do
//     if g_inp["b"..(d-1).."press"] then
//      self:move(d)
// 			  sfx(2)
// 			 end
//    end
//    // picking and cancelling
//    if g_inp.b5press and self.cancellable then
//     self:select(nil)
//     self:confirm()
//    elseif g_inp.b4press then
//     self:confirm()
//    end
//   end
//  end

//  function pointer_mouse_control()
//   // hover
//   self.hovered=nil
//   local mpos=g_inp.mpos
//   local h=min_by(self.options,function(e)
//    return #(mpos-e.pos-e.sz*0.5)
//   end)
//   local d=mpos-h.pos
//   local close=d.x>=-5 and d.x<h.sz.x+5 and d.y>=-5 and d.y<h.sz.y+5
//   self.hovered=close and h
//   // selection
//   if self.hovered~=self.tgt then
//    self:select(self.hovered)
//   end
//   // confirming/cancelling
//   local want_confirm=
//    (self.interaction=="click" and g_inp.mb0press) or
//    (self.interaction=="drag" and g_inp.mb0rel)
//   if want_confirm then
//    self:confirm()
//   end
//  end

//  function pointer_confirm()
//   if not self.tgt and not self.cancellable then
//    return
//   end
//   g_runner.unblock(self.tgt)
//   self.options=nil
//   self:select()
//  end

function pointer_choose(os: any, interaction: string, cancellable: boolean = false) {
    this.options = os;
    this.interaction = interaction;
    this.cancellable = cancellable;
    if (this.mode != "mouse") {
        const tgt = min_by(os, (o) => v_lensq(v_sub(v_mul(this.pos, 0.01), v_mul(o.pos, 0.01))))
        this.select(tgt)
        this.snap()
    }
}

//  function pointer_move(d)
//   d=dirs[d]
//   local from=self.tgt and self.tgt.pos+self.tgt.sz*0.5 or self.pos
//   local tgt,mc=min_by(self.options,
//    function(o)
//     if (o==self.tgt) return 32767
//     return move_cost(from,o.pos+o.sz*0.5,d)
//    end)
//   if (tgt and mc<32767) self:select(tgt)
//   self:snap()
//  end

//  function pointer_snap()
//   local tgt=self.tgt
//   self.lpos=tgt.pos+tgt.sz*0.5+(tgt.pointer_off or v(0,0))
//  end

//  function pointer_select(option)
//   // deselect
//   if self.tgt then
//    self.tgt.selected=false
//    event(option,"on_deselect")
//   end
//   // check if allowed
//   if not index_of(self.options,option) then
//    option=nil
//   end
//   // select
//   self.tgt=option
//   if option then
//    option.selected=true
//    event(option,"on_select")
//   end
//  end

//  function pointer_r9(p)
//   local shown=
//    self.options or self.mode=="mouse"
//   if g_inp.touch and self.mode~="script" then
//    shown=false
//   end
//   if shown then
//    spr(4,p.x,p.y)
//   end
//  end

// function move_cost(from,to,d)
//  local delta=to-from
//  while abs(d.x)~=0 and sgn(delta.x)~=sgn(d.x) do
//   delta.x+=sgn(d.x)*128
//  end
//  while abs(d.y)~=0 and sgn(delta.y)~=sgn(d.y) do
//   delta.y+=sgn(d.y)*128
//  end
//  delta*=0.1
//  local dot=delta:norm():dot(d)
//  local mul=1+(1-dot)*10
//  if (dot<=0.5) mul*=100
//  return #delta*mul
// end

// //////////////////////////////
// // pointer scripting
// //////////////////////////////

// function pointer_s_pop()
//  local v=self.script[1]
//  del(self.script,v)
//  return v
// end

// function pointer_s_op(op)
//  if op=="move" then
//   self:move(self:s_pop())
//   self.delay=25
//  elseif op=="prompt" then
//   local n=self:s_pop()
//   local a=clone(anims["prompt"..n])
//   for n=1,n do
//    local txt=""
//    each_char(self:s_pop(),function(c)
//     txt=txt..(c=="/" and "," or c)
//    end)
//    a[n+2].t=txt
//   end
//   self.prompt=animation({dur=30,elems=a,locked=true})
//  elseif op=="wait" then
//   self.delay=60
//  elseif op=="reset" then
//   g_tutorial=false
//   g_game.score=0
//   g_game.best_cake=0
//   e_remove(g_reqs)
//   e_remove(g_recipe)
//   e_remove(g_tray)
//   g_tray=nil
//   g_reqs=reqs()
//   g_reqs:generate()
//   g_reqs:co_next()
//   foreach(g_hand.children,e_remove)
//   g_chooser.cancellable,g_chooser.tgt=true,nil
//   g_chooser:confirm()
//  else
//   self[op](self)
//   self.delay=60
//  end
// end

//////////////////////////////
// fx
//////////////////////////////

type Particle = {
    p: { x: number, y: number },
    v: { x: number, y: number },
    drag: number,
    l: number,
    d: number,
    grav: number,
};
function particle_new() {
    const particle: Particle = {
        p: { x: 0, y: 0 },
        v: { x: 0, y: 0 },
        drag: 1,
        l: 1,
        d: 0.016666,
        grav: 0,
    };
    return particle;
}

function particles() {
    const particles: Entity & {
        ps: Record<string, Particle>,
        idle: () => void,
        spawn: (p: Particle) => void,
        r8: () => void,
    } = {
        ...e_new(),
        ps: {},
        idle: particles_idle,
        spawn: particles_spawn,
        r8: particles_r8,
    };
    return particles;
}

function particles_idle() {
    for (const key in this.ps) {
        const p = this.ps[key];
        p.p.x += p.v.x;
        p.p.y += p.v.y;
        p.v.x *= p.drag;
        p.v.y *= p.drag;
        p.v.y += p.grav;
        p.l -= p.d;
        if (p.l <= 0) delete this.ps[key];
    }
}

function particles_spawn(p: Particle) {
    this.ps[rnd()] = p;
}

function particles_r8() {
    for (let key in this.ps) {
        const p = this.ps[key];
        let pos = p.p;
        if (p.radius) {
            // TODO:
            // circfill(pos.x, pos.y, p.radius * p.l, p.clr)
        }
        if (p.sradius) {
            let s = 1 - abs(p.l - 0.5) * 2
            // circfill(pos.x, pos.y, p.sradius * s, p.clr)
        }
    }
}


// floater=entity:extend[[
// ]]
//  function floater:idle()
//   self.vel+=v(0,0.15)
//   self.vel*=0.98
//   self.pos+=self.vel
//   self.done=self.pos.y>128
//  end

//  function floater:r9(p)
//   local w=#self.text*4
//   printdsh(self.text,p.x,p.y,self.clr,4,0.5)
//  end

// announce_clrs=ob[[6,7,9,10,12,]]
// function announce(text,clr,cards,ps)
//  ps=ps or 1
//  local t=v(0,0)
//  for c in all(cards) do
//   t+=c.pos+v(12,12)
//  end
//  t/=#cards
//  local d=0.05*(64-t.x)/64
//  floater({
//   text=text,clr=clr,pos=t,
//   vel=mav(2,rndf(0.2,0.3)+d)
//  })
//  for i=1,ps*g_combo.count*10 do
//   local v=mav(rndf(0.7,1.2),rndf(0,0.5))
//   g_particles:spawn({
//    p=t+v*2,v=v,
//    radius=rndf(1,3),
//    clr=announce_clrs[rndi(1,#announce_clrs)],
//    grav=0.02,drag=0.99,
//    d=0.02,l=rndf(1,1.3),
//   })
//  end
// end

// //////////////////////////////
// // fingers
// //////////////////////////////

// fingers=entity:extend[[
//  pos=v(64,96),
// ]]
//  function fingers:layout(c)
//   if g_chooser.mode=="mouse" then
//    self.pos=g_inp.mpos
//    c.lpos=
//     g_chooser.tgt
//      and g_chooser.tgt.pos
//      or self.pos-c.sz*0.5
//   else
//    self.pos=fingers.pos
//    c.lpos=self.pos-c.sz*0.5+mav(4,self.t/100)
//   end
//  end

// //////////////////////////////
// // gravity
// //////////////////////////////

// gravity={}
//  function gravity:falling()
//   self.vel+=v(0,0.2)
//   self.pos+=self.vel
//   self.done=self.pos.y>150
//  end

//  function gravity:fall()
//   local d=(64-self.pos.x)/64*0.4
//   self.vel=v(rndf(-0.4,0.4)+d,-2)
//   self:become("falling")
//  end

// //////////////////////////////
// // reqs
// //////////////////////////////

// reqs=entity:extend[[
//  next_value=1,
// ]]
//  function reqs:init()
//   self.krnd=randomizer({
//    range={0,5},
//    looseness=0.33,
//    no_repeats=true
//   })
//   self.ttrnd=randomizer({
//    range={1,#tray_types},
//    looseness=1,
//    no_repeats=true,
//   })
//  end

//  function reqs:generate()
//   local kind=self.krnd:next()
//   local trayt=tray_types[self.ttrnd:next()]
//   local u=upcoming({
//    trayt=trayt,
//    value=self.next_value,
//    kind=kind
//   })
//   move(u,self)
//   self.next_value+=1
//  end

//  function reqs:co_next()
//   g_recipe=recipe(self.children[1])
//   set(g_recipe,recipe)
//   e_remove(self.children[1])
//   self:generate()
//  end

//  function reqs:layout(c,i)
//   c.lpos=v(18+i*8,0)
//  end

//  function reqs:r7()
//   cutebox(0,3,34,4,1,5,0)
//   printdsh("next:",3,1,13,1)
//  end

// upcoming=entity:extend[[
//  pos=v(44,-10),
// ]]
//  function upcoming:idle()
//   l_apply(self)
//  end
//  function upcoming:r8(p)
//   set_palette(24+self.kind)
//   spr(174,p.x,p.y)
//  end

// recipe=entity:extend[[
//  pos=v(0,-40),
//  lpos=v(1,-2),
//  glow=0,
// ]]
//  set(recipe, gravity)

//  function recipe:idle()
//   l_apply(self)
//  end

//  function recipe:r9(p)
//   camera(-p.x,-p.y)
//   if self.glow>0 then
//    set_palette(mid(16+self.glow,16,21))
//    self.glow-=0.5
//   end
//   spr(189,-1,0,3,4)
//   if not self.fulfilled then
//    printc(self:text(),12,19,4)
//   else
//    spr(255,7,18)
//   end
//   set_palette(6)
//   palt(13,false)
//   palt(3,true)
//   spr(64+self.kind*2,4,3,2,2)
//   camera()
//  end

//  function recipe:recheck()
//   local total=0
//   for slot in all(g_tray.children) do
//    local c=slot:card()
//    if c and c.kind==self.kind then
//     total+=c.score
//    end
//   end
//   local fulfilled=total>=self.value
//   if fulfilled and not self.fulfilled then
//    self.glow=12
//    self:fall()
//    animation({
//     elems=anims.recipe_clear,
//     dur=45,
//    })
//   end
//   self.fulfilled=fulfilled
//  end

//  function recipe:text()
//   return self.value.."+"
//  end

//////////////////////////////
// new banner
//////////////////////////////

type Animation = Entity & {
    dur: number,
    at: number,
    locked: boolean,
    done: boolean,
    elems: any[],
    idle: () => void,
    dismiss: () => void,
    r8: () => void,
}
function animation() {
    const animation: Animation = {
        ...e_new(),
        dur: 60,
        at: 0,
        locked: false,
        done: false,
        elems: [],
        idle: animation_idle,
        dismiss: animation_dismiss,
        r8: animation_r8,
    }
    return animation;
}
function animation_idle(this: Animation) {
    this.at += 1
    if (this.locked && this.at > this.dur) {
        this.at = this.dur
    }
    this.done = this.at > this.dur * 2.5
}

function animation_dismiss(this: Animation) {
    this.locked = false
}

function animation_r8(this: Animation) {
    let t = 1 - this.at / this.dur;
    t = t ^ 5;
    for (const e of this.elems) {
        let dt = t * 128;
        if (e.sym) {
            dt = abs(dt);
        }
        (animation_functions as any)[e.fn](e.d * dt, e);
    }
}

const animation_functions = {
    sh(d: any, o: any) {
        const p = o.p + d;
        const c = p + o.s;
        p.x = max(round(p.x), 0);
        p.y = max(round(p.y), 0);
        c.x = min(round(c.x), 127);
        c.y = min(round(c.y), 127);
        if (p.x !== c.x && p.y !== c.y) {
            shadow(p.x, p.y, c.x, c.y, o.plt);
        }
    },
    prcd(d: any, o: any) {
        o.sp = g_chooser.pmode == "mouse" && 41 || 25
        animation_functions.dspr(d, o);
    },
    dspr(d: any, o: any) {
        if (o.blink && g_t % (o.blink * 2) < o.blink) return;
        spr(o.sp, o.p.x + d.x, o.p.y + d.y, o.s.x, o.s.y);
    },
    pdsh(d: any, o: any) {
        printdsh(o.t, o.p.x + d.x, o.p.y + d.y, o.c1, o.c2, o.a);
    },
    bar(d: any, o: any) {
        const p = o.p + d;
        const c = p + o.s;
        rectfill(p.x, p.y, c.x, c.y, o.c);
    }
}








// //////////////////////////////
// // actual animations
// //////////////////////////////

// anims={}
// anims.recipe_clear=ob[[
//  o(fn="sh",d=v(-2,0),p=v(0,49),s=v(127,2),plt=3),
//  o(fn="pdsh",p=v(64,48),d=v(1,0),t="recipe cleared!",c1=7,c2=5,a=0.5),
// ]]
// anims.prompt2=ob[[
//  o(fn="bar",d=v(2,0),p=v(0,27),s=v(127,22),c=0),
//  o(fn="bar",d=v(2,0),p=v(0,28),s=v(127,0),c=13),
//  o(fn="pdsh",p=v(64,31),d=v(-1,0),t="",c1=7,c2=13,a=0.5),
//  o(fn="pdsh",p=v(64,40),d=v(1,0),t="",c1=7,c2=13,a=0.5),
//  o(fn="prcd",p=v(118,45),d=v(1,0),s=v(1,1),sp=25,blink=45),
// ]]
// anims.prompt3=ob[[
//  o(fn="bar",d=v(2,0),p=v(0,23),s=v(127,31),c=0),
//  o(fn="bar",d=v(2,0),p=v(0,24),s=v(127,0),c=13),
//  o(fn="pdsh",p=v(64,27),d=v(-1,0),t="",c1=7,c2=13,a=0.5),
//  o(fn="pdsh",p=v(64,36),d=v(1,0),t="",c1=7,c2=13,a=0.5),
//  o(fn="pdsh",p=v(64,45),d=v(-1,0),t="",c1=7,c2=13,a=0.5),
//  o(fn="prcd",p=v(118,50),d=v(1,0),s=v(1,1),sp=25,blink=45),
// ]]
// anims.made_cake=ob[[
//  o(fn="bar",d=v(-2,0),p=v(0,40),s=v(127,0),c=0),
//  o(fn="bar",d=v(-2,0),p=v(0,71),s=v(127,0),c=0),
//  o(fn="sh",d=v(2,0),p=v(0,40),s=v(127,1),plt=2),
//  o(fn="sh",d=v(2,0),p=v(0,42),s=v(127,29),plt=3),
//  o(fn="dspr",p=v(48,32),d=v(0,-1),sym=1,sp=134,s=v(4,3)),
//  o(fn="pdsh",p=v(64,52),d=v(1,0),t="fabulous cake!",c1=7,c2=13,a=0.5),
//  o(fn="pdsh",p=v(64,61),d=v(-1,0),t="24 points!",c1=10,c2=4,a=0.5),
// ]]
// anims.failed_cake=ob[[
//  o(fn="bar",d=v(-2,0),p=v(0,46),s=v(127,0),c=0),
//  o(fn="bar",d=v(-2,0),p=v(0,68),s=v(127,0),c=0),
//  o(fn="sh",d=v(2,0),p=v(0,46),s=v(127,1),plt=2),
//  o(fn="sh",d=v(2,0),p=v(0,48),s=v(127,20),plt=4),
//  o(fn="pdsh",p=v(78,46),d=v(1,0),t="not enough chocolate!",c1=14,c2=2,a=0.5),
//  o(fn="pdsh",p=v(42,56),d=v(-1,0),t="final score:",c1=10,c2=4,a=0),
//  o(fn="pdsh",p=v(42,64),d=v(1,0),t="best cake:",c1=10,c2=4,a=0),
//  o(fn="pdsh",p=v(114,56),d=v(-1,0),t="12345",c1=7,c2=5,a=1),
//  o(fn="pdsh",p=v(114,64),d=v(1,0),t="123",c1=7,c2=5,a=1),
// ]]
// cake_qualities=ob[[
//  o(5,"nice"),
//  o(15,"tasty"),
//  o(25,"yummy"),
//  o(40,"delicious"),
//  o(60,"luscious"),
//  o(80,"scrumptious"),
//  o(160,"heavenly"),
//  o(320,"divine"),
//  o(640,"unbelievable"),
// ]]

// //////////////////////////////
// // combo counter
// //////////////////////////////

// combo=entity:extend[[
//  pos=v(64,83),
//  lpos=v(64,83),
//  ctr=v(32,51),
//  count=0,
//  llerp=0.3,
//  glow=0,
// ]]
//  function combo:idle()
//   l_apply(self)
//  end

//  function combo:bump(by)
//   self.count+=by
//   self.pos-=v(0,10)
//  end

//  function combo:reset()
//   self.count=0
//   self.pos=combo.pos
//   self.lpos=combo.pos
//  end

//  function combo:co_apply()
//   local bonus=self.count-1
//   self.glow=12
//   local cs=card.played_in_move_order()
//   for frm=0,30 do
//    local t=frm/30
//    local ang=lerp(0,0.6,t)
//    self.lpos+=mav(lerp(3,12,t),ang)
//    local crd=cs[frm/5]
//    if crd then
//     crd:point_out()
//     crd.score+=bonus
//     co_update_state()
//     announce("+"..bonus,10,{crd},0.3)
//     sfx(3)
//    end
//    g_runner.delay(1) yield()
//   end
//  end

//  function combo:r8(p)
//   local cnt=self.count
//   set_palette(mid(16,21,self.glow))
//   if cnt>=2 then
//    spr(128,p.x-19,p.y,5,2)
//    printdsh(cnt,p.x+19,p.y+4,10,4,0.5)
//   end
//  end

// //////////////////////////////
// // trays
// //////////////////////////////

// tray_types=ob[[
//  o(
//   mx=36,my=0,
//   grid=o(
//    v(0,0),v(1,0),
//    v(0,1),v(1,1),v(2,1),
//   ),
//   rpos=v(84,21),
//  ),
//  o(
//   mx=48,my=0,
//   grid=o(
//           v(1,0),v(2,0),
//    v(0,1),v(1,1),v(2,1),
//   ),
//   rpos=v(18,18),
//  ),
//  o(
//   mx=60,my=0,
//   grid=o(
//    v(0,0),       v(2,0),
//    v(0,1),v(1,1),v(2,1),
//   ),
//   rpos=v(53,13),
//  ),
// ]]

// tray=entity:extend[[
//  tags=o("tray"),
//  score=0,
//  shake=0,
// ]]
//  set(tray, gravity)
//  function tray:init()
//   set(self,self.trayt)
//   self.slots={}
//   for c in all(self.grid) do
//    local s=
//     slot({
//      tray=self,
//      coords=c
//     })
//    self.slots[c:str()]=s
//    move(s,self)
//   end
//  end

//  function tray:idle(t)
//   l_apply(self)
//   if self.shake>0 then
//    self.pos+=v(sin(t/15)*self.shake,0)
//    self.shake-=0.15
//   end
//  end

//  function tray:anim_shake()
//   self.shake=5
//  end

//  function tray:update_score()
//   local total=0
//   for s in all(self.children) do
//    local sc=s:card()
//    if (sc) total+=sc.score
//   end
//   self.score=total
//  end

//  function tray:co_complete()
//   // check with recipe
//   local rec=g_recipe
//   if not rec.fulfilled then
//    self:co_fail()
//    return false
//   end
//   // blink everything
//   for s in all(self.children) do
//    s:card():point_out()
//   end
//   music(0)
//   g_runner.delay(15) yield()
//   // score and pop off the screen
//   self:fall()
//   local score=self.score
//   g_game:score_cake(score)
//   local quality=min_by(cake_qualities,
//    function(q) return abs(q[1]-score) end)[2]
//   anims.made_cake[6].t=quality.." cake!"
//   anims.made_cake[7].t=score.." points!"
//   animation({elems=anims.made_cake})
//   g_runner.delay(90) yield()
//   // done!
//   return true
//  end

//  function tray:co_fail()
//   // hi-score?
//   if g_game.score>dget(0) then
//    dset(0,g_game.score)
//   end
//   // show fail screen
//   self:anim_shake()
//   music(1)
//   g_recipe.lpos=v(8,44)
//   e_remove(g_reqs)
//   e_remove(g_game)
//   local f=anims.failed_cake
//   f[5].t="not enough "..kinds[g_recipe.kind+1].."!"
//   f[8].t=tostr(g_game.score)
//   f[9].t=tostr(g_game.best_cake)
//   local anim=animation({
//    elems=f,locked=1
//   })
//   g_runner.waitforbtn() yield()
//   // dismiss everything
//   anim:dismiss()
//   g_recipe:fall()
//   self:fall()
//  end

//  function tray:is_complete()
//   return #filter(self.children,is_empty)==0
//  end

//  function tray:anim_nudge()
//   self.pos.y+=4
//  end

//  function tray:r2(p)
//   palt(3,true)
//   palt(13,false)
//   map(self.mx,self.my,p.x-8,p.y-8,11,9)
//  end


// slot=entity:extend[[
//  tags=o("slot"),
//  sz=v(24,24),
// ]]
//  function slot:idle()
//   self.pos=self.tray.pos+self.coords*24
//  end

//  slot.init=slot.idle

//  function slot:layout(child,i)
//   child.lpos=self.pos
//  end

//  function slot:on_select()
//   self:evaluate_drop()
//  end

//  function slot:evaluate_drop()
//   local fc=g_fingers.children and g_fingers.children[1]
//   local effects={}
//   for d=1,4 do
//    local ns=self:neighbour(d)
//    local nc=ns and ns:card()
//    if nc then
//     if nc.kind==fc.kind then
//      add(effects,{d=d,c=12})
//     end
//     local fl=fc.links[d]
//     if fl and fl.kind==nc.kind then
//      add(effects,{d=d,c=9})
//     end
//     local id=inverse[d]
//     local nl=nc.links[id]
//     if nl and nl.kind==fc.kind then
//      add(effects,{d=d,c=9,inv=true})
//     end
//    end
//   end
//   self.effects=effects
//  end

//  function slot:neighbour(direction)
//   local dc=self.coords+dirs[direction]
//   local slot=self.tray.slots[dc:str()]
//   return slot
//  end

//  function slot:neighbours()
//   local ns={}
//   for d=1,4 do
//    add(ns,self:neighbour(d))
//   end
//   return ns
//  end

//  function slot:card()
//   return self.children and self.children[1]
//  end

//  function slot:r3(p)
//   if self.selected then
//    local d=flr(self.t%30/15)
//    camera(-p.x,-p.y)
//    spr(9,1+d,1+d)
//    spr(9,15-d,1+d,1,1,true)
//    spr(9,15-d,15-d,1,1,true,true)
//    spr(9,1+d,15-d,1,1,false,true)
//    camera()
//   end
//  end

//  function slot:r9(p)
//   if self.selected then
//    camera(-p.x,-p.y)
//    for e in all(self.effects) do
//     if self.t%10==e.d then
//      local p=self.pos+v(12+rndf(-1,1),12+rndf(-1,1))
//      local v=dirs[e.d]
//      if e.inv then
//       p+=v*24
//       v*=-1
//      end
//      g_particles:spawn({
//       p=p,v=v,
//       d=0.05,
//       radius=2.5,
//       clr=e.c,
//      })
//     end
//     if self.t%45==0 then
//      self:neighbour(e.d):card():point_out(6)
//     end
//    end
//    camera()
//   end
//  end

// //////////////////////////////
// // cards
// //////////////////////////////

// kinds=ob[[
//  "chocolate","jam",
//  "raisins","honey",
//  "dough","nuts",
// ]]
// card=entity:extend[[
//  tags=o("card"),
//  t_bg=o(o(1,1,22,22,13,fn="rf")),
//  t_sides=o(
//   o(o(0,1,0,22,1,fn="rf"),
//     o(1,1,1,22,7,fn="rf")),
//   o(o(23,1,23,22,0,fn="rf"),
//     o(22,1,22,22,5,fn="rf")),
//   o(o(1,0,22,0,1,fn="rf"),
//     o(1,1,22,1,7,fn="rf")),
//   o(o(1,23,22,23,0,fn="rf"),
//     o(1,22,22,22,5,fn="rf")),
//  ),
//  sz=v(24,24),
//  glow=0,
// ]]
// cardbg=ob[[
//  o(0,0,23,23,13,fn="rf"),
// ]]
//  function card:init()
//   self.icn=64+self.kind*2
//  end

//  function card:idle()
//   l_apply(self)
//  end

//  function card:point_out(n)
//   self.glow=n or 9
//  end

//  function card.played_in_move_order()
//   local played=filter(
//    entities_tagged.card,
//    function(c)
//     return c.parent and c.parent:is_a("slot")
//    end)
//   return sort_by(played,
//    function(c)
//     return -c.moved_on
//    end)
//  end

//  function card:find_pulls()
//   local ps={}
//   for d=1,4 do
//    local l=self.links[d]
//    if l then
//     local nc=self:neighbour(d)
//     if nc and nc.kind==l.kind then
//      add(ps,make_pull(self,l))
//     end
//    end
//   end
//   return ps
//  end

//  function card:neighbour(d)
//   local slt=self.parent
//   if (not slt or not slt:is_a("slot")) return
//   local ns=slt:neighbour(d)
//   return ns and ns:card()
//  end

//  function card:find_fused()
//   local fs={}
//   for d=1,4 do
//    local nc=self:neighbour(d)
//    if nc and nc.kind==self.kind then
//     add(fs,nc)
//    end
//   end
//   return fs
//  end

//  function card:co_place(slot)
//   self.llerp=0.5
//   move(self,slot)
//   slot.tray:anim_nudge()
//   g_runner.delay(8)
//   yield()
//  end

//  function card:co_fuse_with(cs)
//   self:point_out()
//   for c in all(cs) do
//    // glow
//    c:point_out()
//    // score
//    self.score+=c.score
//    // links
//    self.links=merge(c.links,self.links)
//   end
//   // announce
//   sfx(min(5+g_combo.count,8))
//   announce("fuse!",10,{self,other})
//   // let animation run
//   g_runner.delay(15) yield()
//   // actually move
//   for c in all(cs) do
//    c.llerp=0.15
//    move(c,self.parent)
//   end
//   g_runner.delay(12) yield()
//   // remove extra cards
//   foreach(cs,e_remove)
//  end

//  function card:r7(p)
//   local slotted=self.parent:is_a("slot")
//   // shadow
//   if not slotted then
//    for dy=0,2 do
//     shadow(p.x+dy,p.y+23+dy,p.x+24-dy,p.y+23+dy,2)
//    end
//    shadow(p.x+24,p.y+2,p.x+24,p.y+22,2)
//   end
//   // glow
//   set_palette(16+mid(self.glow,0,5))
//   if (self.glow>0) self.glow-=0.5
//   // background
//   camera(-p.x,-p.y)
//   draw_from_template(card.t_bg)
//   // borders
//   for s=1,4 do
//    draw_from_template(card.t_sides[s])
//   end
//   // links
//   for d,l in pairs(self.links) do
//    local lp=v(8,8)+dirs[d]*12
//    local n=self:neighbour(d)
//    if n then
//     if (d==2 and n.links[1]) lp.x-=1
//     if (d==4 and n.links[3]) lp.y-=1
//    end
//    set_palette(24+l.kind)
//    spr(169+d,lp.x,lp.y)
//   end
//   set_palette(16+mid(self.glow,0,5))
//   // item sprite
//   palt(3,true)
//   palt(13,false)
//   spr(self.icn,4,4,2,2)
//   // score
//   set_palette(self.kind+8)
//   local ln=#tostr(self.score)
//   spr(136+ln*2,5+ln*2,18,2,2)
//   print(self.score,20-2*ln,20,8)
//   // reset cam
//   camera()
//  end

// //////////////////////////////
// // pulls
// //////////////////////////////

// // pull objects represent
// // a link about to happen
// pull=object:extend[[
// ]]
//  function pull:conflicts_with(other)
//   return #filter(
//    self.cards,
//    function(c)
//     return index_of(other.cards,c)
//    end
//   )>0
//  end

//  function pull:merge_with(with)
//   // merge card list
//   local crds=clone(self.cards)
//   for c in all(with.cards) do
//    if not index_of(crds,c) then
//     add(crds,c)
//    end
//   end
//   // merge link list
//   local lnks=concat(
//    self.links,with.links
//   )
//   // make new
//   return pull({
//    cards=crds,links=lnks
//   })
//  end

//  function pull:score()
//   local _,bonus=min_by(
//    self.cards,
//    function(c) return c.score end
//   )
//   for c in all(self.cards) do
//    c:point_out()
//    c.score+=bonus*(#self.links)
//   end
//   for l in all(self.links) do
//    announce("link +"..bonus.."!",10,
//     {l.crd,l.other})
//   end
//  end

//  function pull:swap()
//   // remove links that took part
//   for l in all(self.links) do
//    l.crd.links[l.d]=nil
//   end
//   // move cards if possible
//   if #self.cards==2 then
//    local a,b=self.cards[1],self.cards[2]
//    a.llerp,b.llerp=0.2,0.2
//    local ap,bp=a.parent,b.parent
//    move(a,bp)
//    move(b,ap)
//   end
//  end

// function make_pull(card,link)
//  local d=link.direction
//  local other=card:neighbour(d)
//  return pull({
//   links={{crd=card,other=other,d=d}},
//   cards={card,other}
//  })
// end

// function co_execute_pulls(ps)
//  sfx(min(5+g_combo.count,8))
//  foreach(ps,pull.score)
//  g_runner.delay(12) yield()
//  foreach(ps,pull.swap)
//  g_runner.delay(12) yield()
// end

// function merge_pulls(ps)
//  local nothing_merged
//  repeat
//   nothing_merged=true
//   for i=1,#ps do
//    for j=i+1,#ps do
//     local a,b=ps[i],ps[j]
//     if a:conflicts_with(b) then
//      local n=a:merge_with(b)
//      del(ps,a)
//      del(ps,b)
//      add(ps,n)
//      nothing_merged=false
//      goto retry
//     end
//    end
//   end
//   ::retry::
//  until nothing_merged
//  return ps
// end

// //////////////////////////////
// // hand
// //////////////////////////////

// hand=entity:extend[[
//  rnds=o(
//   k=o(range=o(0,5)),
//   ld=o(range=o(1,4),looseness=0.5),
//   lk=o(range=o(0,5)),
//   v=o(es=o(1,2,2,3)),
//  ),
// ]]
//  function hand:init()
//   self.children={}
//   for k,v in pairs(self.rnds) do
//    self[k.."rnd"]=
//     randomizer(v)
//   end
//  end
//  function hand:co_deal_new(force_recipe)
//   // possible?
//   local ch=self.children
//   if (#ch>=5) return
//   // forced draw?
//   local k
//   local forced=
//    force_recipe and
//    #ch==4 and
//    #filter(ch,
//     function(c)
//      return c.kind==g_recipe.kind
//     end)==0
//   if forced then
//     k=g_recipe.kind
//   end
//   // random kind
//   if not k then
//    k=self.krnd:next()
//   end
//   // make the card
//   local c=card({
//    pos=v(144,140),
//    lpos=v(144,140),
//    kind=k,
//    score=self.vrnd:next(),
//    links={}
//   })
//   // make links
//   local link_count=1
//   for l=1,link_count do
//    local link_k,link_d
//    repeat
//     link_k=
//      self.lkrnd:next(k)
//     link_d=
//      self.ldrnd:next()
//    until not c.links[link_d]
//    c.links[link_d]={direction=link_d,kind=link_k}
//   end
//   // move
//   move(c,self)
//   sfx(1)
//   // animation
//   g_runner.delay(8)
//   yield()
//  end

//  function hand:layout(child,i)
//   local n=#self.children
//   local x=64+(i-1-n/2)*25
//   child.lpos=v(x,101-(child.selected and 4 or 0))
//  end

// //////////////////////////////
// // menu stuff
// //////////////////////////////

function logo() {
    const logo = animation();
    logo.dur = 45;
    logo.elems = [
        { fn: "sh", d: v(0, -1), p: v(0, 18), s: v(127, 2), plt: 2, },
        { fn: "sh", d: v(0, -1), p: v(0, 20), s: v(127, 22), plt: 3, },
        { fn: "bar", d: v(0, -1), p: v(0, 18), s: v(127, 2), c: 0, },
        { fn: "bar", d: v(0, -1), p: v(0, 43), s: v(127, 2), c: 0, },
        { fn: "dspr", d: v(0, 1), p: v(44, 17), s: v(5, 4), spr: 10, },
    ];
    logo.locked = true;
    return logo
}

// blinker=entity:extend[[
// ]]
//  function blinker:r8(p)
//   if (self.t<60) return
//   local t=(self.t-60)%90
//   if t<=45 then
//    printdsh(self.text,p.x,p.y,10,4,0.5)
//   end
//   if (t==0) sfx(2)
//  end

function menu_text() {
    const menu_text: Entity & {
        r8: () => void
    } = {
        ...e_new(),
        r8: menu_text_r8
    }
    return menu_text;
}
function menu_text_r8() {
    if (Number(dget(0)) > 0) {
        printdsh("best score: " + dget(0), 64, 111, 7, 13, 0.5)
        printdsh("best cake: " + dget(1), 64, 119, 7, 13, 0.5)
    } else {
        printdsh("controls:", 64, 99, 15, 4, 0.5)
        printdsh("use mouse/touch to drag", 64, 109, 6, 5, 0.5)
        printdsh("or arrows+[z]/[x] on keyboard", 64, 117, 6, 5, 0.5)
    }
}

function menu_op(pos: Vec, text: String) {
    const menu_op: Entity & {
        text: String,
        sz: Vec,
        pointer_off: Vec,
        r8: () => void
    } = {
        ...e_new(),
        text,
        pos,
        sz: v(80, 10),
        pointer_off: v(21, 0),
        r8: menu_op_r8
    }
    return menu_op
}
function menu_op_r8() {
    const sh = this.selected && 3 || 2;
    const p = this.pos;
    //   shadow(p.x,p.y-1,p.x+71,p.y+8,sh); TODO:
    printdsh(this.text, p.x + 36, p.y + 1, 10, 4, 0.5);
}

function* main_menu() {
    while (true) {
        console.log("test")
        // show the menu
        const s = menu_op(v(28, 61), "start game");
        const htp = menu_op(v(28, 74), "how to play");
        const menu_entities = [logo(), menu_text(), s, htp];
        menu_entities.forEach(e_add);
        // g_chooser.pos = v(64, 40);
        // g_runner.choose({ s, htp }, "click");
        // const choice = yield;
        // g_tutorial = choice == htp
        // menu_entities.forEach(e_remove);
        // // play the game
        // co_init_game();
        // if (g_tutorial) {
        //     co_init_tutorial();
        // }
        // game_logic(g_runner);
        // co_end_game();
        g_runner.delay(75);
        yield;
    }
}

// //////////////////////////////
// // game
// //////////////////////////////

// game=entity:extend[[
//  score=0,best_cake=0,
// ]]
//  function game:score_cake(pts)
//   self.best_cake=max(pts,self.best_cake)
//   if pts>dget(1) and not g_tutorial then
//    dset(1,pts)
//   end
//   self.score+=pts
//  end

//  function game:r8()
//   local w=#tostr(self.score)*4
//   cutebox(99-w,0,127,7,1,5,0)
//   printdsh(self.score,126,1,7,5,1)
//   printdsh("score:",126-w,1,13,1,1)
//  end

// //////////////////////////////
// // game logic
// //////////////////////////////

// tray_def=ob[[
//  pos=v(-40,24),
//  lpos=v(27,28),
// ]]

// function co_update_state()
//  g_tray:update_score()
//  g_recipe:recheck()
// end

// function game_logic(rnr)
//  // initial recipes
//  g_reqs:generate()
//  g_reqs:co_next()
//  while true do
//   // new turn
//   g_combo:reset()
//   // spawn missing trays
//   // and refresh hand
//   if not g_tray then
//    g_tray=tray(set(tray_def,{
//    	trayt=g_recipe.trayt
//    }))
//    while #g_hand.children<5 do
//     g_hand:co_deal_new(true)
//    end
//   end
//   // game over?
//   if is_empty(g_hand) then
//    return
//   end
//   // pick a card
//   rnr:choose(g_hand.children,"click")
//   local card=yield()
//   if not card then
//    goto cancelled
//   end
//   move(card,g_fingers)
//   card.pop=true
//   sfx(1)
//   // choose a spot for it
//   rnr:choose(filter(
//    entities_tagged.slot,
//    is_empty
//   ),"drag",true)
//   local spot=yield()
//   // un"pop" the card
//   card.pop=false
//   // cancelled?
//   if not spot then
//    move(card,g_hand)
//    sfx(1)
//    goto cancelled
//   end
//   // play it there
//   card:co_place(spot)
//   co_update_state()
//   sfx(0)
//   // fusing and linking
//   local triggered
//   local pulls
//   repeat
//    triggered=false
//    // fuses first
//    for card in all(card.played_in_move_order()) do
//     local fused=card:find_fused()
//     if #fused>0 then
//      g_combo:bump(1)
//      card:co_fuse_with(fused)
//      for i=1,#fused do
//       g_hand:co_deal_new()
//      end
//      triggered=true
//      goto reevaluate
//     end
//    end
//    // pulls later
//    pulls={}
//    for c in all(card.played_in_move_order()) do
//     pulls=concat(pulls,c:find_pulls())
//    end
//    pulls=merge_pulls(pulls)
//    if #pulls>0 then
//     g_combo:bump(#pulls)
//     co_execute_pulls(pulls)
//     if not g_tray:is_complete() then
//      // don't draw on complete trays,
//      // we'll draw to full anyway
//      // and forcing will work better then
//      g_hand:co_deal_new()
//     end
//     triggered=true
//     goto reevaluate
//    end
//    ::reevaluate::
//    co_update_state()
//   until not triggered
//   // apply combo bonuses
//   if g_combo.count>=2 then
//    g_combo:co_apply()
//   end
//   // remove complete trays
//   if g_tray:is_complete() then
//    // remove tray
//    local valid=g_tray:co_complete()
//    if not valid then
//     return
//    end
//    g_tray=nil
//    // new recipe
//    g_reqs:co_next()
//   end
//   // end turn
//   ::cancelled::
//  end
// end

//////////////////////////////
// running through coroutines
//////////////////////////////

function runner() {
    const runner = {
        blocked: false,
        start: runner_start,
        process: runner_process,
        unblock: runner_unblock,
        delay: runner_delay,
        waitforbtn: runner_waitforbtn,
        choose: runner_choose
    }
    return runner;
}
function runner_start(logic: () => void) {
    this.co = logic()
}

function runner_process() {
    if (!this.blocked) {
        this.co.next(this.value)
        this.value = true
    }
}

function runner_unblock(value: any = null) {
    this.value = value;
    this.blocked = false;
}

function runner_delay(dur: number) {
    function delay() {
        const delay: Entity & {
            idle: () => void
        } = {
            ...e_new(),
            idle: function delay_idle() {
                this.done = this.t >= dur
                if (this.done) g_runner.unblock();
            }
        }
        return delay;
    }
    this.blocked = true;
    e_add(delay());
}

function runner_waitforbtn() {
    function waitforbtn() {
        const delay: Entity & {
            idle: () => void
        } = {
            ...e_new(),
            idle: function waitforbtn_idle() {
                if (g_inp.proceed) {
                    this.done = true;
                    g_runner.unblock();
                }
            }
        }
        return delay;
    }
    this.blocked = true
    e_add(waitforbtn());
}

function runner_choose(os: any, interaction: string, cancellable?: boolean) {
    this.blocked = true;
    g_chooser.choose(os, interaction, cancellable);
}


// //////////////////////////////
// // tutorial
// //////////////////////////////

// tutorial=//[[prot]]ob[[
//  cards=o(
//   k=o(0,0,1,3,4,5),
//   ld=o(1,2,3,4,1,3),
//   lk=o(1,3,3,2,2,0),
//  ),
//  recipes=o(
//   k=o(0),
//   tt=o(1),
//  ),
//  script=o(
//   "prompt",2,
//   "you're baking cakes",
//   "for the holidays!",
//   "prompt",2,
//   "you do this by putting",
//   "ingredients into the tray.",
//   "move",2,
//   "move",2,
//   "confirm",
//   "move",1,
//   "move",1,
//   "move",3,
//   "move",2,
//   "move",4,
//   "move",2,
//   "confirm",
//   "prompt",2,
//   "you have to match the recipe",
//   "in the top-left corner.",
//   "prompt",3,
//   "this one means that the total",
//   "score on chocolate tiles used",
//   "in your cake must be 1 or more.",
//   "move",1,
//   "move",1,
//   "move",1,
//   "confirm",
//   "confirm",
//   "prompt",2,
//   "the recipe will fall away",
//   "when it's finished.",
//   "prompt",3,
//   "if you place two identical",
//   "tiles next to each other/",
//   "they will fuse.",
//   "move",1,
//   "confirm",
//   "move",3,
//   "move",1,
//   "move",2,
//   "move",4,
//   "confirm",
//   "prompt",2,
//   "tiles with different symbols",
//   "interact through links.",
//   "prompt",2,
//   "see these colored knobs",
//   "on the sides of your tiles?",
//   "prompt",3,
//   "a red knob on the left means",
//   "you can link to a red tile",
//   "through that side.",
//   "move",1,
//   "confirm",
//   "wait",
//   "confirm",
//   "prompt",2,
//   "this swaps the tiles and",
//   "adds bonus points to both.",
//   "prompt",2,
//   "forming longer combos adds",
//   "points to all your tiles.",
//   "confirm",
//   "move",1,
//   "move",2,
//   "wait",
//   "confirm",
//   "prompt",3,
//   "once the tray fills up/",
//   "the cake is scored",
//   "and a new recipe appears.",
//   "move",1,
//   "move",1,
//   "confirm",
//   "confirm",
//   "prompt",2,
//   "you're on your own now!",
//   "good luck!",
//   "reset",
//  ),
// ]]//[[protend]]

// //////////////////////////////
// // main loop
// //////////////////////////////

// function grab()
//  set_palette()
//  palt(13,false)
//  for k=0,5 do
//   sspr(k*16,32,16,16,0,0,8,8)
//   for x=0,7 do
//    for y=0,7 do
//     sset(64+k*8+x,120+y,pget(x,y))
//    end
//   end
//  end
//  cstore()
// end

// function co_init_game()
//  // counters
//  g_move_ctr=0
//  // per-game entities
//  g_game=game()
//  g_hand=hand()
//  g_combo=combo()
//  g_reqs=reqs()
//  g_fingers=fingers()
//  g_tray=nil
// end

// function co_end_game()
//  // retire everything
//  local retiring={
//   g_game,g_hand,g_combo,
//   g_reqs,g_fingers
//  }
//  foreach(retiring,e_remove)
// end

// function co_init_tutorial()
//  force(g_hand,tutorial.cards)
//  force(g_reqs,tutorial.recipes)
//  g_chooser.script=clone(tutorial.script)
//  g_chooser.pos=v(64,64)
// end

const g_inp: any = {};
let g_t = 0;
init_palettes();
e_add(background());
const g_particles = particles();
const g_chooser = pointer();
const g_runner = runner();
g_runner.start(main_menu);
start("poc", 9, 2, update, draw, 60);
function update() {
    g_t += 1;
    // l_do_layouts();
    // i_update_input();
    e_update_all();
    g_runner.process();
}

function draw() {
    cls();
    r_render_all();
}