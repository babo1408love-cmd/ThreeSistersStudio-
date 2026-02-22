/**
 * spirit-attack-generator.js — 정령 속성공격 생성기
 * 8속성 × 5스킬 = 40종, Canvas renderAttack
 * 이펙트: projectile/aoe/cone/beam/wave/line/pillar/rain/vortex/multi_hit
 */

const ATTR_COLORS = {
  fire:   {p:'#FF4500',s:'#FFA500',g:'rgba(255,69,0,0.4)'},
  water:  {p:'#1E90FF',s:'#87CEEB',g:'rgba(30,144,255,0.4)'},
  earth:  {p:'#8B4513',s:'#DEB887',g:'rgba(139,69,19,0.4)'},
  wind:   {p:'#98FB98',s:'#F0FFF0',g:'rgba(152,251,152,0.4)'},
  light:  {p:'#FFD700',s:'#FFFACD',g:'rgba(255,215,0,0.4)'},
  dark:   {p:'#6A0DAD',s:'#9370DB',g:'rgba(106,13,173,0.4)'},
  nature: {p:'#228B22',s:'#90EE90',g:'rgba(34,139,34,0.4)'},
  ice:    {p:'#00CED1',s:'#E0FFFF',g:'rgba(0,206,209,0.4)'},
};

// ── 40종 스킬 (8속성 × 5스킬) ──
export const SKILLS = {
  // 불
  fire_arrow:    {id:'fire_arrow',   attr:'fire',  name:'불화살',    tier:1,dmg:12,cd:1.5,fx:'projectile',emoji:'🔥'},
  flame_burst:   {id:'flame_burst',  attr:'fire',  name:'화염폭발',  tier:2,dmg:22,cd:4,  fx:'aoe',      emoji:'💥',radius:60},
  fire_breath:   {id:'fire_breath',  attr:'fire',  name:'화염브레스',tier:3,dmg:28,cd:5,  fx:'cone',     emoji:'🐉',angle:50},
  meteor:        {id:'meteor',       attr:'fire',  name:'유성우',    tier:4,dmg:18,cd:7,  fx:'rain',     emoji:'☄️',count:6},
  inferno_pillar:{id:'inferno_pillar',attr:'fire', name:'지옥불기둥',tier:5,dmg:45,cd:10, fx:'pillar',   emoji:'🌋'},
  // 물
  water_bolt:    {id:'water_bolt',   attr:'water', name:'물화살',    tier:1,dmg:10,cd:1.2,fx:'projectile',emoji:'💧'},
  tidal_wave:    {id:'tidal_wave',   attr:'water', name:'해일',      tier:2,dmg:20,cd:4,  fx:'wave',     emoji:'🌊',radius:80},
  water_beam:    {id:'water_beam',   attr:'water', name:'워터빔',    tier:3,dmg:26,cd:5,  fx:'beam',     emoji:'💧'},
  rain_storm:    {id:'rain_storm',   attr:'water', name:'폭풍우',    tier:4,dmg:14,cd:6,  fx:'rain',     emoji:'🌧️',count:10},
  geyser:        {id:'geyser',       attr:'water', name:'간헐천',    tier:5,dmg:40,cd:10, fx:'pillar',   emoji:'⛲'},
  // 땅
  rock_throw:    {id:'rock_throw',   attr:'earth', name:'바위던지기',tier:1,dmg:14,cd:2,  fx:'projectile',emoji:'🪨'},
  earthquake:    {id:'earthquake',   attr:'earth', name:'지진',      tier:2,dmg:24,cd:5,  fx:'wave',     emoji:'🌍',radius:100},
  stone_cone:    {id:'stone_cone',   attr:'earth', name:'돌파편',    tier:3,dmg:22,cd:4,  fx:'cone',     emoji:'💎',angle:45},
  boulder_rain:  {id:'boulder_rain', attr:'earth', name:'낙석',      tier:4,dmg:20,cd:7,  fx:'rain',     emoji:'🪨',count:5},
  earth_pillar:  {id:'earth_pillar', attr:'earth', name:'대지기둥',  tier:5,dmg:48,cd:10, fx:'pillar',   emoji:'🏔️'},
  // 바람
  wind_blade:    {id:'wind_blade',   attr:'wind',  name:'바람칼날',  tier:1,dmg:9, cd:1.0,fx:'projectile',emoji:'🌪️'},
  tornado:       {id:'tornado',      attr:'wind',  name:'토네이도',  tier:2,dmg:18,cd:4,  fx:'vortex',   emoji:'🌀',radius:60},
  gale:          {id:'gale',         attr:'wind',  name:'돌풍',      tier:3,dmg:22,cd:4,  fx:'line',     emoji:'💨'},
  storm_wave:    {id:'storm_wave',   attr:'wind',  name:'폭풍파동',  tier:4,dmg:26,cd:6,  fx:'wave',     emoji:'🌪️',radius:100},
  sky_pillar:    {id:'sky_pillar',   attr:'wind',  name:'하늘기둥',  tier:5,dmg:42,cd:10, fx:'pillar',   emoji:'🌬️'},
  // 빛
  light_arrow:   {id:'light_arrow',  attr:'light', name:'빛화살',    tier:1,dmg:11,cd:1.3,fx:'projectile',emoji:'✨'},
  holy_burst:    {id:'holy_burst',   attr:'light', name:'성스러운폭발',tier:2,dmg:20,cd:4, fx:'aoe',     emoji:'☀️',radius:70},
  divine_beam:   {id:'divine_beam',  attr:'light', name:'신성광선',  tier:3,dmg:30,cd:5,  fx:'beam',     emoji:'🔦'},
  light_rain:    {id:'light_rain',   attr:'light', name:'빛의비',    tier:4,dmg:16,cd:6,  fx:'rain',     emoji:'🌤️',count:8},
  judgment:      {id:'judgment',     attr:'light', name:'심판기둥',  tier:5,dmg:50,cd:12, fx:'pillar',   emoji:'⚡'},
  // 어둠
  shadow_bolt:   {id:'shadow_bolt',  attr:'dark',  name:'그림자탄',  tier:1,dmg:13,cd:1.5,fx:'projectile',emoji:'🌑'},
  dark_vortex:   {id:'dark_vortex',  attr:'dark',  name:'암흑소용돌이',tier:2,dmg:20,cd:5,fx:'vortex',   emoji:'🌀',radius:65},
  nightmare:     {id:'nightmare',    attr:'dark',  name:'악몽',      tier:3,dmg:26,cd:5,  fx:'cone',     emoji:'😈',angle:55},
  dark_rain:     {id:'dark_rain',    attr:'dark',  name:'어둠의비',  tier:4,dmg:16,cd:6,  fx:'rain',     emoji:'🌧️',count:8},
  abyss_pillar:  {id:'abyss_pillar', attr:'dark',  name:'심연기둥',  tier:5,dmg:46,cd:10, fx:'pillar',   emoji:'🕳️'},
  // 자연
  thorn_shot:    {id:'thorn_shot',   attr:'nature',name:'가시발사',  tier:1,dmg:10,cd:1.3,fx:'projectile',emoji:'🌿'},
  vine_burst:    {id:'vine_burst',   attr:'nature',name:'덩굴폭발',  tier:2,dmg:18,cd:4,  fx:'aoe',     emoji:'🌱',radius:65},
  petal_vortex:  {id:'petal_vortex', attr:'nature',name:'꽃잎소용돌이',tier:3,dmg:20,cd:5,fx:'vortex',   emoji:'🌸',radius:60},
  seed_rain:     {id:'seed_rain',    attr:'nature',name:'씨앗비',    tier:4,dmg:14,cd:6,  fx:'rain',     emoji:'🌰',count:9},
  world_tree:    {id:'world_tree',   attr:'nature',name:'세계수기둥',tier:5,dmg:42,cd:10, fx:'pillar',   emoji:'🌳',heal:15},
  // 얼음
  ice_shard:     {id:'ice_shard',    attr:'ice',   name:'얼음파편',  tier:1,dmg:11,cd:1.4,fx:'projectile',emoji:'❄️'},
  frost_burst:   {id:'frost_burst',  attr:'ice',   name:'서리폭발',  tier:2,dmg:19,cd:4,  fx:'aoe',     emoji:'💥',radius:70},
  blizzard:      {id:'blizzard',     attr:'ice',   name:'눈보라',    tier:3,dmg:24,cd:5,  fx:'cone',     emoji:'🌨️',angle:60},
  ice_rain:      {id:'ice_rain',     attr:'ice',   name:'얼음비',    tier:4,dmg:15,cd:6,  fx:'rain',     emoji:'🧊',count:9},
  glacial_pillar:{id:'glacial_pillar',attr:'ice',  name:'빙하기둥',  tier:5,dmg:44,cd:10, fx:'pillar',   emoji:'🏔️'},
};

// ── 속성별 스킬 조회 ──
export function getSkillsByAttr(attr) {
  return Object.values(SKILLS).filter(s => s.attr === attr);
}

export function getSkillByTier(attr, tier) {
  return Object.values(SKILLS).find(s => s.attr === attr && s.tier === tier) || null;
}

export function getAvailableSkills(attr, level) {
  const maxTier = Math.min(5, Math.ceil(level / 4));
  return Object.values(SKILLS).filter(s => s.attr === attr && s.tier <= maxTier);
}

// ── Canvas 공격 이펙트 렌더링 ──
export function renderAttack(ctx, skill, origin, target, progress) {
  const c = ATTR_COLORS[skill.attr] || ATTR_COLORS.light;
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - progress * 0.4);

  switch (skill.fx) {
    case 'projectile': _projectile(ctx,c,origin,target,progress); break;
    case 'aoe':        _aoe(ctx,c,target,skill.radius||60,progress); break;
    case 'cone':       _cone(ctx,c,origin,target,skill.angle||45,progress); break;
    case 'beam':       _beam(ctx,c,origin,target,progress); break;
    case 'wave':       _wave(ctx,c,origin,skill.radius||80,progress); break;
    case 'line':       _line(ctx,c,origin,target,progress); break;
    case 'pillar':     _pillar(ctx,c,target,progress); break;
    case 'rain':       _rain(ctx,c,target,skill.count||6,progress); break;
    case 'vortex':     _vortex(ctx,c,target,skill.radius||60,progress); break;
    case 'multi_hit':  _multiHit(ctx,c,target,progress); break;
  }
  ctx.restore();
}

function _projectile(ctx,c,from,to,t) {
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t;
  ctx.shadowColor = c.g; ctx.shadowBlur = 12;
  ctx.fillStyle = c.p;
  ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha *= 0.4; ctx.fillStyle = c.s;
  for (let i=1;i<=3;i++){
    const tt=Math.max(0,t-i*0.05);
    const tx=from.x+(to.x-from.x)*tt, ty=from.y+(to.y-from.y)*tt;
    ctx.beginPath(); ctx.arc(tx,ty,6-i,0,Math.PI*2); ctx.fill();
  }
}

function _aoe(ctx,c,center,radius,t) {
  const r = radius * t;
  const grad = ctx.createRadialGradient(center.x,center.y,0,center.x,center.y,r);
  grad.addColorStop(0,c.p); grad.addColorStop(0.7,c.s); grad.addColorStop(1,'transparent');
  ctx.globalAlpha = (1-t)*0.5;
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(center.x,center.y,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = c.p; ctx.lineWidth = 2;
  ctx.globalAlpha = 1-t;
  ctx.beginPath(); ctx.arc(center.x,center.y,r,0,Math.PI*2); ctx.stroke();
}

function _cone(ctx,c,from,to,angle,t) {
  const dx=to.x-from.x, dy=to.y-from.y;
  const dir=Math.atan2(dy,dx), half=(angle/2)*Math.PI/180;
  const len=Math.sqrt(dx*dx+dy*dy)*t;
  ctx.globalAlpha=(1-t)*0.4;
  const grad=ctx.createRadialGradient(from.x,from.y,0,from.x,from.y,len);
  grad.addColorStop(0,c.p); grad.addColorStop(1,'transparent');
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.moveTo(from.x,from.y);
  ctx.arc(from.x,from.y,len,dir-half,dir+half); ctx.closePath(); ctx.fill();
}

function _beam(ctx,c,from,to,t) {
  ctx.globalAlpha = t<0.2 ? t*5 : (1-(t-0.2)/0.8);
  ctx.strokeStyle=c.p; ctx.lineWidth=12; ctx.shadowColor=c.g; ctx.shadowBlur=15;
  ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
  ctx.strokeStyle=c.s; ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
}

function _wave(ctx,c,center,radius,t) {
  const r=radius*t;
  ctx.globalAlpha=(1-t)*0.4; ctx.strokeStyle=c.p; ctx.lineWidth=3*(1-t);
  ctx.beginPath(); ctx.arc(center.x,center.y,r,0,Math.PI*2); ctx.stroke();
  if(t>0.15){const r2=radius*(t-0.15);ctx.globalAlpha=(1-t)*0.2;ctx.strokeStyle=c.s;ctx.lineWidth=2*(1-t);ctx.beginPath();ctx.arc(center.x,center.y,r2,0,Math.PI*2);ctx.stroke();}
}

function _line(ctx,c,from,to,t) {
  const len=Math.sqrt((to.x-from.x)**2+(to.y-from.y)**2);
  const dx=(to.x-from.x)/len, dy=(to.y-from.y)/len;
  const endX=from.x+dx*len*t, endY=from.y+dy*len*t;
  ctx.strokeStyle=c.p; ctx.lineWidth=3; ctx.globalAlpha=1-t*0.5;
  ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(endX,endY); ctx.stroke();
}

function _pillar(ctx,c,center,t) {
  const maxH=120, w=25;
  let h,a;
  if(t<0.3){h=maxH*(t/0.3);a=1;}else if(t<0.7){h=maxH;a=1;}else{h=maxH;a=1-(t-0.7)/0.3;}
  ctx.globalAlpha=a*0.6;
  const grad=ctx.createLinearGradient(center.x,center.y,center.x,center.y-h);
  grad.addColorStop(0,c.p); grad.addColorStop(0.5,c.s); grad.addColorStop(1,'transparent');
  ctx.fillStyle=grad;
  ctx.fillRect(center.x-w/2,center.y-h,w,h);
  ctx.globalAlpha=a*0.4; ctx.strokeStyle=c.p; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(center.x,center.y,w*0.7,w*0.25,0,0,Math.PI*2); ctx.stroke();
}

function _rain(ctx,c,center,count,t) {
  const spread=70;
  for(let i=0;i<count;i++){
    const ox=(i*37%spread)-spread/2, oy=(i*53%spread)-spread/2;
    const delay=(i/count)*0.4;
    const lt=Math.max(0,Math.min(1,(t-delay)/0.6));
    if(lt<=0) continue;
    const x=center.x+ox, startY=center.y+oy-100, endY=center.y+oy;
    const y=startY+(endY-startY)*lt;
    ctx.globalAlpha=lt<0.8?0.7:(1-(lt-0.8)/0.2);
    ctx.fillStyle=c.p; ctx.shadowColor=c.g; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
    if(lt>0.85){const ir=(lt-0.85)/0.15*12;ctx.globalAlpha=(1-(lt-0.85)/0.15)*0.4;ctx.strokeStyle=c.s;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,endY,ir,0,Math.PI*2);ctx.stroke();}
  }
}

function _vortex(ctx,c,center,radius,t) {
  ctx.globalAlpha=(1-t)*0.5;
  for(let i=0;i<10;i++){
    const angle=(i/10)*Math.PI*2+t*3*Math.PI*2;
    const r=radius*(0.3+t*0.7)*(0.5+(i%3)*0.2);
    const x=center.x+Math.cos(angle)*r, y=center.y+Math.sin(angle)*r;
    ctx.fillStyle=i%2===0?c.p:c.s;
    ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill();
  }
}

function _multiHit(ctx,c,center,t) {
  const hits=4;
  for(let i=0;i<hits;i++){
    const delay=i/hits*0.5;
    const lt=Math.max(0,Math.min(1,(t-delay)/0.3));
    if(lt<=0||lt>=1) continue;
    const ox=Math.sin(i*2.5)*15, oy=Math.cos(i*3.7)*15;
    ctx.globalAlpha=(1-lt)*0.6; ctx.fillStyle=c.p;
    ctx.beginPath(); ctx.arc(center.x+ox,center.y+oy,8*(1-lt),0,Math.PI*2); ctx.fill();
  }
}

/**
 * FormulaPack1 연동: 정령 스킬 스케일링
 * 기존 SKILLS의 고정 dmg/cd/aoe를 등급/레벨에 맞게 스케일링
 */
export function getScaledSkill(skillId, spiritLevel, rarityId, hasSynergy) {
  const skill = SKILLS[skillId];
  if (!skill) return null;
  if (typeof FormulaPack1 !== 'undefined') {
    const scaled = FormulaPack1.scaleSpiritSkill(skill, spiritLevel || 1, rarityId || 1, hasSynergy || false);
    return { ...skill, ...scaled };
  }
  // 폴백: 원본 스킬 반환
  return { ...skill };
}
