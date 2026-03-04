import { useState, useMemo, useEffect } from "react";

const CREDS = { username:"admin", password:"admin123" };
// localStorage helpers
const LS = {
  get: (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

const CATEGORIES = ["Food & Dining","Utilities","Entertainment","Credit Card","Transport","Shopping","Healthcare","Education","Income","Other"];
const METHODS = ["UPI","Cash","Credit Card","Bank Transfer","Debit Card"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CAT_META = {
  "Food & Dining":{ color:"#f97316", icon:"🍛" }, Utilities:{ color:"#38bdf8", icon:"⚡" },
  Entertainment:{ color:"#c084fc", icon:"🎬" }, "Credit Card":{ color:"#fb7185", icon:"💳" },
  Transport:{ color:"#34d399", icon:"🚗" }, Shopping:{ color:"#f472b6", icon:"🛍️" },
  Healthcare:{ color:"#4ade80", icon:"💊" }, Education:{ color:"#fbbf24", icon:"📚" },
  Income:{ color:"#a3e635", icon:"💰" }, Other:{ color:"#94a3b8", icon:"📦" },
};
const METHOD_META = {
  UPI:{ color:"#818cf8", icon:"📱" }, Cash:{ color:"#fbbf24", icon:"💵" },
  "Credit Card":{ color:"#fb7185", icon:"💳" }, "Bank Transfer":{ color:"#34d399", icon:"🏦" },
  "Debit Card":{ color:"#38bdf8", icon:"🏧" },
};

const fmt = n => "₹" + Number(n).toLocaleString("en-IN");
const todayStr = () => new Date().toISOString().slice(0,10);
const clamp = (v,mn,mx) => Math.min(Math.max(v,mn),mx);

const C = {
  bg:"#0e1117", surface:"#161b26", border:"#1f2a38",
  text:"#e8edf5", muted:"#64748b", gold:"#f5a623",
  teal:"#14b8a6", red:"#f87171", green:"#4ade80", orange:"#fb923c",
};

const css = `
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:${C.bg}; }
  ::-webkit-scrollbar{width:5px;height:5px;}
  ::-webkit-scrollbar-track{background:${C.surface};}
  ::-webkit-scrollbar-thumb{background:#2d3a4a;border-radius:99px;}
  select option{background:#1a2332;}
  input[type=number]{-moz-appearance:textfield;}
  input[type=number]::-webkit-outer-spin-button,
  input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;display:none;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
  @keyframes shake{0%,100%{transform:translateX(0);}20%,60%{transform:translateX(-6px);}40%,80%{transform:translateX(6px);}}
  .fade-up{animation:fadeUp .4s ease both;}
  .nav-btn:hover{background:rgba(245,166,35,.1)!important;color:${C.gold}!important;}
  .card-h:hover{border-color:#2d3a4a!important;transform:translateY(-1px);}
  .row:hover{background:rgba(245,166,35,.04)!important;}
  .cal-day:hover{border-color:${C.gold}!important;transform:scale(1.06);}
  .tag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:99px;font-size:11px;font-weight:600;}
`;

const sty = {
  card: { background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:"20px 22px", transition:"all .22s" },
  inp:  { width:"100%", background:"#111827", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", color:C.text, fontSize:13.5, outline:"none", fontFamily:"inherit" },
  sel:  { background:"#111827", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px 14px", color:C.text, fontSize:13.5, outline:"none", fontFamily:"inherit", cursor:"pointer" },
  lbl:  { fontSize:11, fontWeight:700, color:C.muted, letterSpacing:1.2, textTransform:"uppercase", marginBottom:7, display:"block" },
};

function MiniBar({ value, max, color, noAnim }) {
  const [w, setW] = useState(noAnim ? (max ? clamp(Math.round((value/max)*100),0,100) : 0) : 0);
  useEffect(() => { if (!noAnim) setTimeout(() => setW(max ? clamp(Math.round((value/max)*100),0,100) : 0), 120); }, [value,max]);
  const pct = noAnim ? (max ? clamp(Math.round((value/max)*100),0,100) : 0) : w;
  return (
    <div style={{background:"#1a2332",borderRadius:99,height:5,overflow:"hidden"}}>
      <div style={{width:pct+"%",height:"100%",background:color,borderRadius:99,transition:noAnim?"none":"width .7s ease"}}/>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [err,setErr]=useState(""); const [show,setShow]=useState(false); const [loading,setLoading]=useState(false);
  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      if (u===CREDS.username && p===CREDS.password) onLogin();
      else { setErr("Wrong credentials. Try admin / admin123"); setLoading(false); }
    }, 500);
  };
  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:400,height:400,background:"radial-gradient(circle,rgba(245,166,35,.12) 0%,transparent 70%)",top:"-10%",right:"10%",pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:300,height:300,background:"radial-gradient(circle,rgba(20,184,166,.1) 0%,transparent 70%)",bottom:"5%",left:"5%",pointerEvents:"none"}}/>
      <div className="fade-up" style={{width:420,background:C.surface,border:`1px solid ${C.border}`,borderRadius:24,padding:"48px 44px",boxShadow:"0 32px 80px rgba(0,0,0,.5)"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:64,height:64,background:"linear-gradient(135deg,#f5a623,#e8850a)",borderRadius:20,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,boxShadow:"0 8px 24px rgba(245,166,35,.3)"}}>🪙</div>
          <h1 style={{fontFamily:"Georgia,serif",fontSize:30,color:C.text,fontWeight:800,letterSpacing:-.5}}>Gulak</h1>
          <p style={{color:C.muted,fontSize:13,marginTop:5}}>गुल्लक — Your smart money diary</p>
        </div>
        {err && <div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:10,padding:"11px 14px",color:"#fca5a5",fontSize:13,marginBottom:20}}>{err}</div>}
        <div style={{marginBottom:18}}>
          <label style={sty.lbl}>Username</label>
          <input value={u} onChange={e=>setU(e.target.value)} placeholder="admin" style={sty.inp} onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div style={{marginBottom:28,position:"relative"}}>
          <label style={sty.lbl}>Password</label>
          <input value={p} onChange={e=>setP(e.target.value)} type={show?"text":"password"} placeholder="••••••••" style={{...sty.inp,paddingRight:52}} onKeyDown={e=>e.key==="Enter"&&submit()}/>
          <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,bottom:11,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>{show?"Hide":"Show"}</button>
        </div>
        <button onClick={submit} disabled={loading} style={{width:"100%",background:loading?"#2d3a4a":"linear-gradient(135deg,#f5a623,#e07d08)",border:"none",borderRadius:12,padding:"14px",color:loading?C.muted:"#0e1117",fontWeight:700,fontSize:15,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",transition:"all .3s",boxShadow:loading?"none":"0 4px 20px rgba(245,166,35,.25)"}}>
          {loading ? "Signing in…" : "Sign In →"}
        </button>
        <p style={{textAlign:"center",color:"#334155",fontSize:12,marginTop:18}}>admin / admin123</p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ txns, dailyBudget }) {
  const totalCredit = txns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const totalDebit  = txns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const balance = totalCredit - totalDebit;
  const todaySpend = txns.filter(t=>t.type==="debit"&&t.date===todayStr()).reduce((s,t)=>s+t.amount,0);
  const budgetPct = dailyBudget>0 ? clamp(Math.round((todaySpend/dailyBudget)*100),0,100) : 0;
  const budgetColor = budgetPct>=100?C.red:budgetPct>=80?C.orange:C.green;

  if(txns.length===0) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"60vh",gap:16,textAlign:"center"}}>
      <div style={{fontSize:64}}>🪙</div>
      <h2 style={{fontFamily:"Georgia,serif",fontSize:24,color:C.text,fontWeight:800}}>Your Gulak is empty</h2>
      <p style={{color:C.muted,fontSize:14,maxWidth:320,lineHeight:1.6}}>No transactions yet. Head to <b style={{color:C.gold}}>Add / Edit</b> in the sidebar to record your first entry!</p>
      <div style={{background:"rgba(245,166,35,.08)",border:"1px solid rgba(245,166,35,.2)",borderRadius:14,padding:"16px 24px",marginTop:8}}>
        <div style={{fontSize:12,color:C.muted,marginBottom:4}}>Quick tip</div>
        <div style={{fontSize:13,color:C.gold}}>Also set your Daily Budget in <b>Budget & Savings</b> 🎯</div>
      </div>
    </div>
  );

  const catBreakdown = useMemo(()=>{ const m={}; txns.filter(t=>t.type==="debit").forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); },[txns]);
  const methodBreakdown = useMemo(()=>{ const m={}; txns.forEach(t=>{m[t.method]=(m[t.method]||0)+t.amount;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); },[txns]);
  const dailyData = useMemo(()=>{ const m={}; txns.forEach(t=>{if(!m[t.date])m[t.date]={credit:0,debit:0};m[t.date][t.type]+=t.amount;}); return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0])).slice(-7); },[txns]);
  const maxMethod = methodBreakdown[0]?.[1]||1;
  const maxDaily = Math.max(...dailyData.flatMap(([,v])=>[v.credit,v.debit]),1);
  const recent = [...txns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontFamily:"Georgia,serif",fontSize:26,color:C.text,fontWeight:800}}>Good day! 👋</h2>
          <p style={{color:C.muted,fontSize:13,marginTop:4}}>{new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
        </div>
        <div style={{background:"rgba(245,166,35,.1)",border:"1px solid rgba(245,166,35,.25)",borderRadius:12,padding:"10px 18px",textAlign:"right"}}>
          <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Net Balance</div>
          <div style={{fontSize:22,fontWeight:800,color:balance>=0?C.green:C.red,fontFamily:"Georgia,serif",marginTop:2}}>{fmt(balance)}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:13}}>
        {[
          {label:"Money In",  value:fmt(totalCredit), sub:`${txns.filter(t=>t.type==="credit").length} credits`, color:C.green, icon:"📥"},
          {label:"Money Out", value:fmt(totalDebit),  sub:`${txns.filter(t=>t.type==="debit").length} debits`,  color:C.red,   icon:"📤"},
          {label:"Today Spent",value:fmt(todaySpend), sub:dailyBudget>0?`${budgetPct}% of budget`:"No budget set", color:budgetColor, icon:"📅"},
          {label:"Today Saved",value:fmt(Math.max(0,dailyBudget-todaySpend)), sub:dailyBudget>0?"Under budget 🎉":"Set a budget", color:C.teal, icon:"🏦"},
        ].map(c=>(
          <div key={c.label} className="card-h" style={{...sty.card,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:10.5,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>{c.label}</div>
                <div style={{fontSize:21,fontWeight:800,color:c.color,fontFamily:"Georgia,serif",lineHeight:1}}>{c.value}</div>
                <div style={{fontSize:11.5,color:"#475569",marginTop:5}}>{c.sub}</div>
              </div>
              <span style={{fontSize:22}}>{c.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      {dailyBudget>0&&(
        <div style={sty.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>🎯</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text}}>Daily Budget Tracker</div>
                <div style={{fontSize:12,color:C.muted}}>Budget: {fmt(dailyBudget)} · Spent: {fmt(todaySpend)} · Left: {fmt(Math.max(0,dailyBudget-todaySpend))}</div>
              </div>
            </div>
            <div style={{fontSize:18,fontWeight:800,color:budgetColor,fontFamily:"Georgia,serif"}}>{budgetPct}%</div>
          </div>
          <div style={{background:"#1a2332",borderRadius:99,height:10,overflow:"hidden"}}>
            <div style={{width:budgetPct+"%",height:"100%",background:budgetPct>=100?"#dc2626":budgetPct>=80?"#f97316":"#14b8a6",borderRadius:99,transition:"width .8s ease"}}/>
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:14}}>
        <div style={sty.card}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:16}}>Daily Flow — Last 7 Days</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:10,height:130}}>
            {dailyData.map(([date,val])=>(
              <div key={date} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:110}}>
                  <div style={{flex:1,background:"linear-gradient(180deg,#4ade80,#16a34a)",borderRadius:"4px 4px 0 0",height:Math.round((val.credit/maxDaily)*100)+"%",minHeight:val.credit?4:0,transition:"height .6s ease"}}/>
                  <div style={{flex:1,background:"linear-gradient(180deg,#fb7185,#e11d48)",borderRadius:"4px 4px 0 0",height:Math.round((val.debit/maxDaily)*100)+"%",minHeight:val.debit?4:0,transition:"height .6s ease"}}/>
                </div>
                <span style={{fontSize:10,color:"#334155"}}>{date.slice(5)}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:16,marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
            {[[C.green,"Money In"],[C.red,"Money Out"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,background:c,borderRadius:2}}/><span style={{fontSize:11,color:C.muted}}>{l}</span></div>
            ))}
          </div>
        </div>
        <div style={sty.card}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:16}}>By Payment Method</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {methodBreakdown.map(([method,amt])=>{
              const meta=METHOD_META[method]||{color:"#94a3b8",icon:"💸"};
              return(<div key={method}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:7}}><span>{meta.icon}</span><span style={{fontSize:13,color:C.text}}>{method}</span></div>
                <span style={{fontSize:13,color:meta.color,fontWeight:700}}>{fmt(amt)}</span>
              </div><MiniBar value={amt} max={maxMethod} color={meta.color}/></div>);
            })}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={sty.card}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:16}}>Spending by Category</div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {catBreakdown.slice(0,6).map(([cat,amt])=>{
              const meta=CAT_META[cat]||{color:"#94a3b8",icon:"📦"};
              return(<div key={cat}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:26,height:26,background:meta.color+"18",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{meta.icon}</div>
                  <span style={{fontSize:13,color:C.text}}>{cat}</span>
                </div>
                <span style={{fontSize:13,color:meta.color,fontWeight:700}}>{fmt(amt)}</span>
              </div><MiniBar value={amt} max={catBreakdown[0]?.[1]||1} color={meta.color}/></div>);
            })}
          </div>
        </div>
        <div style={sty.card}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:16}}>Recent Activity</div>
          {recent.map(t=>{
            const meta=CAT_META[t.category]||{color:"#94a3b8",icon:"📦"};
            return(<div key={t.id} className="row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 8px",borderRadius:10,transition:"background .2s"}}>
              <div style={{display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:32,height:32,background:meta.color+"18",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{meta.icon}</div>
                <div><div style={{fontSize:13,color:C.text,fontWeight:600}}>{t.description}</div><div style={{fontSize:11,color:C.muted,marginTop:1}}>{t.date} · {t.method}</div></div>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:t.type==="credit"?C.green:C.red,fontFamily:"Georgia,serif",flexShrink:0,marginLeft:8}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
            </div>);
          })}
        </div>
      </div>
    </div>
  );
}

// ── Monthly View ──────────────────────────────────────────────────────────────
function MonthlyView({ txns, dailyBudget }) {
  const now = new Date();
  const [year,setYear]=useState(now.getFullYear());
  const [month,setMonth]=useState(now.getMonth());
  const [selectedDay,setSelectedDay]=useState(null);

  const monthKey = `${year}-${String(month+1).padStart(2,"0")}`;
  const monthTxns = useMemo(()=>txns.filter(t=>t.date.startsWith(monthKey)),[txns,monthKey]);
  const monthDebit = monthTxns.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const monthCredit = monthTxns.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);

  const dayMap = useMemo(()=>{
    const m={};
    monthTxns.forEach(t=>{ if(!m[t.date])m[t.date]={debit:0,credit:0,txns:[]}; m[t.date][t.type]+=t.amount; m[t.date].txns.push(t); });
    return m;
  },[monthTxns]);

  const catBreak = useMemo(()=>{ const m={}; monthTxns.filter(t=>t.type==="debit").forEach(t=>{m[t.category]=(m[t.category]||0)+t.amount;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]); },[monthTxns]);

  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const weeks=[]; let week=[];
  for(let i=0;i<firstDay;i++) week.push(null);
  for(let d=1;d<=daysInMonth;d++){ week.push(d); if(week.length===7){weeks.push(week);week=[];} }
  if(week.length>0){while(week.length<7)week.push(null);weeks.push(week);}

  const maxDaySpend = Math.max(...Object.values(dayMap).map(d=>d.debit),1);
  const prevMonth = ()=>{ if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1); setSelectedDay(null); };
  const nextMonth = ()=>{ if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1); setSelectedDay(null); };
  const selectedKey = selectedDay ? `${year}-${String(month+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}` : null;
  const selectedData = selectedKey ? dayMap[selectedKey] : null;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h2 style={{fontFamily:"Georgia,serif",fontSize:24,color:C.text,fontWeight:800}}>Monthly Report</h2><p style={{color:C.muted,fontSize:13,marginTop:3}}>Tap any day to see transactions</p></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={prevMonth} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,padding:"7px 14px",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:14}}>‹</button>
          <div style={{fontFamily:"Georgia,serif",fontWeight:700,fontSize:17,color:C.text,minWidth:160,textAlign:"center"}}>{MONTHS[month]} {year}</div>
          <button onClick={nextMonth} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,padding:"7px 14px",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:14}}>›</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:13}}>
        {[
          {label:"Month Spend",value:fmt(monthDebit),color:C.red,icon:"📤"},
          {label:"Month Income",value:fmt(monthCredit),color:C.green,icon:"📥"},
          {label:"Net",value:fmt(monthCredit-monthDebit),color:(monthCredit-monthDebit)>=0?C.green:C.red,icon:"⚖️"},
          {label:"Month Savings",value:dailyBudget>0?fmt(Math.max(0,dailyBudget*daysInMonth-monthDebit)):"Set budget",color:C.teal,icon:"🏦"},
        ].map(c=>(
          <div key={c.label} style={{...sty.card,padding:"16px 18px"}}>
            <div style={{fontSize:10.5,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>{c.icon} {c.label}</div>
            <div style={{fontSize:20,fontWeight:800,color:c.color,fontFamily:"Georgia,serif"}}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:16}}>
        <div style={sty.card}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:6}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} style={{textAlign:"center",fontSize:10.5,color:C.muted,fontWeight:700,padding:"4px 0"}}>{d}</div>
            ))}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
            {weeks.flat().map((day,i)=>{
              if(!day) return <div key={i}/>;
              const key=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const data=dayMap[key]; const spend=data?.debit||0;
              const intensity=spend>0?clamp(Math.round((spend/maxDaySpend)*100),15,100):0;
              const isToday=key===todayStr(); const isSelected=selectedDay===day;
              const over=dailyBudget>0&&spend>dailyBudget; const warn=dailyBudget>0&&spend>=dailyBudget*0.8&&!over;
              let bg="transparent";
              if(spend>0) bg=over?`rgba(248,113,113,${intensity/100*.5})`:warn?`rgba(251,146,60,${intensity/100*.5})`:`rgba(20,184,166,${intensity/100*.45})`;
              return(
                <div key={key} className="cal-day" onClick={()=>setSelectedDay(isSelected?null:day)}
                  style={{aspectRatio:"1",borderRadius:9,border:`1px solid ${isSelected?C.gold:isToday?"rgba(245,166,35,.4)":spend>0?"rgba(20,184,166,.2)":C.border}`,background:isSelected?"rgba(245,166,35,.18)":bg,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"all .18s"}}>
                  <div style={{fontSize:12,fontWeight:isToday||isSelected?700:500,color:isToday||isSelected?C.gold:C.text}}>{day}</div>
                  {spend>0&&<div style={{fontSize:8.5,color:over?C.red:warn?C.orange:C.teal,fontWeight:700,marginTop:1}}>₹{spend>=1000?(spend/1000).toFixed(1)+"k":spend}</div>}
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`,flexWrap:"wrap"}}>
            {[[C.teal,"Under budget"],[C.orange,"Near limit"],[C.red,"Over budget"],[C.gold,"Selected"]].map(([c,l])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:9,height:9,background:c,borderRadius:3}}/><span style={{fontSize:10.5,color:C.muted}}>{l}</span></div>
            ))}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {selectedDay&&(
            <div style={sty.card}>
              <div style={{fontSize:11,color:C.gold,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:12}}>{MONTHS[month]} {selectedDay}, {year}</div>
              {selectedData?(
                <>
                  <div style={{display:"flex",gap:10,marginBottom:12}}>
                    <div style={{flex:1,background:"rgba(248,113,113,.08)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1}}>SPENT</div>
                      <div style={{fontSize:16,fontWeight:800,color:C.red,fontFamily:"Georgia,serif",marginTop:4}}>{fmt(selectedData.debit)}</div>
                    </div>
                    <div style={{flex:1,background:"rgba(74,222,128,.08)",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1}}>RECEIVED</div>
                      <div style={{fontSize:16,fontWeight:800,color:C.green,fontFamily:"Georgia,serif",marginTop:4}}>{fmt(selectedData.credit)}</div>
                    </div>
                  </div>
                  {selectedData.txns.map(t=>{
                    const meta=CAT_META[t.category]||{color:"#94a3b8",icon:"📦"};
                    return(<div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 8px",background:"#0d1320",borderRadius:8,marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:13}}>{meta.icon}</span>
                        <div><div style={{fontSize:12,color:C.text,fontWeight:600}}>{t.description}</div><div style={{fontSize:10,color:C.muted}}>{t.method}</div></div>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:t.type==="credit"?C.green:C.red,fontFamily:"Georgia,serif"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</span>
                    </div>);
                  })}
                </>
              ):(
                <div style={{textAlign:"center",padding:"20px 0",color:C.muted}}><div style={{fontSize:28,marginBottom:8}}>😴</div><div style={{fontSize:13}}>No transactions this day</div></div>
              )}
            </div>
          )}
          <div style={{...sty.card,flex:1}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:14}}>Month by Category</div>
            {catBreak.length===0?<div style={{textAlign:"center",padding:"20px 0",color:C.muted,fontSize:13}}>No spending this month</div>:(
              catBreak.map(([cat,amt])=>{
                const meta=CAT_META[cat]||{color:"#94a3b8",icon:"📦"};
                return(<div key={cat} style={{marginBottom:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:13}}>{meta.icon}</span><span style={{fontSize:12.5,color:C.text}}>{cat}</span></div>
                    <span style={{fontSize:12.5,color:meta.color,fontWeight:700}}>{fmt(amt)}</span>
                  </div>
                  <MiniBar value={amt} max={catBreak[0]?.[1]||1} color={meta.color}/>
                </div>);
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Budget Page ───────────────────────────────────────────────────────────────
function BudgetPage({ txns, dailyBudget, setDailyBudget }) {
  const [inputBudget,setInputBudget]=useState(String(dailyBudget||""));
  const [saved,setSaved]=useState(false);
  const saveBudget=()=>{ const v=parseFloat(inputBudget); if(v>0){setDailyBudget(v);setSaved(true);setTimeout(()=>setSaved(false),2000);} };

  const last30=useMemo(()=>{
    const days=[];
    for(let i=29;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const key=d.toISOString().slice(0,10); const spend=txns.filter(t=>t.type==="debit"&&t.date===key).reduce((s,t)=>s+t.amount,0); days.push({date:key,spend,saved:dailyBudget>0?Math.max(0,dailyBudget-spend):0,label:key.slice(5)}); }
    return days;
  },[txns,dailyBudget]);

  const totalSaved=last30.reduce((s,d)=>s+d.saved,0);
  const avgDaily=Math.round(last30.reduce((s,d)=>s+d.spend,0)/30);
  const daysUnder=last30.filter(d=>dailyBudget>0&&d.spend<dailyBudget&&d.spend>0).length;
  const daysOver=last30.filter(d=>dailyBudget>0&&d.spend>dailyBudget).length;
  const maxSpend=Math.max(...last30.map(d=>d.spend),dailyBudget||1,1);
  const todaySpend=last30[last30.length-1]?.spend||0;
  const todayPct=dailyBudget>0?clamp(Math.round((todaySpend/dailyBudget)*100),0,100):0;

  return(
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div><h2 style={{fontFamily:"Georgia,serif",fontSize:24,color:C.text,fontWeight:800}}>Budget & Savings 🎯</h2><p style={{color:C.muted,fontSize:13,marginTop:3}}>Set your daily limit and watch your savings grow</p></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={sty.card}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:16}}>⚙️ Daily Budget Setting</div>
          <label style={sty.lbl}>Daily Spending Limit (₹)</label>
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <input type="text" inputMode="numeric" value={inputBudget} onChange={e=>setInputBudget(e.target.value.replace(/[^0-9.]/g,""))} placeholder="e.g. 500" style={{...sty.inp,flex:1}}/>
            <button onClick={saveBudget} style={{background:saved?"#14532d":"linear-gradient(135deg,#f5a623,#e07d08)",border:"none",borderRadius:10,padding:"11px 20px",color:saved?C.green:"#0e1117",fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13,transition:"all .3s",whiteSpace:"nowrap"}}>
              {saved?"✓ Saved!":"Set Budget"}
            </button>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:C.muted,marginBottom:8,fontWeight:600}}>Quick Presets</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {[300,500,750,1000,1500,2000].map(v=>(
                <button key={v} onClick={()=>setInputBudget(String(v))} style={{background:inputBudget===String(v)?"rgba(245,166,35,.2)":"#0d1320",border:`1px solid ${inputBudget===String(v)?C.gold:C.border}`,borderRadius:8,padding:"6px 12px",color:inputBudget===String(v)?C.gold:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all .2s"}}>
                  {fmt(v)}
                </button>
              ))}
            </div>
          </div>
          {dailyBudget>0&&(
            <div style={{background:"#0d1320",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:12,color:C.muted,marginBottom:10}}>Today's snapshot</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:13,color:C.text}}>Spent today</span>
                <span style={{fontSize:15,fontWeight:800,color:todayPct>=100?C.red:todayPct>=80?C.orange:C.green,fontFamily:"Georgia,serif"}}>{fmt(todaySpend)}</span>
              </div>
              <div style={{background:"#1a2332",borderRadius:99,height:8,overflow:"hidden",marginBottom:8}}>
                <div style={{width:todayPct+"%",height:"100%",background:todayPct>=100?"#dc2626":todayPct>=80?"#f97316":"#14b8a6",borderRadius:99,transition:"width .8s ease"}}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted}}>
                <span>{todayPct}% used</span><span>Remaining: {fmt(Math.max(0,dailyBudget-todaySpend))}</span>
              </div>
            </div>
          )}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[
            {label:"Total Saved (30d)",value:dailyBudget>0?fmt(totalSaved):"—",color:C.teal,icon:"💎"},
            {label:"Avg Daily Spend",value:fmt(avgDaily),color:C.gold,icon:"📊"},
            {label:"Days Under Budget",value:dailyBudget>0?`${daysUnder} days`:"Set budget",color:C.green,icon:"✅"},
            {label:"Days Over Budget",value:dailyBudget>0?`${daysOver} days`:"Set budget",color:daysOver>5?C.red:C.orange,icon:"⚠️"},
          ].map(c=>(
            <div key={c.label} style={{...sty.card,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{fontSize:22,flexShrink:0}}>{c.icon}</div>
              <div><div style={{fontSize:10.5,color:C.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:3}}>{c.label}</div><div style={{fontSize:18,fontWeight:800,color:c.color,fontFamily:"Georgia,serif",lineHeight:1}}>{c.value}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div style={sty.card}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:16}}>Daily Spend vs Budget — Last 30 Days</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:3,height:120}}>
          {last30.map((d)=>{
            const pct=Math.round((d.spend/maxSpend)*100);
            const over=dailyBudget>0&&d.spend>dailyBudget; const warn=dailyBudget>0&&d.spend>=dailyBudget*0.8&&!over;
            return(<div key={d.date} title={`${d.date}: ${fmt(d.spend)}`} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}>
              <div style={{width:"100%",background:over?"#dc2626":warn?"#f97316":d.spend>0?"#14b8a6":"#1a2332",borderRadius:"3px 3px 0 0",height:pct+"%",minHeight:d.spend?2:0,transition:"height .5s ease"}}/>
            </div>);
          })}
        </div>
        {dailyBudget>0&&<div style={{fontSize:11,color:C.gold,marginTop:10,display:"flex",alignItems:"center",gap:6}}><div style={{width:20,borderTop:"2px dashed "+C.gold}}/><span>Daily Budget ({fmt(dailyBudget)})</span></div>}
      </div>
      {dailyBudget>0&&(
        <div style={sty.card}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:16}}>💰 Daily Savings — Last 14 Days</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
            {last30.slice(-14).map(d=>{
              const saved=Math.max(0,dailyBudget-d.spend); const over=d.spend>dailyBudget?d.spend-dailyBudget:0;
              return(<div key={d.date} style={{background:"#0d1320",borderRadius:10,padding:"10px 8px",textAlign:"center",border:`1px solid ${over>0?"rgba(248,113,113,.2)":saved>0?"rgba(20,184,166,.2)":C.border}`}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:5}}>{d.label}</div>
                {d.spend===0?<div style={{fontSize:11,color:C.muted}}>—</div>:over>0?<><div style={{fontSize:9,color:C.red,fontWeight:700}}>OVER</div><div style={{fontSize:12,fontWeight:800,color:C.red,fontFamily:"Georgia,serif"}}>-{fmt(over)}</div></>:<><div style={{fontSize:9,color:C.teal,fontWeight:700}}>SAVED</div><div style={{fontSize:12,fontWeight:800,color:C.teal,fontFamily:"Georgia,serif"}}>{fmt(saved)}</div></>}
              </div>);
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────
function Transactions({ txns, onEdit, onDelete }) {
  const [fT,setFT]=useState("all"); const [fM,setFM]=useState("all"); const [fC,setFC]=useState("all"); const [sr,setSr]=useState("");
  const filtered=useMemo(()=>txns.filter(t=>{
    if(fT!=="all"&&t.type!==fT)return false; if(fM!=="all"&&t.method!==fM)return false;
    if(fC!=="all"&&t.category!==fC)return false; if(sr&&!t.description.toLowerCase().includes(sr.toLowerCase()))return false; return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)),[txns,fT,fM,fC,sr]);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h2 style={{fontFamily:"Georgia,serif",fontSize:24,color:C.text,fontWeight:800}}>All Transactions</h2><p style={{color:C.muted,fontSize:13,marginTop:3}}>{filtered.length} of {txns.length} entries</p></div>
      </div>
      <div style={{...sty.card,padding:"14px 18px"}}>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <input value={sr} onChange={e=>setSr(e.target.value)} placeholder="🔍 Search…" style={{...sty.inp,width:200,fontSize:13,padding:"9px 14px"}}/>
          {[
            {val:fT,set:setFT,opts:["all","debit","credit"],labels:["All Types","Debit","Credit"]},
            {val:fM,set:setFM,opts:["all",...METHODS],labels:["All Methods",...METHODS]},
            {val:fC,set:setFC,opts:["all",...CATEGORIES],labels:["All Categories",...CATEGORIES]},
          ].map((f,i)=>(
            <select key={i} value={f.val} onChange={e=>f.set(e.target.value)} style={{...sty.sel,fontSize:13,padding:"9px 12px"}}>
              {f.opts.map((o,j)=><option key={o} value={o}>{f.labels[j]}</option>)}
            </select>
          ))}
          {(sr||fT!=="all"||fM!=="all"||fC!=="all")&&<button onClick={()=>{setSr("");setFT("all");setFM("all");setFC("all");}} style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.25)",borderRadius:9,padding:"9px 14px",color:C.red,cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600}}>Clear ✕</button>}
        </div>
      </div>
      <div style={{...sty.card,padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"#0d1320",borderBottom:`1px solid ${C.border}`}}>
              {["Date","Description","Category","Method","Flow","Amount",""].map(h=>(
                <th key={h} style={{padding:"13px 16px",textAlign:"left",color:C.muted,fontWeight:700,fontSize:10.5,letterSpacing:1.2,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.length===0&&<tr><td colSpan={7} style={{padding:"48px",textAlign:"center",color:C.muted}}><div style={{fontSize:32,marginBottom:10}}>🔍</div>No transactions match.</td></tr>}
              {filtered.map(t=>{
                const cM=CAT_META[t.category]||{color:"#94a3b8",icon:"📦"}; const mM=METHOD_META[t.method]||{color:"#94a3b8",icon:"💸"};
                return(<tr key={t.id} className="row" style={{borderBottom:`1px solid ${C.border}`,transition:"background .15s"}}>
                  <td style={{padding:"12px 16px",color:C.muted,whiteSpace:"nowrap",fontSize:12.5}}>{t.date}</td>
                  <td style={{padding:"12px 16px",color:C.text,fontWeight:600}}>{t.description}</td>
                  <td style={{padding:"12px 16px"}}><span className="tag" style={{background:cM.color+"18",color:cM.color}}>{cM.icon} {t.category}</span></td>
                  <td style={{padding:"12px 16px"}}><span className="tag" style={{background:mM.color+"18",color:mM.color}}>{mM.icon} {t.method}</span></td>
                  <td style={{padding:"12px 16px"}}><span style={{fontSize:11,fontWeight:700,color:t.type==="credit"?C.green:C.red}}>{t.type==="credit"?"↑ IN":"↓ OUT"}</span></td>
                  <td style={{padding:"12px 16px",fontWeight:800,color:t.type==="credit"?C.green:C.red,fontFamily:"Georgia,serif",whiteSpace:"nowrap"}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</td>
                  <td style={{padding:"12px 16px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>onEdit(t)} style={{background:"rgba(129,140,248,.12)",border:"none",borderRadius:7,padding:"5px 10px",color:"#818cf8",cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600}}>Edit</button>
                      <button onClick={()=>onDelete(t.id)} style={{background:"rgba(248,113,113,.1)",border:"none",borderRadius:7,padding:"5px 9px",color:C.red,cursor:"pointer",fontSize:12}}>🗑</button>
                    </div>
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
const emptyForm = () => ({ date:todayStr(), description:"", category:"Food & Dining", method:"UPI", type:"debit", amount:"" });

function BudgetAlert({ spent, budget, pending, onConfirm, onCancel }) {
  const pct = Math.round((spent/budget)*100);
  const isOver = spent >= budget;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.surface,border:`2px solid ${isOver?"#dc2626":"#f97316"}`,borderRadius:24,padding:40,width:420,textAlign:"center",boxShadow:`0 0 60px ${isOver?"rgba(220,38,38,.3)":"rgba(249,115,22,.25)"}`}}>
        <div style={{fontSize:52,marginBottom:12}}>{isOver?"🚨":"⚠️"}</div>
        <h2 style={{fontFamily:"Georgia,serif",color:C.text,fontSize:22,marginBottom:10}}>{isOver?"Budget Exceeded!":"You're Almost There!"}</h2>
        <p style={{color:C.muted,fontSize:14,lineHeight:1.6,marginBottom:20}}>
          {isOver?`You've already spent ${fmt(spent)} vs budget of ${fmt(budget)}. Adding ${fmt(pending)} puts you ${fmt(spent+pending-budget)} over.`
                 :`You've spent ${fmt(spent)} of ${fmt(budget)} (${pct}%). Adding ${fmt(pending)} = ${fmt(spent+pending)}. Sure?`}
        </p>
        <div style={{background:"#1a2332",borderRadius:99,height:10,marginBottom:16,overflow:"hidden"}}>
          <div style={{width:clamp(Math.round(((spent+pending)/budget)*100),0,100)+"%",height:"100%",background:isOver?"#dc2626":"#f97316",borderRadius:99}}/>
        </div>
        <div style={{display:"flex",gap:12}}>
          <button onClick={onCancel} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,padding:"13px",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:14}}>← Go Back</button>
          <button onClick={onConfirm} style={{flex:1,background:isOver?"#dc2626":"#f97316",border:"none",borderRadius:12,padding:"13px",color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit",fontSize:14}}>{isOver?"Add Anyway 🔥":"Yes, Add It"}</button>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ txns, onAdd, onUpdate, editTarget, onCancel, dailyBudget, setAlert }) {
  const [form,setForm]=useState(emptyForm());
  useMemo(()=>{ setForm(editTarget?{...editTarget,amount:String(editTarget.amount)}:emptyForm()); },[editTarget]);
  const valid = form.description && form.amount && form.date && parseFloat(form.amount)>0;

  const attemptSave = () => {
    if(!valid) return;
    const amt = parseFloat(form.amount);
    if(form.type==="debit" && dailyBudget>0 && !editTarget) {
      const todaySpend = txns.filter(t=>t.type==="debit"&&t.date===form.date).reduce((s,t)=>s+t.amount,0);
      if((todaySpend+amt)/dailyBudget >= 0.8) {
        setAlert({ spent:todaySpend, budget:dailyBudget, pending:amt, onConfirm:()=>{ doSave(amt); setAlert(null); }, onCancel:()=>setAlert(null) });
        return;
      }
    }
    doSave(amt);
  };
  const doSave = amt => {
    const txn = {...form, amount:amt};
    if(editTarget) onUpdate({...txn,id:editTarget.id}); else { onAdd(txn); setForm(emptyForm()); }
  };

  const warnInfo = (() => {
    if(form.type!=="debit"||!dailyBudget||!form.amount||!parseFloat(form.amount)) return null;
    const ts = txns.filter(t=>t.type==="debit"&&t.date===form.date).reduce((s,t)=>s+t.amount,0);
    const pct = Math.round(((ts+parseFloat(form.amount))/dailyBudget)*100);
    if(pct<80) return null;
    return { pct, isOver:pct>=100, newTotal:ts+parseFloat(form.amount) };
  })();

  return(
    <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
      <div style={{flex:"0 0 480px"}}>
        <div style={{marginBottom:20}}><h2 style={{fontFamily:"Georgia,serif",fontSize:24,color:C.text,fontWeight:800}}>{editTarget?"Edit Transaction":"New Entry"}</h2><p style={{color:C.muted,fontSize:13,marginTop:3}}>{editTarget?"Update details below":"Record a new transaction in your Gulak"}</p></div>
        <div style={sty.card}>
          <div style={{marginBottom:22}}>
            <label style={sty.lbl}>Transaction Type</label>
            <div style={{display:"flex",gap:10}}>
              {["debit","credit"].map(t=>(
                <button key={t} onClick={()=>setForm({...form,type:t})} style={{flex:1,padding:"13px 10px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13.5,transition:"all .2s",border:`2px solid ${form.type===t?(t==="debit"?"#fb7185":"#4ade80"):C.border}`,background:form.type===t?(t==="debit"?"rgba(248,113,113,.1)":"rgba(74,222,128,.1)"):"transparent",color:form.type===t?(t==="debit"?C.red:C.green):C.muted}}>
                  {t==="debit"?"📤 Money Out":"📥 Money In"}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div><label style={sty.lbl}>Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={sty.inp}/></div>
            <div><label style={sty.lbl}>Amount (₹)</label><input type="text" inputMode="numeric" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value.replace(/[^0-9.]/g,"")})} placeholder="0" style={sty.inp}/></div>
          </div>
          <div style={{marginBottom:16}}><label style={sty.lbl}>Description</label><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="e.g. Zomato order, Salary…" style={sty.inp}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:warnInfo?16:22}}>
            <div><label style={sty.lbl}>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={{...sty.sel,width:"100%"}}>{CATEGORIES.map(c=><option key={c} value={c}>{CAT_META[c]?.icon} {c}</option>)}</select></div>
            <div><label style={sty.lbl}>Payment Method</label><select value={form.method} onChange={e=>setForm({...form,method:e.target.value})} style={{...sty.sel,width:"100%"}}>{METHODS.map(m=><option key={m} value={m}>{METHOD_META[m]?.icon} {m}</option>)}</select></div>
          </div>
          {warnInfo&&(
            <div style={{background:warnInfo.isOver?"rgba(220,38,38,.1)":"rgba(249,115,22,.1)",border:`1px solid ${warnInfo.isOver?"rgba(220,38,38,.3)":"rgba(249,115,22,.3)"}`,borderRadius:10,padding:"11px 14px",marginBottom:16,display:"flex",gap:8,alignItems:"flex-start"}}>
              <span style={{fontSize:16}}>{warnInfo.isOver?"🚨":"⚠️"}</span>
              <div><div style={{fontSize:13,fontWeight:700,color:warnInfo.isOver?C.red:C.orange}}>{warnInfo.isOver?"Over budget!":"Approaching budget"}</div><div style={{fontSize:12,color:C.muted,marginTop:2}}>This will bring today's spend to {fmt(warnInfo.newTotal)} ({warnInfo.pct}% of {fmt(dailyBudget)} budget)</div></div>
            </div>
          )}
          {valid&&(
            <div style={{background:"#0d1320",borderRadius:12,padding:"14px 16px",marginBottom:20,border:`1px dashed ${C.border}`}}>
              <div style={{fontSize:10,color:C.muted,letterSpacing:1.2,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Preview</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,background:(CAT_META[form.category]?.color||"#94a3b8")+"18",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{CAT_META[form.category]?.icon||"📦"}</div>
                  <div><div style={{fontWeight:700,color:C.text,fontSize:14}}>{form.description}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{form.category} · {form.method} · {form.date}</div></div>
                </div>
                <div style={{fontSize:20,fontWeight:800,color:form.type==="credit"?C.green:C.red,fontFamily:"Georgia,serif"}}>{form.type==="credit"?"+":"-"}{fmt(form.amount)}</div>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button onClick={attemptSave} disabled={!valid} style={{flex:1,background:valid?"linear-gradient(135deg,#f5a623,#e07d08)":"#1a2332",border:"none",borderRadius:12,padding:"13px",color:valid?"#0e1117":C.muted,fontWeight:700,fontSize:14,cursor:valid?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .25s"}}>
              {editTarget?"💾 Save Changes":"➕ Add to Gulak"}
            </button>
            {editTarget&&<button onClick={onCancel} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 18px",color:C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Cancel</button>}
          </div>
        </div>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:11,color:C.muted,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",marginBottom:14}}>Recent Entries</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[...txns].reverse().slice(0,8).map(t=>{
            const meta=CAT_META[t.category]||{color:"#94a3b8",icon:"📦"};
            return(<div key={t.id} style={{...sty.card,padding:"12px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,background:meta.color+"18",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{meta.icon}</div>
                  <div><div style={{fontSize:13,color:C.text,fontWeight:600}}>{t.description}</div><div style={{fontSize:11,color:C.muted,marginTop:1}}>{t.date}</div></div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:t.type==="credit"?C.green:C.red,fontFamily:"Georgia,serif",flexShrink:0,marginLeft:8}}>{t.type==="credit"?"+":"-"}{fmt(t.amount)}</div>
              </div>
            </div>);
          })}
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn,setLoggedIn]=useState(false);
  const [tab,setTab]=useState("dashboard");
  const [txns,setTxns]=useState(()=>LS.get("gulak_txns",[]));
  const [editTarget,setEditTarget]=useState(null);
  const [toast,setToast]=useState(null);
  const [delId,setDelId]=useState(null);
  const [dailyBudget,setDailyBudget]=useState(()=>LS.get("gulak_budget",500));
  const [alert,setAlert]=useState(null);

  // Save to localStorage whenever transactions or budget change
  useEffect(()=>{ LS.set("gulak_txns", txns); },[txns]);
  useEffect(()=>{ LS.set("gulak_budget", dailyBudget); },[dailyBudget]);

  const showToast=(msg,type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2600); };
  const handleAdd=txn=>{ const id=Math.max(0,...(txns.length?txns.map(t=>t.id):[0]))+1; setTxns(p=>[...p,{...txn,id}]); showToast("Entry added to Gulak! 🪙"); };
  const handleUpdate=txn=>{ setTxns(p=>p.map(t=>t.id===txn.id?txn:t)); setEditTarget(null); showToast("Transaction updated ✓"); };
  const handleEdit=t=>{ setEditTarget(t); setTab("admin"); };
  const handleDelete=()=>{ setTxns(p=>p.filter(t=>t.id!==delId)); setDelId(null); showToast("Deleted","error"); };

  const NAV=[
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"monthly",  icon:"📅",label:"Monthly View"},
    {id:"budget",   icon:"🎯",label:"Budget & Savings"},
    {id:"transactions",icon:"📋",label:"Transactions"},
    {id:"admin",    icon:"✏️", label:"Add / Edit"},
  ];

  return(
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",background:C.bg,minHeight:"100vh",color:C.text}}>
      <style>{css}</style>
      {!loggedIn && <div style={{position:"fixed",inset:0,zIndex:100}}><Login onLogin={()=>setLoggedIn(true)}/></div>}
      {alert && <BudgetAlert {...alert}/>}
      {toast&&(
        <div style={{position:"fixed",top:20,right:20,zIndex:200,background:toast.type==="error"?"#2d1515":"#0f2a1a",border:`1px solid ${toast.type==="error"?"rgba(248,113,113,.4)":"rgba(74,222,128,.4)"}`,borderRadius:12,padding:"12px 20px",color:toast.type==="error"?"#fca5a5":"#86efac",fontSize:13,fontWeight:600,boxShadow:"0 8px 32px rgba(0,0,0,.4)",display:"flex",alignItems:"center",gap:8,animation:"fadeUp .3s ease"}}>
          {toast.type==="error"?"⚠️":"✅"} {toast.msg}
        </div>
      )}
      {delId!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:150,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:36,width:360,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🗑️</div>
            <h3 style={{color:C.text,marginBottom:8,fontFamily:"Georgia,serif",fontSize:20}}>Delete this entry?</h3>
            <p style={{color:C.muted,fontSize:13,marginBottom:24}}>This cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setDelId(null)} style={{flex:1,background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,padding:12,color:C.muted,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Cancel</button>
              <button onClick={handleDelete} style={{flex:1,background:"#dc2626",border:"none",borderRadius:10,padding:12,color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {loggedIn&&(
        <div style={{display:"flex",minHeight:"100vh"}}>
          <div style={{width:230,background:"#0d1117",borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",padding:"26px 14px",position:"sticky",top:0,height:"100vh",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10,paddingLeft:6,marginBottom:24}}>
              <div style={{width:38,height:38,background:"linear-gradient(135deg,#f5a623,#e07d08)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:"0 4px 14px rgba(245,166,35,.25)"}}>🪙</div>
              <div><div style={{fontFamily:"Georgia,serif",fontWeight:800,fontSize:20,color:C.text,lineHeight:1}}>Gulak</div><div style={{fontSize:10,color:C.muted,letterSpacing:.5}}>गुल्लक</div></div>
            </div>
            {dailyBudget>0&&(()=>{
              const ts=txns.filter(t=>t.type==="debit"&&t.date===todayStr()).reduce((s,t)=>s+t.amount,0);
              const pct=clamp(Math.round((ts/dailyBudget)*100),0,100);
              const col=pct>=100?C.red:pct>=80?C.orange:C.teal;
              return(<div style={{background:"#111827",border:`1px solid ${C.border}`,borderRadius:11,padding:"10px 12px",marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:11,color:C.muted,fontWeight:600}}>Today's budget</span><span style={{fontSize:11,fontWeight:700,color:col}}>{pct}%</span></div>
                <div style={{background:"#1a2332",borderRadius:99,height:4,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:col,borderRadius:99,transition:"width .5s"}}/></div>
                <div style={{fontSize:10,color:C.muted,marginTop:5}}>{fmt(ts)} / {fmt(dailyBudget)}</div>
              </div>);
            })()}
            <div style={{flex:1}}>
              {NAV.map(item=>{
                const active=tab===item.id;
                return(<button key={item.id} className="nav-btn" onClick={()=>{setTab(item.id);if(item.id!=="admin")setEditTarget(null);}} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 12px",borderRadius:10,border:"none",background:active?"rgba(245,166,35,.12)":"transparent",color:active?C.gold:C.muted,cursor:"pointer",fontSize:13,fontWeight:active?700:500,fontFamily:"inherit",marginBottom:2,transition:"all .2s",borderLeft:active?`3px solid ${C.gold}`:"3px solid transparent"}}>
                  <span style={{fontSize:14}}>{item.icon}</span> {item.label}
                </button>);
              })}
            </div>
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:16}}>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",marginBottom:8}}>
                <div style={{width:32,height:32,background:"linear-gradient(135deg,#14b8a6,#0f766e)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>👤</div>
                <div><div style={{fontSize:13,color:C.text,fontWeight:600}}>Admin</div><div style={{fontSize:11,color:C.muted}}>Owner</div></div>
              </div>
              <button onClick={()=>setLoggedIn(false)} style={{width:"100%",background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,padding:"9px",color:C.muted,cursor:"pointer",fontSize:12.5,fontFamily:"inherit",fontWeight:500}}>🚪 Sign Out</button>
              <button onClick={()=>{ if(window.confirm("Delete ALL transactions? This cannot be undone.")){setTxns([]);showToast("All data cleared","error");}}} style={{width:"100%",marginTop:6,background:"transparent",border:`1px solid rgba(248,113,113,.25)`,borderRadius:9,padding:"8px",color:"rgba(248,113,113,.6)",cursor:"pointer",fontSize:11.5,fontFamily:"inherit",fontWeight:500}}>🗑 Clear All Data</button>
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"30px 28px"}}>
            {tab==="dashboard"    && <Dashboard txns={txns} dailyBudget={dailyBudget}/>}
            {tab==="monthly"      && <MonthlyView txns={txns} dailyBudget={dailyBudget}/>}
            {tab==="budget"       && <BudgetPage txns={txns} dailyBudget={dailyBudget} setDailyBudget={setDailyBudget}/>}
            {tab==="transactions" && <Transactions txns={txns} onEdit={handleEdit} onDelete={id=>setDelId(id)}/>}
            {tab==="admin"        && <AdminPanel txns={txns} editTarget={editTarget} onAdd={handleAdd} onUpdate={handleUpdate} onCancel={()=>setEditTarget(null)} dailyBudget={dailyBudget} setAlert={setAlert}/>}
          </div>
        </div>
      )}
    </div>
  );
}