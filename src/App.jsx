import React, { useState, useMemo, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SUPA_URL = "https://fxnfnxfjuwwoxwzlabix.supabase.co";
const SUPA_KEY = "sb_publishable_Jpkmj4u-EUSEOcKWaAcRBw_ma4pROXy";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const sb = {
  h: { "Content-Type":"application/json", "apikey":SUPA_KEY, "Authorization":`Bearer ${SUPA_KEY}` },
  url:(p,q="")=>`${SUPA_URL}/rest/v1/${p}${q}`,
  async all(){
    const r=await fetch(sb.url("transactions","?order=created_at.desc"),{headers:sb.h});
    if(!r.ok)throw new Error(await r.text());
    return(await r.json()).map(r=>({id:r.id,date:r.date,description:r.description,category:r.category,method:r.method,type:r.type,amount:Number(r.amount)}));
  },
  async insert(t){
    const r=await fetch(sb.url("transactions"),{method:"POST",headers:{...sb.h,"Prefer":"return=representation"},body:JSON.stringify({date:t.date,description:t.description,category:t.category,method:t.method,type:t.type,amount:t.amount})});
    if(!r.ok)throw new Error(await r.text());
    const[row]=await r.json();
    return{id:row.id,date:row.date,description:row.description,category:row.category,method:row.method,type:row.type,amount:Number(row.amount)};
  },
  async update(t){
    const r=await fetch(sb.url("transactions",`?id=eq.${t.id}`),{method:"PATCH",headers:{...sb.h,"Prefer":"return=representation"},body:JSON.stringify({date:t.date,description:t.description,category:t.category,method:t.method,type:t.type,amount:t.amount})});
    if(!r.ok)throw new Error(await r.text());
  },
  async remove(id){
    const r=await fetch(sb.url("transactions",`?id=eq.${id}`),{method:"DELETE",headers:sb.h});
    if(!r.ok)throw new Error(await r.text());
  },
  async clearAll(){
    const r=await fetch(sb.url("transactions","?id=gte.0"),{method:"DELETE",headers:sb.h});
    if(!r.ok)throw new Error(await r.text());
  },
  async getSettings(){
    const r=await fetch(sb.url("settings","?id=eq.1"),{headers:sb.h});
    if(!r.ok)throw new Error(await r.text());
    const rows=await r.json();
    return rows[0]||null;
  },
  async saveSettings(data){
    await fetch(sb.url("settings","?id=eq.1"),{method:"DELETE",headers:sb.h});
    const r=await fetch(sb.url("settings"),{method:"POST",headers:{...sb.h,"Prefer":"return=representation"},body:JSON.stringify({id:1,...data})});
    if(!r.ok)throw new Error(await r.text());
  },
};

const LS={
  get:(k,fb)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES=["Food & Dining","Utilities","Entertainment","Credit Card","Transport","Shopping","Healthcare","Education","Income","Other"];
const METHODS=["UPI","Cash","Credit Card","Bank Transfer","Debit Card"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const CAT_COLORS={
  "Food & Dining":"#fb923c",
  Utilities:"#60a5fa",
  Entertainment:"#c084fc",
  "Credit Card":"#f87171",
  Transport:"#34d399",
  Shopping:"#f472b6",
  Healthcare:"#4ade80",
  Education:"#fbbf24",
  Income:"#818cf8",
  Other:"#94a3b8",
};
const MET_COLORS={UPI:"#818cf8",Cash:"#fbbf24","Credit Card":"#f87171","Bank Transfer":"#34d399","Debit Card":"#60a5fa"};

const fmt=n=>"₹"+Number(n).toLocaleString("en-IN");
const today=()=>new Date().toISOString().slice(0,10);
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const pct=(v,m)=>m?clamp(Math.round(v/m*100),0,100):0;

// ─── THEMES ───────────────────────────────────────────────────────────────────
// Dark: warm charcoal like Paisa, not cold black
const DARK={
  bg:"#111111",
  surf:"#1a1a1a",
  raised:"#222222",
  card:"#1e1e1e",
  bord:"#2a2a2a",
  bord2:"#333333",
  text:"#f5f5f0",
  sub:"#888880",
  dim:"#444440",
  navBg:"rgba(17,17,17,0.92)",
  // Semantic
  red:"#ff6b6b",
  redBg:"rgba(255,107,107,0.12)",
  redBord:"rgba(255,107,107,0.25)",
  green:"#51cf66",
  greenBg:"rgba(81,207,102,0.12)",
  greenBord:"rgba(81,207,102,0.25)",
  amber:"#ffd43b",
  amberBg:"rgba(255,212,59,0.12)",
  orange:"#ff922b",
  orangeBg:"rgba(255,146,43,0.12)",
  blue:"#74c0fc",
  V:"#845ef7",
  VL:"#9775fa",
  VD:"#6741d9",
  VBg:"rgba(132,94,247,0.12)",
  VBord:"rgba(132,94,247,0.3)",
  shadow:"0 4px 24px rgba(0,0,0,0.4)",
  shadowLg:"0 8px 48px rgba(0,0,0,0.6)",
};

// Light: clean warm white
const LIGHT={
  bg:"#f8f8f6",
  surf:"#ffffff",
  raised:"#f0f0ee",
  card:"#ffffff",
  bord:"#e8e8e5",
  bord2:"#d8d8d4",
  text:"#111111",
  sub:"#777770",
  dim:"#bbbbbb",
  navBg:"rgba(255,255,255,0.92)",
  red:"#e03131",
  redBg:"rgba(224,49,49,0.08)",
  redBord:"rgba(224,49,49,0.2)",
  green:"#2f9e44",
  greenBg:"rgba(47,158,68,0.08)",
  greenBord:"rgba(47,158,68,0.2)",
  amber:"#e67700",
  amberBg:"rgba(230,119,0,0.08)",
  orange:"#d9480f",
  orangeBg:"rgba(217,72,15,0.08)",
  blue:"#1971c2",
  V:"#7048e8",
  VL:"#845ef7",
  VD:"#5f3dc4",
  VBg:"rgba(112,72,232,0.08)",
  VBord:"rgba(112,72,232,0.25)",
  shadow:"0 2px 12px rgba(0,0,0,0.08)",
  shadowLg:"0 8px 32px rgba(0,0,0,0.12)",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
function GlobalCSS({T,dark}){
  const css=`
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:${T.bg};font-family:'Outfit',system-ui,sans-serif;color:${T.text};transition:background .25s,color .25s;}
::-webkit-scrollbar{width:5px;height:5px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${T.bord2};border-radius:99px;}
select option{background:${T.surf};color:${T.text};}
input[type=number]{-moz-appearance:textfield;appearance:textfield;}
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;}
input[type=date]::-webkit-calendar-picker-indicator{opacity:.5;cursor:pointer;filter:${dark?"invert(1)":"none"};}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
.fu{animation:fadeUp .38s cubic-bezier(.22,1,.36,1) both;}
.fi{animation:fadeIn .25s ease both;}
.card{background:${T.card};border:1px solid ${T.bord};border-radius:16px;padding:20px 22px;transition:box-shadow .2s,border-color .2s,transform .2s;}
.card:hover{box-shadow:${T.shadow};border-color:${T.bord2};}
.card-lift:hover{transform:translateY(-2px);}
.row-hover:hover{background:${T.raised}!important;border-radius:10px;}
.ghost-btn{background:${T.raised};border:1px solid ${T.bord};border-radius:9px;padding:8px 16px;color:${T.sub};cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;transition:all .18s;}
.ghost-btn:hover{border-color:${T.V};color:${T.V};}
.nav-btn{padding:7px 16px;border-radius:99px;border:none;background:transparent;color:${T.sub};cursor:pointer;font-size:13.5px;font-weight:500;font-family:'Outfit',sans-serif;transition:all .18s;white-space:nowrap;}
.nav-btn:hover{background:${T.raised};color:${T.text};}
.nav-btn.active{background:${T.V};color:white;font-weight:700;}
.nav-btn.cta{background:${T.VBg};border:1px solid ${T.VBord};color:${T.VL};}
.nav-btn.cta:hover{background:${T.V};color:white;}
input:focus,select:focus,textarea:focus{outline:none!important;border-color:${T.V}!important;box-shadow:0 0 0 3px ${T.VBg}!important;}
button:active{opacity:.85;}
  `;
  return <style>{css}</style>;
}

// ─── BAR ──────────────────────────────────────────────────────────────────────
function Bar({value,max,color,h=5,anim=true,T}){
  const[w,setW]=useState(anim?0:pct(value,max));
  useEffect(()=>{if(anim){const t=setTimeout(()=>setW(pct(value,max)),60);return()=>clearTimeout(t);}},[value,max]);
  const bg=T.dark?`rgba(255,255,255,.06)`:`rgba(0,0,0,.06)`;
  return(
    <div style={{background:bg,borderRadius:99,height:h,overflow:"hidden"}}>
      <div style={{width:(anim?w:pct(value,max))+"%",height:"100%",background:color,borderRadius:99,transition:anim?"width .7s cubic-bezier(.22,1,.36,1)":"none"}}/>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({label,value,sub,accentColor,accentBg,accentBord,bar,barMax,T,icon,gradient}){
  return(
    <div className="card card-lift" style={gradient?{background:gradient,border:`1px solid ${accentBord||T.bord}`,borderRadius:16,padding:"20px 22px",transition:"box-shadow .2s,transform .2s"}:{}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <span style={{fontSize:11.5,fontWeight:600,color:accentColor||T.sub,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</span>
        {icon&&(
          <div style={{width:32,height:32,borderRadius:10,background:accentBg||T.raised,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {icon}
          </div>
        )}
      </div>
      <div style={{fontSize:26,fontWeight:800,color:accentColor||T.text,letterSpacing:"-0.04em",lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:T.sub,marginTop:7,fontWeight:400}}>{sub}</div>}
      {bar!=null&&<div style={{marginTop:12}}><Bar value={bar} max={barMax||1} color={accentColor} T={T}/></div>}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin,profile,T,dark}){
  const[u,sU]=useState("");const[p,sP]=useState("");
  const[err,sE]=useState("");const[show,sS]=useState(false);const[load,sL]=useState(false);
  const go=()=>{
    if(!u||!p)return;sL(true);
    setTimeout(()=>{
      if(u===profile.username&&p===profile.password)onLogin();
      else{sE("Incorrect credentials");sL(false);}
    },450);
  };
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      {/* Ambient blobs */}
      <div style={{position:"absolute",top:"-20%",right:"-10%",width:500,height:500,borderRadius:"50%",background:dark?"radial-gradient(circle,rgba(132,94,247,.15) 0%,transparent 70%)":"radial-gradient(circle,rgba(132,94,247,.08) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:"-10%",left:"-5%",width:400,height:400,borderRadius:"50%",background:dark?"radial-gradient(circle,rgba(81,207,102,.08) 0%,transparent 70%)":"radial-gradient(circle,rgba(81,207,102,.05) 0%,transparent 70%)",pointerEvents:"none"}}/>

      <div className="fu" style={{width:420,background:T.surf,border:`1px solid ${T.bord}`,borderRadius:24,padding:"48px 44px",boxShadow:T.shadowLg}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:38}}>
          <div style={{width:64,height:64,borderRadius:20,background:`linear-gradient(135deg,${T.VL},${T.VD})`,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 8px 24px ${T.V}40`,overflow:"hidden"}}>
            {profile.photo
              ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            }
          </div>
          <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:"-0.05em"}}>Gulak</div>
          <div style={{fontSize:13.5,color:T.sub,marginTop:5}}>Track every rupee, own your story</div>
        </div>

        {err&&<div style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:10,padding:"11px 15px",color:T.red,fontSize:13,marginBottom:20,fontWeight:500}}>{err}</div>}

        <div style={{marginBottom:16}}>
          <label style={{fontSize:11.5,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8,display:"block"}}>Username</label>
          <input value={u} onChange={e=>sU(e.target.value)} placeholder="Enter username"
            style={{width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:11,padding:"13px 15px",color:T.text,fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",transition:"all .2s"}}
            onKeyDown={e=>e.key==="Enter"&&go()}/>
        </div>
        <div style={{marginBottom:30,position:"relative"}}>
          <label style={{fontSize:11.5,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8,display:"block"}}>Password</label>
          <input value={p} onChange={e=>sP(e.target.value)} type={show?"text":"password"} placeholder="Enter password"
            style={{width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:11,padding:"13px 48px 13px 15px",color:T.text,fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",transition:"all .2s"}}
            onKeyDown={e=>e.key==="Enter"&&go()}/>
          <button onClick={()=>sS(!show)} style={{position:"absolute",right:14,bottom:14,background:"none",border:"none",color:T.sub,cursor:"pointer",fontSize:11,fontFamily:"'Outfit',sans-serif",fontWeight:600,letterSpacing:"0.05em"}}>{show?"HIDE":"SHOW"}</button>
        </div>
        <button onClick={go} disabled={load||!u||!p}
          style={{width:"100%",background:!u||!p?T.raised:`linear-gradient(135deg,${T.VL},${T.VD})`,border:"none",borderRadius:12,padding:"14px",color:!u||!p?T.dim:"white",fontWeight:700,fontSize:15,cursor:!u||!p?"not-allowed":"pointer",fontFamily:"'Outfit',sans-serif",transition:"all .25s",letterSpacing:"0.01em",boxShadow:u&&p?`0 4px 16px ${T.V}40`:"none"}}>
          {load?"Signing in…":"Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",label:"Dashboard"},
  {id:"monthly",label:"Monthly"},
  {id:"budget",label:"Budget"},
  {id:"transactions",label:"Transactions"},
  {id:"entry",label:"+ New Entry",cta:true},
  {id:"profile",label:"Profile"},
];

function TopBar({tab,setTab,profile,dark,toggleDark,budget,tSpend,bp,bc,T}){
  const dn=profile.displayName||profile.username;
  return(
    <div style={{position:"sticky",top:0,zIndex:50,background:T.navBg,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:`1px solid ${T.bord}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:58}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:11,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:10,background:`linear-gradient(135deg,${T.VL},${T.VD})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 12px ${T.V}40`}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 13.5"/></svg>
          </div>
          <span style={{fontSize:18,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Gulak</span>
        </div>

        {/* Right */}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {/* Live sync */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:T.greenBg,border:`1px solid ${T.greenBord}`,borderRadius:99,padding:"5px 12px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:T.green,animation:"pulse 2.5s ease infinite"}}/>
            <span style={{fontSize:11,fontWeight:700,color:T.green,letterSpacing:"0.04em"}}>LIVE</span>
          </div>

          {/* Budget mini */}
          {budget>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:"5px 14px"}}>
              <div style={{width:36,height:5,background:T.bord,borderRadius:99,overflow:"hidden"}}>
                <div style={{width:bp+"%",height:"100%",background:bc,borderRadius:99,transition:"width .5s"}}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:bc}}>{bp}%</span>
            </div>
          )}

          {/* Dark toggle */}
          <button onClick={toggleDark} className="ghost-btn" style={{width:36,height:36,padding:0,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:10}}>
            {dark
              ?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
              :<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {/* Avatar */}
          <button onClick={()=>setTab("profile")}
            style={{display:"flex",alignItems:"center",gap:8,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:"4px 12px 4px 4px",cursor:"pointer",transition:"all .2s",fontFamily:"'Outfit',sans-serif"}}>
            <div style={{width:28,height:28,borderRadius:"50%",overflow:"hidden",background:`linear-gradient(135deg,${T.VL},${T.VD})`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {profile.photo
                ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<span style={{fontSize:12,fontWeight:700,color:"white"}}>{dn.charAt(0).toUpperCase()}</span>
              }
            </div>
            <span style={{fontSize:13,fontWeight:600,color:T.text}}>{dn}</span>
          </button>
        </div>
      </div>

      {/* Nav */}
      <div style={{display:"flex",alignItems:"center",gap:3,padding:"0 18px 10px",overflowX:"auto"}}>
        {NAV.map(item=>(
          <button key={item.id}
            className={`nav-btn${tab===item.id?" active":item.cta?" cta":""}`}
            onClick={()=>setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({txns,budget,name,T,dark}){
  const cred=txns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const deb=txns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const bal=cred-deb;
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const bp=pct(tSpend,budget);
  const bc=bp>=100?T.red:bp>=80?T.orange:T.green;
  const h=new Date().getHours();
  const greet=h<12?"Good morning":h<17?"Good afternoon":"Good evening";

  if(!txns.length)return(
    <div className="fu" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:14,textAlign:"center"}}>
      <div style={{width:72,height:72,borderRadius:20,background:T.VBg,border:`1px solid ${T.VBord}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={T.V} strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
      </div>
      <div style={{fontSize:21,fontWeight:700,color:T.text,letterSpacing:"-0.03em"}}>No transactions yet</div>
      <div style={{fontSize:14,color:T.sub,maxWidth:280,lineHeight:1.7}}>Hit <span style={{color:T.V,fontWeight:600}}>+ New Entry</span> in the nav to get started.</div>
    </div>
  );

  const cats=useMemo(()=>{const m={};txns.filter(t=>t.type==="debit").forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[txns]);
  const mets=useMemo(()=>{const m={};txns.forEach(t=>{m[t.method]=(m[t.method]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[txns]);
  const bars=useMemo(()=>{const m={};txns.forEach(t=>{if(!m[t.date])m[t.date]={c:0,d:0};m[t.date][t.type==="credit"?"c":"d"]+=t.amount;});return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8);},[txns]);
  const maxB=bars.reduce((m,[,v])=>Math.max(m,v.c,v.d),1);
  const recent=[...txns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:22}} className="fu">
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontSize:13,color:T.sub,fontWeight:500,marginBottom:4}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
          <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>{greet}, {name}</div>
          <div style={{fontSize:14,color:T.sub,marginTop:4}}>Here's your financial snapshot</div>
        </div>
        {/* Net balance hero */}
        <div style={{background:bal>=0?T.greenBg:T.redBg,border:`1px solid ${bal>=0?T.greenBord:T.redBord}`,borderRadius:16,padding:"16px 24px",textAlign:"right",minWidth:180}}>
          <div style={{fontSize:11.5,fontWeight:600,color:T.sub,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:6}}>Net Balance</div>
          <div style={{fontSize:30,fontWeight:800,color:bal>=0?T.green:T.red,letterSpacing:"-0.05em"}}>{fmt(bal)}</div>
          <div style={{fontSize:11.5,color:T.sub,marginTop:4}}>all time</div>
        </div>
      </div>

      {/* 3 main stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <StatCard T={T}
          label="Spent"
          value={fmt(deb)}
          sub={`${txns.filter(t=>t.type==="debit").length} expenses`}
          accentColor={T.red} accentBg={T.redBg} accentBord={T.redBord}
          gradient={dark?`linear-gradient(135deg,rgba(255,107,107,.08) 0%,${T.card} 100%)`:`linear-gradient(135deg,rgba(224,49,49,.05) 0%,${T.card} 100%)`}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}/>
        <StatCard T={T}
          label="Received"
          value={fmt(cred)}
          sub={`${txns.filter(t=>t.type==="credit").length} entries`}
          accentColor={T.green} accentBg={T.greenBg} accentBord={T.greenBord}
          gradient={dark?`linear-gradient(135deg,rgba(81,207,102,.08) 0%,${T.card} 100%)`:`linear-gradient(135deg,rgba(47,158,68,.05) 0%,${T.card} 100%)`}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}/>
        <StatCard T={T}
          label="Spent Today"
          value={fmt(tSpend)}
          sub={budget>0?`${bp}% of daily ${fmt(budget)}`:"No budget set"}
          accentColor={bc} accentBg={`${bc}18`} accentBord={`${bc}30`}
          gradient={dark?`linear-gradient(135deg,${bc}12 0%,${T.card} 100%)`:`linear-gradient(135deg,${bc}08 0%,${T.card} 100%)`}
          bar={tSpend} barMax={budget||tSpend||1}/>
      </div>

      {/* Budget bar full width */}
      {budget>0&&(
        <div className="card" style={{padding:"18px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <span style={{fontSize:14,fontWeight:600,color:T.text}}>Daily Budget</span>
              <span style={{fontSize:12.5,color:T.sub,marginLeft:12}}>Limit {fmt(budget)} · Spent {fmt(tSpend)} · Remaining {fmt(Math.max(0,budget-tSpend))}</span>
            </div>
            <span style={{fontSize:20,fontWeight:800,color:bc,letterSpacing:"-0.03em"}}>{bp}%</span>
          </div>
          <Bar value={tSpend} max={budget} color={bp>=100?T.red:bp>=80?T.orange:T.V} h={8} T={T}/>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16}}>
        {/* Flow chart */}
        <div className="card">
          <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>Daily Flow — Last 8 Days</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:7,height:120}}>
            {bars.map(([date,val])=>(
              <div key={date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
                <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:100}}>
                  <div style={{flex:1,background:T.green,borderRadius:"4px 4px 0 0",opacity:.7,height:Math.round(val.c/maxB*100)+"%",minHeight:val.c?4:0,transition:"height .65s"}}/>
                  <div style={{flex:1,background:T.red,borderRadius:"4px 4px 0 0",opacity:.7,height:Math.round(val.d/maxB*100)+"%",minHeight:val.d?4:0,transition:"height .65s"}}/>
                </div>
                <span style={{fontSize:9.5,color:T.dim}}>{date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:18,marginTop:14,paddingTop:12,borderTop:`1px solid ${T.bord}`}}>
            {[[T.green,"Income"],[T.red,"Expense"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:10,height:4,background:c,borderRadius:99}}/>
                <span style={{fontSize:11.5,color:T.sub}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By method */}
        <div className="card">
          <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>By Payment Method</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {mets.map(([m,a])=>{
              const col=MET_COLORS[m]||T.sub;
              return(
                <div key={m}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0}}/>
                      <span style={{fontSize:13,color:T.text,fontWeight:500}}>{m}</span>
                    </div>
                    <span style={{fontSize:13,color:col,fontWeight:700}}>{fmt(a)}</span>
                  </div>
                  <Bar value={a} max={mets[0]?.[1]||1} color={col} T={T} h={4}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* Top categories */}
        <div className="card">
          <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>Monthly Insights</div>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {cats.slice(0,5).map(([cat,amt])=>{
              const col=CAT_COLORS[cat]||T.sub;
              return(
                <div key={cat}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:5,height:18,background:col,borderRadius:99,flexShrink:0}}/>
                      <span style={{fontSize:13,color:T.text,fontWeight:500}}>{cat}</span>
                    </div>
                    <span style={{fontSize:13,color:col,fontWeight:700}}>{fmt(amt)}</span>
                  </div>
                  <Bar value={amt} max={cats[0]?.[1]||1} color={col} T={T} h={4}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:14}}>Recent Activity</div>
          <div style={{display:"flex",flexDirection:"column"}}>
            {recent.map((t,i)=>{
              const col=CAT_COLORS[t.category]||T.sub;
              return(
                <div key={t.id} className="row-hover" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 8px",borderBottom:i<recent.length-1?`1px solid ${T.bord}`:"none",transition:"background .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:11}}>
                    <div style={{width:36,height:36,borderRadius:11,background:`${col}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>
                    </div>
                    <div>
                      <div style={{fontSize:13.5,color:T.text,fontWeight:500,lineHeight:1.2}}>{t.description}</div>
                      <div style={{fontSize:11,color:T.sub,marginTop:3}}>{t.date} · {t.category}</div>
                    </div>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:t.type==="credit"?T.green:T.red,letterSpacing:"-0.02em",flexShrink:0,marginLeft:12}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MONTHLY ──────────────────────────────────────────────────────────────────
function Monthly({txns,budget,T}){
  const[mon,sM]=useState(new Date().getMonth());
  const[year,sY]=useState(new Date().getFullYear());
  const[sel,sSel]=useState(null);
  const mt=useMemo(()=>txns.filter(t=>{const[y,m]=t.date.split("-").map(Number);return y===year&&m-1===mon;}),[txns,mon,year]);
  const md=mt.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const mc=mt.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const dim=new Date(year,mon+1,0).getDate();
  const dayMap=useMemo(()=>{const m={};mt.forEach(t=>{if(!m[t.date])m[t.date]={d:0,c:0,txns:[]};m[t.date][t.type==="debit"?"d":"c"]+=t.amount;m[t.date].txns.push(t);});return m;},[mt]);
  const catBreak=useMemo(()=>{const m={};mt.filter(t=>t.type==="debit").forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[mt]);
  const maxD=Object.values(dayMap).reduce((m,d)=>d.d>m?d.d:m,1);
  const fd=new Date(year,mon,1).getDay();
  const weeks=[];let wk=[];
  for(let i=0;i<fd;i++)wk.push(null);
  for(let d=1;d<=dim;d++){wk.push(d);if(wk.length===7){weeks.push(wk);wk=[];}}
  if(wk.length){while(wk.length<7)wk.push(null);weeks.push(wk);}
  const prev=()=>{if(mon===0){sM(11);sY(y=>y-1);}else sM(m=>m-1);sSel(null);};
  const next=()=>{if(mon===11){sM(0);sY(y=>y+1);}else sM(m=>m+1);sSel(null);};
  const sk=sel?`${year}-${String(mon+1).padStart(2,"0")}-${String(sel).padStart(2,"0")}`:null;
  const sd=sk?dayMap[sk]:null;
  const todayStr=today();

  return(
    <div style={{display:"flex",flexDirection:"column",gap:22}} className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
        <div>
          <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Monthly Report</div>
          <div style={{fontSize:14,color:T.sub,marginTop:4}}>Click any day to see transactions</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={prev} className="ghost-btn">‹</button>
          <div style={{fontWeight:700,fontSize:15.5,color:T.text,minWidth:170,textAlign:"center"}}>{MONTHS[mon]} {year}</div>
          <button onClick={next} className="ghost-btn">›</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        <StatCard T={T} label="Month Expenses" value={fmt(md)} accentColor={T.red} accentBg={T.redBg} accentBord={T.redBord}/>
        <StatCard T={T} label="Month Income"   value={fmt(mc)} accentColor={T.green} accentBg={T.greenBg} accentBord={T.greenBord}/>
        <StatCard T={T} label="Net"            value={fmt(mc-md)} accentColor={(mc-md)>=0?T.green:T.red} accentBg={(mc-md)>=0?T.greenBg:T.redBg}/>
        <StatCard T={T} label="Est. Savings"   value={budget>0?fmt(Math.max(0,budget*dim-md)):"Set budget"} accentColor={T.V} accentBg={T.VBg}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:18}}>
        <div className="card">
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:10}}>
            {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10.5,color:T.dim,fontWeight:600,padding:"3px 0",letterSpacing:"0.04em"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {weeks.flat().map((day,i)=>{
              if(!day)return<div key={`e${i}`}/>;
              const key=`${year}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const data=dayMap[key];const spend=data?.d||0;
              const isSel=sel===day;const isToday=key===todayStr;
              const over=budget>0&&spend>budget;const warn=budget>0&&spend>=budget*.8&&!over;
              const intensity=spend>0?clamp(spend/maxD,.18,1):0;
              const bg=spend>0?(over?`rgba(255,107,107,${intensity*.5})`:(warn?`rgba(255,146,43,${intensity*.45})`:`rgba(132,94,247,${intensity*.45})`)):"transparent";
              return(
                <div key={key} onClick={()=>sSel(isSel?null:day)}
                  style={{aspectRatio:"1",borderRadius:9,border:`1.5px solid ${isSel?T.V:isToday?T.V+"80":spend>0?T.bord2:T.bord}`,background:isSel?T.VBg:bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,transition:"all .15s"}}>
                  <div style={{fontSize:12,fontWeight:isSel||isToday?700:400,color:isSel||isToday?T.V:T.text}}>{day}</div>
                  {spend>0&&<div style={{fontSize:8,fontWeight:700,color:over?T.red:warn?T.orange:T.V}}>{spend>=1000?(spend/1000).toFixed(1)+"k":spend}</div>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:16,marginTop:14,paddingTop:12,borderTop:`1px solid ${T.bord}`}}>
            {[[T.V,"Under"],[T.orange,"Near limit"],[T.red,"Over"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:10,height:4,background:c,borderRadius:99}}/>
                <span style={{fontSize:11,color:T.sub}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sel&&(
            <div className="card" style={{padding:"18px 20px"}}>
              <div style={{fontSize:12,fontWeight:700,color:T.V,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:12}}>{MONTHS[mon]} {sel}</div>
              {sd?(
                <>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["Spent",sd.d,T.red,T.redBg],["Received",sd.c,T.green,T.greenBg]].map(([l,v,c,bg])=>(
                      <div key={l} style={{flex:1,background:bg,borderRadius:10,padding:"10px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:T.sub,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{l}</div>
                        <div style={{fontSize:15,fontWeight:800,color:c,marginTop:3}}>{fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                  {sd.txns.map(t=>(
                    <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 11px",background:T.raised,borderRadius:10,marginBottom:5}}>
                      <div>
                        <div style={{fontSize:12.5,color:T.text,fontWeight:500}}>{t.description}</div>
                        <div style={{fontSize:10.5,color:T.sub,marginTop:2}}>{t.method}</div>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:t.type==="credit"?T.green:T.red}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</span>
                    </div>
                  ))}
                </>
              ):<div style={{textAlign:"center",padding:"20px 0",color:T.dim,fontSize:13}}>No transactions</div>}
            </div>
          )}
          <div className="card" style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:16}}>By Category</div>
            {catBreak.length===0
              ?<div style={{textAlign:"center",color:T.dim,fontSize:13,padding:"20px 0"}}>No spending this month</div>
              :catBreak.map(([cat,amt])=>{
                const col=CAT_COLORS[cat]||T.sub;
                return(
                  <div key={cat} style={{marginBottom:13}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>
                        <span style={{fontSize:13,color:T.text,fontWeight:500}}>{cat}</span>
                      </div>
                      <span style={{fontSize:13,color:col,fontWeight:700}}>{fmt(amt)}</span>
                    </div>
                    <Bar value={amt} max={catBreak[0]?.[1]||1} color={col} h={4} T={T}/>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BUDGET ───────────────────────────────────────────────────────────────────
function BudgetPage({txns,budget,setBudget,T}){
  const[input,sI]=useState(String(budget||""));
  const[saved,sS]=useState(false);
  const save=()=>{const v=parseFloat(input);if(v>0){setBudget(v);sS(true);setTimeout(()=>sS(false),2000);}};
  const l30=useMemo(()=>{
    const arr=[];
    for(let i=29;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const k=d.toISOString().slice(0,10);
      const spend=txns.filter(t=>t.type==="debit"&&t.date===k).reduce((s,t)=>s+t.amount,0);
      arr.push({k,spend,label:k.slice(5),saved:budget>0?Math.max(0,budget-spend):0});
    }
    return arr;
  },[txns,budget]);
  const totSaved=l30.reduce((s,d)=>s+d.saved,0);
  const avg=Math.round(l30.reduce((s,d)=>s+d.spend,0)/30);
  const under=l30.filter(d=>budget>0&&d.spend>0&&d.spend<budget).length;
  const over=l30.filter(d=>budget>0&&d.spend>budget).length;
  const maxS=l30.reduce((m,d)=>Math.max(m,d.spend),budget||1);
  const t=l30[l30.length-1];
  const tp=pct(t?.spend||0,budget);
  const lbl={fontSize:11.5,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8,display:"block"};
  const inp={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:11,padding:"13px 15px",color:T.text,fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",transition:"all .2s"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:22}} className="fu">
      <div>
        <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Budget & Savings</div>
        <div style={{fontSize:14,color:T.sub,marginTop:4}}>Set your daily limit and track your saving streak</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <div className="card">
          <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>Daily Budget Limit</div>
          <label style={lbl}>Amount (₹)</label>
          <div style={{display:"flex",gap:10,marginBottom:18}}>
            <input type="text" inputMode="numeric" value={input} onChange={e=>sI(e.target.value.replace(/[^0-9.]/g,""))} placeholder="e.g. 500" style={inp}/>
            <button onClick={save}
              style={{background:saved?T.green:`linear-gradient(135deg,${T.VL},${T.VD})`,border:"none",borderRadius:11,padding:"13px 22px",color:"white",fontWeight:700,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:14,transition:"all .3s",whiteSpace:"nowrap",minWidth:110}}>
              {saved?"Saved ✓":"Set Limit"}
            </button>
          </div>
          <div style={{marginBottom:18}}>
            <label style={lbl}>Quick Presets</label>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {[300,500,750,1000,1500,2000].map(v=>(
                <button key={v} onClick={()=>sI(String(v))}
                  style={{background:input===String(v)?T.VBg:T.raised,border:`1px solid ${input===String(v)?T.V:T.bord}`,borderRadius:8,padding:"7px 14px",color:input===String(v)?T.V:T.sub,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,transition:"all .2s"}}>
                  {fmt(v)}
                </button>
              ))}
            </div>
          </div>
          {budget>0&&(
            <div style={{background:T.raised,borderRadius:12,padding:"14px 16px",borderLeft:`3px solid ${T.V}`}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Today</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13.5,color:T.text}}>Spent</span>
                <span style={{fontSize:15,fontWeight:800,color:tp>=100?T.red:tp>=80?T.orange:T.green}}>{fmt(t?.spend||0)}</span>
              </div>
              <Bar value={t?.spend||0} max={budget} color={tp>=100?T.red:tp>=80?T.orange:T.V} h={7} T={T}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11.5,color:T.sub,marginTop:7}}>
                <span>{tp}% used</span><span>Left: {fmt(Math.max(0,budget-(t?.spend||0)))}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <StatCard T={T} label="Total Saved (30d)" value={budget>0?fmt(totSaved):"—"} accentColor={T.V} accentBg={T.VBg}/>
          <StatCard T={T} label="Avg Daily Spend"   value={fmt(avg)} accentColor={T.amber} accentBg={T.amberBg}/>
          <StatCard T={T} label="Days Under Budget" value={budget>0?`${under} days`:"Set budget"} accentColor={T.green} accentBg={T.greenBg}/>
          <StatCard T={T} label="Days Over Budget"  value={budget>0?`${over} days`:"—"} accentColor={over>5?T.red:T.orange} accentBg={over>5?T.redBg:T.orangeBg}/>
        </div>
      </div>

      <div className="card">
        <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:16}}>Daily Spend — Last 30 Days</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:2,height:90}}>
          {l30.map(d=>{
            const h=Math.round(d.spend/maxS*100);
            const ov=budget>0&&d.spend>budget;const wn=budget>0&&d.spend>=budget*.8&&!ov;
            return(
              <div key={d.k} title={`${d.k}: ${fmt(d.spend)}`} style={{flex:1,display:"flex",alignItems:"flex-end",height:"100%"}}>
                <div style={{width:"100%",background:ov?T.red:wn?T.orange:d.spend>0?T.V:T.bord,borderRadius:"2px 2px 0 0",height:h+"%",minHeight:d.spend?2:0,opacity:.8,transition:"height .4s"}}/>
              </div>
            );
          })}
        </div>
        {budget>0&&<div style={{fontSize:11.5,color:T.V,marginTop:8,display:"flex",alignItems:"center",gap:6}}><div style={{width:14,borderTop:`1.5px dashed ${T.V}`}}/><span>Limit: {fmt(budget)}</span></div>}
      </div>

      {budget>0&&(
        <div className="card">
          <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:16}}>Daily Savings — Last 14 Days</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
            {l30.slice(-14).map(d=>{
              const sv=Math.max(0,budget-d.spend);const ov=d.spend>budget?d.spend-budget:0;
              return(
                <div key={d.k} style={{background:T.raised,borderRadius:11,padding:"10px 6px",textAlign:"center",border:`1px solid ${ov>0?T.redBord:sv>0?T.VBord:T.bord}`}}>
                  <div style={{fontSize:9.5,color:T.dim,marginBottom:5}}>{d.label}</div>
                  {d.spend===0?<div style={{fontSize:11,color:T.dim}}>—</div>
                    :ov>0?<><div style={{fontSize:8,color:T.red,fontWeight:700,letterSpacing:"0.05em"}}>OVER</div><div style={{fontSize:11,fontWeight:800,color:T.red}}>-{fmt(ov)}</div></>
                    :<><div style={{fontSize:8,color:T.V,fontWeight:700,letterSpacing:"0.05em"}}>SAVED</div><div style={{fontSize:11,fontWeight:800,color:T.V}}>{fmt(sv)}</div></>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
function Transactions({txns,onEdit,onDelete,T}){
  const[fT,sfT]=useState("all");const[fM,sfM]=useState("all");
  const[fC,sfC]=useState("all");const[sr,sSr]=useState("");
  const list=useMemo(()=>txns.filter(t=>{
    if(fT!=="all"&&t.type!==fT)return false;
    if(fM!=="all"&&t.method!==fM)return false;
    if(fC!=="all"&&t.category!==fC)return false;
    if(sr&&!t.description.toLowerCase().includes(sr.toLowerCase()))return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)),[txns,fT,fM,fC,sr]);
  const dirty=sr||fT!=="all"||fM!=="all"||fC!=="all";
  const inp={background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"9px 14px",color:T.text,fontSize:13.5,outline:"none",fontFamily:"'Outfit',sans-serif",transition:"all .2s"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}} className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Transactions</div>
          <div style={{fontSize:14,color:T.sub,marginTop:4}}>{list.length} of {txns.length} entries</div>
        </div>
      </div>
      <div className="card" style={{padding:"14px 18px",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <input value={sr} onChange={e=>sSr(e.target.value)} placeholder="Search…" style={{...inp,width:200}}/>
        <select value={fT} onChange={e=>sfT(e.target.value)} style={{...inp,cursor:"pointer"}}>
          <option value="all">All Types</option>
          <option value="debit">Expense</option>
          <option value="credit">Income</option>
        </select>
        <select value={fM} onChange={e=>sfM(e.target.value)} style={{...inp,cursor:"pointer"}}>
          <option value="all">All Methods</option>
          {METHODS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={fC} onChange={e=>sfC(e.target.value)} style={{...inp,cursor:"pointer"}}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {dirty&&<button onClick={()=>{sSr("");sfT("all");sfM("all");sfC("all");}} style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"9px 16px",color:T.red,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600}}>Clear</button>}
      </div>

      <div className="card" style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
            <thead>
              <tr style={{background:T.raised,borderBottom:`1px solid ${T.bord}`}}>
                {["Date","Description","Category","Method","Type","Amount",""].map((h,i)=>(
                  <th key={i} style={{padding:"13px 16px",textAlign:"left",color:T.dim,fontWeight:600,fontSize:10.5,letterSpacing:"0.07em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!list.length&&<tr><td colSpan={7} style={{padding:"56px",textAlign:"center",color:T.dim,fontSize:14}}>No results</td></tr>}
              {list.map((t,i)=>{
                const cc=CAT_COLORS[t.category]||T.sub;
                const mc=MET_COLORS[t.method]||T.sub;
                return(
                  <tr key={t.id} style={{borderBottom:`1px solid ${T.bord}`,transition:"background .15s",cursor:"default"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.raised}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"12px 16px",color:T.sub,whiteSpace:"nowrap",fontSize:12.5}}>{t.date}</td>
                    <td style={{padding:"12px 16px",color:T.text,fontWeight:500}}>{t.description}</td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:12.5,color:cc,background:`${cc}15`,padding:"3px 10px",borderRadius:99,fontWeight:600}}>
                        <span style={{width:6,height:6,background:cc,borderRadius:"50%",display:"inline-block",flexShrink:0}}/>{t.category}
                      </span>
                    </td>
                    <td style={{padding:"12px 16px",fontSize:12.5,color:T.sub}}>{t.method}</td>
                    <td style={{padding:"12px 16px"}}>
                      <span style={{fontSize:11,fontWeight:700,color:t.type==="credit"?T.green:T.red,background:t.type==="credit"?T.greenBg:T.redBg,padding:"3px 10px",borderRadius:99,letterSpacing:"0.04em"}}>{t.type==="credit"?"IN":"OUT"}</span>
                    </td>
                    <td style={{padding:"12px 16px",fontWeight:800,color:t.type==="credit"?T.green:T.red,whiteSpace:"nowrap",fontSize:15,letterSpacing:"-0.02em"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>onEdit(t)} style={{background:T.VBg,border:`1px solid ${T.VBord}`,borderRadius:7,padding:"5px 12px",color:T.V,cursor:"pointer",fontSize:12,fontFamily:"'Outfit',sans-serif",fontWeight:600}}>Edit</button>
                        <button onClick={()=>onDelete(t.id)} style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:7,padding:"5px 10px",color:T.red,cursor:"pointer",fontSize:12,fontFamily:"'Outfit',sans-serif"}}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── BUDGET MODAL ─────────────────────────────────────────────────────────────
function BudgetModal({spent,budget,pending,onConfirm,onCancel,T}){
  const p2=Math.round(spent/budget*100);const over=spent>=budget;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surf,border:`1px solid ${over?T.redBord:T.orangeBg}`,borderRadius:20,padding:34,width:390}}>
        <div style={{fontSize:15,fontWeight:800,color:over?T.red:T.orange,marginBottom:10,letterSpacing:"-0.02em"}}>{over?"Budget exceeded":"Approaching limit"}</div>
        <div style={{fontSize:13.5,color:T.sub,lineHeight:1.7,marginBottom:18}}>
          {over?`Spent ${fmt(spent)} of ${fmt(budget)} limit. Adding ${fmt(pending)} puts you ${fmt(spent+pending-budget)} over.`
               :`${p2}% used. Adding ${fmt(pending)} takes today to ${fmt(spent+pending)}.`}
        </div>
        <Bar value={spent+pending} max={budget} color={over?T.red:T.orange} h={5} T={T}/>
        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onCancel} style={{flex:1,background:"transparent",border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px",color:T.sub,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:500,fontSize:14}}>Go back</button>
          <button onClick={onConfirm} style={{flex:1,background:over?T.redBg:T.VBg,border:`1px solid ${over?T.redBord:T.VBord}`,borderRadius:10,padding:"12px",color:over?T.red:T.V,cursor:"pointer",fontWeight:700,fontFamily:"'Outfit',sans-serif",fontSize:14}}>Add anyway</button>
        </div>
      </div>
    </div>
  );
}

// ─── NEW ENTRY ────────────────────────────────────────────────────────────────
const emptyForm=()=>({date:today(),description:"",category:"Food & Dining",method:"UPI",type:"debit",amount:""});

function NewEntry({txns,onAdd,onUpdate,editTarget,onCancel,budget,setAlert,T}){
  const[form,sF]=useState(emptyForm());
  useEffect(()=>{sF(editTarget?{...editTarget,amount:String(editTarget.amount)}:emptyForm());},[editTarget]);
  const valid=form.description&&form.amount&&parseFloat(form.amount)>0&&form.date;
  const attempt=()=>{
    if(!valid)return;
    const amt=parseFloat(form.amount);
    if(form.type==="debit"&&budget>0&&!editTarget){
      const ts=txns.filter(t=>t.type==="debit"&&t.date===form.date).reduce((s,t)=>s+t.amount,0);
      if((ts+amt)/budget>=0.8){setAlert({spent:ts,budget,pending:amt,onConfirm:()=>{doSave(amt);setAlert(null);},onCancel:()=>setAlert(null)});return;}
    }
    doSave(amt);
  };
  const doSave=amt=>{
    const t={...form,amount:amt};
    if(editTarget)onUpdate({...t,id:editTarget.id});
    else{onAdd(t);sF(emptyForm());}
  };
  const warn=(()=>{
    if(form.type!=="debit"||!budget||!parseFloat(form.amount))return null;
    const ts=txns.filter(t=>t.type==="debit"&&t.date===form.date).reduce((s,t)=>s+t.amount,0);
    const p2=Math.round((ts+parseFloat(form.amount))/budget*100);
    if(p2<80)return null;
    return{p2,over:p2>=100,total:ts+parseFloat(form.amount)};
  })();
  const lbl={fontSize:11.5,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8,display:"block"};
  const inp={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:11,padding:"13px 15px",color:T.text,fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",transition:"all .2s"};

  return(
    <div style={{display:"flex",gap:26,alignItems:"flex-start"}} className="fu">
      <div style={{flex:"0 0 500px"}}>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>{editTarget?"Edit Transaction":"New Entry"}</div>
          <div style={{fontSize:14,color:T.sub,marginTop:4}}>{editTarget?"Update the transaction":"Record an income or expense"}</div>
        </div>
        <div className="card" style={{padding:"26px"}}>
          {/* Type toggle */}
          <div style={{marginBottom:22}}>
            <label style={lbl}>Type</label>
            <div style={{display:"flex",background:T.raised,borderRadius:12,padding:4,gap:4}}>
              {["debit","credit"].map(tp=>(
                <button key={tp} onClick={()=>sF({...form,type:tp})}
                  style={{flex:1,padding:"11px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:14,transition:"all .2s",
                    background:form.type===tp?(tp==="debit"?T.redBg:T.greenBg):"transparent",
                    color:form.type===tp?(tp==="debit"?T.red:T.green):T.sub,
                    boxShadow:form.type===tp?T.shadow:"none"}}>
                  {tp==="debit"?"Expense":"Income"}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e=>sF({...form,date:e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Amount (₹)</label><input type="text" inputMode="numeric" value={form.amount} onChange={e=>sF({...form,amount:e.target.value.replace(/[^0-9.]/g,"")})} placeholder="0.00" style={inp}/></div>
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>Description</label><input value={form.description} onChange={e=>sF({...form,description:e.target.value})} placeholder="e.g. Zomato, Salary, Rent…" style={inp}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:warn?16:24}}>
            <div><label style={lbl}>Category</label><select value={form.category} onChange={e=>sF({...form,category:e.target.value})} style={{...inp,cursor:"pointer"}}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Payment Method</label><select value={form.method} onChange={e=>sF({...form,method:e.target.value})} style={{...inp,cursor:"pointer"}}>{METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          {warn&&(
            <div style={{background:warn.over?T.redBg:T.amberBg,border:`1px solid ${warn.over?T.redBord:T.orange+"30"}`,borderRadius:10,padding:"11px 15px",marginBottom:18}}>
              <div style={{fontSize:13,fontWeight:700,color:warn.over?T.red:T.amber,marginBottom:2}}>{warn.over?"Over budget":"Near your limit"}</div>
              <div style={{fontSize:12.5,color:T.sub}}>Today will total {fmt(warn.total)} ({warn.p2}% of {fmt(budget)})</div>
            </div>
          )}
          {valid&&(
            <div style={{background:T.raised,borderRadius:12,padding:"14px 16px",marginBottom:20,borderLeft:`3px solid ${form.type==="debit"?T.red:T.green}`}}>
              <div style={{fontSize:10,color:T.sub,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:9}}>Preview</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:600,color:T.text,fontSize:14}}>{form.description}</div>
                  <div style={{fontSize:12,color:T.sub,marginTop:3}}>{form.category} · {form.method} · {form.date}</div>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:form.type==="credit"?T.green:T.red}}>{form.type==="credit"?"+":"-"}{fmt(form.amount)}</div>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button onClick={attempt} disabled={!valid}
              style={{flex:1,background:valid?`linear-gradient(135deg,${T.VL},${T.VD})`:T.raised,border:"none",borderRadius:12,padding:"14px",color:valid?"white":T.dim,fontWeight:700,fontSize:15,cursor:valid?"pointer":"not-allowed",fontFamily:"'Outfit',sans-serif",transition:"all .25s",boxShadow:valid?`0 4px 16px ${T.V}40`:"none"}}>
              {editTarget?"Save Changes":"Add Transaction"}
            </button>
            {editTarget&&<button onClick={onCancel} style={{background:"transparent",border:`1px solid ${T.bord}`,borderRadius:12,padding:"14px 20px",color:T.sub,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:500,fontSize:14}}>Cancel</button>}
          </div>
        </div>
      </div>

      <div style={{flex:1}}>
        <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:14}}>Recent Entries</div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {[...txns].reverse().slice(0,8).map(t=>(
            <div key={t.id} className="card" style={{padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:4,height:34,background:CAT_COLORS[t.category]||T.sub,borderRadius:99,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:13,color:T.text,fontWeight:500}}>{t.description}</div>
                    <div style={{fontSize:11,color:T.dim,marginTop:2}}>{t.date} · {t.category}</div>
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:t.type==="credit"?T.green:T.red}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function ProfilePage({profile,setProfile,onLogout,onClear,T}){
  const[form,sF]=useState({username:profile.username,password:"",confirm:"",displayName:profile.displayName||""});
  const[saved,sS]=useState(false);const[err,sE]=useState("");
  const fileRef=useRef();
  const handlePhoto=e=>{
    const file=e.target.files?.[0];if(!file)return;
    const r=new FileReader();r.onload=ev=>setProfile(p=>({...p,photo:ev.target.result}));r.readAsDataURL(file);
  };
  const save=()=>{
    if(!form.username.trim()){sE("Username cannot be empty.");return;}
    if(form.password&&form.password!==form.confirm){sE("Passwords do not match.");return;}
    sE("");
    setProfile(p=>({...p,username:form.username.trim(),displayName:form.displayName.trim()||form.username.trim(),...(form.password?{password:form.password}:{})}));
    sF(f=>({...f,password:"",confirm:""}));
    sS(true);setTimeout(()=>sS(false),2500);
  };
  const lbl={fontSize:11.5,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8,display:"block"};
  const inp={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:11,padding:"13px 15px",color:T.text,fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif",transition:"all .2s"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:22,maxWidth:620}} className="fu">
      <div>
        <div style={{fontSize:28,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Profile & Settings</div>
        <div style={{fontSize:14,color:T.sub,marginTop:4}}>Manage your photo, name, and login</div>
      </div>
      <div className="card">
        <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>Profile Photo</div>
        <div style={{display:"flex",alignItems:"center",gap:22}}>
          <div style={{width:84,height:84,borderRadius:20,overflow:"hidden",background:`linear-gradient(135deg,${T.VL},${T.VD})`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 6px 20px ${T.V}30`}}>
            {profile.photo
              ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<span style={{fontSize:28,fontWeight:800,color:"white"}}>{(profile.displayName||profile.username).charAt(0).toUpperCase()}</span>
            }
          </div>
          <div>
            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} style={{display:"none"}}/>
            <button onClick={()=>fileRef.current.click()} style={{background:T.VBg,border:`1px solid ${T.VBord}`,borderRadius:10,padding:"10px 20px",color:T.V,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:700,fontSize:13.5,display:"block",marginBottom:9}}>Upload Photo</button>
            {profile.photo&&<button onClick={()=>setProfile(p=>({...p,photo:null}))} style={{background:"transparent",border:"none",color:T.sub,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:12.5,padding:0}}>Remove photo</button>}
            <div style={{fontSize:11.5,color:T.dim,marginTop:6}}>Stored locally on this device.</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{fontSize:12,fontWeight:600,color:T.sub,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>Account</div>
        {err&&<div style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:10,padding:"11px 15px",color:T.red,fontSize:13.5,marginBottom:16,fontWeight:500}}>{err}</div>}
        {saved&&<div style={{background:T.greenBg,border:`1px solid ${T.greenBord}`,borderRadius:10,padding:"11px 15px",color:T.green,fontSize:13.5,marginBottom:16,fontWeight:500}}>Changes saved and synced.</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div><label style={lbl}>Display Name</label><input value={form.displayName} onChange={e=>sF({...form,displayName:e.target.value})} placeholder="Your name" style={inp}/></div>
          <div><label style={lbl}>Username</label><input value={form.username} onChange={e=>sF({...form,username:e.target.value})} placeholder="Login username" style={inp}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
          <div><label style={lbl}>New Password</label><input type="password" value={form.password} onChange={e=>sF({...form,password:e.target.value})} placeholder="Leave blank to keep" style={inp}/></div>
          <div><label style={lbl}>Confirm Password</label><input type="password" value={form.confirm} onChange={e=>sF({...form,confirm:e.target.value})} placeholder="Repeat new password" style={inp}/></div>
        </div>
        <button onClick={save} style={{background:`linear-gradient(135deg,${T.VL},${T.VD})`,border:"none",borderRadius:11,padding:"13px 30px",color:"white",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Outfit',sans-serif",boxShadow:`0 4px 16px ${T.V}40`}}>Save Changes</button>
      </div>

      <div className="card" style={{borderColor:T.redBord}}>
        <div style={{fontSize:12,fontWeight:600,color:T.red,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:18}}>Danger Zone</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button onClick={onLogout} className="ghost-btn">Sign Out</button>
          <button onClick={onClear} style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"9px 20px",color:T.red,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:600,fontSize:13.5}}>Delete All Transactions</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const DEFAULT_PROFILE={username:"admin",password:"admin123",displayName:"",photo:null};

export default function App(){
  const[loggedIn,sLI]=useState(false);
  const[tab,sTab]=useState("dashboard");
  const[txns,sTxns]=useState([]);
  const[loading,sLoad]=useState(true);
  const[dbErr,sDbErr]=useState("");
  const[budget,sBudget]=useState(()=>LS.get("gulak_budget",500));
  const[profile,sProfileRaw]=useState(()=>LS.get("gulak_profile",DEFAULT_PROFILE));
  const[editTarget,sET]=useState(null);
  const[toast,sToast]=useState(null);
  const[delId,sDel]=useState(null);
  const[alert,sAlert]=useState(null);
  const[dark,setDark]=useState(()=>LS.get("gulak_dark",true));
  const T={...dark?DARK:LIGHT,dark};

  const didLoad=useRef(false);
  useEffect(()=>{
    Promise.all([sb.all(),sb.getSettings()])
      .then(([rows,settings])=>{
        sTxns(rows);
        if(settings){
          sProfileRaw(p=>{
            const merged={...p,username:settings.username||p.username,password:settings.password||p.password,displayName:settings.display_name||p.displayName||""};
            LS.set("gulak_profile",merged);
            return merged;
          });
          if(settings.budget)sBudget(Number(settings.budget));
        }
        didLoad.current=true;
        sLoad(false);
      })
      .catch(e=>{sDbErr(e.message);sLoad(false);});
  },[]);

  useEffect(()=>{LS.set("gulak_dark",dark);},[dark]);
  useEffect(()=>{
    LS.set("gulak_budget",budget);
    if(!didLoad.current)return;
    sb.saveSettings({budget,username:profile.username,password:profile.password,display_name:profile.displayName||profile.username}).catch(()=>{});
  },[budget]);

  const setProfile=fn=>{
    sProfileRaw(p=>{
      const next=typeof fn==="function"?fn(p):fn;
      LS.set("gulak_profile",next);
      sb.saveSettings({budget,username:next.username,password:next.password,display_name:next.displayName||next.username}).catch(()=>{});
      return next;
    });
  };

  const toast2=(msg,type="ok")=>{sToast({msg,type});setTimeout(()=>sToast(null),2800);};
  const handleAdd=async t=>{try{const s=await sb.insert(t);sTxns(p=>[s,...p]);toast2("Transaction saved");}catch(e){toast2("Save failed","err");}};
  const handleUpdate=async t=>{try{await sb.update(t);sTxns(p=>p.map(x=>x.id===t.id?t:x));sET(null);toast2("Updated");}catch(e){toast2("Update failed","err");}};
  const handleEdit=t=>{sET(t);sTab("entry");};
  const handleDelete=async()=>{try{await sb.remove(delId);sTxns(p=>p.filter(t=>t.id!==delId));sDel(null);toast2("Deleted","err");}catch{toast2("Failed","err");}};
  const clearData=async()=>{if(!window.confirm("Delete ALL transactions?"))return;try{await sb.clearAll();sTxns([]);toast2("Cleared","err");}catch{toast2("Failed","err");}};

  const dn=profile.displayName||profile.username;
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const bp=pct(tSpend,budget);
  const bc=bp>=100?T.red:bp>=80?T.orange:T.green;

  if(loading)return(
    <div style={{minHeight:"100vh",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Outfit',system-ui,sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:38,height:38,border:"3px solid #222",borderTop:"3px solid #845ef7",borderRadius:"50%",animation:"spin 0.75s linear infinite"}}/>
      <div style={{fontSize:14,color:"#555"}}>Connecting to database…</div>
    </div>
  );

  if(dbErr)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Outfit',system-ui,sans-serif"}}>
      <div style={{width:500,background:T.surf,border:`1px solid ${T.redBord}`,borderRadius:20,padding:38}}>
        <div style={{fontSize:16,fontWeight:800,color:T.red,marginBottom:12}}>Database not configured</div>
        <div style={{fontSize:14,color:T.sub,lineHeight:1.75,marginBottom:14}}>Open <code style={{background:T.raised,padding:"2px 8px",borderRadius:6,color:T.V}}>src/App.jsx</code> and paste your Supabase URL and anon key at the top of the file.</div>
        <div style={{fontSize:12,color:T.dim}}>Error: {dbErr}</div>
      </div>
    </div>
  );

  return(
    <div style={{fontFamily:"'Outfit',system-ui,sans-serif",background:T.bg,minHeight:"100vh",color:T.text,transition:"background .25s"}}>
      <GlobalCSS T={T} dark={dark}/>

      {!loggedIn&&<div style={{position:"fixed",inset:0,zIndex:100}}><Login onLogin={()=>sLI(true)} profile={profile} T={T} dark={dark}/></div>}
      {alert&&<BudgetModal {...alert} T={T}/>}

      {toast&&(
        <div style={{position:"fixed",top:22,right:22,zIndex:200,background:T.surf,border:`1px solid ${toast.type==="err"?T.redBord:T.VBord}`,borderRadius:12,padding:"12px 20px",color:toast.type==="err"?T.red:T.V,fontSize:14,fontWeight:600,boxShadow:T.shadowLg,animation:"fadeUp .3s both"}}>
          {toast.msg}
        </div>
      )}

      {delId!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:150,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.surf,border:`1px solid ${T.bord}`,borderRadius:18,padding:30,width:330,textAlign:"center",boxShadow:T.shadowLg}}>
            <div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:8,letterSpacing:"-0.02em"}}>Delete transaction?</div>
            <div style={{fontSize:14,color:T.sub,marginBottom:24}}>This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>sDel(null)} className="ghost-btn" style={{flex:1,padding:"11px"}}>Cancel</button>
              <button onClick={handleDelete} style={{flex:1,background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"11px",color:T.red,cursor:"pointer",fontWeight:700,fontFamily:"'Outfit',sans-serif",fontSize:14}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {loggedIn&&(
        <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          <TopBar tab={tab} setTab={t=>{sTab(t);if(t!=="entry")sET(null);}} profile={profile} dark={dark} toggleDark={()=>setDark(d=>!d)} budget={budget} tSpend={tSpend} bp={bp} bc={bc} T={T}/>
          <div style={{flex:1,padding:"28px 28px",maxWidth:1380,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
            {tab==="dashboard"    &&<Dashboard    txns={txns} budget={budget} name={dn} T={T} dark={dark}/>}
            {tab==="monthly"      &&<Monthly      txns={txns} budget={budget} T={T}/>}
            {tab==="budget"       &&<BudgetPage   txns={txns} budget={budget} setBudget={sBudget} T={T}/>}
            {tab==="transactions" &&<Transactions txns={txns} onEdit={handleEdit} onDelete={sDel} T={T}/>}
            {tab==="entry"        &&<NewEntry     txns={txns} editTarget={editTarget} onAdd={handleAdd} onUpdate={handleUpdate} onCancel={()=>sET(null)} budget={budget} setAlert={sAlert} T={T}/>}
            {tab==="profile"      &&<ProfilePage  profile={profile} setProfile={setProfile} onLogout={()=>sLI(false)} onClear={clearData} T={T}/>}
          </div>
        </div>
      )}
    </div>
  );
}