import React, { useState, useMemo, useEffect, useRef } from "react";

// ─── CONFIG — paste your Supabase keys here ───────────────────────────────────
const SUPA_URL = "https://fxnfnxfjuwwoxwzlabix.supabase.co";
const SUPA_KEY = "sb_publishable_Jpkmj4u-EUSEOcKWaAcRBw_ma4pROXy";

// ─── Supabase REST helper ─────────────────────────────────────────────────────
const sb = {
  headers: {
    "Content-Type": "application/json",
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${SUPA_KEY}`,
  },
  url: (path, qs="") => `${SUPA_URL}/rest/v1/${path}${qs}`,

  async all() {
    const r = await fetch(sb.url("transactions","?order=created_at.desc"), { headers:{...sb.headers,"Prefer":"return=representation"} });
    if(!r.ok) throw new Error(await r.text());
    const rows = await r.json();
    return rows.map(r=>({ id:r.id, date:r.date, description:r.description, category:r.category, method:r.method, type:r.type, amount:Number(r.amount) }));
  },

  async insert(t) {
    const r = await fetch(sb.url("transactions"), { method:"POST", headers:{...sb.headers,"Prefer":"return=representation"}, body:JSON.stringify({date:t.date,description:t.description,category:t.category,method:t.method,type:t.type,amount:t.amount}) });
    if(!r.ok) throw new Error(await r.text());
    const [row] = await r.json();
    return { id:row.id, date:row.date, description:row.description, category:row.category, method:row.method, type:row.type, amount:Number(row.amount) };
  },

  async update(t) {
    const r = await fetch(sb.url("transactions",`?id=eq.${t.id}`), { method:"PATCH", headers:{...sb.headers,"Prefer":"return=representation"}, body:JSON.stringify({date:t.date,description:t.description,category:t.category,method:t.method,type:t.type,amount:t.amount}) });
    if(!r.ok) throw new Error(await r.text());
  },

  async remove(id) {
    const r = await fetch(sb.url("transactions",`?id=eq.${id}`), { method:"DELETE", headers:sb.headers });
    if(!r.ok) throw new Error(await r.text());
  },

  async clearAll() {
    const r = await fetch(sb.url("transactions","?id=gte.0"), { method:"DELETE", headers:sb.headers });
    if(!r.ok) throw new Error(await r.text());
  },

  // Settings (profile + budget) — single row with id=1
  async getSettings() {
    const r = await fetch(sb.url("settings","?id=eq.1"), { headers:sb.headers });
    if(!r.ok) throw new Error(await r.text());
    const rows = await r.json();
    console.log("getSettings result:", rows);
    return rows[0] || null;
  },

  async saveSettings(data) {
    // DELETE then INSERT — most reliable approach
    await fetch(sb.url("settings","?id=eq.1"), { method:"DELETE", headers:sb.headers });
    const r = await fetch(sb.url("settings"), {
      method:"POST",
      headers:{...sb.headers,"Prefer":"return=representation"},
      body:JSON.stringify({id:1, ...data})
    });
    if(!r.ok){ const t=await r.text(); console.error("saveSettings failed:",t); throw new Error(t); }
    console.log("saveSettings OK", data);
  },
};

// ─── localStorage — profile & budget only ────────────────────────────────────
const LS = {
  get:(k,fb)=>{ try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch{return fb;} },
  set:(k,v)=>{ try{localStorage.setItem(k,JSON.stringify(v));}catch{} },
};

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

// Palette — 2 colours: near-black + electric violet
const V="#7C3AED", VL="#8B5CF6", VD="#5B21B6", VG="rgba(124,58,237,.12)";
const C={
  bg:"#07080a", surf:"#0f1117", raised:"#141720",
  bord:"#1c1f2e", bord2:"#252a3a",
  text:"#f1f3f9", sub:"#8892a4", dim:"#3a4259",
  green:"#22d3a0", red:"#f43f5e", orange:"#f97316", yellow:"#fbbf24",
};

const css=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:${C.bord2};border-radius:99px;}
select option{background:${C.raised};}
input[type=number]{-moz-appearance:textfield;appearance:textfield;}
input[type=number]::-webkit-outer-spin-button,
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;display:none;}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.fu{animation:fadeUp .32s cubic-bezier(.16,1,.3,1) both;}
.fi{animation:fadeIn .25s ease both;}
.nav-item:hover{background:${VG}!important;color:${V}!important;}
.lift:hover{transform:translateY(-2px);border-color:${C.bord2}!important;}
.row-hover:hover{background:rgba(124,58,237,.05)!important;}
.ghost:hover{background:${VG}!important;color:${V}!important;border-color:rgba(124,58,237,.3)!important;}
.cal-cell:hover{border-color:${V}!important;}
input:focus,select:focus{outline:none;border-color:${V}!important;box-shadow:0 0 0 3px rgba(124,58,237,.15)!important;}
`;

const S={
  card:{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:14,padding:"20px 22px",transition:"border-color .2s, transform .2s"},
  inp:{width:"100%",background:C.raised,border:`1px solid ${C.bord}`,borderRadius:9,padding:"11px 14px",color:C.text,fontSize:13.5,outline:"none",fontFamily:"inherit",transition:"border-color .2s, box-shadow .2s"},
  sel:{width:"100%",background:C.raised,border:`1px solid ${C.bord}`,borderRadius:9,padding:"11px 14px",color:C.text,fontSize:13.5,outline:"none",fontFamily:"inherit",cursor:"pointer",transition:"border-color .2s, box-shadow .2s"},
  lbl:{fontSize:11,fontWeight:600,color:C.sub,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8,display:"block"},
  sech:{fontSize:11,fontWeight:600,color:C.sub,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:18},
};

function Bar({value,max,color=V,h=4,anim=true}){
  const [w,setW]=useState(anim?0:pct(value,max));
  useEffect(()=>{if(anim){const t=setTimeout(()=>setW(pct(value,max)),80);return()=>clearTimeout(t);}},[value,max]);
  return(
    <div style={{background:C.bord,borderRadius:99,height:h,overflow:"hidden"}}>
      <div style={{width:(anim?w:pct(value,max))+"%",height:"100%",background:color,borderRadius:99,transition:anim?"width .65s cubic-bezier(.16,1,.3,1)":"none"}}/>
    </div>
  );
}

function Card({label,value,sub,accent,bar,barMax,style:extra}){
  return(
    <div className="lift" style={{...S.card,...extra}}>
      <div style={S.sech}>{label}</div>
      <div style={{fontSize:22,fontWeight:700,color:accent,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:sub?6:0}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:C.dim}}>{sub}</div>}
      {bar!=null&&<div style={{marginTop:8}}><Bar value={bar} max={barMax} color={accent}/></div>}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({onLogin,profile}){
  const [u,sU]=useState(""); const [p,sP]=useState("");
  const [err,sE]=useState(""); const [show,sS]=useState(false); const [load,sL]=useState(false);
  const go=()=>{
    if(!u||!p)return; sL(true);
    setTimeout(()=>{
      if(u===profile.username&&p===profile.password) onLogin();
      else{sE("Incorrect credentials.");sL(false);}
    },400);
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 55% 45% at 65% 15%, rgba(124,58,237,.2) 0%, transparent 55%), radial-gradient(ellipse 40% 35% at 15% 85%, rgba(124,58,237,.1) 0%, transparent 55%)",pointerEvents:"none"}}/>
      <div className="fu" style={{width:400,background:C.surf,border:`1px solid ${C.bord}`,borderRadius:20,padding:"44px 40px",boxShadow:"0 40px 100px rgba(0,0,0,.6)"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          {profile.photo
            ?<img src={profile.photo} alt="" style={{width:60,height:60,borderRadius:14,objectFit:"cover",border:`2px solid ${V}`,margin:"0 auto 14px",display:"block"}}/>
            :<div style={{width:60,height:60,borderRadius:14,background:VG,border:`1px solid rgba(124,58,237,.25)`,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </div>
          }
          <div style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.03em"}}>Gulak</div>
          <div style={{fontSize:12.5,color:C.sub,marginTop:4}}>Personal finance tracker</div>
        </div>
        {err&&<div style={{background:"rgba(244,63,94,.08)",border:"1px solid rgba(244,63,94,.2)",borderRadius:8,padding:"10px 14px",color:"#fda4af",fontSize:13,marginBottom:16}}>{err}</div>}
        <div style={{marginBottom:14}}>
          <label style={S.lbl}>Username</label>
          <input value={u} onChange={e=>sU(e.target.value)} placeholder="Enter username" style={S.inp} onKeyDown={e=>e.key==="Enter"&&go()}/>
        </div>
        <div style={{marginBottom:24,position:"relative"}}>
          <label style={S.lbl}>Password</label>
          <input value={p} onChange={e=>sP(e.target.value)} type={show?"text":"password"} placeholder="Enter password" style={{...S.inp,paddingRight:52}} onKeyDown={e=>e.key==="Enter"&&go()}/>
          <button onClick={()=>sS(!show)} style={{position:"absolute",right:13,bottom:12,background:"none",border:"none",color:C.sub,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase"}}>{show?"Hide":"Show"}</button>
        </div>
        <button onClick={go} disabled={load||!u||!p} style={{width:"100%",background:load||!u||!p?C.raised:`linear-gradient(135deg,${VL},${VD})`,border:"none",borderRadius:9,padding:"12px",color:load||!u||!p?C.dim:C.text,fontWeight:600,fontSize:13.5,cursor:load||!u||!p?"not-allowed":"pointer",fontFamily:"inherit",transition:"all .25s",letterSpacing:"0.01em"}}>
          {load?"Signing in...":"Sign In"}
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({txns,budget,name}){
  const cred=txns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const deb=txns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const bal=cred-deb;
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const bp=pct(tSpend,budget);
  const bc=bp>=100?C.red:bp>=80?C.orange:C.green;
  const h=new Date().getHours();
  const greet=h<12?"Good morning":h<17?"Good afternoon":"Good evening";

  if(!txns.length) return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:10,textAlign:"center"}}>
      <div style={{width:64,height:64,borderRadius:16,background:VG,border:`1px solid rgba(124,58,237,.2)`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>
      </div>
      <div style={{fontSize:20,fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>No transactions yet</div>
      <div style={{fontSize:13.5,color:C.sub,maxWidth:280,lineHeight:1.65}}>Use <span style={{color:V,fontWeight:600}}>New Entry</span> in the sidebar to record your first transaction.</div>
    </div>
  );

  const cats=useMemo(()=>{const m={};txns.filter(t=>t.type==="debit").forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[txns]);
  const mets=useMemo(()=>{const m={};txns.forEach(t=>{m[t.method]=(m[t.method]||0)+t.amount;});return Object.entries(m).sort((a,b)=>b[1]-a[1]);},[txns]);
  const bars=useMemo(()=>{const m={};txns.forEach(t=>{if(!m[t.date])m[t.date]={c:0,d:0};m[t.date][t.type==="credit"?"c":"d"]+=t.amount;});return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(-8);},[txns]);
  const maxB=bars.reduce((m,[,v])=>Math.max(m,v.c,v.d),1);
  const recent=[...txns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}} className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:24,fontWeight:700,color:C.text,letterSpacing:"-0.03em"}}>{greet}, {name}</div>
          <div style={{fontSize:13,color:C.sub,marginTop:4}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div style={{background:VG,border:`1px solid rgba(124,58,237,.25)`,borderRadius:12,padding:"12px 20px",textAlign:"right"}}>
          <div style={S.sech}>Net Balance</div>
          <div style={{fontSize:24,fontWeight:700,color:bal>=0?C.green:C.red,letterSpacing:"-0.04em",marginTop:2}}>{fmt(bal)}</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <Card label="Total Income" value={fmt(cred)} sub={`${txns.filter(t=>t.type==="credit").length} transactions`} accent={C.green}/>
        <Card label="Total Expenses" value={fmt(deb)} sub={`${txns.filter(t=>t.type==="debit").length} transactions`} accent={C.red}/>
        <Card label="Spent Today" value={fmt(tSpend)} sub={budget>0?`${bp}% of limit`:"No budget set"} accent={bc} bar={tSpend} barMax={budget||tSpend}/>
        <Card label="Saved Today" value={fmt(Math.max(0,budget-tSpend))} sub={budget>0?"Remaining today":"Set a daily budget"} accent={V}/>
      </div>

      {budget>0&&(
        <div style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:600,color:C.text}}>Daily Budget</div>
              <div style={{fontSize:12,color:C.sub,marginTop:2}}>Limit {fmt(budget)} &nbsp;·&nbsp; Spent {fmt(tSpend)} &nbsp;·&nbsp; Remaining {fmt(Math.max(0,budget-tSpend))}</div>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:bc,letterSpacing:"-0.02em"}}>{bp}%</div>
          </div>
          <Bar value={tSpend} max={budget} color={bp>=100?C.red:bp>=80?C.orange:V} h={6}/>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:14}}>
        <div style={S.card}>
          <div style={S.sech}>Daily Flow — Last 8 Days</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:110}}>
            {bars.map(([date,val])=>(
              <div key={date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:92}}>
                  <div style={{flex:1,background:C.green,borderRadius:"3px 3px 0 0",opacity:.8,height:Math.round(val.c/maxB*100)+"%",minHeight:val.c?3:0,transition:"height .55s"}}/>
                  <div style={{flex:1,background:V,borderRadius:"3px 3px 0 0",opacity:.8,height:Math.round(val.d/maxB*100)+"%",minHeight:val.d?3:0,transition:"height .55s"}}/>
                </div>
                <span style={{fontSize:9,color:C.dim}}>{date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:14,marginTop:12,paddingTop:12,borderTop:`1px solid ${C.bord}`}}>
            {[[C.green,"Income"],[V,"Expense"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:10,height:3,background:c,borderRadius:99}}/>
                <span style={{fontSize:11,color:C.sub}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.sech}>By Payment Method</div>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {mets.map(([m,a])=>{
              const col=MET_COLORS[m]||C.sub;
              return(
                <div key={m}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,color:C.text}}>{m}</span>
                    <span style={{fontSize:13,color:col,fontWeight:600}}>{fmt(a)}</span>
                  </div>
                  <Bar value={a} max={mets[0]?.[1]||1} color={col} h={3}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={S.card}>
          <div style={S.sech}>Top Spending Categories</div>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {cats.slice(0,5).map(([cat,amt])=>{
              const col=CAT_COLORS[cat]||C.sub;
              return(
                <div key={cat}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:3,height:14,background:col,borderRadius:99}}/>
                      <span style={{fontSize:13,color:C.text}}>{cat}</span>
                    </div>
                    <span style={{fontSize:13,color:col,fontWeight:600}}>{fmt(amt)}</span>
                  </div>
                  <Bar value={amt} max={cats[0]?.[1]||1} color={col} h={3}/>
                </div>
              );
            })}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.sech}>Recent Activity</div>
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            {recent.map(t=>{
              const col=CAT_COLORS[t.category]||C.sub;
              return(
                <div key={t.id} className="row-hover" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 8px",borderRadius:9,transition:"background .15s"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:col,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:13,color:C.text,fontWeight:500,lineHeight:1.2}}>{t.description}</div>
                      <div style={{fontSize:11,color:C.dim,marginTop:1}}>{t.date} · {t.method}</div>
                    </div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:t.type==="credit"?C.green:C.red,flexShrink:0,marginLeft:10,letterSpacing:"-0.01em"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MONTHLY VIEW ─────────────────────────────────────────────────────────────
function Monthly({txns,budget}){
  const now=new Date();
  const [year,sY]=useState(now.getFullYear());
  const [mon,sM]=useState(now.getMonth());
  const [sel,sSel]=useState(null);
  const mk=`${year}-${String(mon+1).padStart(2,"0")}`;
  const mt=useMemo(()=>txns.filter(t=>t.date.startsWith(mk)),[txns,mk]);
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

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}} className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>Monthly Report</div>
          <div style={{fontSize:13,color:C.sub,marginTop:3}}>Click any day for transaction details</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={prev} className="ghost" style={{background:"transparent",border:`1px solid ${C.bord}`,borderRadius:8,padding:"8px 14px",color:C.sub,cursor:"pointer",fontFamily:"inherit",fontSize:15,transition:"all .18s"}}>‹</button>
          <div style={{fontWeight:600,fontSize:15,color:C.text,minWidth:165,textAlign:"center",letterSpacing:"-0.01em"}}>{MONTHS[mon]} {year}</div>
          <button onClick={next} className="ghost" style={{background:"transparent",border:`1px solid ${C.bord}`,borderRadius:8,padding:"8px 14px",color:C.sub,cursor:"pointer",fontFamily:"inherit",fontSize:15,transition:"all .18s"}}>›</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <Card label="Month Expenses" value={fmt(md)} accent={C.red}/>
        <Card label="Month Income"   value={fmt(mc)} accent={C.green}/>
        <Card label="Net"            value={fmt(mc-md)} accent={(mc-md)>=0?C.green:C.red}/>
        <Card label="Est. Savings"   value={budget>0?fmt(Math.max(0,budget*dim-md)):"Set budget"} accent={V}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:16}}>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:8}}>
            {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:10,color:C.dim,fontWeight:600,padding:"3px 0",letterSpacing:"0.05em"}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
            {weeks.flat().map((day,i)=>{
              if(!day)return<div key={`e${i}`}/>;
              const key=`${year}-${String(mon+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const data=dayMap[key];const spend=data?.d||0;
              const isSel=sel===day;const isToday=key===today();
              const over=budget>0&&spend>budget;const warn=budget>0&&spend>=budget*.8&&!over;
              const intensity=spend>0?clamp(spend/maxD,.15,1):0;
              const bg=spend>0?(over?`rgba(244,63,94,${intensity*.4})`:(warn?`rgba(249,115,22,${intensity*.38})`:`rgba(124,58,237,${intensity*.38})`)):"transparent";
              return(
                <div key={key} className="cal-cell" onClick={()=>sSel(isSel?null:day)}
                  style={{aspectRatio:"1",borderRadius:8,border:`1px solid ${isSel?V:isToday?`rgba(124,58,237,.45)`:spend>0?C.bord2:C.bord}`,background:isSel?VG:bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1.5,transition:"all .15s"}}>
                  <div style={{fontSize:11,fontWeight:isSel||isToday?700:400,color:isSel||isToday?V:C.text}}>{day}</div>
                  {spend>0&&<div style={{fontSize:8,fontWeight:600,color:over?C.red:warn?C.orange:V}}>{spend>=1000?(spend/1000).toFixed(1)+"k":spend}</div>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:14,marginTop:14,paddingTop:12,borderTop:`1px solid ${C.bord}`}}>
            {[[V,"Under budget"],[C.orange,"Near limit"],[C.red,"Over budget"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:10,height:3,background:c,borderRadius:99}}/>
                <span style={{fontSize:10.5,color:C.sub}}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sel&&(
            <div style={S.card}>
              <div style={{fontSize:11,fontWeight:600,color:V,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>{MONTHS[mon]} {sel}</div>
              {sd?(
                <>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    {[["Spent",sd.d,C.red],["Received",sd.c,C.green]].map(([l,v,c])=>(
                      <div key={l} style={{flex:1,background:C.raised,borderRadius:8,padding:"10px",textAlign:"center"}}>
                        <div style={{fontSize:10,color:C.sub,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase"}}>{l}</div>
                        <div style={{fontSize:14,fontWeight:700,color:c,marginTop:3,letterSpacing:"-0.02em"}}>{fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                  {sd.txns.map(t=>(
                    <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"8px",background:C.raised,borderRadius:8,marginBottom:4}}>
                      <div>
                        <div style={{fontSize:12,color:C.text,fontWeight:500}}>{t.description}</div>
                        <div style={{fontSize:10,color:C.dim,marginTop:2}}>{t.method}</div>
                      </div>
                      <span style={{fontSize:12,fontWeight:600,color:t.type==="credit"?C.green:C.red}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</span>
                    </div>
                  ))}
                </>
              ):<div style={{textAlign:"center",padding:"18px 0",color:C.dim,fontSize:13}}>No transactions</div>}
            </div>
          )}
          <div style={{...S.card,flex:1}}>
            <div style={S.sech}>Spending by Category</div>
            {catBreak.length===0
              ?<div style={{textAlign:"center",color:C.dim,fontSize:13,padding:"16px 0"}}>No spending this month</div>
              :catBreak.map(([cat,amt])=>{
                const col=CAT_COLORS[cat]||C.sub;
                return(
                  <div key={cat} style={{marginBottom:13}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:12.5,color:C.text}}>{cat}</span>
                      <span style={{fontSize:12.5,color:col,fontWeight:600}}>{fmt(amt)}</span>
                    </div>
                    <Bar value={amt} max={catBreak[0]?.[1]||1} color={col} h={3}/>
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

// ─── BUDGET PAGE ──────────────────────────────────────────────────────────────
function BudgetPage({txns,budget,setBudget}){
  const [input,sI]=useState(String(budget||""));
  const [saved,sS]=useState(false);
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
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}} className="fu">
      <div>
        <div style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>Budget & Savings</div>
        <div style={{fontSize:13,color:C.sub,marginTop:3}}>Set your daily limit and monitor your spending</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={S.card}>
          <div style={S.sech}>Daily Budget Limit</div>
          <label style={S.lbl}>Amount (₹)</label>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input type="text" inputMode="numeric" value={input} onChange={e=>sI(e.target.value.replace(/[^0-9.]/g,""))} placeholder="e.g. 500" style={S.inp}/>
            <button onClick={save} style={{background:saved?C.green:`linear-gradient(135deg,${VL},${VD})`,border:"none",borderRadius:9,padding:"11px 20px",color:saved?C.bg:C.text,fontWeight:600,cursor:"pointer",fontFamily:"inherit",fontSize:13,transition:"all .3s",whiteSpace:"nowrap",minWidth:100}}>
              {saved?"Saved":"Set Limit"}
            </button>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:C.sub,fontWeight:600,marginBottom:8,letterSpacing:"0.06em",textTransform:"uppercase"}}>Quick Presets</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[300,500,750,1000,1500,2000].map(v=>(
                <button key={v} onClick={()=>sI(String(v))} style={{background:input===String(v)?VG:C.raised,border:`1px solid ${input===String(v)?V:C.bord}`,borderRadius:7,padding:"6px 12px",color:input===String(v)?V:C.sub,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:500,transition:"all .2s"}}>{fmt(v)}</button>
              ))}
            </div>
          </div>
          {budget>0&&(
            <div style={{background:C.raised,borderRadius:10,padding:"14px 16px",borderLeft:`3px solid ${V}`}}>
              <div style={{fontSize:11,color:C.sub,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:10}}>Today</div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,color:C.text}}>Spent</span>
                <span style={{fontSize:14,fontWeight:700,color:tp>=100?C.red:tp>=80?C.orange:C.green,letterSpacing:"-0.02em"}}>{fmt(t?.spend||0)}</span>
              </div>
              <Bar value={t?.spend||0} max={budget} color={tp>=100?C.red:tp>=80?C.orange:V} h={5}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.dim,marginTop:6}}>
                <span>{tp}% used</span><span>Left: {fmt(Math.max(0,budget-(t?.spend||0)))}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Card label="Total Saved (30 days)" value={budget>0?fmt(totSaved):"—"} accent={V}/>
          <Card label="Average Daily Spend"   value={fmt(avg)} accent={C.yellow}/>
          <Card label="Days Under Budget"     value={budget>0?`${under} days`:"Set budget"} accent={C.green}/>
          <Card label="Days Over Budget"      value={budget>0?`${over} days`:"Set budget"} accent={over>5?C.red:C.orange}/>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sech}>Daily Spend — Last 30 Days</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:2,height:90}}>
          {l30.map(d=>{
            const h=Math.round(d.spend/maxS*100);
            const ov=budget>0&&d.spend>budget;const wn=budget>0&&d.spend>=budget*.8&&!ov;
            return(
              <div key={d.k} title={`${d.k}: ${fmt(d.spend)}`} style={{flex:1,display:"flex",alignItems:"flex-end",height:"100%"}}>
                <div style={{width:"100%",background:ov?C.red:wn?C.orange:d.spend>0?V:C.bord,borderRadius:"2px 2px 0 0",height:h+"%",minHeight:d.spend?2:0,opacity:.82,transition:"height .4s"}}/>
              </div>
            );
          })}
        </div>
        {budget>0&&<div style={{fontSize:11,color:V,marginTop:8,display:"flex",alignItems:"center",gap:6}}><div style={{width:14,borderTop:`1.5px dashed ${V}`}}/><span>Budget: {fmt(budget)}</span></div>}
      </div>
      {budget>0&&(
        <div style={S.card}>
          <div style={S.sech}>Daily Savings — Last 14 Days</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
            {l30.slice(-14).map(d=>{
              const sv=Math.max(0,budget-d.spend);const ov=d.spend>budget?d.spend-budget:0;
              return(
                <div key={d.k} style={{background:C.raised,borderRadius:9,padding:"10px 8px",textAlign:"center",border:`1px solid ${ov>0?"rgba(244,63,94,.2)":sv>0?"rgba(124,58,237,.2)":C.bord}`}}>
                  <div style={{fontSize:9,color:C.dim,marginBottom:4}}>{d.label}</div>
                  {d.spend===0?<div style={{fontSize:11,color:C.dim}}>—</div>
                    :ov>0?<><div style={{fontSize:8.5,color:C.red,fontWeight:600,letterSpacing:"0.05em"}}>OVER</div><div style={{fontSize:11,fontWeight:700,color:C.red}}>-{fmt(ov)}</div></>
                    :<><div style={{fontSize:8.5,color:V,fontWeight:600,letterSpacing:"0.05em"}}>SAVED</div><div style={{fontSize:11,fontWeight:700,color:V}}>{fmt(sv)}</div></>
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
function Transactions({txns,onEdit,onDelete}){
  const [fT,sfT]=useState("all");const [fM,sfM]=useState("all");
  const [fC,sfC]=useState("all");const [sr,sSr]=useState("");
  const list=useMemo(()=>txns.filter(t=>{
    if(fT!=="all"&&t.type!==fT)return false;
    if(fM!=="all"&&t.method!==fM)return false;
    if(fC!=="all"&&t.category!==fC)return false;
    if(sr&&!t.description.toLowerCase().includes(sr.toLowerCase()))return false;
    return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)),[txns,fT,fM,fC,sr]);
  const dirty=sr||fT!=="all"||fM!=="all"||fC!=="all";
  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}} className="fu">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>Transactions</div>
          <div style={{fontSize:13,color:C.sub,marginTop:3}}>{list.length} of {txns.length} entries</div>
        </div>
      </div>
      <div style={{...S.card,padding:"14px 18px",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
        <input value={sr} onChange={e=>sSr(e.target.value)} placeholder="Search..." style={{...S.inp,width:200,padding:"9px 14px",fontSize:13}}/>
        {[
          {v:fT,s:sfT,o:["all","debit","credit"],l:["All Types","Expense","Income"]},
          {v:fM,s:sfM,o:["all",...METHODS],l:["All Methods",...METHODS]},
          {v:fC,s:sfC,o:["all",...CATEGORIES],l:["All Categories",...CATEGORIES]},
        ].map((f,i)=>(
          <select key={i} value={f.v} onChange={e=>f.s(e.target.value)} style={{...S.sel,width:"auto",padding:"9px 12px",fontSize:13}}>
            {f.o.map((o,j)=><option key={o} value={o}>{f.l[j]}</option>)}
          </select>
        ))}
        {dirty&&<button onClick={()=>{sSr("");sfT("all");sfM("all");sfC("all");}} style={{background:"rgba(244,63,94,.07)",border:"1px solid rgba(244,63,94,.18)",borderRadius:8,padding:"9px 14px",color:C.red,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:500}}>Clear</button>}
      </div>
      <div style={{...S.card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:C.raised,borderBottom:`1px solid ${C.bord}`}}>
                {["Date","Description","Category","Method","","Amount",""].map((h,i)=>(
                  <th key={i} style={{padding:"12px 16px",textAlign:"left",color:C.dim,fontWeight:600,fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!list.length&&<tr><td colSpan={7} style={{padding:"48px",textAlign:"center",color:C.dim,fontSize:13}}>No results</td></tr>}
              {list.map(t=>{
                const cc=CAT_COLORS[t.category]||C.sub;
                const mc=MET_COLORS[t.method]||C.sub;
                return(
                  <tr key={t.id} className="row-hover" style={{borderBottom:`1px solid ${C.bord}`,transition:"background .15s"}}>
                    <td style={{padding:"11px 16px",color:C.sub,whiteSpace:"nowrap",fontSize:11.5}}>{t.date}</td>
                    <td style={{padding:"11px 16px",color:C.text,fontWeight:500}}>{t.description}</td>
                    <td style={{padding:"11px 16px"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,color:cc}}><span style={{width:5,height:5,background:cc,borderRadius:"50%",display:"inline-block"}}/>{t.category}</span></td>
                    <td style={{padding:"11px 16px"}}><span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,color:mc}}><span style={{width:5,height:5,background:mc,borderRadius:"50%",display:"inline-block"}}/>{t.method}</span></td>
                    <td style={{padding:"11px 16px"}}><span style={{fontSize:10,fontWeight:600,color:t.type==="credit"?C.green:C.red,letterSpacing:"0.06em",textTransform:"uppercase"}}>{t.type==="credit"?"In":"Out"}</span></td>
                    <td style={{padding:"11px 16px",fontWeight:700,color:t.type==="credit"?C.green:C.red,whiteSpace:"nowrap",letterSpacing:"-0.02em"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</td>
                    <td style={{padding:"11px 16px"}}>
                      <div style={{display:"flex",gap:5}}>
                        <button onClick={()=>onEdit(t)} style={{background:VG,border:`1px solid rgba(124,58,237,.2)`,borderRadius:6,padding:"5px 11px",color:V,cursor:"pointer",fontSize:11,fontFamily:"inherit",fontWeight:500}}>Edit</button>
                        <button onClick={()=>onDelete(t.id)} style={{background:"rgba(244,63,94,.07)",border:"1px solid rgba(244,63,94,.15)",borderRadius:6,padding:"5px 10px",color:C.red,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Delete</button>
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

// ─── NEW ENTRY ────────────────────────────────────────────────────────────────
const emptyForm=()=>({date:today(),description:"",category:"Food & Dining",method:"UPI",type:"debit",amount:""});

function BudgetModal({spent,budget,pending,onConfirm,onCancel}){
  const p2=Math.round(spent/budget*100);const over=spent>=budget;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.surf,border:`1px solid ${over?"rgba(244,63,94,.3)":"rgba(249,115,22,.3)"}`,borderRadius:16,padding:32,width:380}}>
        <div style={{fontSize:14,fontWeight:700,color:over?C.red:C.orange,marginBottom:8}}>{over?"Budget exceeded":"Approaching limit"}</div>
        <div style={{fontSize:13,color:C.sub,lineHeight:1.65,marginBottom:18}}>
          {over?`You've spent ${fmt(spent)} of your ${fmt(budget)} limit. Adding ${fmt(pending)} puts you ${fmt(spent+pending-budget)} over.`
               :`${p2}% used (${fmt(spent)} of ${fmt(budget)}). Adding ${fmt(pending)} takes today to ${fmt(spent+pending)}.`}
        </div>
        <Bar value={spent+pending} max={budget} color={over?C.red:C.orange} h={4}/>
        <div style={{display:"flex",gap:10,marginTop:18}}>
          <button onClick={onCancel} style={{flex:1,background:"transparent",border:`1px solid ${C.bord}`,borderRadius:8,padding:"11px",color:C.sub,cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13}}>Go back</button>
          <button onClick={onConfirm} style={{flex:1,background:over?"rgba(244,63,94,.1)":VG,border:`1px solid ${over?"rgba(244,63,94,.25)":`rgba(124,58,237,.25)`}`,borderRadius:8,padding:"11px",color:over?C.red:V,cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:13}}>Add anyway</button>
        </div>
      </div>
    </div>
  );
}

function NewEntry({txns,onAdd,onUpdate,editTarget,onCancel,budget,setAlert}){
  const [form,sF]=useState(emptyForm());
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
  return(
    <div style={{display:"flex",gap:24,alignItems:"flex-start"}} className="fu">
      <div style={{flex:"0 0 480px"}}>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>{editTarget?"Edit Transaction":"New Entry"}</div>
          <div style={{fontSize:13,color:C.sub,marginTop:3}}>{editTarget?"Update the transaction details":"Record an income or expense"}</div>
        </div>
        <div style={S.card}>
          <div style={{marginBottom:22}}>
            <label style={S.lbl}>Type</label>
            <div style={{display:"flex",background:C.raised,borderRadius:10,padding:4,gap:4}}>
              {["debit","credit"].map(t=>(
                <button key={t} onClick={()=>sF({...form,type:t})} style={{flex:1,padding:"10px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,transition:"all .2s",background:form.type===t?(t==="debit"?"rgba(244,63,94,.1)":VG):"transparent",color:form.type===t?(t==="debit"?C.red:V):C.sub}}>
                  {t==="debit"?"Expense":"Income"}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div><label style={S.lbl}>Date</label><input type="date" value={form.date} onChange={e=>sF({...form,date:e.target.value})} style={S.inp}/></div>
            <div><label style={S.lbl}>Amount (₹)</label><input type="text" inputMode="numeric" value={form.amount} onChange={e=>sF({...form,amount:e.target.value.replace(/[^0-9.]/g,"")})} placeholder="0" style={S.inp}/></div>
          </div>
          <div style={{marginBottom:16}}><label style={S.lbl}>Description</label><input value={form.description} onChange={e=>sF({...form,description:e.target.value})} placeholder="e.g. Zomato, Salary, Rent..." style={S.inp}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:warn?16:22}}>
            <div><label style={S.lbl}>Category</label><select value={form.category} onChange={e=>sF({...form,category:e.target.value})} style={S.sel}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div><label style={S.lbl}>Payment Method</label><select value={form.method} onChange={e=>sF({...form,method:e.target.value})} style={S.sel}>{METHODS.map(m=><option key={m} value={m}>{m}</option>)}</select></div>
          </div>
          {warn&&(
            <div style={{background:warn.over?"rgba(244,63,94,.07)":VG,border:`1px solid ${warn.over?"rgba(244,63,94,.2)":`rgba(124,58,237,.2)`}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}>
              <div style={{fontSize:12,fontWeight:600,color:warn.over?C.red:V,marginBottom:2}}>{warn.over?"Over budget":"Near your limit"}</div>
              <div style={{fontSize:12,color:C.sub}}>Today's total will be {fmt(warn.total)} ({warn.p2}% of {fmt(budget)})</div>
            </div>
          )}
          {valid&&(
            <div style={{background:C.raised,borderRadius:10,padding:"13px 16px",marginBottom:18,borderLeft:`3px solid ${V}`}}>
              <div style={{fontSize:10,color:C.sub,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Preview</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:600,color:C.text,fontSize:13}}>{form.description}</div>
                  <div style={{fontSize:11,color:C.dim,marginTop:2}}>{form.category} · {form.method} · {form.date}</div>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:form.type==="credit"?C.green:C.red,letterSpacing:"-0.03em"}}>{form.type==="credit"?"+":"-"}{fmt(form.amount)}</div>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button onClick={attempt} disabled={!valid} style={{flex:1,background:valid?`linear-gradient(135deg,${VL},${VD})`:C.raised,border:"none",borderRadius:9,padding:"12px",color:valid?C.text:C.dim,fontWeight:600,fontSize:14,cursor:valid?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .25s",letterSpacing:"0.01em"}}>
              {editTarget?"Save Changes":"Add Transaction"}
            </button>
            {editTarget&&<button onClick={onCancel} style={{background:"transparent",border:`1px solid ${C.bord}`,borderRadius:9,padding:"12px 18px",color:C.sub,cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13}}>Cancel</button>}
          </div>
        </div>
      </div>
      <div style={{flex:1}}>
        <div style={S.sech}>Recent Entries</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[...txns].reverse().slice(0,8).map(t=>(
            <div key={t.id} style={{...S.card,padding:"11px 15px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:3,height:30,background:CAT_COLORS[t.category]||C.sub,borderRadius:99,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:12.5,color:C.text,fontWeight:500}}>{t.description}</div>
                    <div style={{fontSize:10.5,color:C.dim,marginTop:2}}>{t.date} · {t.category}</div>
                  </div>
                </div>
                <div style={{fontSize:13,fontWeight:600,color:t.type==="credit"?C.green:C.red,letterSpacing:"-0.02em"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function ProfilePage({profile,setProfile,onLogout,onClear}){
  const [form,sF]=useState({username:profile.username,password:"",confirm:"",displayName:profile.displayName||""});
  const [saved,sS]=useState(false);const [err,sE]=useState("");
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
  return(
    <div style={{display:"flex",flexDirection:"column",gap:20,maxWidth:600}} className="fu">
      <div>
        <div style={{fontSize:22,fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>Profile & Settings</div>
        <div style={{fontSize:13,color:C.sub,marginTop:3}}>Update your photo, name, and credentials</div>
      </div>
      <div style={S.card}>
        <div style={S.sech}>Profile Photo</div>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{width:76,height:76,borderRadius:16,overflow:"hidden",background:C.raised,border:`1px solid ${C.bord2}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {profile.photo
              ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              :<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            }
          </div>
          <div>
            <input type="file" accept="image/*" ref={fileRef} onChange={handlePhoto} style={{display:"none"}}/>
            <button onClick={()=>fileRef.current.click()} style={{background:VG,border:`1px solid rgba(124,58,237,.25)`,borderRadius:8,padding:"9px 16px",color:V,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:13,display:"block",marginBottom:8}}>Upload Photo</button>
            {profile.photo&&<button onClick={()=>setProfile(p=>({...p,photo:null}))} style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontFamily:"inherit",fontSize:12,padding:0}}>Remove photo</button>}
            <div style={{fontSize:11,color:C.dim,marginTop:4}}>Stored locally in your browser.</div>
          </div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.sech}>Account</div>
        {err&&<div style={{background:"rgba(244,63,94,.07)",border:"1px solid rgba(244,63,94,.2)",borderRadius:8,padding:"10px 14px",color:"#fda4af",fontSize:13,marginBottom:14}}>{err}</div>}
        {saved&&<div style={{background:"rgba(34,211,160,.07)",border:"1px solid rgba(34,211,160,.2)",borderRadius:8,padding:"10px 14px",color:C.green,fontSize:13,marginBottom:14}}>Changes saved.</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div><label style={S.lbl}>Display Name</label><input value={form.displayName} onChange={e=>sF({...form,displayName:e.target.value})} placeholder="How you want to be greeted" style={S.inp}/></div>
          <div><label style={S.lbl}>Username</label><input value={form.username} onChange={e=>sF({...form,username:e.target.value})} placeholder="Login username" style={S.inp}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
          <div><label style={S.lbl}>New Password</label><input type="password" value={form.password} onChange={e=>sF({...form,password:e.target.value})} placeholder="Leave blank to keep current" style={S.inp}/></div>
          <div><label style={S.lbl}>Confirm Password</label><input type="password" value={form.confirm} onChange={e=>sF({...form,confirm:e.target.value})} placeholder="Repeat new password" style={S.inp}/></div>
        </div>
        <button onClick={save} style={{background:`linear-gradient(135deg,${VL},${VD})`,border:"none",borderRadius:9,padding:"11px 26px",color:C.text,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.01em"}}>Save Changes</button>
      </div>
      <div style={{...S.card,borderColor:"rgba(244,63,94,.2)"}}>
        <div style={{...S.sech,color:C.red}}>Danger Zone</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button onClick={onLogout} style={{background:"transparent",border:`1px solid ${C.bord}`,borderRadius:8,padding:"9px 18px",color:C.sub,cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13}}>Sign Out</button>
          <button onClick={onClear} style={{background:"rgba(244,63,94,.07)",border:"1px solid rgba(244,63,94,.18)",borderRadius:8,padding:"9px 18px",color:C.red,cursor:"pointer",fontFamily:"inherit",fontWeight:500,fontSize:13}}>Delete All Transactions</button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const DEFAULT_PROFILE={username:"admin",password:"admin123",displayName:"",photo:null};
const NAV=[
  {id:"dashboard",label:"Dashboard"},
  {id:"monthly",label:"Monthly"},
  {id:"budget",label:"Budget"},
  {id:"transactions",label:"Transactions"},
  {id:"entry",label:"New Entry"},
  {id:"profile",label:"Profile"},
];

export default function App(){
  const [loggedIn,sLI]=useState(false);
  const [tab,sTab]=useState("dashboard");
  const [txns,sTxns]=useState([]);
  const [loading,sLoad]=useState(true);
  const [dbErr,sDbErr]=useState("");
  const [budget,sBudget]=useState(()=>LS.get("gulak_budget",500));
  const [profile,sProfileRaw]=useState(()=>LS.get("gulak_profile",DEFAULT_PROFILE));
  const [editTarget,sET]=useState(null);
  const [toast,sToast]=useState(null);
  const [delId,sDel]=useState(null);
  const [alert,sAlert]=useState(null);

  // Load transactions + settings from Supabase on mount
  useEffect(()=>{
    Promise.all([sb.all(), sb.getSettings()])
      .then(([rows, settings])=>{
        sTxns(rows);
        if(settings){
          console.log("Applying settings from DB:", settings);
          sProfileRaw(p=>{
            const merged = {
              ...p,
              username: settings.username || p.username,
              password: settings.password || p.password,
              displayName: settings.display_name || p.displayName || "",
            };
            LS.set("gulak_profile", merged);
            console.log("Profile merged:", merged);
            return merged;
          });
          if(settings.budget) sBudget(Number(settings.budget));
        } else {
          console.log("No settings row found in DB");
        }
        didLoad.current = true;
        sLoad(false);
      })
      .catch(e=>{sDbErr(e.message);sLoad(false);});
  },[]);

  // Save budget to Supabase when it changes — but only after initial load
  const didLoad = React.useRef(false);
  useEffect(()=>{
    LS.set("gulak_budget",budget);
    if(!didLoad.current) return; // skip on first mount (loading from DB)
    sb.saveSettings({budget, username:profile.username, password:profile.password, display_name:profile.displayName||profile.username})
      .catch(()=>{});
  },[budget]);

  const setProfile=fn=>{
    sProfileRaw(p=>{
      const next=typeof fn==="function"?fn(p):fn;
      LS.set("gulak_profile",next);
      // Sync to Supabase (skip photo — too large)
      sb.saveSettings({
        username: next.username,
        password: next.password,
        display_name: next.displayName||next.username,
        budget: budget,
      }).catch(()=>{});
      return next;
    });
  };

  const toast2=(msg,type="ok")=>{sToast({msg,type});setTimeout(()=>sToast(null),2800);};

  const handleAdd=async t=>{
    try{const saved=await sb.insert(t);sTxns(p=>[saved,...p]);toast2("Transaction saved");}
    catch(e){toast2("Save failed: "+e.message,"err");}
  };
  const handleUpdate=async t=>{
    try{await sb.update(t);sTxns(p=>p.map(x=>x.id===t.id?t:x));sET(null);toast2("Updated");}
    catch(e){toast2("Update failed: "+e.message,"err");}
  };
  const handleEdit=t=>{sET(t);sTab("entry");};
  const handleDelete=async()=>{
    try{await sb.remove(delId);sTxns(p=>p.filter(t=>t.id!==delId));sDel(null);toast2("Deleted","err");}
    catch(e){toast2("Delete failed: "+e.message,"err");}
  };
  const clearData=async()=>{
    if(!window.confirm("Delete ALL transactions? Cannot be undone."))return;
    try{await sb.clearAll();sTxns([]);toast2("All data cleared","err");}
    catch(e){toast2("Failed: "+e.message,"err");}
  };

  const dn=profile.displayName||profile.username;
  const tSpend=txns.filter(t=>t.type==="debit"&&t.date===today()).reduce((s,t)=>s+t.amount,0);
  const bp=pct(tSpend,budget);
  const bc=bp>=100?C.red:bp>=80?C.orange:V;

  if(loading) return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:36,height:36,border:`3px solid ${C.bord}`,borderTop:`3px solid ${V}`,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
      <div style={{fontSize:13,color:C.sub,letterSpacing:"0.02em"}}>Connecting to database...</div>
    </div>
  );

  if(dbErr) return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:500,background:C.surf,border:`1px solid rgba(244,63,94,.3)`,borderRadius:16,padding:36}}>
        <div style={{fontSize:15,fontWeight:700,color:C.red,marginBottom:10}}>Database not configured</div>
        <div style={{fontSize:13,color:C.sub,lineHeight:1.75,marginBottom:20}}>
          Open <code style={{background:C.raised,padding:"2px 7px",borderRadius:5,color:V,fontSize:12}}>src/App.jsx</code> and replace the two placeholder values at the top with your Supabase URL and anon key.
        </div>
        <div style={{background:C.raised,borderRadius:9,padding:"14px 18px",fontFamily:"monospace",fontSize:12,color:C.sub,lineHeight:2,marginBottom:16}}>
          <span style={{color:C.dim}}>// Lines 3–4 in App.jsx</span><br/>
          <span style={{color:VL}}>const</span> SUPA_URL = <span style={{color:C.green}}>"https://xxxx.supabase.co"</span>;<br/>
          <span style={{color:VL}}>const</span> SUPA_KEY = <span style={{color:C.green}}>"eyJ..."</span>;
        </div>
        <div style={{fontSize:11,color:C.dim}}>Error: {dbErr}</div>
      </div>
    </div>
  );

  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{css}</style>
      {!loggedIn&&<div style={{position:"fixed",inset:0,zIndex:100}}><Login onLogin={()=>sLI(true)} profile={profile}/></div>}
      {alert&&<BudgetModal {...alert}/>}
      {toast&&(
        <div style={{position:"fixed",top:20,right:20,zIndex:200,background:C.surf,border:`1px solid ${toast.type==="err"?"rgba(244,63,94,.3)":"rgba(124,58,237,.3)"}`,borderRadius:9,padding:"11px 18px",color:toast.type==="err"?C.red:V,fontSize:13,fontWeight:500,boxShadow:"0 8px 40px rgba(0,0,0,.5)",animation:"fadeUp .3s both"}}>
          {toast.msg}
        </div>
      )}
      {delId!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:150,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:14,padding:28,width:320,textAlign:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:8}}>Delete transaction?</div>
            <div style={{fontSize:13,color:C.sub,marginBottom:22}}>This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>sDel(null)} style={{flex:1,background:"transparent",border:`1px solid ${C.bord}`,borderRadius:8,padding:"10px",color:C.sub,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancel</button>
              <button onClick={handleDelete} style={{flex:1,background:"rgba(244,63,94,.1)",border:"1px solid rgba(244,63,94,.22)",borderRadius:8,padding:"10px",color:C.red,cursor:"pointer",fontWeight:600,fontFamily:"inherit",fontSize:13}}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {loggedIn&&(
        <div style={{display:"flex",minHeight:"100vh"}}>
          {/* Sidebar */}
          <div style={{width:216,background:C.surf,borderRight:`1px solid ${C.bord}`,display:"flex",flexDirection:"column",padding:"22px 10px",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9,padding:"4px 8px",marginBottom:24}}>
              <div style={{width:30,height:30,borderRadius:8,background:VG,border:`1px solid rgba(124,58,237,.25)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <span style={{fontSize:16,fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>Gulak</span>
            </div>
            {budget>0&&(
              <div style={{background:C.raised,borderRadius:9,padding:"10px 12px",marginBottom:18,border:`1px solid ${C.bord}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <span style={{fontSize:10.5,color:C.sub,fontWeight:500}}>Today's budget</span>
                  <span style={{fontSize:10.5,fontWeight:600,color:bc}}>{bp}%</span>
                </div>
                <Bar value={tSpend} max={budget} color={bc} h={3} anim={false}/>
              </div>
            )}
            <nav style={{flex:1,display:"flex",flexDirection:"column",gap:1}}>
              {NAV.map(item=>{
                const active=tab===item.id;
                return(
                  <button key={item.id} className="nav-item" onClick={()=>{sTab(item.id);if(item.id!=="entry")sET(null);}}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:8,border:"none",background:active?VG:"transparent",color:active?V:C.sub,cursor:"pointer",fontSize:13,fontWeight:active?600:400,fontFamily:"inherit",transition:"all .16s",borderLeft:`2px solid ${active?V:"transparent"}`}}>
                    <div style={{width:4,height:4,borderRadius:"50%",background:active?V:C.dim,transition:"background .16s",flexShrink:0}}/>
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div style={{borderTop:`1px solid ${C.bord}`,paddingTop:14}}>
              <button onClick={()=>sTab("profile")} className="ghost" style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",transition:"all .16s"}}>
                <div style={{width:28,height:28,borderRadius:8,overflow:"hidden",background:C.raised,border:`1px solid ${C.bord2}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {profile.photo
                    ?<img src={profile.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    :<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  }
                </div>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:12,color:C.text,fontWeight:500,lineHeight:1.2}}>{dn}</div>
                  <div style={{fontSize:10,color:C.dim,marginTop:1}}>{profile.username}</div>
                </div>
              </button>
            </div>
          </div>
          {/* Content */}
          <div style={{flex:1,overflowY:"auto",padding:"32px 28px"}}>
            {tab==="dashboard"    &&<Dashboard    txns={txns} budget={budget} name={dn}/>}
            {tab==="monthly"      &&<Monthly      txns={txns} budget={budget}/>}
            {tab==="budget"       &&<BudgetPage   txns={txns} budget={budget} setBudget={sBudget}/>}
            {tab==="transactions" &&<Transactions txns={txns} onEdit={handleEdit} onDelete={sDel}/>}
            {tab==="entry"        &&<NewEntry     txns={txns} editTarget={editTarget} onAdd={handleAdd} onUpdate={handleUpdate} onCancel={()=>sET(null)} budget={budget} setAlert={sAlert}/>}
            {tab==="profile"      &&<ProfilePage  profile={profile} setProfile={setProfile} onLogout={()=>sLI(false)} onClear={clearData}/>}
          </div>
        </div>
      )}
    </div>
  );
}