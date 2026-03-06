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

// Paisa-exact warm cream / warm dark
const LIGHT = {
  mode:"light", bg:"#e8e8e0", surf:"#f4f4ec", card:"#f4f4ec", raised:"#eaeae0", bord:"#d8d8cc", bord2:"#c8c8bc",
  text:"#222218", sub:"#888878", dim:"#aaaaA0", nav:"rgba(244,244,236,0.96)",
  red:"#dc2626",  redBg:"rgba(220,38,38,.08)",   redBord:"rgba(220,38,38,.25)",
  green:"#16a34a",greenBg:"rgba(22,163,74,.08)",  greenBord:"rgba(22,163,74,.25)",
  gold:"#7a6a14", goldBg:"rgba(122,106,20,.08)",  goldBord:"rgba(122,106,20,.3)",
  V:"#6b4fc8",    VBg:"rgba(107,79,200,.08)",     VBord:"rgba(107,79,200,.25)",
  shadow:"0 1px 10px rgba(0,0,0,.08)", shadowLg:"0 4px 28px rgba(0,0,0,.12)",
};
const DARK = {
  mode:"dark", bg:"#1a1a14", surf:"#222218", card:"#222218", raised:"#2a2a20", bord:"#38382c", bord2:"#44443a",
  text:"#f0f0e4", sub:"#88887c", dim:"#44443a", nav:"rgba(26,26,20,0.96)",
  red:"#f87171",  redBg:"rgba(248,113,113,.1)",   redBord:"rgba(248,113,113,.3)",
  green:"#4ade80",greenBg:"rgba(74,222,128,.1)",   greenBord:"rgba(74,222,128,.3)",
  gold:"#c8a84b", goldBg:"rgba(200,168,75,.1)",    goldBord:"rgba(200,168,75,.3)",
  V:"#9b7edb",    VBg:"rgba(155,126,219,.1)",      VBord:"rgba(155,126,219,.3)",
  shadow:"0 2px 18px rgba(0,0,0,.45)", shadowLg:"0 6px 40px rgba(0,0,0,.65)",
};

function G({T}) {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
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
    .card{background:${T.card};border:1px solid ${T.bord};border-radius:16px;}
    .hov:hover{border-color:${T.bord2};box-shadow:${T.shadow};}
    .rowh:hover{background:${T.raised}!important;}
    input:focus,select:focus{outline:none!important;border-color:${T.V}!important;box-shadow:0 0 0 3px ${T.VBg}!important;}
    button{cursor:pointer;}
    button:active{opacity:.82;}
  `}</style>;
}

function Bar({val,max,color,h=5,T}) {
  const[w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(pct(val,max)),80);return()=>clearTimeout(t);},[val,max]);
  return <div style={{background:T.mode==="dark"?"rgba(255,255,255,.06)":"rgba(0,0,0,.07)",borderRadius:99,height:h,overflow:"hidden"}}><div style={{width:w+"%",height:"100%",background:color,borderRadius:99,transition:"width .7s cubic-bezier(.22,1,.36,1)"}}/></div>;
}

// LOGIN
function Login({onLogin,profile,T}) {
  const[u,sU]=useState("");const[p,sP]=useState("");const[err,sE]=useState("");const[show,sS]=useState(false);const[load,sL]=useState(false);
  const go=()=>{if(!u||!p)return;sL(true);setTimeout(()=>{u===profile.username&&p===profile.password?onLogin():(sE("Wrong username or password"),sL(false));},420);};
  const F={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"13px 15px",color:T.text,fontSize:14,fontFamily:"inherit",transition:"all .18s"};
  return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div className="anim" style={{width:400,background:T.surf,border:`1px solid ${T.bord}`,borderRadius:20,padding:"44px 40px",boxShadow:T.shadowLg}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:62,height:62,borderRadius:18,background:T.gold,marginBottom:14,boxShadow:`0 4px 18px ${T.gold}60`}}>
            <span style={{fontSize:30,color:"white",fontWeight:900}}>₹</span>
          </div>
          <div style={{fontSize:26,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>Gulak</div>
          <div style={{fontSize:13,color:T.sub,marginTop:4}}>Track every rupee, own your story</div>
        </div>
        {err&&<div style={{background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"10px 14px",color:T.red,fontSize:13,marginBottom:18,fontWeight:500}}>{err}</div>}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:7,display:"block"}}>Username</label>
          <input value={u} onChange={e=>sU(e.target.value)} placeholder="Enter username" style={F} onKeyDown={e=>e.key==="Enter"&&go()}/>
        </div>
        <div style={{marginBottom:28,position:"relative"}}>
          <label style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:7,display:"block"}}>Password</label>
          <input value={p} onChange={e=>sP(e.target.value)} type={show?"text":"password"} placeholder="Enter password" style={{...F,paddingRight:52}} onKeyDown={e=>e.key==="Enter"&&go()}/>
          <button onClick={()=>sS(!show)} style={{position:"absolute",right:14,bottom:14,background:"none",border:"none",color:T.sub,fontSize:11,fontFamily:"inherit",fontWeight:700,letterSpacing:".06em"}}>{show?"HIDE":"SHOW"}</button>
        </div>
        <button onClick={go} disabled={!u||!p||load} style={{width:"100%",background:u&&p?T.gold:T.raised,border:"none",borderRadius:11,padding:"13px",color:u&&p?"white":T.dim,fontWeight:700,fontSize:14,fontFamily:"inherit",transition:"all .22s",boxShadow:u&&p?`0 4px 16px ${T.gold}60`:"none"}}>
          {load?"Signing in…":"Sign In"}
        </button>
      </div>
    </div>
  );
}

// TOP BAR — Paisa-exact layout
function TopBar({view,setView,setTab,profile,dark,toggleDark,budget,tSpend,T,onAdd}) {
  const dn=profile.displayName||profile.username;
  const bp=pct(tSpend,budget);
  const bc=bp>=100?T.red:bp>=80?"#f97316":T.green;
  return(
    <div style={{position:"sticky",top:0,zIndex:60,width:"100%",background:T.nav,backdropFilter:"blur(18px)",WebkitBackdropFilter:"blur(18px)",borderBottom:`1px solid ${T.bord}`}}>
      <div style={{width:"100%",display:"flex",alignItems:"center",padding:"10px 28px",gap:16,minHeight:60}}>
        {/* Expense / Income toggle */}
        <div style={{display:"flex",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:3,gap:2,flexShrink:0}}>
          {[["expense","🔴","Expenses"],["income","🟢","Received"]].map(([v,dot,lbl])=>(
            <button key={v} onClick={()=>{setView(v);setTab("dashboard");}} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 20px",borderRadius:99,border:"none",fontFamily:"inherit",fontSize:13.5,fontWeight:view===v?700:500,transition:"all .2s",background:view===v?(v==="expense"?"#dc2626":"#16a34a"):"transparent",color:view===v?"white":T.sub,boxShadow:view===v?(v==="expense"?"0 2px 10px rgba(220,38,38,.4)":"0 2px 10px rgba(22,163,74,.4)"):"none"}}>
              <span style={{fontSize:9}}>{dot}</span>{lbl}
            </button>
          ))}
        </div>
        {/* Month — center, monospace gold like Paisa */}
        <div style={{flex:1,display:"flex",justifyContent:"center"}}>
          <span style={{fontSize:15,fontWeight:700,color:T.gold,fontFamily:"'Courier New',monospace",letterSpacing:".04em"}}>
            {new Date().toLocaleString("en-IN",{month:"long",year:"numeric"})}
          </span>
        </div>
        {/* Right: Add + toggle + settings + avatar */}
        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <button onClick={onAdd} style={{display:"flex",alignItems:"center",gap:8,background:T.gold,border:"none",borderRadius:99,padding:"9px 22px",color:"white",fontWeight:700,fontSize:14,fontFamily:"inherit",boxShadow:`0 3px 14px ${T.gold}70`,transition:"all .2s",whiteSpace:"nowrap"}}>
            <span style={{fontSize:17,lineHeight:1}}>＋</span>Add {view==="expense"?"Expense":"Income"}
          </button>
          <button onClick={toggleDark} style={{display:"flex",alignItems:"center",gap:6,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:"8px 15px",fontFamily:"inherit",fontSize:13,fontWeight:700,color:T.sub,transition:"all .2s"}}>
            {dark?"☀️ Light":"🌙 Dark"}
          </button>
          <button onClick={()=>setTab("settings")} style={{width:38,height:38,borderRadius:99,background:T.raised,border:`1px solid ${T.bord}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .18s",fontSize:17}}>⚙️</button>
          <button onClick={()=>setTab("profile")} style={{display:"flex",alignItems:"center",gap:9,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:99,padding:"5px 15px 5px 5px",fontFamily:"inherit",transition:"all .2s"}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:T.gold,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {profile.photo?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:14,fontWeight:900,color:"white"}}>{dn[0].toUpperCase()}</span>}
            </div>
            <span style={{fontSize:13.5,fontWeight:600,color:T.text}}>{dn}</span>
          </button>
        </div>
      </div>
      {/* Sub strip */}
      <div style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px 10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:T.green,display:"inline-block",animation:"blink 2.2s ease infinite"}}/>
          <span style={{fontSize:12,color:T.sub}}>Live sync active</span>
        </div>
        {budget>0&&<div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:T.sub}}>Budget today</span>
          <div style={{width:70,height:5,background:T.bord,borderRadius:99,overflow:"hidden"}}><div style={{width:bp+"%",height:"100%",background:bc,borderRadius:99,transition:"width .5s"}}/></div>
          <span style={{fontSize:12,fontWeight:700,color:bc}}>{bp}%</span>
        </div>}
      </div>
    </div>
  );
}

// DASHBOARD
function Dashboard({txns,budget,name,T,view,onEdit,onDelete,customCats}) {
  const isExp=view==="expense";
  const filtered=useMemo(()=>txns.filter(t=>isExp?t.type==="debit":t.type==="credit"),[txns,view]);
  const opposite=useMemo(()=>txns.filter(t=>isExp?t.type==="credit":t.type==="debit"),[txns,view]);
  const total=filtered.reduce((s,t)=>s+t.amount,0);
  const oTotal=opposite.reduce((s,t)=>s+t.amount,0);
  const net=isExp?oTotal-total:total-oTotal;
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const bp=pct(tSpend,budget);const bc=bp>=100?T.red:bp>=80?"#f97316":T.green;
  const h=new Date().getHours();const greet=h<12?"Good morning":h<17?"Good afternoon":"Good evening";
  const catMap=useMemo(()=>{const m={};filtered.forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[filtered]);
  const metMap=useMemo(()=>{const m={};filtered.forEach(t=>{m[t.method]=(m[t.method]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[filtered]);
  const accentC=isExp?T.red:T.green;const accentBg=isExp?T.redBg:T.greenBg;const accentBo=isExp?T.redBord:T.greenBord;
  const P={padding:"22px 24px"};const SL={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:14};
  return(
    <div className="anim" style={{display:"flex",flexDirection:"column",gap:20,width:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:13,color:T.sub,marginBottom:3}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          <div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>{greet}, {name} 👋</div>
          <div style={{fontSize:14,color:T.sub,marginTop:4}}>Here's your financial snapshot</div>
        </div>
      </div>
      {/* 3 stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <div className="card hov" style={{...P,background:accentBg,borderColor:accentBo}}>
          <div style={SL}>{isExp?"Spent":"Received"}</div>
          <div style={{fontSize:32,fontWeight:900,color:accentC,letterSpacing:"-0.05em",lineHeight:1}}>{fmt(total)}</div>
          <div style={{fontSize:13,color:T.sub,marginTop:8}}>{filtered.length} {isExp?"expenses":"entries"}</div>
        </div>
        <div className="card hov" style={P}>
          <div style={SL}>{isExp?"Received":"Spent"}</div>
          <div style={{fontSize:32,fontWeight:900,color:T.sub,letterSpacing:"-0.05em",lineHeight:1}}>{fmt(oTotal)}</div>
          <div style={{fontSize:13,color:T.sub,marginTop:8}}>{opposite.length} entries</div>
        </div>
        <div className="card hov" style={{...P,background:net>=0?T.greenBg:T.redBg,borderColor:net>=0?T.greenBord:T.redBord}}>
          <div style={SL}>Net Balance</div>
          <div style={{fontSize:32,fontWeight:900,color:net>=0?T.green:T.red,letterSpacing:"-0.05em",lineHeight:1}}>{fmt(net)}</div>
          <div style={{fontSize:13,color:T.sub,marginTop:8}}>{net>=0?"surplus":"deficit"} this month</div>
        </div>
      </div>
      {budget>0&&<div className="card" style={P}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <div><span style={{fontSize:14,fontWeight:700,color:T.text}}>Daily Budget</span><span style={{fontSize:13,color:T.sub,marginLeft:12}}>Limit {fmt(budget)} · Spent {fmt(tSpend)} · Left {fmt(Math.max(0,budget-tSpend))}</span></div>
          <span style={{fontSize:22,fontWeight:900,color:bc}}>{bp}%</span>
        </div>
        <Bar val={tSpend} max={budget} color={bc} h={7} T={T}/>
      </div>}
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
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"16px 24px",borderBottom:`1px solid ${T.bord}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{...SL,marginBottom:0}}>{isExp?"Expense":"Income"} Transactions</span>
          <span style={{fontSize:12.5,color:T.sub}}>{filtered.length} total</span>
        </div>
        {filtered.length===0?<div style={{padding:"56px 24px",textAlign:"center",color:T.dim,fontSize:14}}>No {isExp?"expenses":"income"} yet.</div>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13.5}}>
              <thead><tr style={{background:T.raised}}>{["Description","Category","Method","Date","Amount",""].map((h,i)=><th key={i} style={{padding:"11px 20px",textAlign:"left",color:T.sub,fontWeight:600,fontSize:10.5,letterSpacing:".06em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.slice(0,20).map(t=>(
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
    </div>
  );
}

// MONTHLY
function Monthly({txns,budget,T,view}) {
  const[mon,sM]=useState(new Date().getMonth());const[yr,sY]=useState(new Date().getFullYear());const[sel,sSel]=useState(null);
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
        <div><div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>Monthly Report</div><div style={{fontSize:14,color:T.sub,marginTop:4}}>Showing {isExp?"expenses":"income"} · tap day for details</div></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>{mon===0?(sM(11),sY(y=>y-1)):sM(m=>m-1);sSel(null);}} style={{background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"8px 17px",color:T.sub,fontSize:15,fontFamily:"inherit"}}>‹</button>
          <span style={{fontWeight:700,fontSize:15,color:T.gold,minWidth:170,textAlign:"center",fontFamily:"'Courier New',monospace"}}>{MONTHS[mon]} {yr}</span>
          <button onClick={()=>{mon===11?(sM(0),sY(y=>y+1)):sM(m=>m+1);sSel(null);}} style={{background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"8px 17px",color:T.sub,fontSize:15,fontFamily:"inherit"}}>›</button>
        </div>
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

// BUDGET
function Budget({txns,budget,setBudget,T}) {
  const[inp,sI]=useState(String(budget||""));const[saved,sSaved]=useState(false);
  const save=()=>{const v=parseFloat(inp);if(v>0){setBudget(v);sSaved(true);setTimeout(()=>sSaved(false),2000);}};
  const last30=useMemo(()=>{const arr=[];for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.toISOString().slice(0,10);const spend=txns.filter(t=>t.type==="debit"&&t.date===k).reduce((s,t)=>s+t.amount,0);arr.push({k,spend,label:k.slice(5)});}return arr;},[txns,budget]);
  const tT=last30[last30.length-1];const tp=pct(tT?.spend||0,budget);const bc=tp>=100?T.red:tp>=80?"#f97316":T.green;
  const maxS=last30.reduce((m,d)=>Math.max(m,d.spend),budget||1);
  const avg=Math.round(last30.reduce((s,d)=>s+d.spend,0)/30);
  const under=last30.filter(d=>budget>0&&d.spend>0&&d.spend<budget).length;
  const over30=last30.filter(d=>budget>0&&d.spend>budget).length;
  const F={width:"100%",background:T.raised,border:`1px solid ${T.bord}`,borderRadius:10,padding:"12px 14px",color:T.text,fontSize:14,fontFamily:"inherit",transition:"all .18s"};
  const P={padding:"22px 24px"};const SL={fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:14};
  return(
    <div className="anim" style={{display:"flex",flexDirection:"column",gap:20,width:"100%"}}>
      <div><div style={{fontSize:28,fontWeight:900,color:T.text,letterSpacing:"-0.04em"}}>Budget</div><div style={{fontSize:14,color:T.sub,marginTop:4}}>Set your daily limit and track savings</div></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div className="card" style={P}>
          <div style={SL}>Daily Budget Limit</div>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input type="text" inputMode="numeric" value={inp} onChange={e=>sI(e.target.value.replace(/[^0-9.]/g,""))} placeholder="e.g. 500" style={F}/>
            <button onClick={save} style={{background:saved?T.green:T.gold,border:"none",borderRadius:10,padding:"12px 22px",color:"white",fontWeight:700,fontFamily:"inherit",fontSize:14,whiteSpace:"nowrap",minWidth:110,transition:"all .3s"}}>{saved?"Saved ✓":"Set Limit"}</button>
          </div>
          <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:16}}>
            {[300,500,750,1000,1500,2000].map(v=>(
              <button key={v} onClick={()=>sI(String(v))} style={{background:inp===String(v)?T.goldBg:T.raised,border:`1px solid ${inp===String(v)?T.gold:T.bord}`,borderRadius:8,padding:"6px 14px",color:inp===String(v)?T.gold:T.sub,fontFamily:"inherit",fontSize:13,fontWeight:600,transition:"all .18s"}}>{fmt(v)}</button>
            ))}
          </div>
          {budget>0&&<div style={{background:T.raised,borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${T.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:13,color:T.text}}>Today</span><span style={{fontSize:16,fontWeight:900,color:bc}}>{fmt(tT?.spend||0)}</span></div>
            <Bar val={tT?.spend||0} max={budget} color={bc} h={6} T={T}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:T.sub,marginTop:7}}><span>{tp}% used</span><span>Left: {fmt(Math.max(0,budget-(tT?.spend||0)))}</span></div>
          </div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[["Avg Daily Spend",fmt(avg),T.gold,T.goldBg],["Days Under Budget",budget?`${under} days`:"—",T.green,T.greenBg],["Days Over Budget",budget?`${over30} days`:"—",over30>5?T.red:"#f97316",over30>5?T.redBg:T.raised]].map(([l,v,c,bg])=>(
            <div key={l} className="card hov" style={{...P,background:bg}}><div style={{fontSize:11,fontWeight:600,color:T.sub,letterSpacing:".07em",textTransform:"uppercase",marginBottom:10}}>{l}</div><div style={{fontSize:26,fontWeight:900,color:c,letterSpacing:"-0.03em"}}>{v}</div></div>
          ))}
        </div>
      </div>
      <div className="card" style={P}>
        <div style={SL}>Daily Spend — Last 30 Days</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:2,height:90}}>
          {last30.map(d=>{const h=Math.round(d.spend/maxS*100);const ov=budget>0&&d.spend>budget;const wn=budget>0&&d.spend>=budget*.8&&!ov;return <div key={d.k} title={`${d.k}: ${fmt(d.spend)}`} style={{flex:1,height:"100%",display:"flex",alignItems:"flex-end"}}><div style={{width:"100%",background:ov?T.red:wn?"#f97316":d.spend>0?T.gold:T.bord,borderRadius:"3px 3px 0 0",height:h+"%",minHeight:d.spend?2:0,opacity:.85,transition:"height .4s"}}/></div>;})}
        </div>
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
function ProfilePage({profile,setProfile,onLogout,onClear,T,customCats,setCustomCats}) {
  const[form,sF]=useState({username:profile.username,password:"",confirm:"",displayName:profile.displayName||""});
  const[saved,sSaved]=useState(false);const[err,sE]=useState("");const[catInp,sCatInp]=useState("");
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

// ROOT
const DEF_PROFILE={username:"admin",password:"admin123",displayName:"",photo:null};
export default function App() {
  const[loggedIn,sLI]=useState(false);const[tab,sTab]=useState("dashboard");const[view,sView]=useState("expense");
  const[txns,sTxns]=useState([]);const[loading,sLoad]=useState(true);const[dbErr,sDbErr]=useState("");
  const[budget,sBudget]=useState(()=>LS.get("gulak_budget",500));
  const[profile,sProfRaw]=useState(()=>LS.get("gulak_profile",DEF_PROFILE));
  const[customCats,sCats]=useState(()=>LS.get("gulak_custom_cats",[]));
  const[editTarget,sET]=useState(null);const[toast,sToast]=useState(null);const[delId,sDel]=useState(null);const[alert,sAlert]=useState(null);
  const[dark,setDark]=useState(()=>LS.get("gulak_dark",true));
  const T=dark?DARK:LIGHT;
  const didLoad=useRef(false);

  useEffect(()=>{
    Promise.all([sb.all(),sb.getSettings()]).then(([rows,settings])=>{
      sTxns(rows);
      if(settings){sProfRaw(p=>{const m={...p,username:settings.username||p.username,password:settings.password||p.password,displayName:settings.display_name||p.displayName||""};LS.set("gulak_profile",m);return m;});if(settings.budget)sBudget(Number(settings.budget));}
      didLoad.current=true;sLoad(false);
    }).catch(e=>{sDbErr(e.message);sLoad(false);});
  },[]);

  useEffect(()=>{LS.set("gulak_dark",dark);},[dark]);
  useEffect(()=>{LS.set("gulak_custom_cats",customCats);},[customCats]);
  useEffect(()=>{LS.set("gulak_budget",budget);if(!didLoad.current)return;sb.saveSettings({budget,username:profile.username,password:profile.password,display_name:profile.displayName||profile.username}).catch(()=>{});},[budget]);

  const setProfile=fn=>{sProfRaw(p=>{const next=typeof fn==="function"?fn(p):fn;LS.set("gulak_profile",next);sb.saveSettings({budget,username:next.username,password:next.password,display_name:next.displayName||next.username}).catch(()=>{});return next;});};
  const toast2=(msg,type="ok")=>{sToast({msg,type});setTimeout(()=>sToast(null),2800);};
  const handleAdd=async t=>{try{const s=await sb.insert(t);sTxns(p=>[s,...p]);toast2("Saved ✓");}catch{toast2("Save failed","err");}};
  const handleUpdate=async t=>{try{await sb.update(t);sTxns(p=>p.map(x=>x.id===t.id?t:x));sET(null);sTab("dashboard");toast2("Updated ✓");}catch{toast2("Failed","err");}};
  const handleEdit=t=>{sET(t);sTab("entry");};
  const handleDelete=async()=>{try{await sb.remove(delId);sTxns(p=>p.filter(t=>t.id!==delId));sDel(null);toast2("Deleted","err");}catch{toast2("Failed","err");}};
  const clearData=async()=>{if(!window.confirm("Delete ALL transactions?"))return;try{await sb.clearAll();sTxns([]);toast2("Cleared","err");}catch{toast2("Failed","err");}};
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const dn=profile.displayName||profile.username;

  if(loading)return(<div style={{minHeight:"100vh",background:"#1a1a14",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Inter',sans-serif"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{width:36,height:36,border:"3px solid #38382c",borderTop:"3px solid #c8a84b",borderRadius:"50%",animation:"spin .7s linear infinite"}}/><div style={{fontSize:13,color:"#88887c"}}>Connecting…</div></div>);
  if(dbErr)return(<div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Inter',sans-serif"}}><div style={{maxWidth:440,background:T.surf,border:`1px solid ${T.redBord}`,borderRadius:18,padding:36}}><div style={{fontSize:16,fontWeight:800,color:T.red,marginBottom:10}}>Database error</div><div style={{fontSize:13.5,color:T.sub,lineHeight:1.75}}>{dbErr}</div></div></div>);

  return(
    <div style={{width:"100%",minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Inter',system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
      <G T={T}/>
      {!loggedIn&&<div style={{position:"fixed",inset:0,zIndex:100}}><Login onLogin={()=>sLI(true)} profile={profile} T={T}/></div>}
      {alert&&<BudgetAlert {...alert} T={T}/>}
      {toast&&<div style={{position:"fixed",top:18,right:18,zIndex:200,background:T.surf,border:`1px solid ${toast.type==="err"?T.redBord:T.goldBord}`,borderRadius:11,padding:"12px 20px",color:toast.type==="err"?T.red:T.gold,fontSize:14,fontWeight:600,boxShadow:T.shadowLg,animation:"fadeIn .25s both"}}>{toast.msg}</div>}
      {delId!==null&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:150,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{background:T.surf,border:`1px solid ${T.bord}`,borderRadius:16,padding:28,width:320,textAlign:"center",boxShadow:T.shadowLg}}><div style={{fontSize:16,fontWeight:800,color:T.text,marginBottom:8}}>Delete transaction?</div><div style={{fontSize:14,color:T.sub,marginBottom:22}}>This cannot be undone.</div><div style={{display:"flex",gap:10}}><button onClick={()=>sDel(null)} style={{flex:1,background:T.raised,border:`1px solid ${T.bord}`,borderRadius:9,padding:"11px",color:T.sub,fontFamily:"inherit",fontSize:14}}>Cancel</button><button onClick={handleDelete} style={{flex:1,background:T.redBg,border:`1px solid ${T.redBord}`,borderRadius:9,padding:"11px",color:T.red,fontWeight:700,fontFamily:"inherit",fontSize:14}}>Delete</button></div></div></div>}
      {loggedIn&&<>
        <TopBar view={view} setView={sView} setTab={t=>{sTab(t);if(t!=="entry")sET(null);}} profile={profile} dark={dark} toggleDark={()=>setDark(d=>!d)} budget={budget} tSpend={tSpend} T={T} onAdd={()=>{sET(null);sTab("entry");}}/>
        <div style={{flex:1,width:"100%",padding:"28px 32px",boxSizing:"border-box"}}>
          {tab==="dashboard"&&<Dashboard txns={txns} budget={budget} name={dn} T={T} view={view} onEdit={handleEdit} onDelete={sDel} customCats={customCats}/>}
          {tab==="monthly"&&<Monthly txns={txns} budget={budget} T={T} view={view}/>}
          {tab==="budget"&&<Budget txns={txns} budget={budget} setBudget={sBudget} T={T}/>}
          {tab==="entry"&&<NewEntry txns={txns} editTarget={editTarget} onAdd={handleAdd} onUpdate={handleUpdate} onCancel={()=>{sET(null);sTab("dashboard");}} budget={budget} setAlert={sAlert} T={T} customCats={customCats} view={view}/>}
          {(tab==="profile"||tab==="settings")&&<ProfilePage profile={profile} setProfile={setProfile} onLogout={()=>sLI(false)} onClear={clearData} T={T} customCats={customCats} setCustomCats={sCats}/>}
        </div>
      </>}
    </div>
  );
}