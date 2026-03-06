import React, { useState, useMemo, useEffect, useRef } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SUPA_URL = "https://fxnfnxfjuwwoxwzlabix.supabase.co";
const SUPA_KEY = "sb_publishable_Jpkmj4u-EUSEOcKWaAcRBw_ma4pROXy";

// ─── Supabase REST helper ─────────────────────────────────────────────────────
const sb = {
  h: { "Content-Type":"application/json", "apikey":SUPA_KEY, "Authorization":`Bearer ${SUPA_KEY}` },
  url:(p,q="")=>`${SUPA_URL}/rest/v1/${p}${q}`,
  async all(){
    const r=await fetch(sb.url("transactions","?order=created_at.desc"),{headers:sb.h});
    if(!r.ok)throw new Error(await r.text());
    return (await r.json()).map(r=>({id:r.id,date:r.date,description:r.description,category:r.category,method:r.method,type:r.type,amount:Number(r.amount)}));
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
const CAT_COLORS={"Food & Dining":"#f97316",Utilities:"#38bdf8",Entertainment:"#a78bfa","Credit Card":"#f43f5e",Transport:"#34d399",Shopping:"#f472b6",Healthcare:"#4ade80",Education:"#fbbf24",Income:"#7C3AED",Other:"#64748b"};
const MET_COLORS={UPI:"#7C3AED",Cash:"#fbbf24","Credit Card":"#f43f5e","Bank Transfer":"#34d399","Debit Card":"#38bdf8"};

const fmt=n=>"₹"+Number(n).toLocaleString("en-IN");
const today=()=>new Date().toISOString().slice(0,10);
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const pct=(v,m)=>m?clamp(Math.round(v/m*100),0,100):0;

// ─── THEME ────────────────────────────────────────────────────────────────────
const DARK = {
  bg:"#0a0b0f", surf:"#111318", raised:"#181b23", card:"#13161e",
  bord:"#1e2130", bord2:"#262c3e",
  text:"#eef0f6", sub:"#7c849a", dim:"#363d52",
  green:"#10d4a0", red:"#f43f5e", orange:"#fb923c", yellow:"#fbbf24",
  V:"#7C3AED", VL:"#9b70f6", VD:"#5b21b6", VG:"rgba(124,58,237,.13)",
  shadow:"0 8px 40px rgba(0,0,0,.5)",
  navBg:"rgba(10,11,15,.85)",
};
const LIGHT = {
  bg:"#f3f4f8", surf:"#ffffff", raised:"#f0f1f5", card:"#ffffff",
  bord:"#e2e4ec", bord2:"#d0d3de",
  text:"#0f1117", sub:"#6b7280", dim:"#adb3c4",
  green:"#059669", red:"#e11d48", orange:"#ea580c", yellow:"#d97706",
  V:"#7C3AED", VL:"#9b70f6", VD:"#5b21b6", VG:"rgba(124,58,237,.08)",
  shadow:"0 4px 24px rgba(0,0,0,.08)",
  navBg:"rgba(255,255,255,.9)",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
function GlobalCSS({T,dark}){
  const css=`
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:${T.bg};font-family:'Sora',system-ui,sans-serif;color:${T.text};transition:background .3s,color .3s;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${T.bord2};border-radius:99px;}
select option{background:${T.surf};color:${T.text};}
input[type=number]{-moz-appearance:textfield;appearance:textfield;}
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;display:none;}
input[type=date]::-webkit-calendar-picker-indicator{filter:${dark?"invert(1)":"none"};opacity:.5;cursor:pointer;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.fu{animation:fadeUp .35s cubic-bezier(.16,1,.3,1) both;}
.fi{animation:fadeIn .22s ease both;}
.card-hover{transition:transform .2s,box-shadow .2s,border-color .2s;}
.card-hover:hover{transform:translateY(-2px);box-shadow:${T.shadow};}
.row-hover:hover{background:${T.VG}!important;}
.ghost-btn:hover{background:${T.VG}!important;border-color:${T.V}!important;color:${T.V}!important;}
.nav-pill:hover{background:${T.VG};color:${T.V};}
.nav-pill.active{background:${T.VG};color:${T.V};}
input:focus,select:focus{outline:none;border-color:${T.V}!important;box-shadow:0 0 0 3px ${T.VG}!important;}
button:active{transform:scale(.97);}
  `;
  return <style>{css}</style>;
}

// ─── BAR ──────────────────────────────────────────────────────────────────────
function Bar({value,max,color,h=4,anim=true,T}){
  const[w,setW]=useState(anim?0:pct(value,max));
  useEffect(()=>{if(anim){const t=setTimeout(()=>setW(pct(value,max)),80);return()=>clearTimeout(t);}},[value,max]);
  return(
    <div style={{background:T.bord,borderRadius:99,height:h,overflow:"hidden"}}>
      <div style={{width:(anim?w:pct(value,max))+"%",height:"100%",background:color||T.V,borderRadius:99,transition:anim?"width .7s cubic-bezier(.16,1,.3,1)":"none"}}/>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({label,value,sub,accent,bar,barMax,T,icon}){
  return(
    <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <span style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase"}}>{label}</span>
        {icon&&<div style={{width:28,height:28,borderRadius:8,background:T.VG,display:"flex",alignItems:"center",justifyContent:"center"}}>{icon}</div>}
      </div>
      <div style={{fontSize:22,fontWeight:700,color:accent||T.V,letterSpacing:"-0.03em",lineHeight:1.1}}>{value}</div>
      {sub&&<div style={{fontSize:11.5,color:T.dim,marginTop:5}}>{sub}</div>}
      {bar!=null&&<div style={{marginTop:10}}><Bar value={bar} max={barMax} color={accent} T={T}/></div>}
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
      else{sE("Incorrect credentials.");sL(false);}
    },400);
  };
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse 60% 50% at 70% 10%, ${T.VG.replace(".13",".35")} 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 10% 90%, ${T.VG.replace(".13",".2")} 0%, transparent 60%)`,pointerEvents:"none"}}/>
      <div className="fu" style={{width:420,background:T.surf,border:`1px solid ${T.bord}`,borderRadius:24,padding:"48px 44px",boxShadow:T.shadow,position:"relative"}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{width:56,height:56,borderRadius:16,background:T.VG,border:`1px solid ${T.V}40`,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {profile.photo
              ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:16}}/>
              :<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.V} strokeWidth="1.8"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            }
          </div>
          <div style={{fontSize:26,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Gulak</div>
          <div style={{fontSize:13,color:T.sub,marginTop:5,fontWeight:400}}>Track every rupee</div>
        </div>
        {err&&<div style={{background:`${T.red}12`,border:`1px solid ${T.red}30`,borderRadius:10,padding:"10px 14px",color:T.red,fontSize:13,marginBottom:18}}>{err}</div>}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:7,display:"block"}}>Username</label>
          <input value={u} onChange={e=>sU(e.target.value)} placeholder="Enter username"
            style={{width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:13.5,outline:"none",fontFamily:"inherit",transition:"border-color .2s,box-shadow .2s"}}
            onKeyDown={e=>e.key==="Enter"&&go()}/>
        </div>
        <div style={{marginBottom:28,position:"relative"}}>
          <label style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:7,display:"block"}}>Password</label>
          <input value={p} onChange={e=>sP(e.target.value)} type={show?"text":"password"} placeholder="Enter password"
            style={{width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 44px 12px 14px",color:T.text,fontSize:13.5,outline:"none",fontFamily:"inherit",transition:"border-color .2s,box-shadow .2s"}}
            onKeyDown={e=>e.key==="Enter"&&go()}/>
          <button onClick={()=>sS(!show)} style={{position:"absolute",right:14,bottom:13,background:"none",border:"none",color:T.sub,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600,letterSpacing:"0.05em"}}>{show?"HIDE":"SHOW"}</button>
        </div>
        <button onClick={go} disabled={load||!u||!p}
          style={{width:"100%",background:load||!u||!p?T.raised:`linear-gradient(135deg,${T.VL},${T.VD})`,border:"none",borderRadius:11,padding:"13px",color:load||!u||!p?T.dim:T.text,fontWeight:700,fontSize:14,cursor:load||!u||!p?"not-allowed":"pointer",fontFamily:"inherit",transition:"all .25s",letterSpacing:"0.01em"}}>
          {load?"Signing in…":"Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
const NAV_ITEMS=[
  {id:"dashboard",label:"Dashboard"},
  {id:"monthly",label:"Monthly"},
  {id:"budget",label:"Budget"},
  {id:"transactions",label:"Transactions"},
  {id:"entry",label:"+ New Entry"},
  {id:"profile",label:"Profile"},
];

function TopBar({tab,setTab,profile,dark,toggleDark,budget,tSpend,bp,bc,T}){
  const dn=profile.displayName||profile.username;
  return(
    <div style={{position:"sticky",top:0,zIndex:50,background:T.navBg,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderBottom:`1px solid ${T.bord}`,transition:"background .3s"}}>
      {/* Top row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",height:56}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:9,background:`linear-gradient(135deg,${T.VL},${T.VD})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 12px ${T.V}40`}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>
          </div>
          <span style={{fontSize:17,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Gulak</span>
        </div>

        {/* Right controls */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Live sync dot */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:"5px 12px"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:T.green,animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.04em"}}>LIVE SYNC</span>
          </div>

          {/* Budget pill */}
          {budget>0&&(
            <div style={{display:"flex",alignItems:"center",gap:8,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:"5px 14px",minWidth:140}}>
              <div style={{width:30,height:4,background:T.bord,borderRadius:99,overflow:"hidden"}}>
                <div style={{width:bp+"%",height:"100%",background:bc,borderRadius:99,transition:"width .5s"}}/>
              </div>
              <span style={{fontSize:11,fontWeight:700,color:bc}}>{bp}%</span>
              <span style={{fontSize:10.5,color:T.sub}}>today</span>
            </div>
          )}

          {/* Dark/light toggle */}
          <button onClick={toggleDark}
            style={{width:36,height:36,borderRadius:10,background:T.raised,border:`1px solid ${T.bord}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s",color:T.sub}}>
            {dark
              ?<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              :<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
          </button>

          {/* Profile avatar */}
          <button onClick={()=>setTab("profile")}
            style={{display:"flex",alignItems:"center",gap:9,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:"5px 12px 5px 6px",cursor:"pointer",transition:"all .2s"}}>
            <div style={{width:26,height:26,borderRadius:"50%",overflow:"hidden",background:T.VG,border:`1.5px solid ${T.V}50`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {profile.photo
                ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                :<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.V} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              }
            </div>
            <span style={{fontSize:12.5,fontWeight:600,color:T.text}}>{dn}</span>
          </button>
        </div>
      </div>

      {/* Nav pills row */}
      <div style={{display:"flex",alignItems:"center",gap:2,padding:"0 20px 10px",overflowX:"auto"}}>
        {NAV_ITEMS.map(item=>{
          const active=tab===item.id;
          const isNew=item.id==="entry";
          return(
            <button key={item.id}
              className={active?"nav-pill active":"nav-pill"}
              onClick={()=>setTab(item.id)}
              style={{
                padding:"7px 16px",borderRadius:99,border:isNew&&!active?`1px solid ${T.V}`:active?"none":"1px solid transparent",
                background:isNew&&!active?T.VG:active?T.V:"transparent",
                color:active?"white":isNew?T.V:T.sub,
                cursor:"pointer",fontSize:13,fontWeight:active?700:500,
                fontFamily:"inherit",transition:"all .18s",whiteSpace:"nowrap",
                letterSpacing:active?"-0.01em":"0",flexShrink:0,
              }}>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({txns,budget,name,T}){
  const cred=txns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const deb=txns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const bal=cred-deb;
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const bp=pct(tSpend,budget);
  const bc=bp>=100?T.red:bp>=80?T.orange:T.green;
  const h=new Date().getHours();
  const greet=h<12?"Good morning":h<17?"Good afternoon":"Good evening";

  if(!txns.length)return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"55vh",gap:12,textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:18,background:T.VG,border:`1px solid ${T.V}30`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.V} strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
      </div>
      <div style={{fontSize:20,fontWeight:700,color:T.text,letterSpacing:"-0.03em"}}>No transactions yet</div>
      <div style={{fontSize:13,color:T.sub,maxWidth:260,lineHeight:1.7}}>Click <span style={{color:T.V,fontWeight:600}}>+ New Entry</span> in the nav to record your first transaction.</div>
    </div>
  );

  const cats=useMemo(()=>{const m={};txns.filter(t=>t.type==="debit").forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[txns]);
  const mets=useMemo(()=>{const m={};txns.forEach(t=>{m[t.method]=(m[t.method]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[txns]);
  const bars=useMemo(()=>{const m={};txns.forEach(t=>{if(!m[t.date])m[t.date]={c:0,d:0};m[t.date][t.type==="credit"?"c":"d"]+=t.amount;});return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8);},[txns]);
  const maxB=bars.reduce((m,[,v])=>Math.max(m,v.c,v.d),1);
  const recent=[...txns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}} className="fu">
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
        <div>
          <div style={{fontSize:26,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>{greet}, {name}</div>
          <div style={{fontSize:13,color:T.sub,marginTop:5}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div style={{background:`linear-gradient(135deg,${T.VG},${T.VG.replace(".13",".05")})`,border:`1px solid ${T.V}30`,borderRadius:14,padding:"14px 22px",textAlign:"right"}}>
          <div style={{fontSize:10,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:4}}>Net Balance</div>
          <div style={{fontSize:28,fontWeight:800,color:bal>=0?T.green:T.red,letterSpacing:"-0.05em"}}>{fmt(bal)}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard T={T} label="Total Income" value={fmt(cred)} sub={`${txns.filter(t=>t.type==="credit").length} entries`} accent={T.green}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.green} strokeWidth="2.2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}/>
        <StatCard T={T} label="Total Expenses" value={fmt(deb)} sub={`${txns.filter(t=>t.type==="debit").length} entries`} accent={T.red}
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2.2"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}/>
        <StatCard T={T} label="Spent Today" value={fmt(tSpend)} sub={budget>0?`${bp}% of ${fmt(budget)}`:"No budget set"} accent={bc} bar={tSpend} barMax={budget||tSpend||1}/>
        <StatCard T={T} label="Saved Today" value={fmt(Math.max(0,budget-tSpend))} sub={budget>0?"Remaining today":"Set a daily limit"} accent={T.V}/>
      </div>

      {/* Budget bar */}
      {budget>0&&(
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:600,color:T.text}}>Daily Budget</div>
              <div style={{fontSize:12,color:T.sub,marginTop:2}}>Limit {fmt(budget)} · Spent {fmt(tSpend)} · Remaining {fmt(Math.max(0,budget-tSpend))}</div>
            </div>
            <div style={{fontSize:22,fontWeight:800,color:bc,letterSpacing:"-0.03em"}}>{bp}%</div>
          </div>
          <Bar value={tSpend} max={budget} color={bp>=100?T.red:bp>=80?T.orange:T.V} h={7} T={T}/>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:14}}>
        {/* Flow chart */}
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 22px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Daily Flow — Last 8 Days</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:110}}>
            {bars.map(([date,val])=>(
              <div key={date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:92}}>
                  <div style={{flex:1,background:T.green,borderRadius:"4px 4px 0 0",opacity:.75,height:Math.round(val.c/maxB*100)+"%",minHeight:val.c?3:0,transition:"height .6s"}}/>
                  <div style={{flex:1,background:T.V,borderRadius:"4px 4px 0 0",opacity:.75,height:Math.round(val.d/maxB*100)+"%",minHeight:val.d?3:0,transition:"height .6s"}}/>
                </div>
                <span style={{fontSize:9,color:T.dim,fontFamily:"'JetBrains Mono',monospace"}}>{date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:16,marginTop:12,paddingTop:12,borderTop:`1px solid ${T.bord}`}}>
            {[[T.green,"Income"],[T.V,"Expense"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:10,height:3,background:c,borderRadius:99}}/>
                <span style={{fontSize:11,color:T.sub}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Method */}
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 22px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>By Payment Method</div>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {mets.map(([m,a])=>{
              const col=MET_COLORS[m]||T.sub;
              return(
                <div key={m}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:col}}/>
                      <span style={{fontSize:12.5,color:T.text}}>{m}</span>
                    </div>
                    <span style={{fontSize:12.5,color:col,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(a)}</span>
                  </div>
                  <Bar value={a} max={mets[0]?.[1]||1} color={col} T={T} h={3}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Top categories */}
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 22px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Top Spending Categories</div>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {cats.slice(0,5).map(([cat,amt])=>{
              const col=CAT_COLORS[cat]||T.sub;
              return(
                <div key={cat}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:3,height:16,background:col,borderRadius:99}}/>
                      <span style={{fontSize:12.5,color:T.text}}>{cat}</span>
                    </div>
                    <span style={{fontSize:12.5,color:col,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(amt)}</span>
                  </div>
                  <Bar value={amt} max={cats[0]?.[1]||1} color={col} T={T} h={3}/>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent */}
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 22px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>Recent Activity</div>
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            {recent.map(t=>{
              const col=CAT_COLORS[t.category]||T.sub;
              return(
                <div key={t.id} className="row-hover" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 8px",borderRadius:10,transition:"background .15s",cursor:"default"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:9,background:`${col}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <div style={{width:7,height:7,borderRadius:"50%",background:col}}/>
                    </div>
                    <div>
                      <div style={{fontSize:13,color:T.text,fontWeight:500}}>{t.description}</div>
                      <div style={{fontSize:10.5,color:T.dim,marginTop:1}}>{t.date} · {t.method}</div>
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:t.type==="credit"?T.green:T.red,letterSpacing:"-0.02em",fontFamily:"'JetBrains Mono',monospace"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
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
    <div style={{display:"flex",flexDirection:"column",gap:20}} className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Monthly Report</div>
          <div style={{fontSize:13,color:T.sub,marginTop:4}}>Click any day for transaction details</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={prev} className="ghost-btn" style={{background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"8px 14px",color:T.sub,cursor:"pointer",fontFamily:"inherit",fontSize:15,transition:"all .18s"}}>‹</button>
          <div style={{fontWeight:700,fontSize:15,color:T.text,minWidth:165,textAlign:"center"}}>{MONTHS[mon]} {year}</div>
          <button onClick={next} className="ghost-btn" style={{background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"8px 14px",color:T.sub,cursor:"pointer",fontFamily:"inherit",fontSize:15,transition:"all .18s"}}>›</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <StatCard T={T} label="Month Expenses" value={fmt(md)} accent={T.red}/>
        <StatCard T={T} label="Month Income"   value={fmt(mc)} accent={T.green}/>
        <StatCard T={T} label="Net"            value={fmt(mc-md)} accent={(mc-md)>=0?T.green:T.red}/>
        <StatCard T={T} label="Est. Savings"   value={budget>0?fmt(Math.max(0,budget*dim-md)):"Set budget"} accent={T.V}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:16}}>
        {/* Calendar */}
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"20px 22px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
            {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:T.dim,fontWeight:600,padding:"3px 0",letterSpacing:"0.05em"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {weeks.flat().map((day,i)=>{
              if(!day)return<div key={`e${i}`}/>;
              const key=`${year}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const data=dayMap[key];const spend=data?.d||0;
              const isSel=sel===day;const isToday=key===todayStr;
              const over=budget>0&&spend>budget;const warn=budget>0&&spend>=budget*.8&&!over;
              const intensity=spend>0?clamp(spend/maxD,.15,1):0;
              const bg=spend>0?(over?`rgba(244,63,94,${intensity*.45})`:(warn?`rgba(251,146,60,${intensity*.4})`:`rgba(124,58,237,${intensity*.4})`)):"transparent";
              return(
                <div key={key} onClick={()=>sSel(isSel?null:day)}
                  style={{aspectRatio:"1",borderRadius:9,border:`1px solid ${isSel?T.V:isToday?T.V+"60":spend>0?T.bord2:T.bord}`,background:isSel?T.VG:bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1.5,transition:"all .15s"}}>
                  <div style={{fontSize:11,fontWeight:isSel||isToday?700:400,color:isSel||isToday?T.V:T.text}}>{day}</div>
                  {spend>0&&<div style={{fontSize:8,fontWeight:600,color:over?T.red:warn?T.orange:T.V,fontFamily:"'JetBrains Mono',monospace"}}>{spend>=1000?(spend/1000).toFixed(1)+"k":spend}</div>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:14,marginTop:14,paddingTop:12,borderTop:`1px solid ${T.bord}`}}>
            {[[T.V,"Under budget"],[T.orange,"Near limit"],[T.red,"Over budget"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:10,height:3,background:c,borderRadius:99}}/>
                <span style={{fontSize:10.5,color:T.sub}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sel&&(
            <div style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 20px"}}>
              <div style={{fontSize:11,fontWeight:600,color:T.V,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:12}}>{MONTHS[mon]} {sel}</div>
              {sd?(
                <>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["Spent",sd.d,T.red],["Received",sd.c,T.green]].map(([l,v,c])=>(
                      <div key={l} style={{flex:1,background:T.raised,borderRadius:9,padding:"10px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:T.sub,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{l}</div>
                        <div style={{fontSize:14,fontWeight:700,color:c,marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                  {sd.txns.map(t=>(
                    <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"9px 10px",background:T.raised,borderRadius:9,marginBottom:4}}>
                      <div>
                        <div style={{fontSize:12,color:T.text,fontWeight:500}}>{t.description}</div>
                        <div style={{fontSize:10,color:T.dim,marginTop:2}}>{t.method}</div>
                      </div>
                      <span style={{fontSize:12,fontWeight:700,color:t.type==="credit"?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</span>
                    </div>
                  ))}
                </>
              ):<div style={{textAlign:"center",padding:"18px 0",color:T.dim,fontSize:13}}>No transactions</div>}
            </div>
          )}
          <div style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"18px 20px",flex:1}}>
            <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Spending by Category</div>
            {catBreak.length===0
              ?<div style={{textAlign:"center",color:T.dim,fontSize:13,padding:"16px 0"}}>No spending this month</div>
              :catBreak.map(([cat,amt])=>{
                const col=CAT_COLORS[cat]||T.sub;
                return(
                  <div key={cat} style={{marginBottom:13}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:col}}/>
                        <span style={{fontSize:12.5,color:T.text}}>{cat}</span>
                      </div>
                      <span style={{fontSize:12.5,color:col,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(amt)}</span>
                    </div>
                    <Bar value={amt} max={catBreak[0]?.[1]||1} color={col} h={3} T={T}/>
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
  const lbl={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:7,display:"block"};
  const inp={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:13.5,outline:"none",fontFamily:"inherit",transition:"border-color .2s,box-shadow .2s"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}} className="fu">
      <div>
        <div style={{fontSize:24,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Budget & Savings</div>
        <div style={{fontSize:13,color:T.sub,marginTop:4}}>Set your daily limit and track your progress</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"22px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Daily Budget Limit</div>
          <label style={lbl}>Amount (₹)</label>
          <div style={{display:"flex",gap:10,marginBottom:18}}>
            <input type="text" inputMode="numeric" value={input} onChange={e=>sI(e.target.value.replace(/[^0-9.]/g,""))} placeholder="e.g. 500" style={inp}/>
            <button onClick={save} style={{background:saved?T.green:`linear-gradient(135deg,${T.VL},${T.VD})`,border:"none",borderRadius:10,padding:"12px 20px",color:saved?T.bg:"white",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,transition:"all .3s",whiteSpace:"nowrap",minWidth:100}}>
              {saved?"Saved ✓":"Set Limit"}
            </button>
          </div>
          <div style={{marginBottom:18}}>
            <div style={{fontSize:11,color:T.sub,fontWeight:600,marginBottom:10,letterSpacing:"0.06em",textTransform:"uppercase"}}>Quick Presets</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[300,500,750,1000,1500,2000].map(v=>(
                <button key={v} onClick={()=>sI(String(v))} style={{background:input===String(v)?T.VG:T.raised,border:`1px solid ${input===String(v)?T.V:T.bord}`,borderRadius:8,padding:"6px 13px",color:input===String(v)?T.V:T.sub,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all .2s"}}>{fmt(v)}</button>
              ))}
            </div>
          </div>
          {budget>0&&(
            <div style={{background:T.raised,borderRadius:11,padding:"14px 16px",borderLeft:`3px solid ${T.V}`}}>
              <div style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Today</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,color:T.text}}>Spent</span>
                <span style={{fontSize:14,fontWeight:700,color:tp>=100?T.red:tp>=80?T.orange:T.green,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(t?.spend||0)}</span>
              </div>
              <Bar value={t?.spend||0} max={budget} color={tp>=100?T.red:tp>=80?T.orange:T.V} h={6} T={T}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.dim,marginTop:6}}>
                <span>{tp}% used</span><span>Left: {fmt(Math.max(0,budget-(t?.spend||0)))}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <StatCard T={T} label="Total Saved (30 days)" value={budget>0?fmt(totSaved):"—"} accent={T.V}/>
          <StatCard T={T} label="Average Daily Spend"   value={fmt(avg)} accent={T.yellow}/>
          <StatCard T={T} label="Days Under Budget"     value={budget>0?`${under} days`:"Set budget"} accent={T.green}/>
          <StatCard T={T} label="Days Over Budget"      value={budget>0?`${over} days`:"Set budget"} accent={over>5?T.red:T.orange}/>
        </div>
      </div>

      <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"22px"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Daily Spend — Last 30 Days</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:2,height:90}}>
          {l30.map(d=>{
            const h=Math.round(d.spend/maxS*100);
            const ov=budget>0&&d.spend>budget;const wn=budget>0&&d.spend>=budget*.8&&!ov;
            return(
              <div key={d.k} title={`${d.k}: ${fmt(d.spend)}`} style={{flex:1,display:"flex",alignItems:"flex-end",height:"100%"}}>
                <div style={{width:"100%",background:ov?T.red:wn?T.orange:d.spend>0?T.V:T.bord,borderRadius:"3px 3px 0 0",height:h+"%",minHeight:d.spend?2:0,opacity:.82,transition:"height .4s"}}/>
              </div>
            );
          })}
        </div>
        {budget>0&&<div style={{fontSize:11,color:T.V,marginTop:8,display:"flex",alignItems:"center",gap:6}}><div style={{width:14,borderTop:`1.5px dashed ${T.V}`}}/><span>Budget: {fmt(budget)}</span></div>}
      </div>

      {budget>0&&(
        <div className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"22px"}}>
          <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Daily Savings — Last 14 Days</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
            {l30.slice(-14).map(d=>{
              const sv=Math.max(0,budget-d.spend);const ov=d.spend>budget?d.spend-budget:0;
              return(
                <div key={d.k} style={{background:T.raised,borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${ov>0?T.red+"30":sv>0?T.V+"30":T.bord}`}}>
                  <div style={{fontSize:9,color:T.dim,marginBottom:4,fontFamily:"'JetBrains Mono',monospace"}}>{d.label}</div>
                  {d.spend===0?<div style={{fontSize:11,color:T.dim}}>—</div>
                    :ov>0?<><div style={{fontSize:8,color:T.red,fontWeight:700,letterSpacing:"0.05em"}}>OVER</div><div style={{fontSize:11,fontWeight:700,color:T.red,fontFamily:"'JetBrains Mono',monospace"}}>-{fmt(ov)}</div></>
                    :<><div style={{fontSize:8,color:T.V,fontWeight:700,letterSpacing:"0.05em"}}>SAVED</div><div style={{fontSize:11,fontWeight:700,color:T.V,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(sv)}</div></>
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
  const inp={background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"9px 14px",color:T.text,fontSize:13,outline:"none",fontFamily:"inherit",transition:"border-color .2s,box-shadow .2s"};
  const sel={...inp,cursor:"pointer"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}} className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:24,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Transactions</div>
          <div style={{fontSize:13,color:T.sub,marginTop:4}}>{list.length} of {txns.length} entries</div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:14,padding:"14px 18px",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <input value={sr} onChange={e=>sSr(e.target.value)} placeholder="Search description…" style={{...inp,width:200}}/>
        <select value={fT} onChange={e=>sfT(e.target.value)} style={sel}>
          <option value="all">All Types</option>
          <option value="debit">Expense</option>
          <option value="credit">Income</option>
        </select>
        <select value={fM} onChange={e=>sfM(e.target.value)} style={sel}>
          <option value="all">All Methods</option>
          {METHODS.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={fC} onChange={e=>sfC(e.target.value)} style={sel}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        {dirty&&<button onClick={()=>{sSr("");sfT("all");sfM("all");sfC("all");}} style={{background:`${T.red}12`,border:`1px solid ${T.red}30`,borderRadius:8,padding:"9px 14px",color:T.red,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>Clear filters</button>}
      </div>

      {/* Table */}
      <div style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:T.raised,borderBottom:`1px solid ${T.bord}`}}>
                {["Date","Description","Category","Method","Type","Amount",""].map((h,i)=>(
                  <th key={i} style={{padding:"12px 16px",textAlign:"left",color:T.dim,fontWeight:600,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!list.length&&<tr><td colSpan={7} style={{padding:"52px",textAlign:"center",color:T.dim,fontSize:13}}>No results found</td></tr>}
              {list.map(t=>{
                const cc=CAT_COLORS[t.category]||T.sub;
                const mc=MET_COLORS[t.method]||T.sub;
                return(
                  <tr key={t.id} className="row-hover" style={{borderBottom:`1px solid ${T.bord}`,transition:"background .15s"}}>
                    <td style={{padding:"11px 16px",color:T.sub,whiteSpace:"nowrap",fontSize:11.5,fontFamily:"'JetBrains Mono',monospace"}}>{t.date}</td>
                    <td style={{padding:"11px 16px",color:T.text,fontWeight:500}}>{t.description}</td>
                    <td style={{padding:"11px 16px"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,color:cc}}><span style={{width:6,height:6,background:cc,borderRadius:"50%",display:"inline-block"}}/>{t.category}</span></td>
                    <td style={{padding:"11px 16px"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,color:mc}}><span style={{width:6,height:6,background:mc,borderRadius:"50%",display:"inline-block"}}/>{t.method}</span></td>
                    <td style={{padding:"11px 16px"}}><span style={{fontSize:10,fontWeight:700,color:t.type==="credit"?T.green:T.red,letterSpacing:"0.06em",textTransform:"uppercase",background:t.type==="credit"?`${T.green}15`:`${T.red}15`,padding:"3px 8px",borderRadius:6}}>{t.type==="credit"?"IN":"OUT"}</span></td>
                    <td style={{padding:"11px 16px",fontWeight:700,color:t.type==="credit"?T.green:T.red,whiteSpace:"nowrap",fontFamily:"'JetBrains Mono',monospace"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</td>
                    <td style={{padding:"11px 16px"}}>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={()=>onEdit(t)} style={{background:T.VG,border:`1px solid ${T.V}30`,borderRadius:7,padding:"5px 12px",color:T.V,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600}}>Edit</button>
                        <button onClick={()=>onDelete(t.id)} style={{background:`${T.red}10`,border:`1px solid ${T.red}25`,borderRadius:7,padding:"5px 10px",color:T.red,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Del</button>
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:T.surf,border:`1px solid ${over?T.red+"40":T.orange+"40"}`,borderRadius:18,padding:32,width:380}}>
        <div style={{fontSize:14,fontWeight:700,color:over?T.red:T.orange,marginBottom:8}}>{over?"Budget exceeded":"Approaching limit"}</div>
        <div style={{fontSize:13,color:T.sub,lineHeight:1.65,marginBottom:18}}>
          {over?`You've spent ${fmt(spent)} of your ${fmt(budget)} limit. Adding ${fmt(pending)} puts you ${fmt(spent+pending-budget)} over.`
               :`${p2}% used (${fmt(spent)} of ${fmt(budget)}). Adding ${fmt(pending)} takes today to ${fmt(spent+pending)}.`}
        </div>
        <Bar value={spent+pending} max={budget} color={over?T.red:T.orange} h={4} T={T}/>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={onCancel} style={{flex:1,background:"transparent",border:`1px solid ${T.bord}`,borderRadius:9,padding:"11px",color:T.sub,cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13}}>Go back</button>
          <button onClick={onConfirm} style={{flex:1,background:over?`${T.red}12`:T.VG,border:`1px solid ${over?T.red+"30":T.V+"30"}`,borderRadius:9,padding:"11px",color:over?T.red:T.V,cursor:"pointer",fontWeight:700,fontFamily:"inherit",fontSize:13}}>Add anyway</button>
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
  const lbl={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:7,display:"block"};
  const inp={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:13.5,outline:"none",fontFamily:"inherit",transition:"border-color .2s,box-shadow .2s"};

  return(
    <div style={{display:"flex",gap:24,alignItems:"flex-start"}} className="fu">
      <div style={{flex:"0 0 480px"}}>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:24,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>{editTarget?"Edit Transaction":"New Entry"}</div>
          <div style={{fontSize:13,color:T.sub,marginTop:4}}>{editTarget?"Update the transaction details":"Record an income or expense"}</div>
        </div>
        <div style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"24px"}}>
          <div style={{marginBottom:20}}>
            <label style={lbl}>Type</label>
            <div style={{display:"flex",background:T.raised,borderRadius:11,padding:4,gap:4}}>
              {["debit","credit"].map(tp=>(
                <button key={tp} onClick={()=>sF({...form,type:tp})}
                  style={{flex:1,padding:"10px",borderRadius:9,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,transition:"all .2s",
                    background:form.type===tp?(tp==="debit"?`${T.red}15`:T.VG):"transparent",
                    color:form.type===tp?(tp==="debit"?T.red:T.V):T.sub}}>
                  {tp==="debit"?"Expense":"Income"}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e=>sF({...form,date:e.target.value})} style={inp}/></div>
            <div><label style={lbl}>Amount (₹)</label><input type="text" inputMode="numeric" value={form.amount} onChange={e=>sF({...form,amount:e.target.value.replace(/[^0-9.]/g,"")})} placeholder="0" style={inp}/></div>
          </div>
          <div style={{marginBottom:16}}><label style={lbl}>Description</label><input value={form.description} onChange={e=>sF({...form,description:e.target.value})} placeholder="e.g. Zomato, Salary, Rent…" style={inp}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:warn?16:22}}>
            <div><label style={lbl}>Category</label><select value={form.category} onChange={e=>sF({...form,category:e.target.value})} style={{...inp,cursor:"pointer"}}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={lbl}>Payment Method</label><select value={form.method} onChange={e=>sF({...form,method:e.target.value})} style={{...inp,cursor:"pointer"}}>{METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          {warn&&(
            <div style={{background:warn.over?`${T.red}10`:T.VG,border:`1px solid ${warn.over?T.red+"25":T.V+"25"}`,borderRadius:9,padding:"10px 14px",marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:700,color:warn.over?T.red:T.V,marginBottom:2}}>{warn.over?"Over budget":"Near your limit"}</div>
              <div style={{fontSize:12,color:T.sub}}>Today's total will be {fmt(warn.total)} ({warn.p2}% of {fmt(budget)})</div>
            </div>
          )}
          {valid&&(
            <div style={{background:T.raised,borderRadius:11,padding:"13px 16px",marginBottom:18,borderLeft:`3px solid ${T.V}`}}>
              <div style={{fontSize:10,color:T.sub,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Preview</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:600,color:T.text,fontSize:13}}>{form.description}</div>
                  <div style={{fontSize:11,color:T.dim,marginTop:2}}>{form.category} · {form.method} · {form.date}</div>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:form.type==="credit"?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{form.type==="credit"?"+":"-"}{fmt(form.amount)}</div>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button onClick={attempt} disabled={!valid}
              style={{flex:1,background:valid?`linear-gradient(135deg,${T.VL},${T.VD})`:T.raised,border:"none",borderRadius:11,padding:"13px",color:valid?"white":T.dim,fontWeight:700,fontSize:14,cursor:valid?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .25s"}}>
              {editTarget?"Save Changes":"Add Transaction"}
            </button>
            {editTarget&&<button onClick={onCancel} style={{background:"transparent",border:`1px solid ${T.bord}`,borderRadius:11,padding:"13px 18px",color:T.sub,cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13}}>Cancel</button>}
          </div>
        </div>
      </div>

      {/* Recent sidebar */}
      <div style={{flex:1}}>
        <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:14}}>Recent Entries</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[...txns].reverse().slice(0,8).map(t=>(
            <div key={t.id} className="card-hover" style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:12,padding:"11px 15px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:3,height:32,background:CAT_COLORS[t.category]||T.sub,borderRadius:99,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:12.5,color:T.text,fontWeight:500}}>{t.description}</div>
                    <div style={{fontSize:10.5,color:T.dim,marginTop:2}}>{t.date} · {t.category}</div>
                  </div>
                </div>
                <div style={{fontSize:13,fontWeight:700,color:t.type==="credit"?T.green:T.red,fontFamily:"'JetBrains Mono',monospace"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
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
  const lbl={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:7,display:"block"};
  const inp={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:13.5,outline:"none",fontFamily:"inherit",transition:"border-color .2s,box-shadow .2s"};

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20,maxWidth:600}} className="fu">
      <div>
        <div style={{fontSize:24,fontWeight:800,color:T.text,letterSpacing:"-0.04em"}}>Profile & Settings</div>
        <div style={{fontSize:13,color:T.sub,marginTop:4}}>Manage your photo, name, and login credentials</div>
      </div>

      {/* Photo */}
      <div style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"22px"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Profile Photo</div>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{width:80,height:80,borderRadius:18,overflow:"hidden",background:T.raised,border:`2px solid ${T.bord2}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {profile.photo
              ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={T.sub} strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            }
          </div>
          <div>
            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} style={{display:"none"}}/>
            <button onClick={()=>fileRef.current.click()} style={{background:T.VG,border:`1px solid ${T.V}30`,borderRadius:9,padding:"9px 18px",color:T.V,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,display:"block",marginBottom:8}}>Upload Photo</button>
            {profile.photo&&<button onClick={()=>setProfile(p=>({...p,photo:null}))} style={{background:"transparent",border:"none",color:T.dim,cursor:"pointer",fontFamily:"inherit",fontSize:12,padding:0}}>Remove photo</button>}
            <div style={{fontSize:11,color:T.dim,marginTop:6}}>Stored locally on this device.</div>
          </div>
        </div>
      </div>

      {/* Account */}
      <div style={{background:T.card,border:`1px solid ${T.bord}`,borderRadius:16,padding:"22px"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Account</div>
        {err&&<div style={{background:`${T.red}10`,border:`1px solid ${T.red}30`,borderRadius:9,padding:"10px 14px",color:T.red,fontSize:13,marginBottom:14}}>{err}</div>}
        {saved&&<div style={{background:`${T.green}10`,border:`1px solid ${T.green}30`,borderRadius:9,padding:"10px 14px",color:T.green,fontSize:13,marginBottom:14}}>Changes saved and synced.</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div><label style={lbl}>Display Name</label><input value={form.displayName} onChange={e=>sF({...form,displayName:e.target.value})} placeholder="How you want to be greeted" style={inp}/></div>
          <div><label style={lbl}>Username</label><input value={form.username} onChange={e=>sF({...form,username:e.target.value})} placeholder="Login username" style={inp}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:22}}>
          <div><label style={lbl}>New Password</label><input type="password" value={form.password} onChange={e=>sF({...form,password:e.target.value})} placeholder="Leave blank to keep current" style={inp}/></div>
          <div><label style={lbl}>Confirm Password</label><input type="password" value={form.confirm} onChange={e=>sF({...form,confirm:e.target.value})} placeholder="Repeat new password" style={inp}/></div>
        </div>
        <button onClick={save} style={{background:`linear-gradient(135deg,${T.VL},${T.VD})`,border:"none",borderRadius:10,padding:"12px 28px",color:"white",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Save Changes</button>
      </div>

      {/* Danger */}
      <div style={{background:T.card,border:`1px solid ${T.red}25`,borderRadius:16,padding:"22px"}}>
        <div style={{fontSize:11,fontWeight:600,color:T.red,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:16}}>Danger Zone</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button onClick={onLogout} style={{background:"transparent",border:`1px solid ${T.bord}`,borderRadius:9,padding:"9px 20px",color:T.sub,cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13}}>Sign Out</button>
          <button onClick={onClear} style={{background:`${T.red}10`,border:`1px solid ${T.red}25`,borderRadius:9,padding:"9px 20px",color:T.red,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13}}>Delete All Transactions</button>
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

  const T=dark?DARK:LIGHT;

  // Load from Supabase
  const didLoad=useRef(false);
  useEffect(()=>{
    Promise.all([sb.all(),sb.getSettings()])
      .then(([rows,settings])=>{
        sTxns(rows);
        if(settings){
          sProfileRaw(p=>{
            const merged={...p,
              username:settings.username||p.username,
              password:settings.password||p.password,
              displayName:settings.display_name||p.displayName||"",
            };
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
  const handleAdd=async t=>{try{const s=await sb.insert(t);sTxns(p=>[s,...p]);toast2("Transaction saved");}catch(e){toast2("Save failed: "+e.message,"err");}};
  const handleUpdate=async t=>{try{await sb.update(t);sTxns(p=>p.map(x=>x.id===t.id?t:x));sET(null);toast2("Updated");}catch(e){toast2("Update failed","err");}};
  const handleEdit=t=>{sET(t);sTab("entry");};
  const handleDelete=async()=>{try{await sb.remove(delId);sTxns(p=>p.filter(t=>t.id!==delId));sDel(null);toast2("Deleted","err");}catch(e){toast2("Delete failed","err");}};
  const clearData=async()=>{if(!window.confirm("Delete ALL transactions?"))return;try{await sb.clearAll();sTxns([]);toast2("Cleared","err");}catch(e){toast2("Failed","err");}};

  const dn=profile.displayName||profile.username;
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const bp=pct(tSpend,budget);
  const bc=bp>=100?T.red:bp>=80?T.orange:T.green;

  // Loading
  if(loading)return(
    <div style={{minHeight:"100vh",background:dark?"#0a0b0f":"#f3f4f8",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,border:`3px solid #1e2130`,borderTop:`3px solid #7C3AED`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <div style={{fontSize:13,color:"#7c849a",fontFamily:"system-ui"}}>Connecting to database…</div>
    </div>
  );

  // DB Error
  if(dbErr)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:500,background:T.surf,border:`1px solid ${T.red}30`,borderRadius:18,padding:36}}>
        <div style={{fontSize:15,fontWeight:700,color:T.red,marginBottom:10}}>Database not configured</div>
        <div style={{fontSize:13,color:T.sub,lineHeight:1.75,marginBottom:16}}>Open <code style={{background:T.raised,padding:"2px 7px",borderRadius:5,color:T.V}}>src/App.jsx</code> and paste your Supabase URL and anon key at the top.</div>
        <div style={{fontSize:11,color:T.dim}}>Error: {dbErr}</div>
      </div>
    </div>
  );

  return(
    <div style={{fontFamily:"'Sora',system-ui,sans-serif",background:T.bg,minHeight:"100vh",color:T.text,transition:"background .3s,color .3s"}}>
      <GlobalCSS T={T} dark={dark}/>

      {/* Login overlay */}
      {!loggedIn&&<div style={{position:"fixed",inset:0,zIndex:100}}><Login onLogin={()=>sLI(true)} profile={profile} T={T} dark={dark}/></div>}

      {/* Budget modal */}
      {alert&&<BudgetModal {...alert} T={T}/>}

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:20,right:20,zIndex:200,background:T.surf,border:`1px solid ${toast.type==="err"?T.red+"40":T.V+"40"}`,borderRadius:11,padding:"11px 20px",color:toast.type==="err"?T.red:T.V,fontSize:13,fontWeight:600,boxShadow:T.shadow,animation:"fadeUp .3s both"}}>
          {toast.msg}
        </div>
      )}

      {/* Delete confirm */}
      {delId!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:150,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.surf,border:`1px solid ${T.bord}`,borderRadius:16,padding:28,width:320,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:8}}>Delete transaction?</div>
            <div style={{fontSize:13,color:T.sub,marginBottom:22}}>This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>sDel(null)} style={{flex:1,background:"transparent",border:`1px solid ${T.bord}`,borderRadius:9,padding:"10px",color:T.sub,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancel</button>
              <button onClick={handleDelete} style={{flex:1,background:`${T.red}12`,border:`1px solid ${T.red}25`,borderRadius:9,padding:"10px",color:T.red,cursor:"pointer",fontWeight:700,fontFamily:"inherit",fontSize:13}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {loggedIn&&(
        <div style={{display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          <TopBar tab={tab} setTab={t=>{sTab(t);if(t!=="entry")sET(null);}} profile={profile} dark={dark} toggleDark={()=>setDark(d=>!d)} budget={budget} tSpend={tSpend} bp={bp} bc={bc} T={T}/>
          <div style={{flex:1,padding:"28px 28px",maxWidth:1400,width:"100%",margin:"0 auto",boxSizing:"border-box"}}>
            {tab==="dashboard"    &&<Dashboard    txns={txns} budget={budget} name={dn} T={T}/>}
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