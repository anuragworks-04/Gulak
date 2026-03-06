import React, { useState, useMemo, useEffect, useRef } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPA_URL = "https://fxnfnxfjuwwoxwzlabix.supabase.co";
const SUPA_KEY = "sb_publishable_Jpkmj4u-EUSEOcKWaAcRBw_ma4pROXy";
const H = { "Content-Type":"application/json", apikey:SUPA_KEY, Authorization:`Bearer ${SUPA_KEY}` };
const API = (p,q="") => `${SUPA_URL}/rest/v1/${p}${q}`;

const sb = {
  async all() { const r=await fetch(API("transactions","?order=created_at.desc"),{headers:H}); if(!r.ok)throw new Error(await r.text()); return(await r.json()).map(x=>({...x,amount:Number(x.amount)})); },
  async insert(t) { const r=await fetch(API("transactions"),{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(t)}); if(!r.ok)throw new Error(await r.text()); const[row]=await r.json(); return{...row,amount:Number(row.amount)}; },
  async update(t) { const r=await fetch(API("transactions",`?id=eq.${t.id}`),{method:"PATCH",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify(t)}); if(!r.ok)throw new Error(await r.text()); },
  async remove(id) { const r=await fetch(API("transactions",`?id=eq.${id}`),{method:"DELETE",headers:H}); if(!r.ok)throw new Error(await r.text()); },
  async clearAll() { const r=await fetch(API("transactions","?id=gte.0"),{method:"DELETE",headers:H}); if(!r.ok)throw new Error(await r.text()); },
  async getSettings() { const r=await fetch(API("settings","?id=eq.1"),{headers:H}); if(!r.ok)throw new Error(await r.text()); return(await r.json())[0]||null; },
  async saveSettings(data) { await fetch(API("settings","?id=eq.1"),{method:"DELETE",headers:H}); const r=await fetch(API("settings"),{method:"POST",headers:{...H,"Prefer":"return=representation"},body:JSON.stringify({id:1,...data})}); if(!r.ok)throw new Error(await r.text()); },
};

const LS = { get:(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}}, set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}} };

const BASE_CATS = ["Food & Dining","Transport","Shopping","Entertainment","Healthcare","Education","Utilities","Rent","Salary","Other"];
const METHODS   = ["UPI","Cash","Credit Card","Debit Card","Bank Transfer"];
const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS      = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CAT_ICON  = {"Food & Dining":"🍽️",Transport:"🚗",Shopping:"🛍️",Entertainment:"🎬",Healthcare:"💊",Education:"📚",Utilities:"💡",Rent:"🏠",Salary:"💼",Other:"📦"};

const today = () => new Date().toISOString().slice(0,10);
const fmt   = n  => "₹"+Number(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const pct   = (v,m) => m?Math.min(100,Math.round(v/m*100)):0;

// ─── GULLAK PALETTE — mitti · marigold · peacock ─────────────────────────────
// Terra = expenses/spending  Marigold = savings/positive  Teal = income/growth
const LIGHT = {
  mode:"light",
  bg:"#F5EFE6", surf:"#FDF9F4", card:"#FDF9F4", raised:"#EDE7DB", bord:"#DDD5C8", bord2:"#C9BFB0",
  text:"#1C1410", sub:"#7A6A58", dim:"#B0A090", nav:"rgba(253,249,244,0.96)",
  terra:"#C1440E",  terraBg:"rgba(193,68,14,.09)",   terraBord:"rgba(193,68,14,.28)",
  teal:"#1A7A6E",   tealBg:"rgba(26,122,110,.09)",   tealBord:"rgba(26,122,110,.28)",
  marigold:"#D4830A",marigoldBg:"rgba(212,131,10,.09)",marigoldBord:"rgba(212,131,10,.3)",
  indigo:"#5B4FCF", indigoBg:"rgba(91,79,207,.09)",  indigoBord:"rgba(91,79,207,.26)",
  // aliases for compat
  red:"#C1440E",   redBg:"rgba(193,68,14,.09)",   redBord:"rgba(193,68,14,.28)",
  green:"#1A7A6E", greenBg:"rgba(26,122,110,.09)", greenBord:"rgba(26,122,110,.28)",
  gold:"#D4830A",  goldBg:"rgba(212,131,10,.09)",  goldBord:"rgba(212,131,10,.3)",
  V:"#5B4FCF",     VBg:"rgba(91,79,207,.09)",      VBord:"rgba(91,79,207,.26)",
  shadow:"0 2px 12px rgba(28,20,16,.07)", shadowLg:"0 6px 32px rgba(28,20,16,.13)",
};
const DARK = {
  mode:"dark",
  bg:"#110D0A", surf:"#1C1510", card:"#1C1510", raised:"#261D16", bord:"#3A2E24", bord2:"#4A3C30",
  text:"#F2EAE0", sub:"#8A7A68", dim:"#3A2E24", nav:"rgba(17,13,10,0.96)",
  terra:"#E8693A",  terraBg:"rgba(232,105,58,.12)",  terraBord:"rgba(232,105,58,.35)",
  teal:"#2DB8A8",   tealBg:"rgba(45,184,168,.12)",   tealBord:"rgba(45,184,168,.35)",
  marigold:"#F5A623",marigoldBg:"rgba(245,166,35,.12)",marigoldBord:"rgba(245,166,35,.35)",
  indigo:"#8B7FE8", indigoBg:"rgba(139,127,232,.12)", indigoBord:"rgba(139,127,232,.35)",
  // aliases for compat
  red:"#E8693A",   redBg:"rgba(232,105,58,.12)",   redBord:"rgba(232,105,58,.35)",
  green:"#2DB8A8", greenBg:"rgba(45,184,168,.12)", greenBord:"rgba(45,184,168,.35)",
  gold:"#F5A623",  goldBg:"rgba(245,166,35,.12)",  goldBord:"rgba(245,166,35,.35)",
  V:"#8B7FE8",     VBg:"rgba(139,127,232,.12)",    VBord:"rgba(139,127,232,.35)",
  shadow:"0 2px 18px rgba(0,0,0,.5)", shadowLg:"0 8px 40px rgba(0,0,0,.7)",
};

function G({T}) {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
    html,body,#root{width:100%;min-height:100vh;}
    body{font-family:'Inter',system-ui,sans-serif;background:${T.bg};color:${T.text};-webkit-font-smoothing:antialiased;}
    ::-webkit-scrollbar{width:5px;height:5px;}
    ::-webkit-scrollbar-thumb{background:${T.bord2};border-radius:99px;}
    select option{background:${T.surf};color:${T.text};}
    input[type=number]{-moz-appearance:textfield;}
    input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
    input[type=date]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.5;filter:${T.mode==="dark"?"invert(1)":"none"};}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
    .anim{animation:fadeUp .35s cubic-bezier(.22,1,.36,1) both;}
    .card{background:${T.card};border:1px solid ${T.bord};border-radius:20px;}
    .hov:hover{border-color:${T.marigoldBord||T.bord2};box-shadow:${T.shadow};}
    .rowh:hover{background:${T.raised}!important;}
    input:focus,select:focus{outline:none!important;border-color:${T.terra}!important;box-shadow:0 0 0 3px ${T.terraBg}!important;}
    button{cursor:pointer;}
    button:active{opacity:.82;}
  `}</style>;
}

function Bar({val,max,color,h=5,T}) {
  const[w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(pct(val,max)),80);return()=>clearTimeout(t);},[val,max]);
  return <div style={{background:T.mode==="dark"?"rgba(255,255,255,.06)":"rgba(0,0,0,.07)",borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:w+"%",height:"100%",background:color,borderRadius:99,transition:"width .7s cubic-bezier(.22,1,.36,1)"}}/></div>;
}

// ─── GULLAK LOGO — faithful mitti gullak illustration ────────────────────────
// Reference: round terracotta pot, wide belly tapering up to narrow neck,
// small knob lid, horizontal etched texture bands, coin slot, coin being inserted
function GullakIllustration({size=40}) {
  return(
    <svg width={size} height={size} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="gl_body" cx="36%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#E8845A"/>
          <stop offset="40%" stopColor="#C8552A"/>
          <stop offset="100%" stopColor="#8A2E0A"/>
        </radialGradient>
        <radialGradient id="gl_neck" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#D4663A"/>
          <stop offset="100%" stopColor="#9A3818"/>
        </radialGradient>
        <radialGradient id="gl_coin" cx="32%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#F5E070"/>
          <stop offset="60%" stopColor="#D4A020"/>
          <stop offset="100%" stopColor="#9A6808"/>
        </radialGradient>
        <radialGradient id="gl_sheen" cx="28%" cy="25%" r="50%">
          <stop offset="0%" stopColor="#FFCCA0" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#FFCCA0" stopOpacity="0"/>
        </radialGradient>
        <filter id="gl_shadow" x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#5A1A00" floodOpacity="0.28"/>
        </filter>
      </defs>

      {/* ── BODY — wide round belly, the heart of a gullak ── */}
      <ellipse cx="50" cy="70" rx="36" ry="30" fill="url(#gl_body)" filter="url(#gl_shadow)"/>
      <ellipse cx="50" cy="70" rx="36" ry="30" fill="url(#gl_sheen)"/>

      {/* ── HORIZONTAL ETCHED TEXTURE BANDS — characteristic of terracotta gullaks ── */}
      {[54, 60, 66, 72, 78, 84].map((cy,i)=>{
        const rx=Math.sqrt(Math.max(0,36*36*(1-Math.pow((cy-70)/30,2))))*0.92;
        return rx>4?<ellipse key={i} cx="50" cy={cy} rx={rx} ry="0.7" stroke="#7A2A08" strokeWidth="0.5" fill="none" opacity="0.35"/>:null;
      })}
      {/* A second denser set of bands in the lower belly */}
      {[57,63,69,75,81].map((cy,i)=>{
        const rx=Math.sqrt(Math.max(0,36*36*(1-Math.pow((cy-70)/30,2))))*0.88;
        return rx>4?<ellipse key={'b'+i} cx="50" cy={cy} rx={rx} ry="0.5" stroke="#9A3818" strokeWidth="0.4" fill="none" opacity="0.2"/>:null;
      })}

      {/* ── NECK — narrows from belly up ── */}
      <path d="M36 52 Q35 42 38 39 Q41 37 50 37 Q59 37 62 39 Q65 42 64 52 Q57 49 50 49 Q43 49 36 52Z" fill="url(#gl_neck)"/>
      {/* Neck texture band */}
      <ellipse cx="50" cy="50" rx="13" ry="1.8" stroke="#7A2A08" strokeWidth="0.6" fill="none" opacity="0.4"/>

      {/* ── LID / KNOB TOP — small dome, like the reference ── */}
      <ellipse cx="50" cy="38" rx="13" ry="4.5" fill="#B84820"/>
      <ellipse cx="50" cy="36" rx="12" ry="3.5" fill="#CC5A28"/>
      {/* Knob */}
      <ellipse cx="50" cy="33.5" rx="5" ry="3" fill="#C05020"/>
      <ellipse cx="50" cy="32.5" rx="4.5" ry="2.2" fill="#D46030"/>

      {/* ── COIN SLOT — horizontal slit on the lid ── */}
      <rect x="43" y="35" width="14" height="3" rx="1.5" fill="#3A0E00"/>

      {/* ── COIN — round, tilted, being inserted (like the hand photo) ── */}
      <g transform="rotate(-8 50 22)">
        {/* Coin edge/depth */}
        <ellipse cx="50" cy="23" rx="9" ry="9" fill="#B07A10"/>
        {/* Coin face */}
        <ellipse cx="50" cy="22" rx="9" ry="9" fill="url(#gl_coin)"/>
        {/* Inner ring */}
        <ellipse cx="50" cy="22" rx="6.8" ry="6.8" stroke="#C89020" strokeWidth="0.8" fill="none" opacity="0.6"/>
        {/* ₹ on coin */}
        <text x="50" y="25.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#6A4400" fontFamily="'Inter',system-ui,sans-serif" opacity="0.85">₹</text>
      </g>

      {/* ── GROUND SHADOW ── */}
      <ellipse cx="50" cy="100" rx="26" ry="4" fill="#3A1000" opacity="0.15"/>
    </svg>
  );
}

// LOGIN
function Login({onLogin,profile,T}) {
  const[u,sU]=useState("");const[p,sP]=useState("");const[err,sE]=useState("");const[show,sS]=useState(false);const[load,sL]=useState(false);
  const go=()=>{if(!u||!p)return;sL(true);setTimeout(()=>{u===profile.username&&p===profile.password?onLogin():(sE("Wrong username or password"),sL(false));},420);};
  const F={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:12,padding:"13px 16px",color:T.text,fontSize:15,fontFamily:"inherit",transition:"all .18s"};
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="anim" style={{width:420,background:T.surf,border:`1px solid ${T.bord}`,borderRadius:24,padding:"48px 44px",boxShadow:T.shadowLg}}>
        {/* Gullak illustration + branding */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:42,fontWeight:900,color:T.terra,letterSpacing:"-0.04em",fontFamily:"'Inter',sans-serif"}}>Gullak</div>
          <div style={{fontSize:13,color:T.sub,marginTop:10,fontFamily:"'Noto Sans Devanagari','Inter',sans-serif",fontWeight:500}}>आपकी अपनी गुल्लक</div>
        </div>
        {err&&<div style={{background:T.terraBg,border:`1px solid ${T.terraBord}`,borderRadius:10,padding:"11px 15px",color:T.terra,fontSize:13,marginBottom:20,fontWeight:500}}>{err}</div>}
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8,display:"block"}}>Username</label>
          <input value={u} onChange={e=>sU(e.target.value)} placeholder="Enter your username" style={F} onKeyDown={e=>e.key==="Enter"&&go()}/>
        </div>
        <div style={{marginBottom:32,position:"relative"}}>
          <label style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8,display:"block"}}>Password</label>
          <input value={p} onChange={e=>sP(e.target.value)} type={show?"text":"password"} placeholder="Enter your password" style={{...F,paddingRight:56}} onKeyDown={e=>e.key==="Enter"&&go()}/>
          <button onClick={()=>sS(!show)} style={{position:"absolute",right:16,bottom:15,background:"none",border:"none",color:T.sub,fontSize:11,fontFamily:"inherit",fontWeight:700,letterSpacing:".06em"}}>{show?"HIDE":"SHOW"}</button>
        </div>
        <button onClick={go} disabled={!u||!p||load} style={{width:"100%",background:u&&p?T.terra:T.raised,border:"none",borderRadius:12,padding:"14px",color:u&&p?"white":T.dim,fontWeight:700,fontSize:15,fontFamily:"inherit",transition:"all .22s",boxShadow:u&&p?`0 4px 20px ${T.terra}50`:"none",letterSpacing:".01em"}}>
          {load?"Opening your Gullak…":"Open Gullak"}
        </button>
      </div>
    </div>
  );
}

// TOP BAR — Paisa-exact layout
function TopBar({tab,setTab,view,setView,profile,dark,toggleDark,budget,tSpend,T,onAdd,selMonth,setSelMonth,selYear,setSelYear}) {
  const dn=profile.displayName||profile.username;
  const nowM=new Date().getMonth();const nowY=new Date().getFullYear();
  const isCurrent=selMonth===nowM&&selYear===nowY;
  const bp=isCurrent?pct(tSpend,budget):0;
  const bc=bp>=100?T.terra:bp>=80?"#F5A623":T.teal;
  const prevMonth=()=>{if(selMonth===0){setSelMonth(11);setSelYear(y=>y-1);}else setSelMonth(m=>m-1);};
  const nextMonth=()=>{if(selMonth===11){setSelMonth(0);setSelYear(y=>y+1);}else setSelMonth(m=>m+1);};
  return(
    <div style={{position:"sticky",top:0,zIndex:60,width:"100%",background:T.nav,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${T.bord}`}}>
      <div style={{width:"100%",display:"flex",alignItems:"center",padding:"10px 28px",gap:14,minHeight:64}}>
        {/* Logo — wordmark only */}
        <div style={{flexShrink:0,marginRight:8}}>
          <span style={{fontSize:18,fontWeight:900,color:T.terra,letterSpacing:"-0.04em",fontFamily:"'Inter',sans-serif"}}>Gullak</span>
        </div>
        {/* Dashboard — standalone button */}
        <button onClick={()=>setTab("overview")} style={{padding:"9px 20px",borderRadius:12,border:`1px solid ${tab==="overview"?T.marigold:T.bord}`,fontFamily:"inherit",fontSize:13.5,fontWeight:tab==="overview"?700:500,transition:"all .2s",background:tab==="overview"?T.marigold:T.raised,color:tab==="overview"?"white":T.sub,boxShadow:tab==="overview"?`0 2px 12px ${T.marigold}50`:"none",whiteSpace:"nowrap",flexShrink:0}}>
          Dashboard
        </button>
        {/* Expenses / Income toggle — separate pill group */}
        <div style={{display:"flex",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:12,padding:3,gap:2,flexShrink:0}}>
          {[{id:"expense",label:"Expenses",color:T.terra},{id:"income",label:"Income",color:T.teal}].map(({id,label,color})=>{
            const active=tab===id;
            return(
              <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 20px",borderRadius:9,border:"none",fontFamily:"inherit",fontSize:13.5,fontWeight:active?700:500,transition:"all .2s",background:active?color:"transparent",color:active?"white":T.sub,boxShadow:active?`0 2px 12px ${color}50`:"none",whiteSpace:"nowrap"}}>
                {label}
              </button>
            );
          })}
        </div>
        {/* Month navigator */}
        <div style={{flex:1,display:"flex",justifyContent:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:2,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:12,padding:"4px 8px"}}>
            <button onClick={prevMonth} style={{width:30,height:30,borderRadius:8,border:"none",background:"transparent",color:T.marigold,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>‹</button>
            <span style={{fontSize:13.5,fontWeight:700,color:T.marigold,fontFamily:"'Courier New',monospace",letterSpacing:".04em",minWidth:148,textAlign:"center"}}>{MONTHS[selMonth]} {selYear}</span>
            <button onClick={nextMonth} style={{width:30,height:30,borderRadius:8,border:"none",background:"transparent",color:T.marigold,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>›</button>
            {!isCurrent&&<button onClick={()=>{setSelMonth(nowM);setSelYear(nowY);}} style={{width:26,height:26,borderRadius:7,border:`1px solid ${T.marigoldBord}`,background:T.marigoldBg,color:T.marigold,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>↩</button>}
          </div>
        </div>
        {/* Right controls */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:7,background:T.terra,border:"none",borderRadius:12,padding:"9px 22px",color:"white",fontWeight:700,fontSize:14,fontFamily:"inherit",boxShadow:`0 3px 16px ${T.terra}55`,transition:"all .2s",whiteSpace:"nowrap"}}>
            <span style={{fontSize:17,lineHeight:1}}>+</span> Add Entry
          </button>
          <button onClick={toggleDark} title={dark?"Switch to Light":"Switch to Dark"} style={{width:38,height:38,borderRadius:10,background:T.raised,border:`1px solid ${T.bord}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all .18s"}}>
            {dark?"☀️":"🌙"}
          </button>
          <button onClick={()=>setTab("budget")} title="Budget" style={{width:38,height:38,borderRadius:10,background:tab==="budget"?T.marigoldBg:T.raised,border:`1px solid ${tab==="budget"?T.marigold:T.bord}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all .18s"}}>💰</button>
          <button onClick={()=>setTab("settings")} title="Settings" style={{width:38,height:38,borderRadius:10,background:T.raised,border:`1px solid ${T.bord}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,transition:"all .18s"}}>⚙️</button>
          <button onClick={()=>setTab("profile")} style={{display:"flex",alignItems:"center",gap:8,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:12,padding:"5px 14px 5px 5px",fontFamily:"inherit",transition:"all .2s"}}>
            <div style={{width:30,height:30,borderRadius:8,background:T.terra,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {profile.photo?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:13,fontWeight:900,color:"white"}}>{dn[0].toUpperCase()}</span>}
            </div>
            <span style={{fontSize:13,fontWeight:600,color:T.text}}>{dn}</span>
          </button>
        </div>
      </div>
      {/* Sub strip — budget today */}
      <div style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px 9px"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:T.teal,display:"inline-block",animation:"blink 2.2s ease infinite"}}/>
          <span style={{fontSize:11.5,color:T.sub}}>Live sync</span>
        </div>
        {budget>0&&isCurrent&&<div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11.5,color:T.sub}}>Today's budget</span>
          <div style={{width:80,height:4,background:T.bord,borderRadius:99,overflow:"hidden"}}><div style={{width:bp+"%",height:"100%",background:bc,borderRadius:99,transition:"width .6s"}}/></div>
          <span style={{fontSize:11.5,fontWeight:700,color:bc}}>{bp}%</span>
        </div>}
        {!isCurrent&&<span style={{fontSize:11.5,color:T.dim}}>Viewing {MONTHS[selMonth]} {selYear}</span>}
      </div>
    </div>
  );
}


// OVERVIEW — Command Center
function Overview({txns,budget,name,T,setTab,selMonth,selYear}) {
  const nowM=new Date().getMonth();const nowY=new Date().getFullYear();
  const isCurrent=selMonth===nowM&&selYear===nowY;
  const todayKey=today();
  const h=new Date().getHours();
  const greet=h<12?"Good morning":h<17?"Good afternoon":"Good evening";

  const bankBalance=useMemo(()=>{
    const inc=txns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
    const exp=txns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
    return inc-exp;
  },[txns]);

  const monthTxns=useMemo(()=>txns.filter(t=>{const[y,m]=t.date.split("-").map(Number);return y===selYear&&m-1===selMonth;}),[txns,selMonth,selYear]);
  const monthSpent=monthTxns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const monthReceived=monthTxns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);

  const todaySpent=isCurrent?txns.filter(t=>t.type==="debit"&&t.date===todayKey).reduce((s,t)=>s+t.amount,0):0;
  const todaySaved=budget>0?budget-todaySpent:0;
  const bp=budget>0&&isCurrent?pct(todaySpent,budget):0;
  const bc=bp>=100?T.terra:bp>=80?T.marigold:T.teal;

  const dim=new Date(selYear,selMonth+1,0).getDate();
  const monthPool=budget>0?budget*dim:0;
  const monthLeft=Math.max(0,monthPool-monthSpent);
  const monthPct=monthPool>0?Math.min(100,Math.round(monthSpent/monthPool*100)):0;
  const mbc=monthPct>=100?T.terra:monthPct>=80?T.marigold:T.teal;

  const lifetimeSavings=useMemo(()=>{
    if(!budget)return 0;
    const dayMap={};
    txns.filter(t=>t.type==="debit").forEach(t=>{dayMap[t.date]=(dayMap[t.date]||0)+t.amount;});
    return Object.entries(dayMap).reduce((sum,[,spent])=>sum+(budget-spent),0);
  },[txns,budget]);

  const catMap=useMemo(()=>{const m={};monthTxns.filter(t=>t.type==="debit").forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[monthTxns]);

  const last14=useMemo(()=>{const arr=[];for(let i=13;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);const spend=txns.filter(t=>t.type==="debit"&&t.date===k).reduce((s,t)=>s+t.amount,0);arr.push({k,spend,day:d.getDate()});}return arr;},[txns]);
  const maxS=Math.max(...last14.map(d=>d.spend),budget||1);

  const P={padding:"24px 28px"};
  const LBL={fontSize:10.5,fontWeight:700,color:T.sub,letterSpacing:".09em",textTransform:"uppercase"};

  // ── YESTERDAY NUDGE ─────────────────────────────────────────────────────────
  const yesterdayKey=useMemo(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toISOString().slice(0,10);},[]);
  const yesterdaySpent=useMemo(()=>txns.filter(t=>t.type==="debit"&&t.date===yesterdayKey).reduce((s,t)=>s+t.amount,0),[txns,yesterdayKey]);
  // Strictly: yesterday's budget minus yesterday's actual spend — never touches today
  const yesterdaySaved=budget-yesterdaySpent;
  const nudgeDismissKey="gulak_nudge_v2_"+todayKey;
  const[nudgeDismissed,setNudgeDismissed]=useState(()=>LS.get(nudgeDismissKey,false));
  const showNudge=budget>0&&!nudgeDismissed&&isCurrent;
  const dismissNudge=()=>{LS.set(nudgeDismissKey,true);setNudgeDismissed(true);};

  const nudge=useMemo(()=>{
    if(!budget||!isCurrent)return null;
    const pct2=Math.round(yesterdaySpent/budget*100);
    // Always use the correct saved/over amount from yesterday
    const savedAmt=fmt(Math.abs(yesterdaySaved));
    if(yesterdaySpent===0) return {
      emoji:"✨", tone:"teal",
      title:"You had a free day yesterday!",
      msg:"No spending logged — your Gullak didn't lose a single rupee. Hope you had a great day. Come back and keep tracking!",
    };
    if(yesterdaySaved>0&&pct2<=50) return {
      emoji:"🎉", tone:"teal",
      title:`Wonderful! You saved ${savedAmt} yesterday.`,
      msg:"That's the kind of day that makes a real difference. Every rupee saved is a rupee working for you. Keep it up!",
    };
    if(yesterdaySaved>0&&pct2<=80) return {
      emoji:"😊", tone:"teal",
      title:`Good going! You saved ${savedAmt} yesterday.`,
      msg:"Steady and controlled — that's the Gullak way. Small savings every day add up to something beautiful.",
    };
    if(yesterdaySaved>0) return {
      emoji:"👍", tone:"teal",
      title:`You saved ${savedAmt} yesterday — nice!`,
      msg:"Even saving a little is a win. You tracked your spending and stayed aware. That's what matters most.",
    };
    // Overspent — always gentle, never punishing
    return {
      emoji:"🌱", tone:"marigold",
      title:"Yesterday was a bit heavy on spending.",
      msg:"No worries at all — some days are like that. Today is a brand new day and your Gullak is ready for a fresh start. You've got this!",
    };
  },[budget,yesterdaySpent,yesterdaySaved,isCurrent]);

  const nudgePalette=nudge?{
    teal:{bg:T.tealBg,bord:T.tealBord,accent:T.teal},
    marigold:{bg:T.marigoldBg,bord:T.marigoldBord,accent:T.marigold},
  }[nudge.tone]:null;

  return(
    <div className="anim" style={{display:"flex",flexDirection:"column",gap:20,width:"100%",maxWidth:1100,margin:"0 auto"}}>

      {/* ── YESTERDAY NUDGE BANNER ── */}
      {showNudge&&nudge&&nudgePalette&&(
        <div style={{background:nudgePalette.bg,border:`1px solid ${nudgePalette.bord}`,borderRadius:18,padding:"20px 24px",display:"flex",alignItems:"flex-start",gap:16,animation:"fadeUp .4s cubic-bezier(.22,1,.36,1) both"}}>
          <div style={{fontSize:32,lineHeight:1,flexShrink:0,marginTop:2}}>{nudge.emoji}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:16,fontWeight:800,color:nudgePalette.accent,letterSpacing:"-0.02em",marginBottom:5}}>{nudge.title}</div>
            <div style={{fontSize:13.5,color:T.sub,lineHeight:1.65}}>{nudge.msg}</div>
          </div>
          <button onClick={dismissNudge} title="Dismiss" style={{flexShrink:0,background:"none",border:"none",color:T.dim,fontSize:18,lineHeight:1,padding:"2px 4px",marginTop:-2,transition:"color .15s"}} onMouseEnter={e=>e.target.style.color=T.sub} onMouseLeave={e=>e.target.style.color=T.dim}>✕</button>
        </div>
      )}

      {/* ── HERO ROW: greeting + bank balance ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:12,color:T.sub,marginBottom:4,letterSpacing:".05em"}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>{greet}, {name}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{...LBL,marginBottom:6}}>Bank Balance</div>
          <div style={{fontSize:42,fontWeight:900,color:bankBalance>=0?T.teal:T.terra,letterSpacing:"-0.05em",lineHeight:1}}>{bankBalance<0?"-":""}{Number(Math.abs(bankBalance)).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          <div style={{fontSize:11.5,color:T.sub,marginTop:5}}>all-time income − expenses</div>
        </div>
      </div>

      <div style={{height:1,background:`linear-gradient(to right,transparent,${T.bord},transparent)`}}/>

      {/* ── ROW 1: Month summary + savings + sparkline ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16}}>

        {/* Spent this month */}
        <div className="card" style={{...P,background:T.terraBg,borderColor:T.terraBord}}>
          <div style={{...LBL,marginBottom:14,color:T.terra}}>Spent — {MONTHS[selMonth]}</div>
          <div style={{fontSize:34,fontWeight:900,color:T.terra,letterSpacing:"-0.05em",lineHeight:1,marginBottom:12}}>{fmt(monthSpent)}</div>
          <button onClick={()=>setTab("expense")} style={{fontSize:11.5,color:T.terra,background:"none",border:`1px solid ${T.terraBord}`,borderRadius:8,padding:"5px 12px",fontFamily:"inherit",fontWeight:600,cursor:"pointer"}}>View expenses →</button>
        </div>
        {/* Received this month */}
        <div className="card" style={{...P,background:T.tealBg,borderColor:T.tealBord}}>
          <div style={{...LBL,marginBottom:14,color:T.teal}}>Received — {MONTHS[selMonth]}</div>
          <div style={{fontSize:34,fontWeight:900,color:T.teal,letterSpacing:"-0.05em",lineHeight:1,marginBottom:12}}>{fmt(monthReceived)}</div>
          <button onClick={()=>setTab("income")} style={{fontSize:11.5,color:T.teal,background:"none",border:`1px solid ${T.tealBord}`,borderRadius:8,padding:"5px 12px",fontFamily:"inherit",fontWeight:600,cursor:"pointer"}}>View income →</button>
        </div>

        {/* Lifetime savings */}
        <div className="card" style={{...P,background:lifetimeSavings>=0?T.tealBg:T.terraBg,borderColor:lifetimeSavings>=0?T.tealBord:T.terraBord}}>
          <div style={{...LBL,marginBottom:18}}>Lifetime Savings</div>
          <div style={{fontSize:36,fontWeight:900,color:lifetimeSavings>=0?T.teal:T.terra,letterSpacing:"-0.05em",lineHeight:1}}>
            {lifetimeSavings<0?"-":""}{Number(Math.abs(lifetimeSavings)).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}
          </div>
          <div style={{fontSize:12,color:T.sub,marginTop:10}}>Since you started tracking</div>
        </div>

        {/* Sparkline */}
        <div className="card" style={P}>
          <div style={{...LBL,marginBottom:16}}>Last 14 Days</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:76}}>
            {last14.map(d=>{
              const h2=d.spend>0?Math.max(Math.round(d.spend/maxS*100),4):0;
              const ov=budget>0&&d.spend>budget;
              const isToday=d.k===todayKey;
              return(
                <div key={d.k} title={`${d.k}: ${fmt(d.spend)}`} style={{flex:1,height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:3}}>
                  <div style={{width:"100%",background:ov?T.terra:isToday?T.marigold:d.spend>0?T.indigo:T.bord,borderRadius:"3px 3px 0 0",height:h2+"%",opacity:.9,transition:"height .5s"}}/>
                  <div style={{fontSize:8,color:isToday?T.marigold:T.dim,fontWeight:isToday?700:400}}>{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 2: Budget cards (separate entity as requested) ── */}
      {budget>0&&<>
        <div style={{height:1,background:`linear-gradient(to right,transparent,${T.bord},transparent)`}}/>
        <div>
          <div style={{...LBL,marginBottom:14}}>Budget Tracker</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {/* Daily budget */}
            {isCurrent&&<div className="card" style={P}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{...LBL,marginBottom:6}}>Today's Budget</div>
                  <div style={{fontSize:30,fontWeight:900,color:bc,letterSpacing:"-0.05em",lineHeight:1}}>{fmt(Math.max(0,budget-todaySpent))} <span style={{fontSize:14,fontWeight:500,color:T.sub}}>left</span></div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:bc,background:T.raised,borderRadius:99,padding:"3px 10px"}}>{bp}% used</div>
              </div>
              <Bar val={todaySpent} max={budget} color={bc} h={6} T={T}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,color:T.sub,marginTop:8}}>
                <span>Spent {fmt(todaySpent)}</span>
                <span>Limit {fmt(budget)}/day</span>
              </div>
              {todaySaved!==0&&<div style={{marginTop:12,fontSize:12.5,fontWeight:600,color:todaySaved>=0?T.teal:T.terra}}>{todaySaved>=0?"Saved":"Over by"} {fmt(Math.abs(todaySaved))} today</div>}
            </div>}
            {/* Monthly budget */}
            <div className="card" style={P}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{...LBL,marginBottom:6}}>{MONTHS[selMonth]} Budget</div>
                  <div style={{fontSize:30,fontWeight:900,color:mbc,letterSpacing:"-0.05em",lineHeight:1}}>{fmt(monthLeft)} <span style={{fontSize:14,fontWeight:500,color:T.sub}}>left</span></div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:mbc,background:T.raised,borderRadius:99,padding:"3px 10px"}}>{monthPct}% used</div>
              </div>
              <Bar val={monthSpent} max={monthPool} color={mbc} h={6} T={T}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,color:T.sub,marginTop:8}}>
                <span>Spent {fmt(monthSpent)}</span>
                <span>Pool {fmt(monthPool)}</span>
              </div>
            </div>
          </div>
        </div>
      </>}

      {/* ── ROW 3: Monthly insights ── */}
      {catMap.length>0&&<>
        <div style={{height:1,background:`linear-gradient(to right,transparent,${T.bord},transparent)`}}/>
        <div>
          <div style={{...LBL,marginBottom:14}}>Monthly Insights — Where the Money Went</div>
          <div className="card" style={P}>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {catMap.slice(0,6).map(([cat,amt])=>{
                const w=Math.round(amt/catMap[0][1]*100);
                const pctOfMonth=monthSpent>0?Math.round(amt/monthSpent*100):0;
                return(
                  <div key={cat}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,alignItems:"center"}}>
                      <span style={{fontSize:13.5,color:T.text,fontWeight:500}}>{CAT_ICON[cat]||"📦"} {cat}</span>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <span style={{fontSize:11,color:T.sub,background:T.raised,borderRadius:99,padding:"2px 8px"}}>{pctOfMonth}%</span>
                        <span style={{fontSize:14,fontWeight:700,color:T.marigold,minWidth:72,textAlign:"right"}}>{fmt(amt)}</span>
                      </div>
                    </div>
                    <div style={{height:3,background:T.bord,borderRadius:99,overflow:"hidden"}}>
                      <div style={{width:w+"%",height:"100%",background:T.marigold,borderRadius:99,transition:"width .8s cubic-bezier(.22,1,.36,1)"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </>}
    </div>
  );
}

// DASHBOARD
function Dashboard({txns,budget,name,T,view,onEdit,onDelete,customCats,selMonth,selYear,bankBalance}) {
  const isExp=view==="expense";
  const nowM=new Date().getMonth();const nowY=new Date().getFullYear();
  const isCurrent=selMonth===nowM&&selYear===nowY;
  const filtered=useMemo(()=>txns.filter(t=>{const[y,m]=t.date.split("-").map(Number);return y===selYear&&m-1===selMonth&&(isExp?t.type==="debit":t.type==="credit");}),[txns,view,selMonth,selYear]);
  const opposite=useMemo(()=>txns.filter(t=>{const[y,m]=t.date.split("-").map(Number);return y===selYear&&m-1===selMonth&&(isExp?t.type==="credit":t.type==="debit");}),[txns,view,selMonth,selYear]);
  const total=filtered.reduce((s,t)=>s+t.amount,0);
  const oTotal=opposite.reduce((s,t)=>s+t.amount,0);
  const net=isExp?oTotal-total:total-oTotal;
  const catMap=useMemo(()=>{const m={};filtered.forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[filtered]);
  const metMap=useMemo(()=>{const m={};filtered.forEach(t=>{m[t.method]=(m[t.method]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[filtered]);
  const accentC=isExp?T.terra:T.teal;const accentBg=isExp?T.terraBg:T.tealBg;const accentBo=isExp?T.terraBord:T.tealBord;
  const P={padding:"22px 24px"};const SL={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:14};
  return(
    <div className="anim" style={{display:"flex",flexDirection:"column",gap:20,width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16}}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:T.text,letterSpacing:"-0.03em"}}>{isExp?"Expenses":"Income"} <span style={{color:T.sub,fontWeight:400,fontSize:16}}>— {MONTHS[selMonth]} {selYear}</span></div>
          <div style={{fontSize:13,color:T.sub,marginTop:3}}>{filtered.length} {isExp?"expense":"income"} entries</div>
        </div>
      </div>
      {/* Single clean summary stat */}
      <div className="card" style={{...P,background:accentBg,borderColor:accentBo}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={SL}>{isExp?"Total Spent":"Total Received"} — {MONTHS[selMonth]} {selYear}</div>
            <div style={{fontSize:40,fontWeight:900,color:accentC,letterSpacing:"-0.05em",lineHeight:1,marginTop:8}}>{fmt(total)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,color:T.sub,marginBottom:4}}>{filtered.length} {isExp?"expense":"income"} {filtered.length===1?"entry":"entries"}</div>
            {filtered.length>0&&<div style={{fontSize:13,color:T.sub}}>Avg {fmt(total/filtered.length)} / entry</div>}
          </div>
        </div>
      </div>
      {filtered.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div className="card" style={P}>
          <div style={SL}>📊 Monthly Insights</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {catMap.slice(0,5).map(([cat,amt])=>(
              <div key={cat}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}><span style={{fontSize:13.5,color:T.text,fontWeight:500}}>{CAT_ICON[cat]||"📦"} {cat}</span><span style={{fontSize:13.5,fontWeight:700,color:T.gold}}>{fmt(amt)}</span></div>
                <Bar val={amt} max={catMap[0]?.[1]||1} color={T.gold} T={T} h={4}/>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={P}>
          <div style={SL}>By Payment Method</div>
          {metMap.map(([m,a],i)=>(
            <div key={m} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:i<metMap.length-1?`1px solid ${T.bord}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:9,height:9,borderRadius:"50%",background:T.gold,flexShrink:0}}/><span style={{fontSize:14,color:T.text,fontWeight:500}}>{m}</span></div>
              <span style={{fontSize:14,fontWeight:700,color:T.gold}}>{fmt(a)}</span>
            </div>
          ))}
        </div>
      </div>}
      {(()=>{
        const[filterCat,setFilterCat]=useState("All");
        const[filterMethod,setFilterMethod]=useState("All");
        const allCatsInData=["All",...Array.from(new Set(filtered.map(t=>t.category)))];
        const allMethodsInData=["All",...Array.from(new Set(filtered.map(t=>t.method)))];
        const displayTxns=filtered.filter(t=>(filterCat==="All"||t.category===filterCat)&&(filterMethod==="All"||t.method===filterMethod));
        return(
          <div className="card" style={{overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:`1px solid ${T.bord}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{...SL,marginBottom:0}}>{isExp?"Expense":"Income"} Transactions</span>
                <span style={{fontSize:12,color:T.sub}}>{displayTxns.length} of {filtered.length}</span>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{background:T.raised,border:`1px solid ${filterCat!=="All"?T.gold:T.bord}`,borderRadius:10,padding:"7px 32px 7px 12px",color:filterCat!=="All"?T.gold:T.sub,fontFamily:"inherit",fontSize:13,fontWeight:filterCat!=="All"?700:500,cursor:"pointer",outline:"none",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",transition:"all .15s"}}>
                  {allCatsInData.map(c=><option key={c} value={c}>{c==="All"?"All Categories":((CAT_ICON[c]||"📦")+" "+c)}</option>)}
                </select>
                <select value={filterMethod} onChange={e=>setFilterMethod(e.target.value)} style={{background:T.raised,border:`1px solid ${filterMethod!=="All"?T.gold:T.bord}`,borderRadius:10,padding:"7px 32px 7px 12px",color:filterMethod!=="All"?T.gold:T.sub,fontFamily:"inherit",fontSize:13,fontWeight:filterMethod!=="All"?700:500,cursor:"pointer",outline:"none",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center",transition:"all .15s"}}>
                  {allMethodsInData.map(m=><option key={m} value={m}>{m==="All"?"All Payments":m}</option>)}
                </select>
                {(filterCat!=="All"||filterMethod!=="All")&&<button onClick={()=>{setFilterCat("All");setFilterMethod("All");}} style={{background:"none",border:"none",color:T.sub,fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",padding:"4px 8px",borderRadius:6}}>✕ Clear</button>}
              </div>
            </div>
            {displayTxns.length===0?<div style={{padding:"48px 24px",textAlign:"center",color:T.dim,fontSize:14}}>No {isExp?"expenses":"income"} match the filters.</div>:(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
                  <thead><tr style={{background:T.raised}}>{["Description","Category","Method","Date","Amount",""].map((h,i)=><th key={i} style={{padding:"11px 20px",textAlign:"left",color:T.sub,fontWeight:600,fontSize:10.5,letterSpacing:".06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {displayTxns.slice(0,50).map(t=>(
                      <tr key={t.id} className="rowh" style={{borderTop:`1px solid ${T.bord}`}}>
                        <td style={{padding:"13px 20px",color:T.text,fontWeight:500}}>{t.description}</td>
                        <td style={{padding:"13px 20px"}}><span style={{fontSize:13,background:T.goldBg,color:T.gold,borderRadius:99,padding:"3px 12px",fontWeight:600}}>{CAT_ICON[t.category]||"📦"} {t.category}</span></td>
                        <td style={{padding:"13px 20px",color:T.sub,fontSize:13}}>{t.method}</td>
                        <td style={{padding:"13px 20px",color:T.sub,fontSize:13,whiteSpace:"nowrap"}}>{t.date}</td>
                        <td style={{padding:"13px 20px",fontWeight:900,fontSize:16,letterSpacing:"-0.03em",color:isExp?T.red:T.green,whiteSpace:"nowrap"}}>{isExp?"−":"+"}{fmt(t.amount)}</td>
                        <td style={{padding:"13px 20px"}}><div style={{display:"flex",gap:6}}>
                          <button onClick={()=>onEdit(t)} style={{background:T.VBg,border:`1px solid ${T.VBord}`,borderRadius:7,padding:"5px 13px",color:T.V,fontSize:12.5,fontFamily:"inherit",fontWeight:600}}>Edit</button>
                          <button onClick={()=>onDelete(t.id)} style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:7,padding:"5px 11px",color:T.red,fontSize:12.5,fontFamily:"inherit"}}>Del</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// MONTHLY
function Monthly({txns,budget,T,view,selMonth,setSelMonth,selYear,setSelYear}) {
  const[sel,sSel]=useState(null);
  const mon=selMonth;const yr=selYear;
  const isExp=view==="expense";const acC=isExp?T.red:T.green;
  const mt=useMemo(()=>txns.filter(t=>{const[y,m]=t.date.split("-").map(Number);return y===yr&&m-1===mon;}),[txns,mon,yr]);
  const relevant=mt.filter(t=>isExp?t.type==="debit":t.type==="credit");
  const total=relevant.reduce((s,t)=>s+t.amount,0);
  const dim=new Date(yr,mon+1,0).getDate();const fd=new Date(yr,mon,1).getDay();
  const dayMap=useMemo(()=>{const m={};mt.forEach(t=>{if(!m[t.date])m[t.date]={d:0,c:0,txns:[]};m[t.date][t.type==="debit"?"d":"c"]+=t.amount;m[t.date].txns.push(t);});return m;},[mt]);
  const catBreak=useMemo(()=>{const m={};relevant.forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[relevant]);
  const maxV=Object.values(dayMap).reduce((m,d)=>Math.max(m,isExp?d.d:d.c),1);
  const weeks=[];let wk=[];
  for(let i=0;i<fd;i++)wk.push(null);
  for(let d=1;d<=dim;d++){wk.push(d);if(wk.length===7){weeks.push(wk);wk=[];}}
  if(wk.length){while(wk.length<7)wk.push(null);weeks.push(wk);}
  const sk=sel?`${yr}-${String(mon+1).padStart(2,"0")}-${String(sel).padStart(2,"0")}`:null;
  const sd=sk?dayMap[sk]:null;
  const P={padding:"20px 22px"};const SL={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:14};
  return(
    <div className="anim" style={{display:"flex",flexDirection:"column",gap:20,width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
        <div><div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>Monthly Report</div><div style={{fontSize:14,color:T.sub,marginTop:4}}>Showing {isExp?"expenses":"income"} for {MONTHS[mon]} {yr} · tap a day for details</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        {[[isExp?"Total Spent":"Total Received",fmt(total),acC,isExp?T.redBg:T.greenBg,isExp?T.redBord:T.greenBord],["Entries",String(relevant.length),T.V,T.VBg,T.VBord],["Avg / Day",fmt(Math.round(total/Math.max(1,dim))),T.gold,T.goldBg,T.goldBord],["Largest",fmt(relevant.reduce((m,t)=>Math.max(m,t.amount),0)),T.sub,T.raised,T.bord]].map(([l,v,c,bg,bo])=>(
          <div key={l} className="card hov" style={{...P,background:bg,borderColor:bo}}><div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:10}}>{l}</div><div style={{fontSize:24,fontWeight:900,color:c,letterSpacing:"-0.04em"}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:18}}>
        <div className="card" style={P}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:12}}>{DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10.5,color:T.dim,fontWeight:600}}>{d}</div>)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {weeks.flat().map((day,i)=>{
              if(!day)return<div key={`e${i}`}/>;
              const key=`${yr}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const data=dayMap[key];const val=data?(isExp?data.d:data.c):0;
              const isSel=sel===day;const isToday=key===today();
              const alpha=val>0?Math.round(Math.min(val/maxV,1)*55+15).toString(16).padStart(2,"0"):"00";
              return(
                <div key={key} onClick={()=>sSel(isSel?null:day)} style={{aspectRatio:"1",borderRadius:8,border:`1.5px solid ${isSel?acC:isToday?acC+"80":val>0?T.bord2:T.bord}`,background:isSel?`${acC}25`:(val>0?`${acC}${alpha}`:"transparent"),cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,transition:"all .14s"}}>
                  <div style={{fontSize:11.5,fontWeight:isSel||isToday?700:400,color:isSel||isToday?acC:T.text}}>{day}</div>
                  {val>0&&<div style={{fontSize:8,fontWeight:700,color:acC}}>{val>=1000?(val/1000).toFixed(1)+"k":Math.round(val)}</div>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sel&&<div className="card" style={P}>
            <div style={{fontSize:11,fontWeight:700,color:acC,letterSpacing:".07em",textTransform:"uppercase",marginBottom:12}}>{MONTHS[mon]} {sel}</div>
            {sd?<div style={{display:"flex",flexDirection:"column",gap:6}}>{sd.txns.filter(t=>isExp?t.type==="debit":t.type==="credit").map(t=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:T.raised,borderRadius:10}}>
                <div><div style={{fontSize:13,color:T.text,fontWeight:500}}>{t.description}</div><div style={{fontSize:11,color:T.sub,marginTop:2}}>{t.category}</div></div>
                <span style={{fontSize:14,fontWeight:800,color:acC}}>{isExp?"−":"+"}{fmt(t.amount)}</span>
              </div>
            ))}</div>:<div style={{color:T.dim,fontSize:13,textAlign:"center",padding:"12px 0"}}>No transactions</div>}
          </div>}
          <div className="card" style={{...P,flex:1}}>
            <div style={SL}>By Category</div>
            {catBreak.length===0?<div style={{color:T.dim,fontSize:13}}>No data</div>:catBreak.map(([cat,amt])=>(
              <div key={cat} style={{marginBottom:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:13,color:T.text,fontWeight:500}}>{CAT_ICON[cat]||"📦"} {cat}</span><span style={{fontSize:13,fontWeight:700,color:T.gold}}>{fmt(amt)}</span></div>
                <Bar val={amt} max={catBreak[0]?.[1]||1} color={T.gold} T={T} h={4}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Budget({txns,budget,setBudget,T,selMonth,selYear}) {
  const[inp,sI]=useState(String(budget||""));const[saved,sSaved]=useState(false);
  const mon=selMonth;const yr=selYear;
  const nowM=new Date().getMonth();const nowY=new Date().getFullYear();
  const isCurrent=mon===nowM&&yr===nowY;
  const save=()=>{const v=parseFloat(inp);if(v>0){setBudget(v);sSaved(true);setTimeout(()=>sSaved(false),2000);}};
  const dim=new Date(yr,mon+1,0).getDate();
  const monthDays=useMemo(()=>{
    const arr=[];
    for(let d=1;d<=dim;d++){
      const key=`${yr}-${String(mon+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const spend=txns.filter(t=>t.type==="debit"&&t.date===key).reduce((s,t)=>s+t.amount,0);
      arr.push({d,key,spend});
    }
    return arr;
  },[txns,mon,yr,dim]);
  const todayKey=today();
  const todayData=monthDays.find(d=>d.key===todayKey);
  const tp=isCurrent?pct(todayData?.spend||0,budget):0;
  const bc=tp>=100?T.red:tp>=80?"#f97316":T.green;
  const totalMonthSpend=monthDays.reduce((s,d)=>s+d.spend,0);
  const daysWithSpend=monthDays.filter(d=>d.spend>0).length;
  const avg=daysWithSpend?Math.round(totalMonthSpend/daysWithSpend):0;
  const under=monthDays.filter(d=>budget>0&&d.spend>0&&d.spend<budget).length;
  const overDays=monthDays.filter(d=>budget>0&&d.spend>budget).length;
  const maxS=Math.max(monthDays.reduce((m,d)=>Math.max(m,d.spend),1),budget||1);
  const F={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit",transition:"all .18s"};
  const P={padding:"22px 24px"};const SL={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:14};
  return(
    <div className="anim" style={{display:"flex",flexDirection:"column",gap:20,width:"100%"}}>
      <div><div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>Budget</div>
        <div style={{fontSize:14,color:T.sub,marginTop:4}}>Daily spending limit · {MONTHS[mon]} {yr}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Set budget */}
        <div className="card" style={P}>
          <div style={SL}>Set Daily Budget Limit</div>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input type="text" inputMode="numeric" value={inp} onChange={e=>sI(e.target.value.replace(/[^0-9.]/g,""))} placeholder="e.g. 500" style={F}/>
            <button onClick={save} style={{background:saved?T.green:T.gold,border:"none",borderRadius:10,padding:"12px 22px",color:"white",fontWeight:700,fontFamily:"inherit",fontSize:14,whiteSpace:"nowrap",minWidth:110,transition:"all .3s"}}>{saved?"Saved ✓":"Set Limit"}</button>
          </div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:18}}>
            {[300,500,750,1000,1500,2000].map(v=>(
              <button key={v} onClick={()=>sI(String(v))} style={{background:inp===String(v)?T.goldBg:T.raised,border:`1px solid ${inp===String(v)?T.gold:T.bord}`,borderRadius:8,padding:"6px 14px",color:inp===String(v)?T.gold:T.sub,fontFamily:"inherit",fontSize:13,fontWeight:600,transition:"all .18s"}}>{fmt(v)}</button>
            ))}
          </div>
          {budget>0&&isCurrent&&<div style={{background:T.raised,borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${T.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:T.text,fontWeight:500}}>Today's Spend</span><span style={{fontSize:18,fontWeight:900,color:bc}}>{fmt(todayData?.spend||0)}</span></div>
            <Bar val={todayData?.spend||0} max={budget} color={bc} h={7} T={T}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.sub,marginTop:7}}><span>{tp}% of ₹{budget} used</span><span style={{color:bc,fontWeight:700}}>Left: {fmt(Math.max(0,budget-(todayData?.spend||0)))}</span></div>
          </div>}
          {budget>0&&!isCurrent&&<div style={{background:T.raised,borderRadius:10,padding:"13px 16px",borderLeft:`3px solid ${T.dim}`}}>
            <div style={{fontSize:13,color:T.sub}}>Viewing past month — no live budget bar.</div>
          </div>}
        </div>

        {/* Stats */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[
            ["Month Total Spent",fmt(totalMonthSpend),T.red,T.redBg],
            ["Avg / Active Day",daysWithSpend?fmt(avg):"—",T.gold,T.goldBg],
            ["Days Under Budget",budget&&under?`${under} / ${daysWithSpend} days`:"—",T.green,T.greenBg],
            ["Days Over Budget",budget&&overDays?`${overDays} days`:"—",overDays>3?T.red:"#f97316",overDays>3?T.redBg:T.raised],
          ].map(([l,v,c,bg])=>(
            <div key={l} className="card hov" style={{padding:"16px 22px",background:bg}}>
              <div style={{fontSize:10.5,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:7}}>{l}</div>
              <div style={{fontSize:22,fontWeight:900,color:c,letterSpacing:"-0.03em"}}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily breakdown table */}
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"16px 24px",borderBottom:`1px solid ${T.bord}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{...SL,marginBottom:0}}>📅 Day-by-Day — {MONTHS[mon]} {yr}</span>
          {budget>0&&<span style={{fontSize:12,color:T.sub}}>Daily limit: {fmt(budget)}</span>}
        </div>
        <div style={{maxHeight:420,overflowY:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
            <thead style={{position:"sticky",top:0,background:T.raised,zIndex:1}}>
              <tr>{["Day","Date","Spent","Budget Used","Status"].map((h,i)=><th key={i} style={{padding:"10px 20px",textAlign:"left",color:T.sub,fontWeight:600,fontSize:10.5,letterSpacing:".06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {monthDays.map(({d,key,spend})=>{
                const isToday=key===todayKey;
                const isFuture=key>todayKey;
                const ov=budget>0&&spend>budget;
                const wn=budget>0&&spend>=budget*0.8&&!ov;
                const ok=budget>0&&spend>0&&!ov&&!wn;
                const statusColor=ov?T.red:wn?"#f97316":ok?T.green:T.dim;
                const statusText=isFuture?"—":spend===0?"No spend":ov?"Over limit":wn?"Near limit":"✓ OK";
                const pctV=budget>0&&spend>0?Math.min(pct(spend,budget),100):0;
                return(
                  <tr key={key} className="rowh" style={{borderTop:`1px solid ${T.bord}`,background:isToday?T.goldBg:""}}>
                    <td style={{padding:"11px 20px",fontWeight:500,color:T.sub,fontSize:13}}>{DAYS[new Date(key+"T12:00:00").getDay()]}</td>
                    <td style={{padding:"11px 20px",color:T.text,fontWeight:isToday?700:400}}>
                      {d} {MONTHS[mon].slice(0,3)}
                      {isToday&&<span style={{marginLeft:8,fontSize:10,background:T.gold,color:"white",borderRadius:99,padding:"2px 8px",fontWeight:700}}>TODAY</span>}
                    </td>
                    <td style={{padding:"11px 20px",fontWeight:800,fontSize:15,color:spend>0?(isFuture?T.dim:T.red):T.dim,letterSpacing:"-0.02em"}}>{spend>0?`−${fmt(spend)}`:"—"}</td>
                    <td style={{padding:"11px 20px",minWidth:150}}>
                      {budget>0&&spend>0&&!isFuture?(
                        <div style={{display:"flex",alignItems:"center",gap:9}}>
                          <div style={{flex:1,height:5,background:T.bord,borderRadius:99,overflow:"hidden",minWidth:70}}>
                            <div style={{width:pctV+"%",height:"100%",background:statusColor,borderRadius:99,transition:"width .5s"}}/>
                          </div>
                          <span style={{fontSize:12,fontWeight:700,color:statusColor,minWidth:36,textAlign:"right"}}>{pctV}%</span>
                        </div>
                      ):<span style={{color:T.dim,fontSize:13}}>—</span>}
                    </td>
                    <td style={{padding:"11px 20px"}}>
                      <span style={{fontSize:12,fontWeight:700,color:statusColor}}>{statusText}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card" style={P}>
        <div style={SL}>Spending Overview — {MONTHS[mon]} {yr}</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:3,height:100}}>
          {monthDays.map(({d,key,spend})=>{
            const h=spend>0?Math.max(Math.round(spend/maxS*100),3):0;
            const ov=budget>0&&spend>budget;const wn=budget>0&&spend>=budget*.8&&!ov;
            const isToday=key===todayKey;
            return(
              <div key={key} title={`${key}: ${fmt(spend)}`} style={{flex:1,height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:3}}>
                <div style={{width:"100%",background:ov?T.red:wn?"#f97316":isToday?T.gold:spend>0?T.V:T.bord,borderRadius:"3px 3px 0 0",height:h+"%",opacity:.85,transition:"height .4s"}}/>
                <div style={{fontSize:8,color:isToday?T.gold:T.dim,fontWeight:isToday?700:400}}>{d}</div>
              </div>
            );
          })}
        </div>
        {budget>0&&<div style={{marginTop:10,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          {[[T.V,"Normal"],[T.gold,"Today"],["#f97316","Near limit"],[T.red,"Over limit"]].map(([c,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:c}}/><span style={{fontSize:11,color:T.sub}}>{l}</span></div>
          ))}
        </div>}
      </div>
    </div>
  );
}

// BUDGET ALERT
function BudgetAlert({spent,budget,pending,onConfirm,onCancel,T}) {
  const over=spent>=budget;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surf,border:`1px solid ${over?T.redBord:T.bord}`,borderRadius:18,padding:32,width:380,boxShadow:T.shadowLg}}>
        <div style={{fontSize:16,fontWeight:800,color:over?T.red:"#f97316",marginBottom:10}}>{over?"Over budget":"Approaching limit"}</div>
        <div style={{fontSize:13.5,color:T.sub,lineHeight:1.7,marginBottom:18}}>{over?`You've used ${fmt(spent)} of ${fmt(budget)}. Adding ${fmt(pending)} puts you ${fmt(spent+pending-budget)} over.`:`Adding ${fmt(pending)} will take today to ${fmt(spent+pending)}.`}</div>
        <Bar val={spent+pending} max={budget} color={over?T.red:"#f97316"} T={T} h={5}/>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onCancel} style={{flex:1,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px",color:T.sub,fontFamily:"inherit",fontWeight:500,fontSize:14}}>Go back</button>
          <button onClick={onConfirm} style={{flex:1,background:over?T.redBg:T.goldBg,border:`1px solid ${over?T.redBord:T.goldBord}`,borderRadius:10,padding:"12px",color:over?T.red:T.gold,fontWeight:700,fontFamily:"inherit",fontSize:14}}>Add anyway</button>
        </div>
      </div>
    </div>
  );
}

// NEW ENTRY
const newForm=(type="debit")=>({date:today(),description:"",category:"Food & Dining",method:"UPI",type,amount:""});
function NewEntry({txns,onAdd,onUpdate,editTarget,onCancel,budget,setAlert,T,customCats=[],view}) {
  const defType=view==="income"?"credit":"debit";
  const[form,sF]=useState(()=>editTarget?{...editTarget,amount:String(editTarget.amount)}:newForm(defType));
  useEffect(()=>{sF(editTarget?{...editTarget,amount:String(editTarget.amount)}:newForm(defType));},[editTarget,defType]);
  const allCats=[...BASE_CATS,...customCats];
  const valid=form.description&&form.amount&&parseFloat(form.amount)>0&&form.date;
  const attempt=()=>{
    if(!valid)return;const amt=parseFloat(form.amount);
    if(form.type==="debit"&&budget>0&&!editTarget){const ts=txns.filter(t=>t.type==="debit"&&t.date===form.date).reduce((s,t)=>s+t.amount,0);if((ts+amt)/budget>=0.8){setAlert({spent:ts,budget,pending:amt,onConfirm:()=>{doSave(amt);setAlert(null);},onCancel:()=>setAlert(null)});return;}}
    doSave(amt);
  };
  const doSave=amt=>{if(editTarget)onUpdate({...form,amount:amt,id:editTarget.id});else{onAdd({...form,amount:amt});sF(newForm(defType));}};
  const F={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit",transition:"all .18s"};
  const L={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:7,display:"block"};
  return(
    <div className="anim" style={{display:"flex",gap:24,alignItems:"flex-start",width:"100%"}}>
      <div style={{flex:"0 0 490px",maxWidth:490}}>
        <div style={{marginBottom:22}}><div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>{editTarget?"Edit Transaction":"New Entry"}</div><div style={{fontSize:14,color:T.sub,marginTop:4}}>Record an {form.type==="debit"?"expense":"income"}</div></div>
        <div className="card" style={{padding:26}}>
          <div style={{marginBottom:20}}>
            <label style={L}>Type</label>
            <div style={{display:"flex",background:T.raised,borderRadius:10,padding:4,gap:3}}>
              {[["debit","Expense"],["credit","Income"]].map(([tp,lb])=>(
                <button key={tp} onClick={()=>sF({...form,type:tp})} style={{flex:1,padding:"10px",borderRadius:8,border:"none",fontFamily:"inherit",fontWeight:700,fontSize:14,transition:"all .18s",background:form.type===tp?(tp==="debit"?T.redBg:T.greenBg):"transparent",color:form.type===tp?(tp==="debit"?T.red:T.green):T.sub}}>{lb}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div><label style={L}>Date</label><input type="date" value={form.date} onChange={e=>sF({...form,date:e.target.value})} style={F}/></div>
            <div><label style={L}>Amount (₹)</label><input type="text" inputMode="numeric" value={form.amount} onChange={e=>sF({...form,amount:e.target.value.replace(/[^0-9.]/g,"")})} placeholder="0.00" style={F}/></div>
          </div>
          <div style={{marginBottom:14}}><label style={L}>Description</label><input value={form.description} onChange={e=>sF({...form,description:e.target.value})} placeholder="e.g. Zomato, Salary…" style={F}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
            <div><label style={L}>Category</label><select value={form.category} onChange={e=>sF({...form,category:e.target.value})} style={{...F,cursor:"pointer"}}>{allCats.map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label style={L}>Payment Method</label><select value={form.method} onChange={e=>sF({...form,method:e.target.value})} style={{...F,cursor:"pointer"}}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
          </div>
          {valid&&<div style={{background:T.raised,borderRadius:10,padding:"13px 16px",marginBottom:18,borderLeft:`3px solid ${form.type==="debit"?T.red:T.green}`}}>
            <div style={{fontSize:10,color:T.sub,fontWeight:600,letterSpacing:".07em",textTransform:"uppercase",marginBottom:8}}>Preview</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:600,color:T.text,fontSize:14}}>{form.description}</div><div style={{fontSize:12,color:T.sub,marginTop:2}}>{form.category} · {form.method}</div></div>
              <div style={{fontSize:22,fontWeight:900,color:form.type==="credit"?T.green:T.red}}>{form.type==="credit"?"+":"−"}{fmt(form.amount)}</div>
            </div>
          </div>}
          <div style={{display:"flex",gap:10}}>
            <button onClick={attempt} disabled={!valid} style={{flex:1,background:valid?T.gold:T.raised,border:"none",borderRadius:10,padding:"13px",color:valid?"white":T.dim,fontWeight:700,fontSize:14,fontFamily:"inherit",transition:"all .22s",boxShadow:valid?`0 4px 14px ${T.gold}60`:"none"}}>{editTarget?"Save Changes":"Add Transaction"}</button>
            {editTarget&&<button onClick={onCancel} style={{background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"13px 18px",color:T.sub,fontFamily:"inherit",fontWeight:500,fontSize:14}}>Cancel</button>}
          </div>
        </div>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:14}}>Recent Entries</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {[...txns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(t=>(
            <div key={t.id} className="card hov" style={{padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:4,height:34,background:t.type==="debit"?T.red:T.green,borderRadius:99,flexShrink:0}}/>
                  <div><div style={{fontSize:13,color:T.text,fontWeight:500}}>{t.description}</div><div style={{fontSize:11,color:T.sub,marginTop:2}}>{t.date} · {t.category}</div></div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:t.type==="credit"?T.green:T.red}}>{t.type==="credit"?"+":"−"}{fmt(t.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// PROFILE
function ProfilePage({profile,setProfile,onLogout,onClear,T,customCats,setCustomCats,bankBalance,setBankBalance}) {
  const[form,sF]=useState({username:profile.username,password:"",confirm:"",displayName:profile.displayName||""});
  const[saved,sSaved]=useState(false);const[err,sE]=useState("");const[catInp,sCatInp]=useState("");
  const[bankInp,setBankInp]=useState(String(bankBalance||""));const[bankSaved,setBankSaved]=useState(false);
  const saveBank=()=>{const v=parseFloat(bankInp);if(!isNaN(v)&&v>=0){setBankBalance(v);setBankSaved(true);setTimeout(()=>setBankSaved(false),2000);}};
  const fileRef=useRef();const allCats=[...BASE_CATS,...customCats];
  const handlePhoto=e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setProfile(p=>({...p,photo:ev.target.result}));r.readAsDataURL(f);};
  const save=()=>{if(!form.username.trim()){sE("Username cannot be empty");return;}if(form.password&&form.password!==form.confirm){sE("Passwords don't match");return;}sE("");setProfile(p=>({...p,username:form.username.trim(),displayName:form.displayName.trim()||form.username.trim(),...(form.password?{password:form.password}:{})}));sF(f=>({...f,password:"",confirm:""}));sSaved(true);setTimeout(()=>sSaved(false),2500);};
  const addCat=()=>{const v=catInp.trim();if(!v||allCats.includes(v))return;setCustomCats(p=>[...p,v]);sCatInp("");};
  const rmCat=cat=>setCustomCats(p=>p.filter(c=>c!==cat));
  const F={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit",transition:"all .18s"};
  const L={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:7,display:"block"};
  const P={padding:"22px 24px"};const SL={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:16};
  return(
    <div className="anim" style={{display:"flex",flexDirection:"column",gap:18,maxWidth:680,width:"100%"}}>
      <div><div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>Profile & Settings</div><div style={{fontSize:14,color:T.sub,marginTop:4}}>Manage your account</div></div>
      <div className="card" style={P}>
        <div style={SL}>Profile Photo</div>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{width:80,height:80,borderRadius:18,overflow:"hidden",background:T.gold,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {profile.photo?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:30,fontWeight:900,color:"white"}}>{(profile.displayName||profile.username)[0].toUpperCase()}</span>}
          </div>
          <div>
            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} style={{display:"none"}}/>
            <button onClick={()=>fileRef.current.click()} style={{background:T.goldBg,border:`1px solid ${T.goldBord}`,borderRadius:9,padding:"9px 18px",color:T.gold,fontFamily:"inherit",fontWeight:700,fontSize:13.5,display:"block",marginBottom:8}}>Upload Photo</button>
            {profile.photo&&<button onClick={()=>setProfile(p=>({...p,photo:null}))} style={{background:"none",border:"none",color:T.sub,fontFamily:"inherit",fontSize:13}}>Remove</button>}
          </div>
        </div>
      </div>
      <div className="card" style={P}>
        <div style={SL}>Account</div>
        {err&&<div style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"10px 14px",color:T.red,fontSize:13,marginBottom:14,fontWeight:500}}>{err}</div>}
        {saved&&<div style={{background:T.greenBg,border:`1px solid ${T.greenBord}`,borderRadius:9,padding:"10px 14px",color:T.green,fontSize:13,marginBottom:14,fontWeight:500}}>Saved and synced ✓</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div><label style={L}>Display Name</label><input value={form.displayName} onChange={e=>sF({...form,displayName:e.target.value})} placeholder="Your name" style={F}/></div>
          <div><label style={L}>Username</label><input value={form.username} onChange={e=>sF({...form,username:e.target.value})} style={F}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22}}>
          <div><label style={L}>New Password</label><input type="password" value={form.password} onChange={e=>sF({...form,password:e.target.value})} placeholder="Leave blank to keep" style={F}/></div>
          <div><label style={L}>Confirm Password</label><input type="password" value={form.confirm} onChange={e=>sF({...form,confirm:e.target.value})} placeholder="Repeat" style={F}/></div>
        </div>
        <button onClick={save} style={{background:T.gold,border:"none",borderRadius:10,padding:"12px 28px",color:"white",fontWeight:700,fontSize:14,fontFamily:"inherit",boxShadow:`0 4px 14px ${T.gold}60`}}>Save Changes</button>
      </div>
      <div className="card" style={P}>
        <div style={SL}>Custom Expense Categories</div>
        {customCats.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{customCats.map(cat=><div key={cat} style={{display:"flex",alignItems:"center",gap:6,background:T.goldBg,border:`1px solid ${T.goldBord}`,borderRadius:99,padding:"5px 12px"}}><span style={{fontSize:13,color:T.gold,fontWeight:600}}>{cat}</span><button onClick={()=>rmCat(cat)} style={{background:"none",border:"none",color:T.sub,fontSize:16,lineHeight:1,padding:0}}>×</button></div>)}</div>}
        {customCats.length===0&&<div style={{fontSize:13,color:T.dim,marginBottom:12}}>No custom categories yet.</div>}
        <div style={{display:"flex",gap:10}}>
          <input value={catInp} onChange={e=>sCatInp(e.target.value)} placeholder="e.g. Gym, Travel, Rent…" style={{...F,flex:1}} onKeyDown={e=>e.key==="Enter"&&addCat()}/>
          <button onClick={addCat} disabled={!catInp.trim()||allCats.includes(catInp.trim())} style={{background:catInp.trim()&&!allCats.includes(catInp.trim())?T.gold:T.raised,border:"none",borderRadius:10,padding:"12px 22px",color:catInp.trim()&&!allCats.includes(catInp.trim())?"white":T.dim,fontWeight:700,fontFamily:"inherit",fontSize:14,whiteSpace:"nowrap",transition:"all .18s"}}>+ Add</button>
        </div>
      </div>
      <div className="card" style={P}>
        {(()=>{
          const[bInp,setBInp]=useState("");const[bSaved,setBSaved]=useState(false);
          const saveBalance=()=>{const n=parseFloat(bInp.replace(/,/g,""));if(isNaN(n)||n<0)return;setBankBalance(n);setBSaved(true);setTimeout(()=>setBSaved(false),2500);};
          return(<>
            <div style={SL}>🏦 Update Starting Balance</div>
            <div style={{fontSize:13,color:T.sub,marginBottom:16,lineHeight:1.7}}>Your current balance auto-adjusts with every transaction. If you need to correct the starting figure, enter it here.</div>
            <div style={{display:"flex",gap:10}}>
              <div style={{position:"relative",flex:1}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.sub,fontSize:16,fontWeight:700}}>₹</span>
                <input type="text" inputMode="numeric" value={bInp} onChange={e=>setBInp(e.target.value.replace(/[^0-9.]/g,""))} placeholder="e.g. 25000" style={{...F,paddingLeft:34}}/>
              </div>
              <button onClick={saveBalance} disabled={!bInp.trim()} style={{background:bSaved?T.teal:bInp.trim()?T.terra:T.raised,border:"none",borderRadius:10,padding:"12px 22px",color:bInp.trim()?"white":T.dim,fontWeight:700,fontFamily:"inherit",fontSize:14,whiteSpace:"nowrap",minWidth:140,transition:"all .25s"}}>{bSaved?"Saved ✓":"Update Balance"}</button>
            </div>
          </>);
        })()}
      </div>
      <div className="card" style={{...P,borderColor:T.redBord}}>
        <div style={{fontSize:11,fontWeight:600,color:T.red,letterSpacing:".07em",textTransform:"uppercase",marginBottom:14}}>Danger Zone</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onLogout} style={{background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"9px 20px",color:T.sub,fontFamily:"inherit",fontWeight:500,fontSize:14}}>Sign Out</button>
          <button onClick={onClear} style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"9px 20px",color:T.red,fontFamily:"inherit",fontWeight:600,fontSize:14}}>Delete All Transactions</button>
        </div>
      </div>
    </div>
  );
}

// BANK SETUP MODAL — shown once on first login
function BankSetupModal({T,onSave}) {
  const[val,setVal]=useState("");
  const[saving,setSaving]=useState(false);
  const num=parseFloat(val.replace(/,/g,""))||0;
  const valid=val.trim()!==""&&num>=0;

  const save=async()=>{
    if(!valid)return;
    setSaving(true);
    await onSave(num);
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div className="anim" style={{width:460,background:T.surf,border:`1px solid ${T.bord}`,borderRadius:24,padding:"48px 44px",boxShadow:T.shadowLg}}>
        {/* Icon */}
        <div style={{width:52,height:52,borderRadius:14,background:T.tealBg,border:`1px solid ${T.tealBord}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:24}}>🏦</div>
        <div style={{fontSize:22,fontWeight:900,color:T.text,letterSpacing:"-0.04em",marginBottom:8}}>What's your current bank balance?</div>
        <div style={{fontSize:14,color:T.sub,lineHeight:1.7,marginBottom:32}}>
          Enter the amount in your bank account right now. Gullak will use this as your starting point and automatically track every change as you log transactions.
        </div>
        {/* Input */}
        <div style={{position:"relative",marginBottom:10}}>
          <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",fontSize:18,fontWeight:700,color:T.sub}}>₹</span>
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={val}
            onChange={e=>setVal(e.target.value.replace(/[^0-9.]/g,""))}
            onKeyDown={e=>e.key==="Enter"&&valid&&save()}
            placeholder="e.g. 25000"
            style={{width:"100%",background:T.raised,border:`2px solid ${valid?T.teal:T.bord}`,borderRadius:14,padding:"16px 16px 16px 40px",color:T.text,fontSize:20,fontWeight:700,fontFamily:"inherit",transition:"border-color .2s",outline:"none"}}
          />
        </div>
        {val&&<div style={{fontSize:12,color:T.sub,marginBottom:28,paddingLeft:4}}>
          Starting balance: <span style={{fontWeight:700,color:T.teal}}>{val?`₹${parseFloat(val.replace(/,/g,"")||0).toLocaleString("en-IN")}`:""}</span>
        </div>}
        {!val&&<div style={{height:28}}/>}
        <button
          onClick={save}
          disabled={!valid||saving}
          style={{width:"100%",background:valid?T.teal:T.raised,border:"none",borderRadius:12,padding:"15px",color:valid?"white":T.dim,fontWeight:700,fontSize:15,fontFamily:"inherit",transition:"all .22s",boxShadow:valid?`0 4px 20px ${T.teal}40`:"none",letterSpacing:".01em"}}
        >
          {saving?"Setting up…":"Set My Starting Balance"}
        </button>
        <div style={{marginTop:16,fontSize:12,color:T.dim,textAlign:"center",lineHeight:1.6}}>
          You can update this anytime from Settings.<br/>All future transactions will adjust this automatically.
        </div>
      </div>
    </div>
  );
}

// ROOT
const DEF_PROFILE={username:"admin",password:"admin123",displayName:"",photo:null};
export default function App() {
  const[loggedIn,sLI]=useState(false);const[tab,sTab]=useState("overview");const[view,sView]=useState("expense");
  const[txns,sTxns]=useState([]);const[loading,sLoad]=useState(true);const[dbErr,sDbErr]=useState("");
  const[budget,sBudget]=useState(()=>LS.get("gulak_budget",500));
  const[bankBalance,setBankBalanceRaw]=useState(()=>LS.get("gulak_bank",0));
  // Modal shows only if gulak_bank_set has never been true in localStorage on this device
  const[bankSetupNeeded,setBankSetupNeeded]=useState(false);
  const bankEverSet=useRef(LS.get("gulak_bank_set",false));
  const[profile,sProfRaw]=useState(()=>LS.get("gulak_profile",DEF_PROFILE));
  const[customCats,sCats]=useState(()=>LS.get("gulak_custom_cats",[]));
  const[editTarget,sET]=useState(null);const[toast,sToast]=useState(null);const[delId,sDel]=useState(null);const[alert,sAlert]=useState(null);
  const[dark,setDark]=useState(()=>LS.get("gulak_dark",true));
  const[selMonth,setSelMonth]=useState(new Date().getMonth());
  const[selYear,setSelYear]=useState(new Date().getFullYear());
  const T=dark?DARK:LIGHT;
  const didLoad=useRef(false);

  useEffect(()=>{
    Promise.all([sb.all(),sb.getSettings()]).then(([rows,settings])=>{
      sTxns(rows);
      if(settings){
        sProfRaw(p=>{const m={...p,username:settings.username||p.username,password:settings.password||p.password,displayName:settings.display_name||p.displayName||""};LS.set("gulak_profile",m);return m;});
        if(settings.budget)sBudget(Number(settings.budget));
        if(settings.bank_balance!=null){
          setBankBalanceRaw(Number(settings.bank_balance));
          LS.set("gulak_bank",Number(settings.bank_balance));
          LS.set("gulak_bank_set",true);
          bankEverSet.current=true;
        }
      }
      // Only show modal if balance was NEVER set on this device
      if(!bankEverSet.current){setBankSetupNeeded(true);}
      didLoad.current=true;sLoad(false);
    }).catch(e=>{sDbErr(e.message);sLoad(false);});
  },[]);

  useEffect(()=>{LS.set("gulak_dark",dark);},[dark]);
  useEffect(()=>{LS.set("gulak_custom_cats",customCats);},[customCats]);
  useEffect(()=>{LS.set("gulak_budget",budget);if(!didLoad.current)return;sb.saveSettings({budget,bank_balance:bankBalance,username:profile.username,password:profile.password,display_name:profile.displayName||profile.username}).catch(()=>{});},[budget]);

  const setBankBalance=vOrFn=>{setBankBalanceRaw(prev=>{const n=typeof vOrFn==="function"?Math.max(0,vOrFn(prev)):Math.max(0,Number(vOrFn)||0);LS.set("gulak_bank",n);if(didLoad.current)sb.saveSettings({budget,bank_balance:n,username:profile.username,password:profile.password,display_name:profile.displayName||profile.username}).catch(()=>{});return n;});};
  const handleBankSetup=async(amount)=>{LS.set("gulak_bank_set",true);bankEverSet.current=true;setBankBalance(amount);setBankSetupNeeded(false);};
  const setProfile=fn=>{sProfRaw(p=>{const next=typeof fn==="function"?fn(p):fn;LS.set("gulak_profile",next);sb.saveSettings({budget,bank_balance:bankBalance,username:next.username,password:next.password,display_name:next.displayName||next.username}).catch(()=>{});return next;});};
  const toast2=(msg,type="ok")=>{sToast({msg,type});setTimeout(()=>sToast(null),2800);};
  const handleAdd=async t=>{try{const s=await sb.insert(t);sTxns(p=>[s,...p]);
    if(t.type==="debit"&&["UPI","Bank Transfer","Debit Card"].includes(t.method))setBankBalance(b=>b-t.amount);
    if(t.type==="credit"&&["UPI","Bank Transfer"].includes(t.method))setBankBalance(b=>b+t.amount);
    toast2("Saved ✓");}catch{toast2("Save failed","err");}};
  const handleUpdate=async t=>{try{
    const old2=txns.find(x=>x.id===t.id);
    if(old2){
      if(old2.type==="debit"&&["UPI","Bank Transfer","Debit Card"].includes(old2.method))setBankBalance(b=>b+old2.amount);
      if(old2.type==="credit"&&["UPI","Bank Transfer"].includes(old2.method))setBankBalance(b=>b-old2.amount);
    }
    await sb.update(t);sTxns(p=>p.map(x=>x.id===t.id?t:x));
    if(t.type==="debit"&&["UPI","Bank Transfer","Debit Card"].includes(t.method))setBankBalance(b=>b-t.amount);
    if(t.type==="credit"&&["UPI","Bank Transfer"].includes(t.method))setBankBalance(b=>b+t.amount);
    sET(null);sTab("dashboard");toast2("Updated ✓");}catch{toast2("Failed","err");}};
  const handleEdit=t=>{sET(t);sTab("entry");};
  const handleDelete=async()=>{try{
    const t=txns.find(x=>x.id===delId);
    if(t){
      if(t.type==="debit"&&["UPI","Bank Transfer","Debit Card"].includes(t.method))setBankBalance(b=>b+t.amount);
      if(t.type==="credit"&&["UPI","Bank Transfer"].includes(t.method))setBankBalance(b=>b-t.amount);
    }
    await sb.remove(delId);sTxns(p=>p.filter(t=>t.id!==delId));sDel(null);toast2("Deleted","err");}catch{toast2("Failed","err");}};
  const clearData=async()=>{if(!window.confirm("Delete ALL transactions?"))return;try{await sb.clearAll();sTxns([]);toast2("Cleared","err");}catch{toast2("Failed","err");}};
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const dn=profile.displayName||profile.username;

  if(loading)return(<div style={{minHeight:"100vh",background:"#110D0A",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Inter',sans-serif"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:36,height:36,border:"3px solid #3A2E24",borderTop:"3px solid #E8693A",borderRadius:"50%",animation:"spin .7s linear infinite"}}/><div style={{fontSize:13,color:"#8A7A68"}}>Connecting…</div></div>);
  if(dbErr)return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Inter',sans-serif"}}><div style={{maxWidth:440,background:T.surf,border:`1px solid ${T.redBord}`,borderRadius:18,padding:36}}><div style={{fontSize:16,fontWeight:800,color:T.red,marginBottom:10}}>Database error</div><div style={{fontSize:13.5,color:T.sub,lineHeight:1.75}}>{dbErr}</div></div></div>);

  return(
    <div style={{width:"100%",minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <G T={T}/>
      {!loggedIn&&<div style={{position:"fixed",inset:0,zIndex:100}}><Login onLogin={()=>sLI(true)} profile={profile} T={T}/></div>}
      {loggedIn&&bankSetupNeeded&&<BankSetupModal T={T} onSave={handleBankSetup}/>}
      {alert&&<BudgetAlert {...alert} T={T}/>}
      {toast&&<div style={{position:"fixed",top:18,right:18,zIndex:200,background:T.surf,border:`1px solid ${toast.type==="err"?T.terraBord:T.marigoldBord}`,borderRadius:11,padding:"12px 20px",color:toast.type==="err"?T.terra:T.marigold,fontSize:14,fontWeight:600,boxShadow:T.shadowLg,animation:"fadeIn .25s both"}}>{toast.msg}</div>}
      {delId!==null&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:150,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{background:T.surf,border:`1px solid ${T.bord}`,borderRadius:16,padding:28,width:320,textAlign:"center",boxShadow:T.shadowLg}}><div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:8}}>Delete transaction?</div><div style={{fontSize:14,color:T.sub,marginBottom:22}}>This cannot be undone.</div><div style={{display:"flex",gap:10}}><button onClick={()=>sDel(null)} style={{flex:1,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"11px",color:T.sub,fontFamily:"inherit",fontSize:14}}>Cancel</button><button onClick={handleDelete} style={{flex:1,background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"11px",color:T.red,fontWeight:700,fontFamily:"inherit",fontSize:14}}>Delete</button></div></div></div>}
      {loggedIn&&<>
        <TopBar tab={tab} setTab={t=>{sTab(t);if(t!=="entry")sET(null);}} view={view} setView={sView} profile={profile} dark={dark} toggleDark={()=>setDark(d=>!d)} budget={budget} tSpend={tSpend} T={T} onAdd={()=>{sET(null);sTab("entry");}} selMonth={selMonth} setSelMonth={setSelMonth} selYear={selYear} setSelYear={setSelYear}/>
        <div style={{flex:1,width:"100%",padding:"28px 32px",boxSizing:"border-box"}}>
          {tab==="overview"&&<Overview txns={txns} budget={budget} name={dn} T={T} setTab={t=>{sTab(t);}} selMonth={selMonth} selYear={selYear}/>}
          {(tab==="expense"||tab==="income")&&<Dashboard txns={txns} budget={budget} name={dn} T={T} view={tab==="expense"?"expense":"income"} onEdit={handleEdit} onDelete={sDel} customCats={customCats} selMonth={selMonth} selYear={selYear} bankBalance={bankBalance}/>}
          {tab==="monthly"&&<Monthly txns={txns} budget={budget} T={T} view={view} selMonth={selMonth} setSelMonth={setSelMonth} selYear={selYear} setSelYear={setSelYear}/>}
          {tab==="budget"&&<Budget txns={txns} budget={budget} setBudget={sBudget} T={T} selMonth={selMonth} selYear={selYear}/>}
          {tab==="entry"&&<NewEntry txns={txns} editTarget={editTarget} onAdd={handleAdd} onUpdate={handleUpdate} onCancel={()=>{sET(null);sTab("dashboard");}} budget={budget} setAlert={sAlert} T={T} customCats={customCats} view={view}/>}
          {(tab==="profile"||tab==="settings")&&<ProfilePage profile={profile} setProfile={setProfile} onLogout={()=>sLI(false)} onClear={clearData} T={T} customCats={customCats} setCustomCats={sCats} bankBalance={bankBalance} setBankBalance={setBankBalance}/>}
        </div>
      </>}
    </div>
  );
}