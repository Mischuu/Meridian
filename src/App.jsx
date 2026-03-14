/**
 * MERIDIAN — Paper Trading Platform v4
 * Design: GoodNotes-inspired, soft white, rounded, student-friendly
 * Focus: Paper trading with $10,000 starting balance
 * AI layer: Gemini via /api/ai (interpretation only)
 * Data: Yahoo Finance via /api/quote, /api/history, /api/news
 */

import { useState, useRef, useEffect, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────
// DATA LAYER
// ─────────────────────────────────────────────
function genHistory(base, days, vol = 0.018) {
  const h = [];
  let p = base * (0.84 + Math.random() * 0.08);
  for (let i = 0; i < days; i++) {
    p = Math.max(p * (1 + (Math.random() - 0.48) * vol), 1);
    const d = new Date(); d.setDate(d.getDate() - (days - i));
    h.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), price: +p.toFixed(2) });
  }
  h[h.length - 1].price = base;
  return h;
}

const STOCKS = {
  AAPL:  { ticker:"AAPL",  name:"Apple",             price:189.30, pct:1.14,   change:2.14,   open:187.16, high:190.05, low:186.82, vol:"58.2M", mktCap:"2.94T", pe:29.4, eps:6.44,  w52h:199.62, w52l:143.90, sector:"Technology",      beta:1.2, desc:"Makes iPhones, Macs, and services like the App Store." },
  MSFT:  { ticker:"MSFT",  name:"Microsoft",         price:378.85, pct:-0.32,  change:-1.22,  open:380.07, high:381.30, low:377.40, vol:"22.1M", mktCap:"2.81T", pe:34.1, eps:11.10, w52h:420.82, w52l:309.45, sector:"Technology",      beta:0.9, desc:"Builds Windows, Office, Azure cloud, and owns LinkedIn." },
  NVDA:  { ticker:"NVDA",  name:"NVIDIA",            price:840.00, pct:2.25,   change:18.50,  open:821.50, high:845.20, low:818.90, vol:"41.8M", mktCap:"2.07T", pe:68.2, eps:12.32, w52h:974.00, w52l:405.12, sector:"Technology",      beta:1.7, desc:"Makes GPUs for gaming, AI, and data centers." },
  GOOGL: { ticker:"GOOGL", name:"Alphabet",          price:155.60, pct:0.55,   change:0.85,   open:154.75, high:156.40, low:154.10, vol:"25.3M", mktCap:"1.94T", pe:24.8, eps:6.27,  w52h:191.75, w52l:120.21, sector:"Technology",      beta:1.1, desc:"Runs Google Search, YouTube, and Google Cloud." },
  META:  { ticker:"META",  name:"Meta",              price:512.40, pct:1.45,   change:7.30,   open:505.10, high:514.20, low:503.80, vol:"18.7M", mktCap:"1.31T", pe:26.3, eps:19.48, w52h:531.49, w52l:274.38, sector:"Technology",      beta:1.4, desc:"Owns Facebook, Instagram, WhatsApp, and is building the metaverse." },
  AMZN:  { ticker:"AMZN",  name:"Amazon",            price:182.40, pct:1.05,   change:1.90,   open:180.50, high:183.20, low:180.10, vol:"38.7M", mktCap:"1.90T", pe:60.1, eps:3.04,  w52h:201.20, w52l:118.35, sector:"Consumer",        beta:1.3, desc:"The world's largest online retailer and cloud provider (AWS)." },
  TSLA:  { ticker:"TSLA",  name:"Tesla",             price:175.20, pct:-2.12,  change:-3.80,  open:179.00, high:180.10, low:173.90, vol:"112.4M",mktCap:"557B",  pe:47.3, eps:3.70,  w52h:299.29, w52l:138.80, sector:"Consumer",        beta:2.1, desc:"Makes electric cars, solar panels, and energy storage systems." },
  JPM:   { ticker:"JPM",   name:"JPMorgan",          price:196.50, pct:0.61,   change:1.20,   open:195.30, high:197.40, low:195.00, vol:"9.8M",  mktCap:"566B",  pe:11.8, eps:16.65, w52h:210.27, w52l:141.46, sector:"Finance",         beta:1.1, desc:"America's largest bank by assets. Investment banking and retail." },
  BAC:   { ticker:"BAC",   name:"Bank of America",   price:36.80,  pct:-1.07,  change:-0.40,  open:37.20,  high:37.35,  low:36.60,  vol:"42.1M", mktCap:"284B",  pe:12.2, eps:3.02,  w52h:39.74,  w52l:24.96,  sector:"Finance",         beta:1.4, desc:"Major US retail and investment bank with 67M clients." },
  GS:    { ticker:"GS",    name:"Goldman Sachs",     price:448.20, pct:0.70,   change:3.10,   open:445.10, high:450.30, low:444.80, vol:"2.1M",  mktCap:"145B",  pe:13.4, eps:33.44, w52h:482.32, w52l:295.72, sector:"Finance",         beta:1.3, desc:"Elite investment bank known for trading, M&A, and asset management." },
  JNJ:   { ticker:"JNJ",   name:"J&J",               price:162.30, pct:-0.43,  change:-0.70,  open:163.00, high:163.20, low:161.90, vol:"7.6M",  mktCap:"390B",  pe:15.2, eps:10.68, w52h:175.97, w52l:143.13, sector:"Healthcare",      beta:0.6, desc:"Healthcare giant making pharmaceuticals, medical devices, and consumer products." },
  UNH:   { ticker:"UNH",   name:"UnitedHealth",      price:487.60, pct:0.49,   change:2.40,   open:485.20, high:489.10, low:484.80, vol:"3.2M",  mktCap:"452B",  pe:20.1, eps:24.26, w52h:554.48, w52l:430.62, sector:"Healthcare",      beta:0.7, desc:"Largest US health insurer covering 50M+ people." },
  XOM:   { ticker:"XOM",   name:"ExxonMobil",        price:118.40, pct:0.77,   change:0.90,   open:117.50, high:119.20, low:117.30, vol:"17.3M", mktCap:"474B",  pe:13.8, eps:8.58,  w52h:123.75, w52l:95.77,  sector:"Energy",          beta:0.9, desc:"World's largest publicly traded oil and gas company." },
  WMT:   { ticker:"WMT",   name:"Walmart",           price:64.20,  pct:0.78,   change:0.50,   open:63.70,  high:64.50,  low:63.60,  vol:"22.8M", mktCap:"516B",  pe:30.4, eps:2.11,  w52h:67.89,  w52l:48.62,  sector:"Consumer",        beta:0.6, desc:"World's largest retailer with 10,500+ stores and a growing e-commerce arm." },
  AMD:   { ticker:"AMD",   name:"AMD",               price:162.50, pct:2.65,   change:4.20,   open:158.30, high:163.40, low:157.80, vol:"55.1M", mktCap:"262B",  pe:43.7, eps:3.72,  w52h:227.30, w52l:134.27, sector:"Technology",      beta:1.9, desc:"Makes CPUs and GPUs competing directly with Intel and NVIDIA." },
  INTC:  { ticker:"INTC",  name:"Intel",             price:30.40,  pct:-2.56,  change:-0.80,  open:31.20,  high:31.30,  low:30.10,  vol:"66.3M", mktCap:"129B",  pe:28.1, eps:1.08,  w52h:51.28,  w52l:26.86,  sector:"Technology",      beta:1.1, desc:"Pioneer chip maker undergoing a major turnaround in manufacturing." },
  SPY:   { ticker:"SPY",   name:"S&P 500 ETF",       price:523.40, pct:0.60,   change:3.10,   open:520.30, high:524.10, low:520.10, vol:"78.2M", mktCap:"ETF",   pe:null, eps:null,  w52h:543.93, w52l:410.53, sector:"ETF",             beta:1.0, desc:"Tracks the 500 largest US companies. The most popular ETF in the world." },
  QQQ:   { ticker:"QQQ",   name:"NASDAQ ETF",        price:444.20, pct:1.09,   change:4.80,   open:439.40, high:445.30, low:438.90, vol:"44.6M", mktCap:"ETF",   pe:null, eps:null,  w52h:462.90, w52l:340.67, sector:"ETF",             beta:1.2, desc:"Tracks 100 largest NASDAQ companies. Heavy on tech stocks." },
  KO:    { ticker:"KO",    name:"Coca-Cola",         price:60.10,  pct:0.33,   change:0.20,   open:59.90,  high:60.30,  low:59.80,  vol:"14.2M", mktCap:"259B",  pe:22.8, eps:2.64,  w52h:63.48,  w52l:51.55,  sector:"Consumer",        beta:0.6, desc:"World's most recognized beverage brand, operating in 200+ countries." },
  NKE:   { ticker:"NKE",   name:"Nike",              price:92.40,  pct:-0.88,  change:-0.82,  open:93.22,  high:93.50,  low:91.80,  vol:"8.1M",  mktCap:"141B",  pe:21.4, eps:4.32,  w52h:123.49, w52l:70.75,  sector:"Consumer",        beta:1.1, desc:"World's largest sportswear brand making shoes, apparel, and equipment." },
  DIS:   { ticker:"DIS",   name:"Disney",            price:108.30, pct:0.42,   change:0.45,   open:107.85, high:109.10, low:107.60, vol:"11.2M", mktCap:"197B",  pe:35.2, eps:3.08,  w52h:123.74, w52l:78.73,  sector:"Consumer",        beta:1.2, desc:"Entertainment giant behind Disney+, Marvel, Star Wars, and theme parks." },
};
Object.values(STOCKS).forEach(s => { s.history = genHistory(s.price, 60, (s.beta||1) * 0.013); });

const INDICES = [
  { name:"S&P 500", val:"5,234", chg:"+0.57%", up:true  },
  { name:"NASDAQ",  val:"16,421", chg:"+0.82%", up:true  },
  { name:"DOW",     val:"39,127", chg:"+0.21%", up:true  },
  { name:"VIX",     val:"14.82",  chg:"-3.12%", up:false },
  { name:"BTC",     val:"67,420", chg:"+1.88%", up:true  },
  { name:"Gold",    val:"2,318",  chg:"+0.34%", up:true  },
];

const RISK = (beta, pe) => {
  const score = (beta || 1) + (pe ? (pe > 40 ? 1 : pe > 20 ? 0.5 : 0) : 0);
  if (score >= 2) return { label:"Aggressive", color:"#ef4444", bg:"#fef2f2" };
  if (score >= 1.2) return { label:"Moderate",   color:"#f59e0b", bg:"#fffbeb" };
  return { label:"Conservative", color:"#22c55e", bg:"#f0fdf4" };
};

const NEWS = {
  AAPL:  [{ id:1, title:"Apple Eyes AI in Next iPhone", source:"Bloomberg", time:"2h ago", body:"Apple planning on-device AI features for iPhone 17, leveraging new neural chips." },{ id:2, title:"Services Revenue Hits Record $24.2B", source:"Reuters", time:"5h ago", body:"App Store and Apple Music lead record services quarter." }],
  MSFT:  [{ id:1, title:"Copilot Surpasses 1M Enterprise Users", source:"TechCrunch", time:"3h ago", body:"Copilot for M365 continues rapid rollout across Fortune 500." },{ id:2, title:"Azure AI Revenue Up 28% YoY", source:"Bloomberg", time:"6h ago", body:"Cloud AI workloads driving Azure growth above expectations." }],
  NVDA:  [{ id:1, title:"H200 Demand Exceeds Supply", source:"Bloomberg", time:"1h ago", body:"AI chip backlog remains high with lead times extending to 52 weeks." },{ id:2, title:"Blackwell GPU Ships to Cloud Partners", source:"Reuters", time:"4h ago", body:"AWS, Google, Microsoft begin limited Blackwell deployments." }],
  TSLA:  [{ id:1, title:"Q1 Deliveries Miss Estimates by 7%", source:"Bloomberg", time:"2h ago", body:"Tesla delivered 386,810 vehicles, short of analyst consensus of 415,000." },{ id:2, title:"FSD v12 Gets Positive Reviews", source:"Ars Technica", time:"1d ago", body:"Testers report improved city driving in latest software update." }],
  META:  [{ id:1, title:"Meta AI Hits 600M Monthly Users", source:"Bloomberg", time:"1h ago", body:"AI assistant shows strong retention across WhatsApp and Instagram." }],
  GOOGL: [{ id:1, title:"Search Revenue Beats Despite AI Concerns", source:"Bloomberg", time:"3h ago", body:"Search revenue grew 14% YoY, defying fears of chatbot erosion." }],
  AMZN:  [{ id:1, title:"AWS Announces Singapore AI Region", source:"Reuters", time:"2h ago", body:"Amazon expands cloud AI infrastructure in Southeast Asia." }],
  JPM:   [{ id:1, title:"Q1 Net Income Up 12% YoY", source:"Reuters", time:"3h ago", body:"Strong IB fees and resilient consumer credit drive better results." }],
};
const fallbackNews = t => [{ id:1, title:`${t} Reports Earnings Next Week`, source:"Reuters", time:"4h ago", body:"Analysts watching guidance closely." }];

const SECTOR_COLORS = { Technology:"#6366f1", Finance:"#f59e0b", Healthcare:"#10b981", Energy:"#f97316", Consumer:"#ec4899", ETF:"#94a3b8" };

// ─────────────────────────────────────────────
// PAPER TRADING ENGINE (deterministic)
// ─────────────────────────────────────────────
const STARTING_BALANCE = 10000;

function calcPortfolio(trades, stockData) {
  const positions = {};
  trades.forEach(t => {
    if (!positions[t.ticker]) positions[t.ticker] = { ticker:t.ticker, shares:0, totalCost:0 };
    if (t.type === "buy") {
      positions[t.ticker].shares += t.shares;
      positions[t.ticker].totalCost += t.shares * t.price;
    } else {
      positions[t.ticker].shares -= t.shares;
      positions[t.ticker].totalCost -= t.shares * t.price;
    }
  });
  const held = Object.values(positions).filter(p => p.shares > 0).map(p => {
    const s = stockData[p.ticker];
    const value = s ? s.price * p.shares : 0;
    const avgCost = p.totalCost / p.shares;
    const gain = value - p.totalCost;
    const gainPct = p.totalCost > 0 ? (gain / p.totalCost) * 100 : 0;
    return { ...p, s, value, avgCost, gain, gainPct };
  });
  const investedValue = held.reduce((a, p) => a + p.value, 0);
  return { positions: held, investedValue };
}

function calcCash(trades, startingBalance) {
  return trades.reduce((cash, t) => {
    return t.type === "buy"
      ? cash - t.shares * t.price
      : cash + t.shares * t.price;
  }, startingBalance);
}

// Mock leaderboard
const LEADERBOARD = [
  { name:"Sofia K.",    balance:11840, gain:18.4, avatar:"SK" },
  { name:"Liam T.",     balance:11620, gain:16.2, avatar:"LT" },
  { name:"Emma R.",     balance:11340, gain:13.4, avatar:"ER" },
  { name:"You",         balance:0,     gain:0,    avatar:"ME", isMe:true },
  { name:"Noah P.",     balance:10780, gain:7.8,  avatar:"NP" },
  { name:"Ava M.",      balance:10540, gain:5.4,  avatar:"AM" },
];

// ─────────────────────────────────────────────
// AI SERVICE
// ─────────────────────────────────────────────
async function callAI(system, message) {
  const res = await fetch("/api/ai", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ system, message }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

async function aiExplainStock(ticker, stock) {
  return callAI(
    "You are a friendly finance teacher for students. Use simple language, no jargon. Keep it under 100 words.",
    `Explain ${ticker} (${stock.name}) to a student who knows nothing about investing. Current price: $${stock.price}. What does this company do and why do people invest in it?`
  );
}

async function aiSummarizeNews(ticker, news, stock) {
  const txt = news.map(n => `- ${n.title}: ${n.body}`).join("\n");
  return callAI(
    "You are a concise financial news analyst for students. Use bullet points. Be simple and clear. Never invent data.",
    `Summarize news for ${ticker} ($${stock.price}):\n${txt}\n\nFormat:\n**Key Themes**\n• ...\n**What this means**\n• ...\n**Sentiment**: [Bullish/Neutral/Bearish] — one sentence`
  );
}

async function aiInvestmentView(ticker, stock, news) {
  const txt = news.map(n => `- ${n.title}`).join("\n");
  return callAI(
    "You are a balanced research analyst for student investors. Use plain language. Always add disclaimer.",
    `Give a simple investment view on ${ticker} (${stock.name}). Price: $${stock.price}, P/E: ${stock.pe}, Beta: ${stock.beta}, Sector: ${stock.sector}.\nNews: ${txt}\n\nFormat:\n**Why it could go up**\n• ...\n**Why it could go down**\n• ...\n**Risk level**: ${RISK(stock.beta, stock.pe).label}\n*Not financial advice — this is a paper trading simulation.*`
  );
}

async function aiChat(msg, context) {
  return callAI(
    "You are a friendly finance teacher for students using a paper trading app. Only use provided data. Never invent prices. Keep responses short and clear.",
    `Context:\n${context}\n\nStudent question: ${msg}`
  );
}

// ─────────────────────────────────────────────
// LIVE DATA
// ─────────────────────────────────────────────
async function fetchQuote(ticker) {
  try {
    const res = await fetch(`/api/quote?ticker=${ticker}`);
    if (!res.ok) return null;
    const d = await res.json();
    return d.error ? null : d;
  } catch { return null; }
}
async function fetchHistory(ticker) {
  try {
    const res = await fetch(`/api/history?ticker=${ticker}`);
    if (!res.ok) return null;
    const d = await res.json();
    return Array.isArray(d) && d.length > 0 ? d : null;
  } catch { return null; }
}

// ─────────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────────
const f = {
  price: n => `$${(+n).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}`,
  pct:   n => `${n >= 0 ? "+" : ""}${(+n).toFixed(2)}%`,
  chg:   n => `${n >= 0 ? "+" : ""}${(+n).toFixed(2)}`,
  shares: n => n === 1 ? "1 share" : `${n} shares`,
};

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const T = {
  bg:      "#f9f8f6",
  surface: "#ffffff",
  border:  "#ede9e0",
  border2: "#d8d2c5",
  text:    "#1a1814",
  muted:   "#6b6560",
  dim:     "#a09890",
  accent:  "#4f46e5",
  accentBg:"#eef2ff",
  up:      "#16a34a",
  upBg:    "#f0fdf4",
  down:    "#dc2626",
  downBg:  "#fef2f2",
  radius:  14,
  radiusSm:8,
};

// ─────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────
const ChartTip = ({ active, payload }) => active && payload?.length ? (
  <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
    <p style={{ color:T.text, fontSize:13, margin:0, fontWeight:500 }}>{f.price(payload[0].value)}</p>
    <p style={{ color:T.muted, fontSize:11, margin:0 }}>{payload[0].payload.date}</p>
  </div>
) : null;

function AIPanel({ text, loading, error, label }) {
  if (!loading && !text && !error) return null;
  return (
    <div style={{ background:T.accentBg, border:`1px solid #c7d2fe`, borderRadius:T.radius, padding:16, marginTop:12 }}>
      <div style={{ fontSize:10, color:T.accent, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>✦ {label}</div>
      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${T.accent}`, borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }} />
          <span style={{ fontSize:13, color:T.muted }}>Analyzing…</span>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {error && <p style={{ fontSize:13, color:T.down, margin:0 }}>Error: {error}</p>}
      {text && text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height:4 }} />;
        if (line.startsWith("**") && line.endsWith("**"))
          return <p key={i} style={{ fontSize:11, color:T.accent, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", margin:"10px 0 3px" }}>{line.replace(/\*\*/g,"")}</p>;
        if (line.startsWith("• ") || line.startsWith("- "))
          return <p key={i} style={{ fontSize:13, color:T.text, margin:"3px 0 3px 10px", display:"flex", gap:8, lineHeight:1.5 }}><span style={{ color:T.accent, flexShrink:0 }}>▸</span>{line.slice(2)}</p>;
        if (line.startsWith("*") && line.endsWith("*"))
          return <p key={i} style={{ fontSize:11, color:T.muted, fontStyle:"italic", margin:"10px 0 0", borderTop:`1px solid #c7d2fe`, paddingTop:8 }}>{line.replace(/\*/g,"")}</p>;
        const sc = line.includes("Bullish")?T.up:line.includes("Bearish")?T.down:"#d97706";
        return <p key={i} style={{ fontSize:13, color:line.includes("Sentiment")||line.includes("Risk")?sc:T.text, margin:"3px 0", fontWeight:line.includes("Sentiment")||line.includes("Risk")?600:400, lineHeight:1.5 }}>{line.replace(/\*\*/g,"")}</p>;
      })}
    </div>
  );
}

function Tag({ label, color, bg }) {
  return <span style={{ background:bg||"#f1f5f9", color:color||T.muted, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:600 }}>{label}</span>;
}

function Avatar({ initials, size=32, color=T.accent }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:700, color, flexShrink:0 }}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────
// BUY / SELL MODAL
// ─────────────────────────────────────────────
function TradeModal({ ticker, type, stock, cash, onConfirm, onClose, existingShares }) {
  const [shares, setShares] = useState(1);
  const cost = shares * stock.price;
  const maxBuy = Math.floor(cash / stock.price);
  const canBuy = type === "buy" ? cost <= cash && shares > 0 : shares > 0 && shares <= existingShares;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(2px)" }}>
      <div style={{ background:T.surface, borderRadius:20, padding:28, width:340, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <h3 style={{ fontSize:18, fontWeight:700, margin:0, color:T.text }}>{type === "buy" ? "Buy" : "Sell"} {ticker}</h3>
            <p style={{ fontSize:13, color:T.muted, margin:0 }}>{stock.name} · {f.price(stock.price)}</p>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, color:T.dim, cursor:"pointer" }}>×</button>
        </div>

        <div style={{ background:T.bg, borderRadius:T.radius, padding:16, marginBottom:16 }}>
          <label style={{ fontSize:12, color:T.muted, fontWeight:600, display:"block", marginBottom:8 }}>NUMBER OF SHARES</label>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={()=>setShares(Math.max(1,shares-1))} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, fontSize:18, cursor:"pointer", color:T.text }}>−</button>
            <input type="number" value={shares} min={1} max={type==="buy"?maxBuy:existingShares}
              onChange={e=>setShares(Math.max(1,Math.min(+e.target.value, type==="buy"?maxBuy:existingShares)))}
              style={{ flex:1, textAlign:"center", fontSize:22, fontWeight:700, border:`1px solid ${T.border}`, borderRadius:10, padding:"8px 0", color:T.text, background:T.surface, outline:"none" }} />
            <button onClick={()=>setShares(Math.min((type==="buy"?maxBuy:existingShares),shares+1))} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, fontSize:18, cursor:"pointer", color:T.text }}>+</button>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          {[
            ["Total Cost", f.price(cost)],
            [type==="buy"?"Cash After":"Cash After", f.price(type==="buy"?cash-cost:cash+cost)],
          ].map(([label,val])=>(
            <div key={label} style={{ background:T.bg, borderRadius:T.radiusSm, padding:"10px 12px" }}>
              <p style={{ fontSize:11, color:T.muted, margin:"0 0 3px", fontWeight:600 }}>{label.toUpperCase()}</p>
              <p style={{ fontSize:14, fontWeight:700, color:T.text, margin:0 }}>{val}</p>
            </div>
          ))}
        </div>

        {type==="buy" && shares > maxBuy && <p style={{ fontSize:12, color:T.down, marginBottom:12 }}>Not enough cash. Max: {maxBuy} shares.</p>}
        {type==="sell" && shares > existingShares && <p style={{ fontSize:12, color:T.down, marginBottom:12 }}>You only own {existingShares} shares.</p>}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"12px", borderRadius:12, border:`1px solid ${T.border}`, background:T.surface, fontSize:14, fontWeight:600, cursor:"pointer", color:T.muted }}>Cancel</button>
          <button onClick={()=>canBuy&&onConfirm(shares)} disabled={!canBuy}
            style={{ flex:2, padding:"12px", borderRadius:12, border:"none", background:type==="buy"?T.up:T.down, fontSize:14, fontWeight:700, cursor:canBuy?"pointer":"not-allowed", color:"#fff", opacity:canBuy?1:0.5 }}>
            {type==="buy"?`Buy ${f.shares(shares)}`:`Sell ${f.shares(shares)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [view, setView]           = useState("home");
  const [selected, setSelected]   = useState(null);
  const [watchlist, setWatchlist] = useState(["AAPL","NVDA","TSLA","META","SPY"]);
  const [trades, setTrades]       = useState([]);
  const [modal, setModal]         = useState(null); // { ticker, type }
  const [aiState, setAiState]     = useState({});
  const [chat, setChat]           = useState([{ role:"assistant", content:"Hey! 👋 I'm your paper trading assistant. Ask me anything about stocks, your portfolio, or how markets work." }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [addTicker, setAddTicker] = useState("");
  const [liveStocks, setLiveStocks] = useState({});
  const [liveLoading, setLiveLoading] = useState(true);
  const [filterSector, setFilterSector] = useState("All");
  const [sortBy, setSortBy]       = useState({ col:"pct", dir:-1 });
  const [toast, setToast]         = useState(null);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [chat]);

  useEffect(() => {
    async function load() {
      setLiveLoading(true);
      const tickers = Object.keys(STOCKS);
      const [quotes, histories] = await Promise.all([
        Promise.all(tickers.map(t => fetchQuote(t))),
        Promise.all(tickers.map(t => fetchHistory(t))),
      ]);
      const live = {};
      tickers.forEach((t, i) => {
        live[t] = { ...STOCKS[t], ...(quotes[i] || {}), history: histories[i] || STOCKS[t].history };
      });
      setLiveStocks(live);
      setLiveLoading(false);
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const LIVE = useMemo(() => Object.keys(STOCKS).reduce((acc, t) => {
    acc[t] = liveStocks[t] ?? STOCKS[t];
    return acc;
  }, {}), [liveStocks]);

  const cash = useMemo(() => calcCash(trades, STARTING_BALANCE), [trades]);
  const { positions, investedValue } = useMemo(() => calcPortfolio(trades, LIVE), [trades, LIVE]);
  const totalValue = cash + investedValue;
  const totalGain  = totalValue - STARTING_BALANCE;
  const totalGainPct = (totalGain / STARTING_BALANCE) * 100;

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setAI = (key, val) => setAiState(p => ({ ...p, [key]: { ...p[key], ...val } }));

  const handleAI = async (type, ticker) => {
    const key = `${type}_${ticker}`;
    setAI(key, { loading:true, error:null, text:null });
    try {
      const stock = LIVE[ticker];
      const news  = NEWS[ticker] || fallbackNews(ticker);
      let text;
      if (type === "explain") text = await aiExplainStock(ticker, stock);
      else if (type === "news") text = await aiSummarizeNews(ticker, news, stock);
      else text = await aiInvestmentView(ticker, stock, news);
      setAI(key, { loading:false, text });
    } catch(e) { setAI(key, { loading:false, error:e.message }); }
  };

  const handleTrade = (ticker, type, shares) => {
    const price = LIVE[ticker]?.price || STOCKS[ticker].price;
    setTrades(p => [...p, { ticker, type, shares, price, date: new Date().toISOString() }]);
    setModal(null);
    showToast(`${type === "buy" ? "Bought" : "Sold"} ${f.shares(shares)} of ${ticker} at ${f.price(price)}`);
  };

  const openStock = t => { setSelected(t); setView("stock"); };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim(); setChatInput("");
    setChat(p => [...p, { role:"user", content:msg }]);
    setChatLoading(true);
    const ctx = `Paper trading balance: ${f.price(totalValue)} (started with $10,000, gain: ${f.pct(totalGainPct)})\nCash: ${f.price(cash)}\nPositions:\n${positions.map(p=>`  ${p.ticker}: ${p.shares} shares, value ${f.price(p.value)}, gain ${f.pct(p.gainPct)}`).join("\n")}\nWatchlist: ${watchlist.join(", ")}`;
    try {
      const reply = await aiChat(msg, ctx);
      setChat(p => [...p, { role:"assistant", content:reply }]);
    } catch(e) { setChat(p => [...p, { role:"assistant", content:`Sorry, I hit an error: ${e.message}` }]); }
    setChatLoading(false);
  };

  const leaderboard = LEADERBOARD.map(l => l.isMe
    ? { ...l, balance:totalValue, gain:totalGainPct }
    : l
  ).sort((a,b) => b.balance - a.balance).map((l,i) => ({...l, rank:i+1}));

  const sectors = ["All", ...new Set(Object.values(LIVE).map(s=>s.sector))];
  const screenerData = useMemo(() => Object.values(LIVE)
    .filter(s => filterSector === "All" || s.sector === filterSector)
    .sort((a,b) => {
      const av = a[sortBy.col]??0, bv = b[sortBy.col]??0;
      return (av>bv?1:-1)*sortBy.dir;
    }), [LIVE, filterSector, sortBy]);

  const navItems = [
    { id:"home",      icon:"⌂",  label:"Home"       },
    { id:"trade",     icon:"◎",  label:"Trade"      },
    { id:"portfolio", icon:"▤",  label:"Portfolio"  },
    { id:"screener",  icon:"⊞",  label:"Screener"   },
    { id:"chat",      icon:"◉",  label:"AI Chat"    },
  ];

  // ── STYLES ──
  const card = (extra={}) => ({ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radius, padding:18, ...extra });
  const cardSm = (extra={}) => ({ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:12, ...extra });
  const label = { fontSize:11, color:T.muted, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 };
  const SH = ({ col, children }) => (
    <th onClick={()=>setSortBy(s=>({ col, dir:s.col===col?-s.dir:-1 }))}
      style={{ fontSize:11, color:sortBy.col===col?T.accent:T.muted, textAlign:"right", padding:"0 10px 10px 0", fontWeight:600, cursor:"pointer", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>
      {children} {sortBy.col===col?(sortBy.dir===-1?"↓":"↑"):""}
    </th>
  );

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'DM Rounded', 'Nunito', 'Varela Round', system-ui, sans-serif", color:T.text }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:toast.type==="success"?T.up:T.down, color:"#fff", borderRadius:12, padding:"10px 20px", fontSize:13, fontWeight:600, zIndex:2000, boxShadow:"0 4px 20px rgba(0,0,0,0.15)" }}>
          {toast.msg}
        </div>
      )}

      {/* Trade Modal */}
      {modal && (
        <TradeModal
          ticker={modal.ticker} type={modal.type}
          stock={LIVE[modal.ticker]} cash={cash}
          existingShares={positions.find(p=>p.ticker===modal.ticker)?.shares||0}
          onConfirm={(shares)=>handleTrade(modal.ticker,modal.type,shares)}
          onClose={()=>setModal(null)}
        />
      )}

      {/* NAV */}
      <nav style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, height:56, display:"flex", alignItems:"center", padding:"0 24px", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:10, background:T.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff", fontWeight:800 }}>M</div>
          <span style={{ fontSize:16, fontWeight:800, color:T.text, letterSpacing:"-0.02em" }}>Meridian</span>
          <Tag label="Paper Trading" color={T.accent} bg={T.accentBg} />
        </div>
        <div style={{ display:"flex", gap:2 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={()=>setView(n.id)} style={{ padding:"6px 14px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", border:"none", background:view===n.id||(view==="stock"&&n.id==="trade")?T.accentBg:"transparent", color:view===n.id||(view==="stock"&&n.id==="trade")?T.accent:T.muted, transition:"all 0.15s" }}>
              {n.label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ textAlign:"right" }}>
            <p style={{ fontSize:11, color:T.muted, margin:0 }}>Balance</p>
            <p style={{ fontSize:15, fontWeight:800, color:T.text, margin:0 }}>{f.price(totalValue)}</p>
          </div>
          <div style={{ width:8, height:8, borderRadius:"50%", background:liveLoading?"#f59e0b":T.up }} title={liveLoading?"Loading live data":"Live data"} />
        </div>
      </nav>

      {/* Indices ticker */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:"6px 24px", display:"flex", gap:24, overflowX:"auto" }}>
        {INDICES.map(i => (
          <div key={i.name} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:11, color:T.muted, fontWeight:500 }}>{i.name}</span>
            <span style={{ fontSize:12, fontWeight:700, color:T.text }}>{i.val}</span>
            <span style={{ fontSize:11, color:i.up?T.up:T.down, fontWeight:600 }}>{i.chg}</span>
          </div>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:20 }}>

        {/* ── HOME ── */}
        {view === "home" && (() => {
          const gainers = Object.values(LIVE).filter(s=>s.pct>0).sort((a,b)=>b.pct-a.pct).slice(0,4);
          const losers  = Object.values(LIVE).filter(s=>s.pct<0).sort((a,b)=>a.pct-b.pct).slice(0,4);
          return (
            <div>
              {/* Welcome + Portfolio snapshot */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:20 }}>
                {[
                  { label:"Total Balance", value:f.price(totalValue), sub: totalGain>=0?`▲ ${f.price(Math.abs(totalGain))} (${f.pct(totalGainPct)})`:`▼ ${f.price(Math.abs(totalGain))} (${f.pct(totalGainPct)})`, subColor:totalGain>=0?T.up:T.down },
                  { label:"Cash Available", value:f.price(cash), sub:`${((cash/STARTING_BALANCE)*100).toFixed(0)}% of portfolio`, subColor:T.muted },
                  { label:"Invested", value:f.price(investedValue), sub:`${positions.length} position${positions.length!==1?"s":""}`, subColor:T.muted },
                  { label:"Starting Balance", value:"$10,000.00", sub:"Paper trading", subColor:T.muted },
                ].map(c => (
                  <div key={c.label} style={card()}>
                    <p style={label}>{c.label}</p>
                    <p style={{ fontSize:20, fontWeight:800, color:T.text, margin:"0 0 3px", letterSpacing:"-0.02em" }}>{c.value}</p>
                    <p style={{ fontSize:12, color:c.subColor, margin:0, fontWeight:500 }}>{c.sub}</p>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 340px", gap:16 }}>
                {/* Gainers */}
                <div style={card()}>
                  <p style={label}>🟢 Top Gainers</p>
                  {gainers.map(s => (
                    <div key={s.ticker} onClick={()=>openStock(s.ticker)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:T.accentBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:T.accent }}>{s.ticker.slice(0,2)}</div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:700, color:T.text, margin:0 }}>{s.ticker}</p>
                          <p style={{ fontSize:11, color:T.muted, margin:0 }}>{s.name}</p>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <p style={{ fontSize:13, fontWeight:700, color:T.text, margin:0 }}>{f.price(s.price)}</p>
                        <p style={{ fontSize:12, color:T.up, fontWeight:700, margin:0 }}>{f.pct(s.pct)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Losers */}
                <div style={card()}>
                  <p style={label}>🔴 Top Losers</p>
                  {losers.map(s => (
                    <div key={s.ticker} onClick={()=>openStock(s.ticker)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:36, height:36, borderRadius:10, background:"#fef2f2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:T.down }}>{s.ticker.slice(0,2)}</div>
                        <div>
                          <p style={{ fontSize:13, fontWeight:700, color:T.text, margin:0 }}>{s.ticker}</p>
                          <p style={{ fontSize:11, color:T.muted, margin:0 }}>{s.name}</p>
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <p style={{ fontSize:13, fontWeight:700, color:T.text, margin:0 }}>{f.price(s.price)}</p>
                        <p style={{ fontSize:12, color:T.down, fontWeight:700, margin:0 }}>{f.pct(s.pct)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Leaderboard */}
                <div style={card()}>
                  <p style={label}>🏆 Leaderboard</p>
                  {leaderboard.map(l => (
                    <div key={l.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}`, background:l.isMe?T.accentBg:"transparent", borderRadius:l.isMe?8:0, padding:l.isMe?"8px 10px":"8px 0" }}>
                      <span style={{ fontSize:13, fontWeight:800, color:l.rank<=3?"#f59e0b":T.muted, width:18, flexShrink:0 }}>#{l.rank}</span>
                      <Avatar initials={l.avatar} size={30} color={l.isMe?T.accent:"#94a3b8"} />
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13, fontWeight:l.isMe?700:500, color:T.text, margin:0 }}>{l.name}{l.isMe?" (you)":""}</p>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <p style={{ fontSize:12, fontWeight:700, color:T.text, margin:0 }}>{f.price(l.balance)}</p>
                        <p style={{ fontSize:11, color:l.gain>=0?T.up:T.down, margin:0, fontWeight:600 }}>{f.pct(l.gain)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* News */}
              <div style={{ ...card(), marginTop:16 }}>
                <p style={label}>📰 Latest News</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                  {Object.entries(NEWS).flatMap(([t,items])=>items.map(n=>({...n,ticker:t}))).slice(0,6).map((n,i) => (
                    <div key={i} onClick={()=>openStock(n.ticker)} style={{ borderLeft:`3px solid ${SECTOR_COLORS[LIVE[n.ticker]?.sector]||T.accent}`, paddingLeft:12, cursor:"pointer" }}>
                      <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:"0 0 3px", lineHeight:1.4 }}>{n.title}</p>
                      <p style={{ fontSize:11, color:T.muted, margin:0 }}><span style={{ fontWeight:700, color:SECTOR_COLORS[LIVE[n.ticker]?.sector]||T.accent }}>{n.ticker}</span> · {n.source} · {n.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TRADE (Watchlist) ── */}
        {view === "trade" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ fontSize:20, fontWeight:800, margin:0, color:T.text }}>Markets</h2>
              <div style={{ display:"flex", gap:8 }}>
                <input value={addTicker} onChange={e=>setAddTicker(e.target.value.toUpperCase())} placeholder="Add ticker…"
                  style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"8px 14px", fontSize:13, color:T.text, outline:"none", width:120 }}
                  onKeyDown={e=>{ if(e.key==="Enter"&&LIVE[addTicker]){setWatchlist(p=>[...new Set([...p,addTicker])]);setAddTicker("");}}} />
                <button onClick={()=>{ if(LIVE[addTicker]){setWatchlist(p=>[...new Set([...p,addTicker])]);setAddTicker("");}}}
                  style={{ background:T.accent, border:"none", borderRadius:10, padding:"8px 16px", fontSize:13, fontWeight:700, color:"#fff", cursor:"pointer" }}>+</button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
              {watchlist.map(t => {
                const s = LIVE[t]; if(!s) return null;
                const up = s.pct >= 0;
                const risk = RISK(s.beta, s.pe);
                const pos = positions.find(p=>p.ticker===t);
                return (
                  <div key={t} style={card({ cursor:"pointer", transition:"box-shadow 0.15s" })}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)"}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                    <div onClick={()=>openStock(t)}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:40, height:40, borderRadius:12, background:T.accentBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:T.accent }}>{t.slice(0,2)}</div>
                          <div>
                            <p style={{ fontSize:14, fontWeight:800, color:T.text, margin:0 }}>{t}</p>
                            <p style={{ fontSize:11, color:T.muted, margin:0 }}>{s.name}</p>
                          </div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();setWatchlist(p=>p.filter(x=>x!==t));}} style={{ background:"none", border:"none", color:T.dim, cursor:"pointer", fontSize:18, padding:0 }}>×</button>
                      </div>
                      <div style={{ height:50, marginBottom:10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={s.history.slice(-20)}>
                            <Line type="monotone" dataKey="price" stroke={up?T.up:T.down} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:10 }}>
                        <div>
                          <p style={{ fontSize:20, fontWeight:800, color:T.text, margin:0 }}>{f.price(s.price)}</p>
                          <p style={{ fontSize:12, color:up?T.up:T.down, fontWeight:700, margin:0 }}>{f.pct(s.pct)} today</p>
                        </div>
                        <Tag label={risk.label} color={risk.color} bg={risk.bg} />
                      </div>
                      {pos && (
                        <div style={{ background:pos.gain>=0?T.upBg:T.downBg, borderRadius:8, padding:"6px 10px", marginBottom:10, display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontSize:11, color:T.muted }}>You own {pos.shares} shares</span>
                          <span style={{ fontSize:11, fontWeight:700, color:pos.gain>=0?T.up:T.down }}>{f.pct(pos.gainPct)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <button onClick={()=>setModal({ticker:t,type:"buy"})} style={{ padding:"9px", borderRadius:10, border:"none", background:T.up, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Buy</button>
                      <button onClick={()=>pos?setModal({ticker:t,type:"sell"}):null} style={{ padding:"9px", borderRadius:10, border:`1px solid ${T.border}`, background:pos?T.surface:"#f8f8f8", color:pos?T.down:T.dim, fontSize:13, fontWeight:700, cursor:pos?"pointer":"not-allowed" }}>Sell</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STOCK DETAIL ── */}
        {view === "stock" && selected && (() => {
          const s = LIVE[selected]; if(!s) return null;
          const up = s.pct >= 0;
          const risk = RISK(s.beta, s.pe);
          const news = NEWS[selected] || fallbackNews(selected);
          const pos  = positions.find(p=>p.ticker===selected);
          const newsAI = aiState[`news_${selected}`]||{};
          const viewAI = aiState[`view_${selected}`]||{};
          const explainAI = aiState[`explain_${selected}`]||{};

          return (
            <div>
              <button onClick={()=>setView("trade")} style={{ background:"none", border:"none", color:T.accent, cursor:"pointer", fontSize:13, fontWeight:600, padding:0, marginBottom:16 }}>← Back to Markets</button>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16 }}>
                <div>
                  {/* Header */}
                  <div style={{ ...card(), marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                          <h1 style={{ fontSize:28, fontWeight:800, color:T.text, margin:0 }}>{s.ticker}</h1>
                          <span style={{ fontSize:16, color:T.muted, fontWeight:400 }}>{s.name}</span>
                          <Tag label={s.sector} color={SECTOR_COLORS[s.sector]} bg={SECTOR_COLORS[s.sector]+"22"} />
                          <Tag label={risk.label} color={risk.color} bg={risk.bg} />
                        </div>
                        <div style={{ display:"flex", alignItems:"baseline", gap:12 }}>
                          <span style={{ fontSize:32, fontWeight:800, color:T.text, letterSpacing:"-0.03em" }}>{f.price(s.price)}</span>
                          <span style={{ fontSize:16, fontWeight:700, color:up?T.up:T.down }}>{f.chg(s.change)} ({f.pct(s.pct)})</span>
                        </div>
                        {/* Plain English description */}
                        <p style={{ fontSize:13, color:T.muted, margin:"8px 0 0", lineHeight:1.5, maxWidth:500 }}>{s.desc}</p>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        {!watchlist.includes(selected)
                          ? <button onClick={()=>setWatchlist(p=>[...p,selected])} style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, fontSize:13, fontWeight:600, cursor:"pointer", color:T.muted }}>+ Watchlist</button>
                          : <button onClick={()=>setWatchlist(p=>p.filter(t=>t!==selected))} style={{ padding:"8px 16px", borderRadius:10, border:`1px solid ${T.up}`, background:T.upBg, fontSize:13, fontWeight:600, cursor:"pointer", color:T.up }}>✓ Watching</button>}
                        <button onClick={()=>setModal({ticker:selected,type:"buy"})} style={{ padding:"8px 20px", borderRadius:10, border:"none", background:T.up, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Buy</button>
                        {pos && <button onClick={()=>setModal({ticker:selected,type:"sell"})} style={{ padding:"8px 20px", borderRadius:10, border:`1px solid ${T.down}`, background:T.downBg, color:T.down, fontSize:13, fontWeight:700, cursor:"pointer" }}>Sell</button>}
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div style={{ ...card(), marginBottom:14 }}>
                    <p style={label}>60-Day Price Chart</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={s.history}>
                        <defs>
                          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={up?T.up:T.down} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={up?T.up:T.down} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize:10, fill:T.muted }} tickLine={false} axisLine={false} interval={9} />
                        <YAxis tick={{ fontSize:10, fill:T.muted }} tickLine={false} axisLine={false} domain={["auto","auto"]} tickFormatter={v=>`$${v}`} width={55} />
                        <Tooltip content={<ChartTip />} />
                        <Area type="monotone" dataKey="price" stroke={up?T.up:T.down} strokeWidth={2.5} fill="url(#sg)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stats */}
                  <div style={{ ...card(), marginBottom:14 }}>
                    <p style={label}>Key Statistics</p>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
                      {[["Open",f.price(s.open)],["High",f.price(s.high)],["Low",f.price(s.low)],["Volume",s.vol],["Mkt Cap",s.mktCap],["P/E",s.pe??"-"],["EPS",s.eps?f.price(s.eps):"-"],["Beta",s.beta]].map(([k,v])=>(
                        <div key={k} style={{ background:T.bg, borderRadius:T.radiusSm, padding:"10px 12px" }}>
                          <p style={{ ...label, margin:"0 0 3px" }}>{k}</p>
                          <p style={{ fontSize:14, fontWeight:700, color:T.text, margin:0 }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    {/* 52W Range */}
                    <div style={{ marginTop:14 }}>
                      <p style={{ ...label, margin:"0 0 8px" }}>52-Week Range</p>
                      <div style={{ position:"relative", height:6, background:T.border, borderRadius:3 }}>
                        <div style={{ width:`${((s.price-s.w52l)/(s.w52h-s.w52l))*100}%`, height:"100%", background:up?T.up:T.down, borderRadius:3, opacity:0.4 }} />
                        <div style={{ position:"absolute", left:`${((s.price-s.w52l)/(s.w52h-s.w52l))*100}%`, top:-4, transform:"translateX(-50%)", width:14, height:14, borderRadius:"50%", background:up?T.up:T.down, border:`2px solid ${T.surface}` }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                        <span style={{ fontSize:11, color:T.muted }}>{f.price(s.w52l)}</span>
                        <span style={{ fontSize:11, fontWeight:700, color:T.text }}>{f.price(s.price)}</span>
                        <span style={{ fontSize:11, color:T.muted }}>{f.price(s.w52h)}</span>
                      </div>
                    </div>
                  </div>

                  {/* News */}
                  <div style={card()}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <p style={{ ...label, margin:0 }}>Recent News</p>
                      <button onClick={()=>handleAI("news",selected)} style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, fontSize:12, fontWeight:600, cursor:"pointer", color:T.accent }} disabled={newsAI.loading}>
                        {newsAI.loading?"Analyzing…":"✦ Summarize"}
                      </button>
                    </div>
                    {news.map(n=>(
                      <div key={n.id} style={{ borderLeft:`3px solid ${SECTOR_COLORS[s.sector]||T.accent}`, paddingLeft:12, marginBottom:14 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:T.text, margin:"0 0 3px", lineHeight:1.4 }}>{n.title}</p>
                        <p style={{ fontSize:12, color:T.muted, margin:"0 0 3px", lineHeight:1.5 }}>{n.body}</p>
                        <p style={{ fontSize:11, color:T.dim, margin:0 }}>{n.source} · {n.time}</p>
                      </div>
                    ))}
                    <AIPanel {...newsAI} label="AI News Summary" />
                  </div>
                </div>

                {/* RIGHT SIDEBAR */}
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {/* Your position */}
                  {pos && (
                    <div style={{ ...card(), border:`1px solid ${T.up}44`, background:T.upBg }}>
                      <p style={label}>Your Position</p>
                      {[["Shares",pos.shares],["Avg Cost",f.price(pos.avgCost)],["Value",f.price(pos.value)],["P&L",<span style={{color:pos.gain>=0?T.up:T.down,fontWeight:700}}>{f.price(pos.gain)}</span>],["Return",<span style={{color:pos.gainPct>=0?T.up:T.down,fontWeight:700}}>{f.pct(pos.gainPct)}</span>]].map(([k,v],i)=>(
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.border}` }}>
                          <span style={{ fontSize:12, color:T.muted }}>{k}</span>
                          <span style={{ fontSize:13, fontWeight:600, color:T.text }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Quick trade */}
                  <div style={card()}>
                    <p style={label}>Quick Trade</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      <button onClick={()=>setModal({ticker:selected,type:"buy"})} style={{ padding:"12px", borderRadius:12, border:"none", background:T.up, color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer" }}>Buy {selected}</button>
                      <button onClick={()=>pos?setModal({ticker:selected,type:"sell"}):null} style={{ padding:"12px", borderRadius:12, border:`1px solid ${T.border}`, background:pos?T.surface:T.bg, color:pos?T.down:T.dim, fontSize:14, fontWeight:700, cursor:pos?"pointer":"not-allowed" }}>
                        {pos?`Sell ${selected}`:"No position to sell"}
                      </button>
                    </div>
                    <p style={{ fontSize:11, color:T.dim, margin:"10px 0 0", textAlign:"center" }}>Paper trading only — no real money</p>
                  </div>

                  {/* AI Analysis */}
                  <div style={card()}>
                    <p style={label}>AI Analysis</p>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      <button onClick={()=>handleAI("explain",selected)} style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, fontSize:12, fontWeight:600, cursor:"pointer", color:T.accent, textAlign:"left" }} disabled={explainAI.loading}>
                        💡 {explainAI.loading?"Loading…":"What does this company do?"}
                      </button>
                      <button onClick={()=>handleAI("view",selected)} style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, fontSize:12, fontWeight:600, cursor:"pointer", color:T.accent, textAlign:"left" }} disabled={viewAI.loading}>
                        ◈ {viewAI.loading?"Generating…":"Investment view"}
                      </button>
                      <button onClick={()=>setView("chat")} style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, fontSize:12, fontWeight:600, cursor:"pointer", color:T.muted, textAlign:"left" }}>
                        ◉ Ask AI anything
                      </button>
                    </div>
                    <p style={{ fontSize:10, color:T.dim, margin:"10px 0 0", fontStyle:"italic" }}>AI interprets data only. Not financial advice.</p>
                    <AIPanel {...explainAI} label="Plain English" />
                    <AIPanel {...viewAI} label="Investment View" />
                  </div>

                  {/* Same sector */}
                  <div style={card()}>
                    <p style={label}>Same Sector</p>
                    {Object.values(LIVE).filter(x=>x.sector===s.sector&&x.ticker!==selected).slice(0,5).map(x=>(
                      <div key={x.ticker} onClick={()=>openStock(x.ticker)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}>
                        <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{x.ticker}</span>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:12, fontWeight:600, color:T.text, margin:0 }}>{f.price(x.price)}</p>
                          <p style={{ fontSize:11, color:x.pct>=0?T.up:T.down, margin:0, fontWeight:600 }}>{f.pct(x.pct)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── PORTFOLIO ── */}
        {view === "portfolio" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, margin:"0 0 16px", color:T.text }}>My Portfolio</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
              {[
                ["Total Value", f.price(totalValue), totalGain>=0?T.up:T.down],
                ["Cash", f.price(cash), T.muted],
                ["Invested", f.price(investedValue), T.muted],
                ["Total Return", f.pct(totalGainPct), totalGainPct>=0?T.up:T.down],
              ].map(([label,val,color])=>(
                <div key={label} style={card()}>
                  <p style={{ fontSize:11, color:T.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 5px" }}>{label}</p>
                  <p style={{ fontSize:22, fontWeight:800, color, margin:0 }}>{val}</p>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16 }}>
              {/* Positions table */}
              <div style={card()}>
                <p style={{ ...label, marginBottom:16 }}>Open Positions</p>
                {positions.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"40px 0" }}>
                    <p style={{ fontSize:15, color:T.muted }}>No positions yet.</p>
                    <button onClick={()=>setView("trade")} style={{ marginTop:8, padding:"10px 20px", borderRadius:10, border:"none", background:T.accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Start Trading →</button>
                  </div>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr>
                        {["Ticker","Shares","Avg Cost","Price","Value","P&L","Return"].map((h,i)=>(
                          <th key={h} style={{ fontSize:11, color:T.muted, textAlign:i===0?"left":"right", padding:"0 10px 10px 0", fontWeight:600, letterSpacing:"0.04em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(p=>(
                        <tr key={p.ticker} style={{ borderTop:`1px solid ${T.border}`, cursor:"pointer" }} onClick={()=>openStock(p.ticker)}>
                          <td style={{ padding:"12px 10px 12px 0" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:32, height:32, borderRadius:8, background:T.accentBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:T.accent }}>{p.ticker.slice(0,2)}</div>
                              <div>
                                <p style={{ fontSize:13, fontWeight:800, color:T.text, margin:0 }}>{p.ticker}</p>
                                <p style={{ fontSize:10, color:T.muted, margin:0 }}>{p.s?.name}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"12px 10px", fontSize:13, color:T.text, textAlign:"right" }}>{p.shares}</td>
                          <td style={{ padding:"12px 10px", fontSize:13, color:T.muted, textAlign:"right" }}>{f.price(p.avgCost)}</td>
                          <td style={{ padding:"12px 10px", fontSize:13, fontWeight:600, color:T.text, textAlign:"right" }}>{f.price(p.s?.price||0)}</td>
                          <td style={{ padding:"12px 10px", fontSize:13, color:T.text, textAlign:"right" }}>{f.price(p.value)}</td>
                          <td style={{ padding:"12px 10px", textAlign:"right" }}><span style={{ fontSize:13, fontWeight:700, color:p.gain>=0?T.up:T.down }}>{f.chg(p.gain)}</span></td>
                          <td style={{ padding:"12px 0", textAlign:"right" }}><Tag label={f.pct(p.gainPct)} color={p.gainPct>=0?T.up:T.down} bg={p.gainPct>=0?T.upBg:T.downBg} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Right: allocation + trade history */}
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {positions.length > 0 && (
                  <div style={card()}>
                    <p style={label}>Allocation</p>
                    <div style={{ display:"flex", height:8, borderRadius:4, overflow:"hidden", gap:1, marginBottom:14 }}>
                      {positions.map((p,i)=>{
                        const cols=["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6","#f97316"];
                        return <div key={p.ticker} style={{ flex:p.value/investedValue, background:cols[i%cols.length] }} />;
                      })}
                    </div>
                    {positions.map((p,i)=>{
                      const cols=["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6","#f97316"];
                      return (
                        <div key={p.ticker} style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:8, height:8, borderRadius:2, background:cols[i%cols.length] }} />
                            <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{p.ticker}</span>
                          </div>
                          <span style={{ fontSize:12, color:T.muted }}>{((p.value/investedValue)*100).toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={card()}>
                  <p style={label}>Trade History</p>
                  {trades.length === 0
                    ? <p style={{ fontSize:13, color:T.muted }}>No trades yet.</p>
                    : trades.slice().reverse().slice(0,8).map((t,i)=>(
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:`1px solid ${T.border}` }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <Tag label={t.type.toUpperCase()} color={t.type==="buy"?T.up:T.down} bg={t.type==="buy"?T.upBg:T.downBg} />
                          <span style={{ fontSize:13, fontWeight:700, color:T.text }}>{t.ticker}</span>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <p style={{ fontSize:12, color:T.text, margin:0 }}>{t.shares} × {f.price(t.price)}</p>
                          <p style={{ fontSize:10, color:T.muted, margin:0 }}>{new Date(t.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SCREENER ── */}
        {view === "screener" && (
          <div>
            <h2 style={{ fontSize:20, fontWeight:800, margin:"0 0 16px", color:T.text }}>Stock Screener</h2>
            <div style={{ ...card(), marginBottom:14, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:T.muted, fontWeight:700 }}>SECTOR:</span>
              {sectors.map(sec=>(
                <button key={sec} onClick={()=>setFilterSector(sec)} style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${filterSector===sec?T.accent:T.border}`, background:filterSector===sec?T.accentBg:T.surface, color:filterSector===sec?T.accent:T.muted, fontSize:12, fontWeight:600, cursor:"pointer" }}>{sec}</button>
              ))}
              <span style={{ marginLeft:"auto", fontSize:12, color:T.muted }}>{screenerData.length} results</span>
            </div>
            <div style={card()}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr>
                    <th style={{ fontSize:11, color:T.muted, textAlign:"left", padding:"0 10px 10px 0", fontWeight:600, letterSpacing:"0.04em" }}>TICKER</th>
                    <th style={{ fontSize:11, color:T.muted, textAlign:"left", padding:"0 10px 10px 0", fontWeight:600, letterSpacing:"0.04em" }}>COMPANY</th>
                    <th style={{ fontSize:11, color:T.muted, textAlign:"left", padding:"0 10px 10px 0", fontWeight:600, letterSpacing:"0.04em" }}>SECTOR</th>
                    <th style={{ fontSize:11, color:T.muted, textAlign:"left", padding:"0 10px 10px 0", fontWeight:600, letterSpacing:"0.04em" }}>RISK</th>
                    <SH col="price">PRICE</SH>
                    <SH col="pct">CHANGE</SH>
                    <SH col="pe">P/E</SH>
                    <SH col="beta">BETA</SH>
                    <th style={{ fontSize:11, color:T.muted, padding:"0 0 10px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {screenerData.map(s=>{
                    const risk=RISK(s.beta,s.pe);
                    return (
                      <tr key={s.ticker} onClick={()=>openStock(s.ticker)} style={{ borderTop:`1px solid ${T.border}`, cursor:"pointer" }}
                        onMouseEnter={e=>e.currentTarget.style.background=T.bg}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"12px 10px 12px 0" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:5, height:5, borderRadius:2, background:SECTOR_COLORS[s.sector]||T.accent }} />
                            <span style={{ fontSize:13, fontWeight:800, color:T.text }}>{s.ticker}</span>
                          </div>
                        </td>
                        <td style={{ padding:"12px 10px", fontSize:12, color:T.muted }}>{s.name}</td>
                        <td style={{ padding:"12px 10px" }}><Tag label={s.sector} color={SECTOR_COLORS[s.sector]} bg={SECTOR_COLORS[s.sector]+"22"} /></td>
                        <td style={{ padding:"12px 10px" }}><Tag label={risk.label} color={risk.color} bg={risk.bg} /></td>
                        <td style={{ padding:"12px 10px", fontSize:13, fontWeight:700, color:T.text, textAlign:"right" }}>{f.price(s.price)}</td>
                        <td style={{ padding:"12px 10px", textAlign:"right" }}><span style={{ fontSize:13, fontWeight:700, color:s.pct>=0?T.up:T.down }}>{f.pct(s.pct)}</span></td>
                        <td style={{ padding:"12px 10px", fontSize:12, color:T.muted, textAlign:"right" }}>{s.pe??"-"}</td>
                        <td style={{ padding:"12px 10px", fontSize:12, color:T.muted, textAlign:"right" }}>{s.beta}</td>
                        <td style={{ padding:"12px 0" }}><button onClick={e=>{e.stopPropagation();setModal({ticker:s.ticker,type:"buy"});}} style={{ padding:"5px 12px", borderRadius:8, border:"none", background:T.up, color:"#fff", fontSize:11, fontWeight:700, cursor:"pointer" }}>Buy</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AI CHAT ── */}
        {view === "chat" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 260px", gap:16 }}>
            <div style={{ ...card(), display:"flex", flexDirection:"column", height:580 }}>
              <p style={{ ...label, margin:"0 0 16px" }}>AI Assistant</p>
              <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:14, paddingBottom:8 }}>
                {chat.map((m,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, flexDirection:m.role==="user"?"row-reverse":"row" }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:m.role==="assistant"?T.accentBg:T.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:m.role==="assistant"?T.accent:T.muted, flexShrink:0, fontWeight:700 }}>
                      {m.role==="assistant"?"✦":"U"}
                    </div>
                    <div style={{ maxWidth:"80%", background:m.role==="user"?T.bg:T.accentBg, border:`1px solid ${m.role==="user"?T.border:"#c7d2fe"}`, borderRadius:14, padding:"10px 14px" }}>
                      {m.content.split("\n").map((line,j)=>(
                        <p key={j} style={{ fontSize:13, color:T.text, margin:"2px 0", lineHeight:1.6 }}>{line.replace(/\*\*/g,"")}</p>
                      ))}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display:"flex", gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:T.accentBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:T.accent, fontWeight:700 }}>✦</div>
                    <div style={{ background:T.accentBg, border:`1px solid #c7d2fe`, borderRadius:14, padding:"10px 14px" }}>
                      <p style={{ fontSize:13, color:T.muted, margin:0 }}>Thinking…</p>
                    </div>
                  </div>
                )}
                <div ref={chatEnd} />
              </div>
              <div style={{ display:"flex", gap:8, paddingTop:12, borderTop:`1px solid ${T.border}` }}>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleChat()}
                  placeholder="Ask about stocks, your portfolio, how markets work…"
                  style={{ flex:1, background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 14px", fontSize:13, color:T.text, outline:"none" }} />
                <button onClick={handleChat} disabled={chatLoading||!chatInput.trim()} style={{ padding:"10px 20px", borderRadius:12, border:"none", background:T.accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity:chatLoading||!chatInput.trim()?0.5:1 }}>Send</button>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={card()}>
                <p style={label}>Suggested Questions</p>
                {["How is my portfolio doing?","What's my best trade so far?","Explain what a P/E ratio means","Which stock is the riskiest in my portfolio?","Should I diversify more?","What is beta?"].map(q=>(
                  <button key={q} onClick={()=>setChatInput(q)} style={{ display:"block", width:"100%", textAlign:"left", padding:"8px 12px", borderRadius:10, border:`1px solid ${T.border}`, background:T.surface, fontSize:12, color:T.muted, cursor:"pointer", marginBottom:6, fontWeight:500 }}>{q}</button>
                ))}
              </div>
              <div style={card()}>
                <p style={label}>AI has access to</p>
                {["Your portfolio positions","Trade history","Cash balance","Watchlist prices"].map(i=>(
                  <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                    <span style={{ color:T.up, fontSize:12 }}>✓</span>
                    <span style={{ fontSize:12, color:T.muted }}>{i}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}