/**
 * MERIDIAN — Paper Trading Platform v5
 * 
 * What's new in v5:
 * - Fixed chat input focus bug (isolated ChatPanel with React.memo)
 * - Full-width layout
 * - Firebase auth + Firestore (paste your config in FIREBASE_CONFIG)
 * - Onboarding flow (interests → starter stocks → learning goal)
 * - Fractional shares (buy by $ amount OR shares)
 * - 10 new tickers including crypto proxies
 * - AI market brief + sentiment on Home
 * - Live price pulse animation on update
 * - Learning tooltips on P/E, Beta, EPS, Market Cap
 * - Logo fix (Paper Trading below Meridian)
 * - Leaderboard shows only real users (no fake names)
 * - Longer company descriptions
 * - UX market sentiment widget
 */

import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

// ─────────────────────────────────────────────
// FIREBASE — proper Vite imports
// Keys are loaded from .env.local:
//   VITE_FIREBASE_API_KEY=...
//   VITE_FIREBASE_AUTH_DOMAIN=...
//   VITE_FIREBASE_PROJECT_ID=...
// ─────────────────────────────────────────────
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const _app  = getApps().length ? getApps()[0] : initializeApp({
  apiKey:     import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:  import.meta.env.VITE_FIREBASE_PROJECT_ID,
});
const auth     = getAuth(_app);
const db       = getFirestore(_app);
const provider = new GoogleAuthProvider();

async function fbSave(uid, data) {
  try { await setDoc(doc(db, "users", uid), data); }
  catch(e) { console.error("Firestore save failed:", e); }
}

async function fbLoad(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch(e) { console.error("Firestore load failed:", e); return null; }
}

// ─────────────────────────────────────────────
// DATA LAYER
// ─────────────────────────────────────────────
function genHistory(base, days, vol = 0.016) {
  const h = [];
  let p = base * (0.84 + Math.random() * 0.08);
  for (let i = 0; i < days; i++) {
    p = Math.max(p * (1 + (Math.random() - 0.48) * vol), 1);
    const d = new Date(); d.setDate(d.getDate() - (days - i));
    h.push({ date: d.toLocaleDateString("en-US", { month:"short", day:"numeric" }), price: +p.toFixed(2) });
  }
  h[h.length - 1].price = base;
  return h;
}

const STOCKS = {
  // Mega-cap Tech
  AAPL:  { ticker:"AAPL",  name:"Apple Inc.",              price:189.30, pct:1.14,   change:2.14,   open:187.16, high:190.05, low:186.82, vol:"58.2M",  mktCap:"2.94T", pe:29.4, eps:6.44,  w52h:199.62, w52l:143.90, sector:"Technology",  beta:1.2, desc:"Apple designs and manufactures the iPhone, Mac, iPad, Apple Watch, and AirPods. Its services business — including the App Store, Apple Music, iCloud, and Apple TV+ — now generates over $85B per year and is growing faster than its hardware segment. Apple has one of the most loyal customer bases in the world and holds over $160B in cash." },
  MSFT:  { ticker:"MSFT",  name:"Microsoft Corp.",         price:378.85, pct:-0.32,  change:-1.22,  open:380.07, high:381.30, low:377.40, vol:"22.1M",  mktCap:"2.81T", pe:34.1, eps:11.10, w52h:420.82, w52l:309.45, sector:"Technology",  beta:0.9, desc:"Microsoft builds Windows, Office 365, and Azure — the world's second-largest cloud platform. It owns LinkedIn, GitHub, and has a major stake in OpenAI. Its Copilot AI assistant is being embedded across every product. Azure's AI workloads are growing at 28%+ annually, making it a central player in the enterprise AI race." },
  NVDA:  { ticker:"NVDA",  name:"NVIDIA Corp.",            price:840.00, pct:2.25,   change:18.50,  open:821.50, high:845.20, low:818.90, vol:"41.8M",  mktCap:"2.07T", pe:68.2, eps:12.32, w52h:974.00, w52l:405.12, sector:"Technology",  beta:1.7, desc:"NVIDIA makes the GPUs that power AI training. Its H100 and H200 chips are so in demand that lead times stretch over a year. Every major AI lab — OpenAI, Google DeepMind, Meta AI — runs on NVIDIA hardware. The company has expanded into robotics, autonomous vehicles, and healthcare AI, making it the defining infrastructure stock of the AI era." },
  GOOGL: { ticker:"GOOGL", name:"Alphabet Inc.",           price:155.60, pct:0.55,   change:0.85,   open:154.75, high:156.40, low:154.10, vol:"25.3M",  mktCap:"1.94T", pe:24.8, eps:6.27,  w52h:191.75, w52l:120.21, sector:"Technology",  beta:1.1, desc:"Alphabet owns Google Search (which handles 90% of global queries), YouTube, Google Cloud, Waymo self-driving, and DeepMind AI. Search advertising generates over $175B per year. Its Gemini AI models are deployed across all Google products. Despite AI competition concerns, search revenue continues to grow double digits annually." },
  META:  { ticker:"META",  name:"Meta Platforms Inc.",     price:512.40, pct:1.45,   change:7.30,   open:505.10, high:514.20, low:503.80, vol:"18.7M",  mktCap:"1.31T", pe:26.3, eps:19.48, w52h:531.49, w52l:274.38, sector:"Technology",  beta:1.4, desc:"Meta owns Facebook, Instagram, WhatsApp, and Threads — reaching over 3.2 billion people daily. Its AI ad targeting is considered the most precise in the industry. Meta AI is now the most-used AI assistant in the world by monthly active users. The company is also building AR glasses and the next generation of social computing through its Reality Labs division." },
  AMZN:  { ticker:"AMZN",  name:"Amazon.com Inc.",         price:182.40, pct:1.05,   change:1.90,   open:180.50, high:183.20, low:180.10, vol:"38.7M",  mktCap:"1.90T", pe:60.1, eps:3.04,  w52h:201.20, w52l:118.35, sector:"Consumer",   beta:1.3, desc:"Amazon is the world's largest e-commerce platform and operates AWS — the world's leading cloud provider with ~32% market share. AWS generates the majority of Amazon's profit. The company also owns Whole Foods, Twitch, Ring, and Alexa. Prime membership has surpassed 230 million globally, creating a powerful recurring revenue flywheel across shopping, streaming, and pharmacy." },
  TSLA:  { ticker:"TSLA",  name:"Tesla Inc.",              price:175.20, pct:-2.12,  change:-3.80,  open:179.00, high:180.10, low:173.90, vol:"112.4M", mktCap:"557B",  pe:47.3, eps:3.70,  w52h:299.29, w52l:138.80, sector:"Consumer",   beta:2.1, desc:"Tesla is the world's leading electric vehicle maker, with the Model 3 and Model Y being among the best-selling cars globally. Beyond cars, Tesla operates Megapack energy storage, Supercharger networks, and its Full Self-Driving software. The company is developing a humanoid robot called Optimus. Tesla's valuation reflects not just car sales, but the market's bet on autonomous driving and AI robotics." },
  // Finance
  JPM:   { ticker:"JPM",   name:"JPMorgan Chase & Co.",    price:196.50, pct:0.61,   change:1.20,   open:195.30, high:197.40, low:195.00, vol:"9.8M",   mktCap:"566B",  pe:11.8, eps:16.65, w52h:210.27, w52l:141.46, sector:"Finance",     beta:1.1, desc:"JPMorgan is America's largest bank by assets ($3.9T) and one of the most profitable financial institutions in history. It operates investment banking, retail banking, asset management, and commercial lending. CEO Jamie Dimon is considered one of the most influential figures in global finance. The bank has consistently outperformed peers through economic cycles due to disciplined risk management." },
  GS:    { ticker:"GS",    name:"Goldman Sachs Group",     price:448.20, pct:0.70,   change:3.10,   open:445.10, high:450.30, low:444.80, vol:"2.1M",   mktCap:"145B",  pe:13.4, eps:33.44, w52h:482.32, w52l:295.72, sector:"Finance",     beta:1.3, desc:"Goldman Sachs is the world's premier investment bank, advising on the largest M&A deals, IPOs, and sovereign debt transactions globally. It has a massive trading operation and asset management arm managing over $2.7T. Goldman alumni run central banks, treasury departments, and corporations worldwide — giving it unparalleled network effects in global finance." },
  // Healthcare
  JNJ:   { ticker:"JNJ",   name:"Johnson & Johnson",       price:162.30, pct:-0.43,  change:-0.70,  open:163.00, high:163.20, low:161.90, vol:"7.6M",   mktCap:"390B",  pe:15.2, eps:10.68, w52h:175.97, w52l:143.13, sector:"Healthcare", beta:0.6, desc:"Johnson & Johnson is a healthcare giant with three segments: pharmaceuticals (including cancer drug Darzalex), medical devices (surgical robots, orthopedics), and consumer health (Tylenol, Band-Aid, Neutrogena). J&J is famous for its consistent dividend growth — it has increased its dividend for over 60 consecutive years, making it a 'Dividend King' beloved by long-term investors." },
  UNH:   { ticker:"UNH",   name:"UnitedHealth Group",      price:487.60, pct:0.49,   change:2.40,   open:485.20, high:489.10, low:484.80, vol:"3.2M",   mktCap:"452B",  pe:20.1, eps:24.26, w52h:554.48, w52l:430.62, sector:"Healthcare", beta:0.7, desc:"UnitedHealth is America's largest health insurer, covering 50 million+ people. Its Optum subsidiary is a massive healthcare services business managing pharmacy benefits, data analytics, and care delivery. UnitedHealth's vertical integration strategy — combining insurance with care delivery — makes it one of the most defensible business models in healthcare." },
  // Energy
  XOM:   { ticker:"XOM",   name:"Exxon Mobil Corp.",       price:118.40, pct:0.77,   change:0.90,   open:117.50, high:119.20, low:117.30, vol:"17.3M",  mktCap:"474B",  pe:13.8, eps:8.58,  w52h:123.75, w52l:95.77,  sector:"Energy",     beta:0.9, desc:"ExxonMobil is the world's largest publicly traded oil and gas company, with operations in 60+ countries. It produces 3.7 million barrels of oil equivalent per day. Exxon is investing heavily in carbon capture and hydrogen, positioning itself for an energy transition while returning billions to shareholders through dividends and buybacks. Its 2023 acquisition of Pioneer Natural Resources made it the dominant player in the Permian Basin." },
  // Consumer
  WMT:   { ticker:"WMT",   name:"Walmart Inc.",            price:64.20,  pct:0.78,   change:0.50,   open:63.70,  high:64.50,  low:63.60,  vol:"22.8M",  mktCap:"516B",  pe:30.4, eps:2.11,  w52h:67.89,  w52l:48.62,  sector:"Consumer",   beta:0.6, desc:"Walmart operates 10,500+ stores across 20 countries and serves 240 million customers per week. It's the world's largest private employer with 2.1 million US workers. Walmart's e-commerce business is growing rapidly, and its advertising and financial services segments are becoming significant profit contributors. Its scale gives it unrivaled pricing power with suppliers." },
  KO:    { ticker:"KO",    name:"Coca-Cola Co.",           price:60.10,  pct:0.33,   change:0.20,   open:59.90,  high:60.30,  low:59.80,  vol:"14.2M",  mktCap:"259B",  pe:22.8, eps:2.64,  w52h:63.48,  w52l:51.55,  sector:"Consumer",   beta:0.6, desc:"Coca-Cola is one of the most recognized brands on earth, selling beverages in over 200 countries. Its portfolio includes Coke, Sprite, Fanta, Powerade, Dasani, and smartwater. Coca-Cola operates an asset-light model — it sells concentrate to bottlers, generating extremely high margins. Warren Buffett's Berkshire Hathaway owns 9.3% of the company and has held the stock since 1988." },
  // Semis
  AMD:   { ticker:"AMD",   name:"Advanced Micro Devices",  price:162.50, pct:2.65,   change:4.20,   open:158.30, high:163.40, low:157.80, vol:"55.1M",  mktCap:"262B",  pe:43.7, eps:3.72,  w52h:227.30, w52l:134.27, sector:"Technology",  beta:1.9, desc:"AMD makes CPUs (Ryzen, EPYC) and GPUs (Radeon) that compete directly with Intel and NVIDIA. Its MI300X AI chip is gaining traction as an alternative to NVIDIA's H100, attracting Microsoft and Meta as customers. AMD's EPYC server processors have taken significant market share from Intel in data centers. CEO Lisa Su is widely credited as one of the most effective turnaround executives in tech history." },
  INTC:  { ticker:"INTC",  name:"Intel Corp.",             price:30.40,  pct:-2.56,  change:-0.80,  open:31.20,  high:31.30,  low:30.10,  vol:"66.3M",  mktCap:"129B",  pe:28.1, eps:1.08,  w52h:51.28,  w52l:26.86,  sector:"Technology",  beta:1.1, desc:"Intel is the world's largest chip manufacturer by revenue, though it has lost significant market share to AMD and TSMC. The company is executing a multi-year turnaround under CEO Pat Gelsinger, investing $100B+ in new US and European fab facilities. Intel's future depends on its ability to catch up in process technology by 2025-2026 — a high-risk, high-reward bet on domestic semiconductor manufacturing." },
  // New tickers
  UBER:  { ticker:"UBER",  name:"Uber Technologies",       price:72.40,  pct:1.32,   change:0.94,   open:71.46,  high:73.10,  low:71.20,  vol:"19.3M",  mktCap:"152B",  pe:null, eps:null,  w52h:82.14,  w52l:37.58,  sector:"Technology",  beta:1.6, desc:"Uber operates the world's largest ride-hailing and food delivery platform, active in 70+ countries. Its Uber Eats platform competes with DoorDash globally. After years of losses, Uber reached sustained profitability in 2023. Its autonomous vehicle partnerships with Waymo and others could dramatically reduce driver costs. Uber Freight is also growing into a major logistics marketplace." },
  SPOT:  { ticker:"SPOT",  name:"Spotify Technology",      price:248.60, pct:0.88,   change:2.17,   open:246.43, high:250.20, low:245.80, vol:"3.1M",   mktCap:"48B",   pe:null, eps:null,  w52h:284.17, w52l:120.32, sector:"Technology",  beta:1.5, desc:"Spotify is the world's largest audio streaming platform with 600M+ monthly active users and 240M+ premium subscribers. It has transformed from pure music streaming into podcasts, audiobooks, and creator tools. Spotify's personalization algorithm (Discover Weekly, Wrapped) is widely considered best-in-class. It faces margin pressure from Apple and Google taking 30% of app store purchases, a structural challenge it is actively fighting." },
  SHOP:  { ticker:"SHOP",  name:"Shopify Inc.",            price:68.90,  pct:1.74,   change:1.18,   open:67.72,  high:69.50,  low:67.50,  vol:"8.4M",   mktCap:"88B",   pe:null, eps:null,  w52h:91.79,  w52l:44.39,  sector:"Technology",  beta:1.8, desc:"Shopify powers over 1.7 million businesses and processes $200B+ in gross merchandise value annually. It's the operating system for modern e-commerce — handling payments, logistics, marketing, and financing for merchants of all sizes. Shopify has become the primary alternative to Amazon for brands wanting to own their customer relationship. Its financial services arm (Shop Pay, capital lending) is a rapidly growing revenue stream." },
  COIN:  { ticker:"COIN",  name:"Coinbase Global",         price:182.30, pct:3.44,   change:6.07,   open:176.23, high:184.50, low:175.90, vol:"14.7M",  mktCap:"46B",   pe:null, eps:null,  w52h:284.95, w52l:60.82,  sector:"Finance",     beta:3.2, desc:"Coinbase is the largest regulated cryptocurrency exchange in the United States, serving 100M+ verified users. It makes money on trading fees, staking rewards, and institutional custody services. Coinbase's revenue is highly correlated with crypto market activity — booming in bull markets, contracting sharply in downturns. It has been positioning itself as the regulated, institutional-grade crypto infrastructure layer as governments worldwide develop clearer crypto frameworks." },
  PYPL:  { ticker:"PYPL",  name:"PayPal Holdings",         price:62.80,  pct:-0.63,  change:-0.40,  open:63.20,  high:63.50,  low:62.40,  vol:"12.8M",  mktCap:"67B",   pe:17.2, eps:3.65,  w52h:77.99,  w52l:50.25,  sector:"Finance",     beta:1.4, desc:"PayPal operates the world's most widely used digital payments platform, processing $1.5T in payment volume annually. Its Venmo and Braintree subsidiaries add social payments and developer tools. PayPal is undergoing a major transformation under new CEO Alex Chriss, refocusing on profitability over user growth. Its brand recognition and 400M+ account base give it a strong starting position in a competitive fintech landscape." },
  // ETFs
  SPY:   { ticker:"SPY",   name:"SPDR S&P 500 ETF",        price:523.40, pct:0.60,   change:3.10,   open:520.30, high:524.10, low:520.10, vol:"78.2M",  mktCap:"ETF",   pe:null, eps:null,  w52h:543.93, w52l:410.53, sector:"ETF",         beta:1.0, desc:"SPY tracks the S&P 500 — the 500 largest US companies by market cap. It's the world's most traded ETF with $500B+ in assets. When people say 'the market is up,' they usually mean the S&P 500. Buying SPY is the most popular form of passive investing — Warren Buffett has repeatedly advised that most people should just buy an S&P 500 index fund rather than picking individual stocks." },
  QQQ:   { ticker:"QQQ",   name:"Invesco QQQ Trust",       price:444.20, pct:1.09,   change:4.80,   open:439.40, high:445.30, low:438.90, vol:"44.6M",  mktCap:"ETF",   pe:null, eps:null,  w52h:462.90, w52l:340.67, sector:"ETF",         beta:1.2, desc:"QQQ tracks the NASDAQ-100, the 100 largest non-financial companies on the NASDAQ exchange. It's heavily weighted toward mega-cap tech: Apple, Microsoft, NVIDIA, Amazon, and Meta together make up over 40% of the fund. QQQ outperforms SPY in tech bull markets but falls harder during tech selloffs. It's the most popular ETF for investors wanting concentrated exposure to high-growth technology companies." },
};
Object.values(STOCKS).forEach(s => { s.history = genHistory(s.price, 60, (s.beta||1) * 0.013); });

const INDICES = [
  { name:"S&P 500", val:"5,234", chg:"+0.57%", up:true  },
  { name:"NASDAQ",  val:"16,421",chg:"+0.82%", up:true  },
  { name:"DOW",     val:"39,127",chg:"+0.21%", up:true  },
  { name:"VIX",     val:"14.82", chg:"-3.12%", up:false },
  { name:"BTC",     val:"67,420",chg:"+1.88%", up:true  },
  { name:"ETH",     val:"3,481", chg:"+2.14%", up:true  },
  { name:"Gold",    val:"2,318", chg:"+0.34%", up:true  },
  { name:"Oil",     val:"82.14", chg:"-0.91%", up:false },
];

const SECTOR_COLORS = {
  Technology:"#6366f1", Finance:"#f59e0b", Healthcare:"#10b981",
  Energy:"#f97316", Consumer:"#ec4899", ETF:"#94a3b8",
};

const RISK = (beta, pe) => {
  const s = (beta||1) + (pe ? (pe>40?1:pe>20?0.5:0) : 0);
  if (s>=2)   return { label:"Aggressive",    color:"#dc2626", bg:"#fef2f2" };
  if (s>=1.2) return { label:"Moderate",      color:"#d97706", bg:"#fffbeb" };
  return        { label:"Conservative",  color:"#16a34a", bg:"#f0fdf4" };
};

// Learning tooltip definitions
const TOOLTIPS = {
  "P/E Ratio":   { def:"Price-to-Earnings ratio. Shows how much investors pay per $1 of profit.", formula:"P/E = Stock Price ÷ Earnings Per Share", tip:"Lower P/E can mean cheaper. Growth companies often have high P/E." },
  "Beta":        { def:"Measures how volatile a stock is vs the market. Beta of 1 = moves with the market.", formula:"Beta > 1 = more volatile. Beta < 1 = more stable.", tip:"A beta of 1.5 means the stock moves 50% more than the market." },
  "EPS":         { def:"Earnings Per Share — the company's profit divided by number of shares.", formula:"EPS = Net Income ÷ Shares Outstanding", tip:"Higher EPS generally means a more profitable company." },
  "Market Cap":  { def:"Total value of all shares. Price × Total Shares = Market Cap.", formula:"Market Cap = Stock Price × Shares Outstanding", tip:"Large-cap (>$10B) = more stable. Small-cap (<$2B) = higher risk/reward." },
  "52W Range":   { def:"The highest and lowest price the stock has traded at in the past year.", formula:"Range = 52W High − 52W Low", tip:"A stock near its 52W high may be momentum. Near its low may be a value opportunity — or a falling knife." },
  "Volume":      { def:"Number of shares traded today. High volume = high interest.", formula:"Higher than average volume often signals a major news event.", tip:"Low volume moves are less reliable than high volume moves." },
};

// News data
const NEWS = {
  AAPL:  [{ id:1, title:"Apple Eyes On-Device AI for iPhone 17", source:"Bloomberg", time:"2h ago", body:"Apple is building neural processing chips specifically for on-device generative AI, reducing dependence on cloud servers and addressing privacy concerns." },{ id:2, title:"Services Revenue Hits Record $24.2B in Q1", source:"Reuters", time:"5h ago", body:"The App Store, Apple Music, and iCloud all posted record revenue, with services now representing 24% of total company revenue." }],
  MSFT:  [{ id:1, title:"Copilot Surpasses 1M Enterprise Users", source:"TechCrunch", time:"3h ago", body:"Microsoft's AI productivity suite is being adopted faster than Office 365 was at launch, with Fortune 500 companies leading rollout." },{ id:2, title:"Azure AI Revenue Grows 28% Year-Over-Year", source:"Bloomberg", time:"6h ago", body:"Cloud AI workloads are driving Azure growth significantly above analyst expectations for the third consecutive quarter." }],
  NVDA:  [{ id:1, title:"H200 GPU Lead Times Extend to 52 Weeks", source:"Bloomberg", time:"1h ago", body:"Demand for NVIDIA's latest AI training chip continues to far outstrip supply, with major cloud providers competing for allocation." },{ id:2, title:"Blackwell Architecture Begins Limited Cloud Deployment", source:"Reuters", time:"4h ago", body:"AWS, Google Cloud, and Microsoft Azure are receiving first Blackwell GPU allocations ahead of broader commercial availability." }],
  TSLA:  [{ id:1, title:"Q1 Deliveries Miss Estimates by 7%", source:"Bloomberg", time:"2h ago", body:"Tesla delivered 386,810 vehicles against a consensus estimate of 415,000. The company cited factory retooling and logistics challenges." },{ id:2, title:"Full Self-Driving v12 Receives Strong Early Reviews", source:"Ars Technica", time:"1d ago", body:"Independent testers report significantly improved urban driving behavior, though regulatory approval for unsupervised operation remains years away." }],
  META:  [{ id:1, title:"Meta AI Reaches 600M Monthly Active Users", source:"Bloomberg", time:"1h ago", body:"Meta's AI assistant has become the most-used AI product in the world by MAU, driven by deep integration into WhatsApp and Instagram." }],
  GOOGL: [{ id:1, title:"Google Search Revenue Grows 14% Despite AI Chatbot Threat", source:"Bloomberg", time:"3h ago", body:"Fears that AI chatbots would erode Google's search dominance appear premature, as advertisers continue to commit to search spending." }],
  AMZN:  [{ id:1, title:"AWS Announces Major AI Infrastructure Expansion in Asia", source:"Reuters", time:"2h ago", body:"Amazon is investing $9B in new data centers across Singapore and Malaysia to serve growing Southeast Asian AI demand." }],
  JPM:   [{ id:1, title:"JPMorgan Q1 Net Income Rises 12% on Strong IB Fees", source:"Reuters", time:"3h ago", body:"A resurgent M&A market and robust equity underwriting drove investment banking revenue above consensus for the second straight quarter." }],
  COIN:  [{ id:1, title:"Coinbase Volume Surges 45% as Bitcoin Hits New Highs", source:"Bloomberg", time:"1h ago", body:"Trading activity on Coinbase reached its highest level since 2021, benefiting directly from the broader crypto market rally." }],
};
const fallbackNews = t => [{ id:1, title:`${t} Earnings Report Expected Next Week`, source:"Reuters", time:"4h ago", body:"Analysts are closely watching forward guidance as the company navigates a challenging macroeconomic environment." }];

const STARTING_BALANCE = 10000;

// ─────────────────────────────────────────────
// PAPER TRADING ENGINE
// ─────────────────────────────────────────────
function calcPortfolio(trades, stockData) {
  const pos = {};
  trades.forEach(t => {
    if (!pos[t.ticker]) pos[t.ticker] = { ticker:t.ticker, shares:0, totalCost:0 };
    if (t.type==="buy")  { pos[t.ticker].shares += t.shares; pos[t.ticker].totalCost += t.shares*t.price; }
    else                 { pos[t.ticker].shares -= t.shares; pos[t.ticker].totalCost -= t.shares*t.price; }
  });
  return Object.values(pos).filter(p=>p.shares>0.0001).map(p => {
    const s = stockData[p.ticker];
    const value = s ? s.price * p.shares : 0;
    const avgCost = p.totalCost / p.shares;
    return { ...p, s, value, avgCost, gain:value-p.totalCost, gainPct:p.totalCost>0?((value-p.totalCost)/p.totalCost)*100:0 };
  });
}
function calcCash(trades) {
  return trades.reduce((c,t) => t.type==="buy" ? c-t.shares*t.price : c+t.shares*t.price, STARTING_BALANCE);
}

// ─────────────────────────────────────────────
// AI SERVICE
// ─────────────────────────────────────────────
async function callAI(system, message) {
  const res = await fetch("/api/ai", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({system,message}) });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}
const aiExplain  = (t,s)    => callAI("You are a friendly finance teacher for students. Under 80 words. No jargon.", `What does ${t} (${s.name}) do and why do people invest in it? Price: $${s.price}`);
const aiNews     = (t,n,s)  => callAI("Financial news analyst for students. Bullet points. Simple language. Never invent data.", `Summarize news for ${t} ($${s.price}):\n${n.map(x=>`- ${x.title}: ${x.body}`).join("\n")}\n\nFormat:\n**Key Themes**\n• ...\n**What this means for the stock**\n• ...\n**Sentiment**: [Bullish/Neutral/Bearish] — one sentence`);
const aiView     = (t,s,n)  => callAI("Research analyst for student investors. Plain language. Always include disclaimer.", `Investment view for ${t} (${s.name}). Price: $${s.price}, P/E: ${s.pe||"N/A"}, Beta: ${s.beta}, Sector: ${s.sector}.\nNews: ${n.map(x=>`- ${x.title}`).join("\n")}\n\nFormat:\n**Why it could go up**\n• ...\n**Why it could go down**\n• ...\n**Risk level**: ${RISK(s.beta,s.pe).label}\n*Not financial advice — paper trading only.*`);
const aiMarket   = (movers) => callAI("You write a brief, energetic daily market summary for student investors. Under 100 words. Be clear and engaging.", `Today's market snapshot:\nTop gainers: ${movers.gainers.map(s=>`${s.ticker} +${s.pct.toFixed(1)}%`).join(", ")}\nTop losers: ${movers.losers.map(s=>`${s.ticker} ${s.pct.toFixed(1)}%`).join(", ")}\nIndices: S&P 500 +0.57%, NASDAQ +0.82%\n\nWrite a 2-3 sentence "Today in Markets" brief for students. Include overall sentiment (Bullish/Neutral/Bearish).`);
const aiChat     = (msg,ctx) => callAI("Friendly finance teacher for students using a paper trading app. Only use provided data. Keep responses short and clear. Don't recommend real trades.", `Context:\n${ctx}\n\nStudent: ${msg}`);

// ─────────────────────────────────────────────
// LIVE DATA
// ─────────────────────────────────────────────
async function fetchQuote(ticker)   { try { const r=await fetch(`/api/quote?ticker=${ticker}`);   const d=await r.json(); return d.error?null:d; } catch{return null;} }
async function fetchHistory(ticker) { try { const r=await fetch(`/api/history?ticker=${ticker}`); const d=await r.json(); return Array.isArray(d)&&d.length?d:null; } catch{return null;} }

// ─────────────────────────────────────────────
// DESIGN
// ─────────────────────────────────────────────
const T = {
  bg:"#f9f8f6", surface:"#ffffff", border:"#ede9e0", border2:"#d8d2c5",
  text:"#1a1814", muted:"#6b6560", dim:"#b0a89f",
  accent:"#4f46e5", accentBg:"#eef2ff", accentBorder:"#c7d2fe",
  up:"#16a34a", upBg:"#f0fdf4", down:"#dc2626", downBg:"#fef2f2",
  r:14, rsm:8,
};
const fmt = {
  price: n => `$${(+n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:4})}`,
  pct:   n => `${n>=0?"+":""}${(+n).toFixed(2)}%`,
  chg:   n => `${n>=0?"+":""}${(+n).toFixed(2)}`,
  shares:n => +n.toFixed(4)=== Math.floor(+n.toFixed(4)) ? `${Math.floor(+n.toFixed(4))} share${Math.floor(n)!==1?"s":""}` : `${(+n).toFixed(4)} shares`,
};
const card  = (x={}) => ({background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.r,padding:18,...x});
const lbl   = {fontSize:11,color:T.muted,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6};

// ─────────────────────────────────────────────
// TOOLTIP COMPONENT
// ─────────────────────────────────────────────
function InfoTip({ term }) {
  const [show, setShow] = useState(false);
  const tip = TOOLTIPS[term];
  if (!tip) return <span>{term}</span>;
  return (
    <span style={{ position:"relative", display:"inline-flex", alignItems:"center", gap:4 }}>
      <span>{term}</span>
      <span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}
        style={{ width:14,height:14,borderRadius:"50%",background:T.accentBg,color:T.accent,fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",cursor:"help",border:`1px solid ${T.accentBorder}`,flexShrink:0 }}>?</span>
      {show && (
        <div style={{ position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:T.text,color:"#fff",borderRadius:10,padding:"10px 14px",width:220,zIndex:200,pointerEvents:"none",boxShadow:"0 8px 24px rgba(0,0,0,0.2)" }}>
          <p style={{ fontSize:12,fontWeight:600,margin:"0 0 4px",color:"#fff" }}>{term}</p>
          <p style={{ fontSize:11,color:"#cbd5e1",margin:"0 0 6px",lineHeight:1.5 }}>{tip.def}</p>
          <p style={{ fontSize:10,color:T.accent,margin:"0 0 4px",fontFamily:"monospace",background:"rgba(255,255,255,0.1)",padding:"3px 6px",borderRadius:4 }}>{tip.formula}</p>
          <p style={{ fontSize:10,color:"#94a3b8",margin:0,lineHeight:1.4 }}>💡 {tip.tip}</p>
          <div style={{ position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",width:10,height:10,background:T.text,rotate:"45deg" }} />
        </div>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────
// AI PANEL
// ─────────────────────────────────────────────
function AIPanel({ text, loading, error, label }) {
  if (!loading&&!text&&!error) return null;
  return (
    <div style={{ background:T.accentBg,border:`1px solid ${T.accentBorder}`,borderRadius:T.r,padding:16,marginTop:12 }}>
      <div style={{ fontSize:10,color:T.accent,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8 }}>✦ {label}</div>
      {loading && <div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:14,height:14,borderRadius:"50%",border:`2px solid ${T.accent}`,borderTopColor:"transparent",animation:"spin 0.8s linear infinite" }} /><span style={{ fontSize:13,color:T.muted }}>Analyzing…</span><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}
      {error   && <p style={{ fontSize:13,color:T.down,margin:0 }}>Error: {error}</p>}
      {text && text.split("\n").map((line,i)=>{
        if (!line.trim()) return <div key={i} style={{ height:4 }} />;
        if (line.startsWith("**")&&line.endsWith("**")) return <p key={i} style={{ fontSize:10,color:T.accent,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",margin:"10px 0 3px" }}>{line.replace(/\*\*/g,"")}</p>;
        if (line.startsWith("• ")||line.startsWith("- ")) return <p key={i} style={{ fontSize:13,color:T.text,margin:"3px 0 3px 10px",display:"flex",gap:8,lineHeight:1.5 }}><span style={{ color:T.accent,flexShrink:0 }}>▸</span>{line.slice(2)}</p>;
        if (line.startsWith("*")&&line.endsWith("*")) return <p key={i} style={{ fontSize:11,color:T.muted,fontStyle:"italic",margin:"10px 0 0",borderTop:`1px solid ${T.accentBorder}`,paddingTop:8 }}>{line.replace(/\*/g,"")}</p>;
        const sc = line.includes("Bullish")?T.up:line.includes("Bearish")?T.down:"#d97706";
        return <p key={i} style={{ fontSize:13,color:line.includes("Sentiment")||line.includes("Risk")?sc:T.text,margin:"3px 0",lineHeight:1.5,fontWeight:line.includes("Sentiment")||line.includes("Risk")?600:400 }}>{line.replace(/\*\*/g,"")}</p>;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// PRICE CELL with pulse animation
// ─────────────────────────────────────────────
function PriceCell({ value, up }) {
  const [pulse, setPulse] = useState(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setPulse(value > prev.current ? "up" : "down");
      const t = setTimeout(() => setPulse(null), 800);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <>
      <style>{`@keyframes pulseUp{0%{background:#dcfce7}100%{background:transparent}}@keyframes pulseDown{0%{background:#fee2e2}100%{background:transparent}}`}</style>
      <span style={{ borderRadius:4,padding:"1px 4px",animation:pulse==="up"?"pulseUp 0.8s ease-out":pulse==="down"?"pulseDown 0.8s ease-out":"none",fontWeight:700,color:up?T.up:T.down }}>{fmt.price(value)}</span>
    </>
  );
}

// Chart tooltip
const ChartTip = ({ active, payload }) => active&&payload?.length ? (
  <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 12px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
    <p style={{ color:T.text,fontSize:13,margin:0,fontWeight:500 }}>{fmt.price(payload[0].value)}</p>
    <p style={{ color:T.muted,fontSize:11,margin:0 }}>{payload[0].payload.date}</p>
  </div>
) : null;

// Tag
const Tag = ({ label, color, bg }) => <span style={{ background:bg||"#f1f5f9",color:color||T.muted,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap" }}>{label}</span>;

// ─────────────────────────────────────────────
// BUY/SELL MODAL — supports fractional shares
// ─────────────────────────────────────────────
function TradeModal({ ticker, type, stock, cash, existingShares, onConfirm, onClose }) {
  const [mode, setMode]     = useState("shares"); // "shares" | "dollars"
  const [shares, setShares] = useState(1);
  const [dollars, setDollars] = useState(100);

  const actualShares = mode==="shares" ? shares : dollars / stock.price;
  const totalCost    = actualShares * stock.price;
  const maxBuyShares = cash / stock.price;
  const canDo = type==="buy"
    ? totalCost <= cash && actualShares > 0
    : actualShares > 0 && actualShares <= existingShares;

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(3px)" }}>
      <div style={{ background:T.surface,borderRadius:20,padding:28,width:360,boxShadow:"0 24px 64px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div>
            <h3 style={{ fontSize:18,fontWeight:800,margin:0,color:T.text }}>{type==="buy"?"Buy":"Sell"} {ticker}</h3>
            <p style={{ fontSize:13,color:T.muted,margin:0 }}>{stock.name} · {fmt.price(stock.price)}</p>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:22,color:T.dim,cursor:"pointer",lineHeight:1 }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display:"flex",background:T.bg,borderRadius:10,padding:3,marginBottom:16,gap:3 }}>
          {["shares","dollars"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1,padding:"7px",borderRadius:8,border:"none",background:mode===m?T.surface:"transparent",color:mode===m?T.text:T.muted,fontSize:12,fontWeight:600,cursor:"pointer",boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.08)":"none" }}>
              {m==="shares"?"By Shares":"By Amount ($)"}
            </button>
          ))}
        </div>

        {mode==="shares" ? (
          <div style={{ background:T.bg,borderRadius:T.r,padding:16,marginBottom:16 }}>
            <label style={{ fontSize:12,color:T.muted,fontWeight:600,display:"block",marginBottom:8 }}>NUMBER OF SHARES</label>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <button onClick={()=>setShares(Math.max(0.01,+(shares-1).toFixed(2)))} style={{ width:36,height:36,borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:18,cursor:"pointer",color:T.text }}>−</button>
              <input type="number" value={shares} min={0.01} step={0.01}
                onChange={e=>setShares(Math.max(0.01,+e.target.value))}
                style={{ flex:1,textAlign:"center",fontSize:20,fontWeight:700,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 0",color:T.text,background:T.surface,outline:"none" }} />
              <button onClick={()=>setShares(+(shares+1).toFixed(2))} style={{ width:36,height:36,borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:18,cursor:"pointer",color:T.text }}>+</button>
            </div>
            {type==="buy"&&<p style={{ fontSize:11,color:T.muted,margin:"6px 0 0",textAlign:"center" }}>Max: {maxBuyShares.toFixed(4)} shares</p>}
          </div>
        ) : (
          <div style={{ background:T.bg,borderRadius:T.r,padding:16,marginBottom:16 }}>
            <label style={{ fontSize:12,color:T.muted,fontWeight:600,display:"block",marginBottom:8 }}>DOLLAR AMOUNT</label>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:18,fontWeight:700,color:T.muted }}>$</span>
              <input type="number" value={dollars} min={1} step={1}
                onChange={e=>setDollars(Math.max(1,+e.target.value))}
                style={{ width:"100%",textAlign:"center",fontSize:20,fontWeight:700,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 0",paddingLeft:24,color:T.text,background:T.surface,outline:"none",boxSizing:"border-box" }} />
            </div>
            <p style={{ fontSize:11,color:T.muted,margin:"6px 0 0",textAlign:"center" }}>= {actualShares.toFixed(4)} shares</p>
          </div>
        )}

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
          {[["Total",fmt.price(totalCost)],[type==="buy"?"Cash After":"Cash After",fmt.price(type==="buy"?cash-totalCost:cash+totalCost)]].map(([k,v])=>(
            <div key={k} style={{ background:T.bg,borderRadius:T.rsm,padding:"10px 12px" }}>
              <p style={{ fontSize:11,color:T.muted,margin:"0 0 3px",fontWeight:600 }}>{k.toUpperCase()}</p>
              <p style={{ fontSize:14,fontWeight:700,color:T.text,margin:0 }}>{v}</p>
            </div>
          ))}
        </div>

        {!canDo && <p style={{ fontSize:12,color:T.down,marginBottom:10,textAlign:"center" }}>{type==="buy"?"Not enough cash.":"You don't own enough shares."}</p>}
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:"12px",borderRadius:12,border:`1px solid ${T.border}`,background:T.surface,fontSize:14,fontWeight:600,cursor:"pointer",color:T.muted }}>Cancel</button>
          <button onClick={()=>canDo&&onConfirm(actualShares)} disabled={!canDo}
            style={{ flex:2,padding:"12px",borderRadius:12,border:"none",background:type==="buy"?T.up:T.down,fontSize:14,fontWeight:700,cursor:canDo?"pointer":"not-allowed",color:"#fff",opacity:canDo?1:0.5 }}>
            {type==="buy"?`Buy ${actualShares.toFixed(4)} shares`:`Sell ${actualShares.toFixed(4)} shares`}
          </button>
        </div>
        <p style={{ fontSize:11,color:T.dim,textAlign:"center",margin:"10px 0 0" }}>Paper trading only · No real money</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────
const INTERESTS = [
  { id:"tech",       label:"Technology",  icon:"💻", tickers:["AAPL","NVDA","MSFT","AMD"] },
  { id:"finance",    label:"Finance",     icon:"🏦", tickers:["JPM","GS","PYPL","COIN"] },
  { id:"consumer",   label:"Consumer",    icon:"🛍️",  tickers:["AMZN","TSLA","NKE","DIS"] },
  { id:"healthcare", label:"Healthcare",  icon:"🏥", tickers:["JNJ","UNH"] },
  { id:"energy",     label:"Energy",      icon:"⚡", tickers:["XOM","CVX"] },
  { id:"etf",        label:"ETFs / Safe", icon:"📊", tickers:["SPY","QQQ"] },
];
const GOALS = [
  { id:"understand", label:"Understand how markets work",   desc:"Learn the basics of stocks, P/E ratios, and market movements." },
  { id:"portfolio",  label:"Build a strong portfolio",     desc:"Practise diversification and long-term thinking." },
  { id:"beat",       label:"Beat the market",              desc:"Try to outperform the S&P 500 with active trading." },
  { id:"crypto",     label:"Explore high-risk assets",    desc:"Learn how volatile stocks and crypto-correlated assets behave." },
];

function Onboarding({ onComplete }) {
  const [step, setStep]         = useState(1);
  const [name, setName]         = useState("");
  const [interests, setInterests] = useState([]);
  const [goal, setGoal]         = useState(null);

  const recTickers = useMemo(() => {
    const all = interests.flatMap(i => INTERESTS.find(x=>x.id===i)?.tickers||[]);
    return [...new Set(all)].slice(0,5);
  }, [interests]);

  const toggleInterest = id => setInterests(p => p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  return (
    <div style={{ position:"fixed",inset:0,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",zIndex:500 }}>
      <div style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:24,padding:40,width:480,maxWidth:"calc(100vw - 40px)",boxShadow:"0 24px 64px rgba(0,0,0,0.08)" }}>
        {/* Progress */}
        <div style={{ display:"flex",gap:6,marginBottom:28 }}>
          {[1,2,3,4].map(s=>(
            <div key={s} style={{ flex:1,height:4,borderRadius:2,background:s<=step?T.accent:T.border,transition:"background 0.3s" }} />
          ))}
        </div>

        {step===1 && (
          <>
            <div style={{ width:52,height:52,borderRadius:16,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:16 }}>👋</div>
            <h2 style={{ fontSize:22,fontWeight:800,color:T.text,margin:"0 0 8px" }}>Welcome to Meridian</h2>
            <p style={{ fontSize:14,color:T.muted,margin:"0 0 24px",lineHeight:1.6 }}>The paper trading platform for students. Start with $10,000 of virtual money and learn to invest without any risk.</p>
            <label style={{ ...lbl, display:"block" }}>Your Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sofia"
              style={{ width:"100%",background:T.bg,border:`1px solid ${T.border}`,borderRadius:12,padding:"12px 16px",fontSize:15,color:T.text,outline:"none",boxSizing:"border-box",marginBottom:20 }} />
            <button onClick={()=>name.trim()&&setStep(2)} style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:T.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:name.trim()?"pointer":"not-allowed",opacity:name.trim()?1:0.5 }}>Get Started →</button>
          </>
        )}

        {step===2 && (
          <>
            <h2 style={{ fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px" }}>What interests you?</h2>
            <p style={{ fontSize:13,color:T.muted,margin:"0 0 20px" }}>Pick one or more — we'll suggest starter stocks for you.</p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24 }}>
              {INTERESTS.map(i=>(
                <button key={i.id} onClick={()=>toggleInterest(i.id)}
                  style={{ padding:"14px",borderRadius:12,border:`2px solid ${interests.includes(i.id)?T.accent:T.border}`,background:interests.includes(i.id)?T.accentBg:T.surface,cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                  <div style={{ fontSize:20,marginBottom:4 }}>{i.icon}</div>
                  <p style={{ fontSize:13,fontWeight:700,color:interests.includes(i.id)?T.accent:T.text,margin:0 }}>{i.label}</p>
                </button>
              ))}
            </div>
            <button onClick={()=>interests.length&&setStep(3)} style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:T.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:interests.length?"pointer":"not-allowed",opacity:interests.length?1:0.5 }}>Next →</button>
          </>
        )}

        {step===3 && (
          <>
            <h2 style={{ fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px" }}>Your starter stocks</h2>
            <p style={{ fontSize:13,color:T.muted,margin:"0 0 20px" }}>Based on your interests, we suggest starting with these. You can add more later.</p>
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:24 }}>
              {recTickers.map(t=>{
                const s = STOCKS[t]; if(!s) return null;
                const up = s.pct>=0;
                return (
                  <div key={t} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:T.bg,borderRadius:12,border:`1px solid ${T.border}` }}>
                    <div style={{ width:40,height:40,borderRadius:10,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:T.accent,flexShrink:0 }}>{t.slice(0,2)}</div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13,fontWeight:700,color:T.text,margin:0 }}>{t} — {s.name}</p>
                      <p style={{ fontSize:11,color:T.muted,margin:0 }}>{s.sector}</p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ fontSize:13,fontWeight:700,color:T.text,margin:0 }}>{fmt.price(s.price)}</p>
                      <p style={{ fontSize:11,color:up?T.up:T.down,fontWeight:600,margin:0 }}>{fmt.pct(s.pct)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>setStep(4)} style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:T.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer" }}>These look good →</button>
          </>
        )}

        {step===4 && (
          <>
            <h2 style={{ fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px" }}>What's your learning goal?</h2>
            <p style={{ fontSize:13,color:T.muted,margin:"0 0 20px" }}>This helps us personalize your experience.</p>
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:24 }}>
              {GOALS.map(g=>(
                <button key={g.id} onClick={()=>setGoal(g.id)}
                  style={{ padding:"14px 16px",borderRadius:12,border:`2px solid ${goal===g.id?T.accent:T.border}`,background:goal===g.id?T.accentBg:T.surface,cursor:"pointer",textAlign:"left",transition:"all 0.15s" }}>
                  <p style={{ fontSize:13,fontWeight:700,color:goal===g.id?T.accent:T.text,margin:"0 0 2px" }}>{g.label}</p>
                  <p style={{ fontSize:12,color:T.muted,margin:0 }}>{g.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={()=>goal&&onComplete({name,interests,goal,watchlist:recTickers})}
              style={{ width:"100%",padding:"14px",borderRadius:14,border:"none",background:T.accent,color:"#fff",fontSize:15,fontWeight:700,cursor:goal?"pointer":"not-allowed",opacity:goal?1:0.5 }}>
              Start Trading 🚀
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ISOLATED CHAT PANEL (fixes input focus bug)
// ─────────────────────────────────────────────
const ChatPanel = memo(({ positions, cash, totalValue, totalGainPct, watchlist, LIVE }) => {
  const [msgs, setMsgs]       = useState([{ role:"assistant", content:"Hey! 👋 I'm your paper trading assistant. Ask me anything about stocks, your portfolio, or how markets work." }]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = useCallback(async () => {
    if (!input.trim()||loading) return;
    const msg = input.trim(); setInput("");
    setMsgs(p=>[...p,{ role:"user",content:msg }]);
    setLoading(true);
    const ctx = `Paper trading. Balance: ${fmt.price(totalValue)} (started $10,000, gain ${fmt.pct(totalGainPct)}). Cash: ${fmt.price(cash)}.\nPositions: ${positions.map(p=>`${p.ticker} ${p.shares.toFixed(4)} shares @ ${fmt.price(p.s?.price||0)}, gain ${fmt.pct(p.gainPct)}`).join("; ")}.\nWatchlist: ${watchlist.map(t=>`${t} ${fmt.price(LIVE[t]?.price||0)}`).join(", ")}.`;
    try {
      const reply = await aiChat(msg, ctx);
      setMsgs(p=>[...p,{ role:"assistant",content:reply }]);
    } catch(e) { setMsgs(p=>[...p,{ role:"assistant",content:`Sorry, error: ${e.message}` }]); }
    setLoading(false);
  }, [input, loading, positions, cash, totalValue, totalGainPct, watchlist, LIVE]);

  const SUGGESTIONS = ["How is my portfolio doing?","What's my best trade?","Explain what a P/E ratio means","Which stock is riskiest in my portfolio?","What is beta?","Should I diversify more?"];

  return (
    <div style={{ display:"grid",gridTemplateColumns:"1fr 260px",gap:16 }}>
      <div style={{ ...card(),display:"flex",flexDirection:"column",height:580 }}>
        <p style={{ ...lbl,margin:"0 0 16px" }}>AI Assistant</p>
        <div style={{ flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:14,paddingBottom:8 }}>
          {msgs.map((m,i)=>(
            <div key={i} style={{ display:"flex",gap:10,flexDirection:m.role==="user"?"row-reverse":"row" }}>
              <div style={{ width:28,height:28,borderRadius:8,background:m.role==="assistant"?T.accentBg:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:m.role==="assistant"?T.accent:T.muted,flexShrink:0,fontWeight:700 }}>
                {m.role==="assistant"?"✦":"U"}
              </div>
              <div style={{ maxWidth:"80%",background:m.role==="user"?T.bg:T.accentBg,border:`1px solid ${m.role==="user"?T.border:T.accentBorder}`,borderRadius:14,padding:"10px 14px" }}>
                {m.content.split("\n").map((line,j)=><p key={j} style={{ fontSize:13,color:T.text,margin:"2px 0",lineHeight:1.6 }}>{line.replace(/\*\*/g,"")}</p>)}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex",gap:10 }}>
              <div style={{ width:28,height:28,borderRadius:8,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:T.accent,fontWeight:700 }}>✦</div>
              <div style={{ background:T.accentBg,border:`1px solid ${T.accentBorder}`,borderRadius:14,padding:"10px 14px" }}>
                <p style={{ fontSize:13,color:T.muted,margin:0 }}>Thinking…</p>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div style={{ display:"flex",gap:8,paddingTop:12,borderTop:`1px solid ${T.border}` }}>
          <input
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Ask about stocks, your portfolio, how markets work…"
            style={{ flex:1,background:T.bg,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",fontSize:13,color:T.text,outline:"none" }}
          />
          <button onClick={send} disabled={loading||!input.trim()} style={{ padding:"10px 20px",borderRadius:12,border:"none",background:T.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:loading||!input.trim()?0.5:1 }}>Send</button>
        </div>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        <div style={card()}>
          <p style={lbl}>Try asking</p>
          {SUGGESTIONS.map(q=>(
            <button key={q} onClick={()=>setInput(q)} style={{ display:"block",width:"100%",textAlign:"left",padding:"8px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:12,color:T.muted,cursor:"pointer",marginBottom:6,fontWeight:500 }}>{q}</button>
          ))}
        </div>
        <div style={card()}>
          <p style={lbl}>AI has access to</p>
          {["Your portfolio & trades","Cash balance","Watchlist prices","Market data"].map(i=>(
            <div key={i} style={{ display:"flex",gap:8,marginBottom:6 }}>
              <span style={{ color:T.up,fontSize:12 }}>✓</span>
              <span style={{ fontSize:12,color:T.muted }}>{i}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {
  const [view, setView]             = useState("home");
  const [selected, setSelected]     = useState(null);
  const [watchlist, setWatchlist]   = useState(["AAPL","NVDA","TSLA","META","SPY"]);
  const [trades, setTrades]         = useState([]);
  const [modal, setModal]           = useState(null);
  const [aiState, setAiState]       = useState({});
  const [addTicker, setAddTicker]   = useState("");
  const [liveStocks, setLiveStocks] = useState({});
  const [liveLoading, setLiveLoading] = useState(true);
  const [filterSector, setFilterSector] = useState("All");
  const [sortBy, setSortBy]         = useState({ col:"pct",dir:-1 });
  const [toast, setToast]           = useState(null);
  const [onboarded, setOnboarded]   = useState(() => !!localStorage.getItem("meridian_onboarded"));
  const [userName, setUserName]     = useState(() => localStorage.getItem("meridian_name")||"");
  const [marketBrief, setMarketBrief] = useState({ text:null,loading:false });
  const [user, setUser]             = useState(null); // Firebase user
  const [authReady, setAuthReady]   = useState(false); // wait for Firebase before rendering
  const [dataLoaded, setDataLoaded] = useState(false); // wait for Firestore load before saving

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        setDataLoaded(false); // block saving until load completes
        setUser(u);
        const data = await fbLoad(u.uid);
        if (data) {
          if (data.trades)    setTrades(data.trades);
          if (data.watchlist) setWatchlist(data.watchlist);
          if (data.name)      { setUserName(data.name); localStorage.setItem("meridian_name", data.name); }
          if (data.onboarded) { localStorage.setItem("meridian_onboarded","1"); setOnboarded(true); }
        }
        setDataLoaded(true);  // load complete — saves are now safe
      } else {
        // signed out — reset to clean state
        setUser(null);
        setDataLoaded(false);
        setTrades([]);
        setWatchlist(["AAPL","NVDA","TSLA","META","SPY"]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Save to Firestore — only after data has been loaded (prevents overwriting with empty state)
  useEffect(() => {
    if (user && dataLoaded) {
      fbSave(user.uid, { trades, watchlist, name: userName, onboarded: true });
    }
  }, [trades, watchlist, user, dataLoaded]);

  // Live data fetch
  useEffect(() => {
    async function load() {
      setLiveLoading(true);
      const tickers = Object.keys(STOCKS);
      const [quotes, histories] = await Promise.all([
        Promise.all(tickers.map(fetchQuote)),
        Promise.all(tickers.map(fetchHistory)),
      ]);
      const live = {};
      tickers.forEach((t,i) => { live[t] = { ...STOCKS[t], ...(quotes[i]||{}), history:histories[i]||STOCKS[t].history }; });
      setLiveStocks(live);
      setLiveLoading(false);
    }
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const LIVE = useMemo(() => Object.keys(STOCKS).reduce((acc,t) => { acc[t]=liveStocks[t]??STOCKS[t]; return acc; }, {}), [liveStocks]);

  // Load AI market brief once
  useEffect(() => {
    if (!liveLoading && !marketBrief.text && !marketBrief.loading) {
      const vals = Object.values(LIVE);
      const gainers = vals.filter(s=>s.pct>0).sort((a,b)=>b.pct-a.pct).slice(0,3);
      const losers  = vals.filter(s=>s.pct<0).sort((a,b)=>a.pct-b.pct).slice(0,3);
      setMarketBrief({ text:null, loading:true });
      aiMarket({ gainers, losers }).then(text => setMarketBrief({ text, loading:false })).catch(() => setMarketBrief({ text:null, loading:false }));
    }
  }, [liveLoading]);

  const cash          = useMemo(() => calcCash(trades), [trades]);
  const positions     = useMemo(() => calcPortfolio(trades, LIVE), [trades, LIVE]);
  const investedValue = useMemo(() => positions.reduce((a,p)=>a+p.value,0), [positions]);
  const totalValue    = cash + investedValue;
  const totalGain     = totalValue - STARTING_BALANCE;
  const totalGainPct  = (totalGain / STARTING_BALANCE) * 100;

  const setAI = (key,val) => setAiState(p=>({...p,[key]:{...p[key],...val}}));
  const handleAI = async (type,ticker) => {
    const key=`${type}_${ticker}`;
    setAI(key,{loading:true,error:null,text:null});
    try {
      const s=LIVE[ticker], n=NEWS[ticker]||fallbackNews(ticker);
      const text = type==="explain"?await aiExplain(ticker,s):type==="news"?await aiNews(ticker,n,s):await aiView(ticker,s,n);
      setAI(key,{loading:false,text});
    } catch(e){setAI(key,{loading:false,error:e.message});}
  };

  const showToast = (msg,type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3000); };
  const handleTrade = (ticker,type,shares) => {
    const price = LIVE[ticker]?.price||STOCKS[ticker].price;
    setTrades(p=>[...p,{ticker,type,shares,price,date:new Date().toISOString()}]);
    setModal(null);
    showToast(`${type==="buy"?"Bought":"Sold"} ${shares.toFixed(4)} shares of ${ticker} at ${fmt.price(price)}`);
  };
  const openStock = t => { setSelected(t); setView("stock"); };

  const handleOnboarded = ({ name, interests, goal, watchlist: wl }) => {
    setUserName(name);
    setWatchlist(wl);
    localStorage.setItem("meridian_onboarded","1");
    localStorage.setItem("meridian_name",name);
    setOnboarded(true);
  };

  const sectors = ["All",...new Set(Object.values(LIVE).map(s=>s.sector))];
  const screenerData = useMemo(() => Object.values(LIVE).filter(s=>filterSector==="All"||s.sector===filterSector).sort((a,b)=>{const av=a[sortBy.col]??0,bv=b[sortBy.col]??0;return(av>bv?1:-1)*sortBy.dir;}), [LIVE,filterSector,sortBy]);

  const navItems = [["home","Home"],["trade","Markets"],["portfolio","Portfolio"],["screener","Screener"],["learn","Learn"],["chat","AI Chat"]];

  // Show loading screen while Firebase resolves auth state
  if (!authReady) return (
    <div style={{ background:T.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'DM Rounded','Nunito',system-ui,sans-serif" }}>
      <div style={{ width:48,height:48,borderRadius:16,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"#fff",fontWeight:800 }}>M</div>
      <p style={{ fontSize:14,color:T.muted,margin:0 }}>Loading Meridian…</p>
      <div style={{ width:32,height:32,borderRadius:"50%",border:`3px solid ${T.accentBg}`,borderTopColor:T.accent,animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!onboarded) return <Onboarding onComplete={handleOnboarded} />;

  return (
    <div style={{ background:T.bg,minHeight:"100vh",fontFamily:"'DM Rounded','Nunito','Varela Round',system-ui,sans-serif",color:T.text }}>

      {/* Toast */}
      {toast && <div style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:toast.type==="success"?T.up:T.down,color:"#fff",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:2000,boxShadow:"0 4px 20px rgba(0,0,0,0.15)",whiteSpace:"nowrap" }}>{toast.msg}</div>}

      {/* Trade Modal */}
      {modal && <TradeModal ticker={modal.ticker} type={modal.type} stock={LIVE[modal.ticker]} cash={cash} existingShares={positions.find(p=>p.ticker===modal.ticker)?.shares||0} onConfirm={(s)=>handleTrade(modal.ticker,modal.type,s)} onClose={()=>setModal(null)} />}

      {/* NAV */}
      <nav style={{ background:T.surface,borderBottom:`1px solid ${T.border}`,height:60,display:"flex",alignItems:"center",padding:"0 32px",justifyContent:"space-between",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:12,background:T.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:800,flexShrink:0 }}>M</div>
          <div>
            <p style={{ fontSize:16,fontWeight:800,color:T.text,margin:0,lineHeight:1 }}>Meridian</p>
            <p style={{ fontSize:10,color:T.muted,margin:0,fontWeight:600,letterSpacing:"0.04em" }}>PAPER TRADING</p>
          </div>
        </div>
        <div style={{ display:"flex",gap:2 }}>
          {navItems.map(([id,label])=>(
            <button key={id} onClick={()=>setView(id)} style={{ padding:"6px 14px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",border:"none",background:view===id||(view==="stock"&&id==="trade")?T.accentBg:"transparent",color:view===id||(view==="stock"&&id==="trade")?T.accent:T.muted,transition:"all 0.15s" }}>{label}</button>
          ))}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          {userName && <span style={{ fontSize:13,color:T.muted,fontWeight:500 }}>Hi, {userName} 👋</span>}
          {user
            ? <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:30,height:30,borderRadius:"50%",background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:T.accent }}>{user.displayName?.[0]||user.email?.[0]||"U"}</div>
                <button onClick={()=>signOut(auth).then(()=>setUser(null))} style={{ fontSize:11,color:T.muted,background:"none",border:"none",cursor:"pointer" }}>Sign out</button>
              </div>
            : <button onClick={()=>signInWithPopup(auth, provider).catch(console.error)} style={{ padding:"7px 16px",borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:12,fontWeight:600,cursor:"pointer",color:T.text }}>
                Sign in with Google
              </button>
          }
          <div>
            <p style={{ fontSize:11,color:T.muted,margin:0 }}>Balance</p>
            <p style={{ fontSize:15,fontWeight:800,color:T.text,margin:0 }}>{fmt.price(totalValue)}</p>
          </div>
          <div style={{ width:8,height:8,borderRadius:"50%",background:liveLoading?"#f59e0b":T.up,transition:"background 0.5s" }} title={liveLoading?"Loading…":"Live data"} />
        </div>
      </nav>

      {/* Indices bar */}
      <div style={{ background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"6px 32px",display:"flex",gap:28,overflowX:"auto" }}>
        {INDICES.map(i=>(
          <div key={i.name} style={{ flexShrink:0,display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontSize:11,color:T.muted,fontWeight:500 }}>{i.name}</span>
            <span style={{ fontSize:12,fontWeight:700,color:T.text }}>{i.val}</span>
            <span style={{ fontSize:11,color:i.up?T.up:T.down,fontWeight:600 }}>{i.chg}</span>
          </div>
        ))}
      </div>

      {/* PAGE CONTENT */}
      <div style={{ padding:"20px 32px" }}>

        {/* ── HOME ── */}
        {view==="home" && (()=>{
          const gainers = Object.values(LIVE).filter(s=>s.pct>0).sort((a,b)=>b.pct-a.pct).slice(0,5);
          const losers  = Object.values(LIVE).filter(s=>s.pct<0).sort((a,b)=>a.pct-b.pct).slice(0,5);
          const sentiment = gainers.length > losers.length ? { label:"Bullish", color:T.up } : gainers.length < losers.length ? { label:"Bearish", color:T.down } : { label:"Neutral", color:"#d97706" };
          return (
            <div>
              {/* Summary row */}
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
                {[
                  { label:"Total Balance", value:fmt.price(totalValue), sub:totalGain>=0?`▲ ${fmt.price(Math.abs(totalGain))} (${fmt.pct(totalGainPct)})`:`▼ ${fmt.price(Math.abs(totalGain))} (${fmt.pct(totalGainPct)})`, subColor:totalGain>=0?T.up:T.down },
                  { label:"Cash Available", value:fmt.price(cash), sub:`${((cash/STARTING_BALANCE)*100).toFixed(0)}% of start`, subColor:T.muted },
                  { label:"Invested", value:fmt.price(investedValue), sub:`${positions.length} position${positions.length!==1?"s":""}`, subColor:T.muted },
                  { label:"Market Sentiment", value:sentiment.label, sub:"Based on today's movers", subColor:sentiment.color },
                ].map(c=>(
                  <div key={c.label} style={card()}>
                    <p style={lbl}>{c.label}</p>
                    <p style={{ fontSize:20,fontWeight:800,color:c.label==="Market Sentiment"?sentiment.color:T.text,margin:"0 0 3px",letterSpacing:"-0.02em" }}>{c.value}</p>
                    <p style={{ fontSize:12,color:c.subColor,margin:0,fontWeight:500 }}>{c.sub}</p>
                  </div>
                ))}
              </div>

              {/* AI Market Brief */}
              <div style={{ ...card(),marginBottom:20,borderLeft:`4px solid ${T.accent}` }}>
                <div style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
                  <div style={{ width:40,height:40,borderRadius:12,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>📰</div>
                  <div style={{ flex:1 }}>
                    <p style={{ ...lbl,margin:"0 0 6px" }}>Today in Markets — AI Brief</p>
                    {marketBrief.loading && <p style={{ fontSize:13,color:T.muted,margin:0 }}>Generating today's market summary…</p>}
                    {marketBrief.text && marketBrief.text.split("\n").map((line,i)=>(
                      <p key={i} style={{ fontSize:14,color:T.text,margin:"2px 0",lineHeight:1.6 }}>{line.replace(/\*\*/g,"")}</p>
                    ))}
                    {!marketBrief.loading&&!marketBrief.text && <p style={{ fontSize:13,color:T.muted,margin:0 }}>Loading market data…</p>}
                  </div>
                  <Tag label={sentiment.label} color={sentiment.color} bg={sentiment.color+"22"} />
                </div>
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16 }}>
                {/* Gainers */}
                <div style={card()}>
                  <p style={lbl}>🟢 Top Gainers</p>
                  {gainers.map(s=>(
                    <div key={s.ticker} onClick={()=>openStock(s.ticker)} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:34,height:34,borderRadius:10,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:T.accent }}>{s.ticker.slice(0,2)}</div>
                        <div><p style={{ fontSize:13,fontWeight:700,color:T.text,margin:0 }}>{s.ticker}</p><p style={{ fontSize:11,color:T.muted,margin:0 }}>{s.name}</p></div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <PriceCell value={s.price} up={true} />
                        <p style={{ fontSize:12,color:T.up,fontWeight:700,margin:0 }}>{fmt.pct(s.pct)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Losers */}
                <div style={card()}>
                  <p style={lbl}>🔴 Top Losers</p>
                  {losers.map(s=>(
                    <div key={s.ticker} onClick={()=>openStock(s.ticker)} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div style={{ width:34,height:34,borderRadius:10,background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:T.down }}>{s.ticker.slice(0,2)}</div>
                        <div><p style={{ fontSize:13,fontWeight:700,color:T.text,margin:0 }}>{s.ticker}</p><p style={{ fontSize:11,color:T.muted,margin:0 }}>{s.name}</p></div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <PriceCell value={s.price} up={false} />
                        <p style={{ fontSize:12,color:T.down,fontWeight:700,margin:0 }}>{fmt.pct(s.pct)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* News */}
                <div style={card()}>
                  <p style={lbl}>Latest News</p>
                  <div style={{ display:"flex",flexDirection:"column",gap:10,maxHeight:320,overflowY:"auto" }}>
                    {Object.entries(NEWS).flatMap(([t,items])=>items.map(n=>({...n,ticker:t}))).slice(0,7).map((n,i)=>(
                      <div key={i} onClick={()=>openStock(n.ticker)} style={{ borderLeft:`3px solid ${SECTOR_COLORS[LIVE[n.ticker]?.sector]||T.accent}`,paddingLeft:10,cursor:"pointer" }}>
                        <p style={{ fontSize:12,fontWeight:600,color:T.text,margin:"0 0 2px",lineHeight:1.4 }}>{n.title}</p>
                        <p style={{ fontSize:10,color:T.muted,margin:0 }}><span style={{ fontWeight:700,color:SECTOR_COLORS[LIVE[n.ticker]?.sector]||T.accent }}>{n.ticker}</span> · {n.source} · {n.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── MARKETS (Watchlist + Trade) ── */}
        {view==="trade" && (
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <h2 style={{ fontSize:20,fontWeight:800,margin:0,color:T.text }}>Markets</h2>
              <div style={{ display:"flex",gap:8 }}>
                <input value={addTicker} onChange={e=>setAddTicker(e.target.value.toUpperCase())} placeholder="Add ticker…"
                  style={{ background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 14px",fontSize:13,color:T.text,outline:"none",width:120 }}
                  onKeyDown={e=>{ if(e.key==="Enter"&&LIVE[addTicker]){setWatchlist(p=>[...new Set([...p,addTicker])]);setAddTicker("");} }} />
                <button onClick={()=>{ if(LIVE[addTicker]){setWatchlist(p=>[...new Set([...p,addTicker])]);setAddTicker("");} }}
                  style={{ background:T.accent,border:"none",borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer" }}>+</button>
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12 }}>
              {watchlist.map(t=>{
                const s=LIVE[t]; if(!s) return null;
                const up=s.pct>=0, risk=RISK(s.beta,s.pe), pos=positions.find(p=>p.ticker===t);
                return (
                  <div key={t} style={{ ...card(),cursor:"pointer",transition:"box-shadow 0.15s" }}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.08)"}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                    <div onClick={()=>openStock(t)}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <div style={{ width:40,height:40,borderRadius:12,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:T.accent }}>{t.slice(0,2)}</div>
                          <div><p style={{ fontSize:14,fontWeight:800,color:T.text,margin:0 }}>{t}</p><p style={{ fontSize:11,color:T.muted,margin:0 }}>{s.name}</p></div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();setWatchlist(p=>p.filter(x=>x!==t));}} style={{ background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:18,padding:0 }}>×</button>
                      </div>
                      <div style={{ height:50,marginBottom:10 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={s.history.slice(-20)}>
                            <Line type="monotone" dataKey="price" stroke={up?T.up:T.down} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:10 }}>
                        <div>
                          <PriceCell value={s.price} up={up} />
                          <p style={{ fontSize:12,color:up?T.up:T.down,fontWeight:700,margin:"2px 0 0" }}>{fmt.pct(s.pct)} today</p>
                        </div>
                        <Tag label={risk.label} color={risk.color} bg={risk.bg} />
                      </div>
                      {pos && <div style={{ background:pos.gain>=0?T.upBg:T.downBg,borderRadius:8,padding:"6px 10px",marginBottom:10,display:"flex",justifyContent:"space-between" }}>
                        <span style={{ fontSize:11,color:T.muted }}>You own {pos.shares.toFixed(4)} shares</span>
                        <span style={{ fontSize:11,fontWeight:700,color:pos.gain>=0?T.up:T.down }}>{fmt.pct(pos.gainPct)}</span>
                      </div>}
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                      <button onClick={()=>setModal({ticker:t,type:"buy"})} style={{ padding:"9px",borderRadius:10,border:"none",background:T.up,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>Buy</button>
                      <button onClick={()=>pos?setModal({ticker:t,type:"sell"}):null} style={{ padding:"9px",borderRadius:10,border:`1px solid ${T.border}`,background:pos?T.surface:"#f8f8f8",color:pos?T.down:T.dim,fontSize:13,fontWeight:700,cursor:pos?"pointer":"not-allowed" }}>Sell</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STOCK DETAIL ── */}
        {view==="stock" && selected && (()=>{
          const s=LIVE[selected]; if(!s) return null;
          const up=s.pct>=0, risk=RISK(s.beta,s.pe), news=NEWS[selected]||fallbackNews(selected);
          const pos=positions.find(p=>p.ticker===selected);
          const newsAI=aiState[`news_${selected}`]||{}, viewAI=aiState[`view_${selected}`]||{}, explainAI=aiState[`explain_${selected}`]||{};
          return (
            <div>
              <button onClick={()=>setView("trade")} style={{ background:"none",border:"none",color:T.accent,cursor:"pointer",fontSize:13,fontWeight:600,padding:0,marginBottom:16 }}>← Back to Markets</button>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:16 }}>
                <div>
                  <div style={{ ...card(),marginBottom:14 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                      <div>
                        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap" }}>
                          <h1 style={{ fontSize:26,fontWeight:800,color:T.text,margin:0 }}>{s.ticker}</h1>
                          <span style={{ fontSize:15,color:T.muted }}>{s.name}</span>
                          <Tag label={s.sector} color={SECTOR_COLORS[s.sector]} bg={SECTOR_COLORS[s.sector]+"22"} />
                          <Tag label={risk.label} color={risk.color} bg={risk.bg} />
                        </div>
                        <div style={{ display:"flex",alignItems:"baseline",gap:12,marginBottom:10 }}>
                          <PriceCell value={s.price} up={up} />
                          <span style={{ fontSize:15,fontWeight:700,color:up?T.up:T.down }}>{fmt.chg(s.change)} ({fmt.pct(s.pct)})</span>
                        </div>
                        <p style={{ fontSize:13,color:T.muted,margin:0,lineHeight:1.6,maxWidth:560 }}>{s.desc}</p>
                      </div>
                      <div style={{ display:"flex",gap:8,flexShrink:0 }}>
                        {!watchlist.includes(selected)
                          ?<button onClick={()=>setWatchlist(p=>[...p,selected])} style={{ padding:"8px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:12,fontWeight:600,cursor:"pointer",color:T.muted }}>+ Watch</button>
                          :<button onClick={()=>setWatchlist(p=>p.filter(t=>t!==selected))} style={{ padding:"8px 14px",borderRadius:10,border:`1px solid ${T.up}`,background:T.upBg,fontSize:12,fontWeight:600,cursor:"pointer",color:T.up }}>✓ Watching</button>}
                        <button onClick={()=>setModal({ticker:selected,type:"buy"})} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:T.up,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>Buy</button>
                        {pos&&<button onClick={()=>setModal({ticker:selected,type:"sell"})} style={{ padding:"8px 18px",borderRadius:10,border:`1px solid ${T.down}`,background:T.downBg,color:T.down,fontSize:13,fontWeight:700,cursor:"pointer" }}>Sell</button>}
                      </div>
                    </div>
                  </div>
                  {/* Chart */}
                  <div style={{ ...card(),marginBottom:14 }}>
                    <p style={{ ...lbl,marginBottom:8 }}>60-Day Price Chart</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={s.history}>
                        <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={up?T.up:T.down} stopOpacity={0.15}/><stop offset="95%" stopColor={up?T.up:T.down} stopOpacity={0}/></linearGradient></defs>
                        <XAxis dataKey="date" tick={{ fontSize:10,fill:T.muted }} tickLine={false} axisLine={false} interval={9}/>
                        <YAxis tick={{ fontSize:10,fill:T.muted }} tickLine={false} axisLine={false} domain={["auto","auto"]} tickFormatter={v=>`$${v}`} width={55}/>
                        <Tooltip content={<ChartTip />}/>
                        <Area type="monotone" dataKey="price" stroke={up?T.up:T.down} strokeWidth={2.5} fill="url(#sg)" dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Stats with tooltips */}
                  <div style={{ ...card(),marginBottom:14 }}>
                    <p style={lbl}>Key Statistics</p>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                      {[["Open",fmt.price(s.open)],["High",fmt.price(s.high)],["Low",fmt.price(s.low)],["Volume",s.vol],["Mkt Cap",s.mktCap,"Market Cap"],["P/E",s.pe??"-","P/E Ratio"],["EPS",s.eps?fmt.price(s.eps):"-","EPS"],["Beta",s.beta,"Beta"]].map(([k,v,tip])=>(
                        <div key={k} style={{ background:T.bg,borderRadius:T.rsm,padding:"10px 12px" }}>
                          <p style={{ ...lbl,margin:"0 0 3px" }}><InfoTip term={tip||k} /></p>
                          <p style={{ fontSize:14,fontWeight:700,color:T.text,margin:0 }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    {/* 52W Range */}
                    <div style={{ marginTop:14 }}>
                      <p style={{ ...lbl,margin:"0 0 8px" }}><InfoTip term="52W Range" /></p>
                      <div style={{ position:"relative",height:6,background:T.border,borderRadius:3 }}>
                        <div style={{ width:`${((s.price-s.w52l)/(s.w52h-s.w52l))*100}%`,height:"100%",background:up?T.up:T.down,borderRadius:3,opacity:0.4 }}/>
                        <div style={{ position:"absolute",left:`${((s.price-s.w52l)/(s.w52h-s.w52l))*100}%`,top:-4,transform:"translateX(-50%)",width:14,height:14,borderRadius:"50%",background:up?T.up:T.down,border:`2px solid ${T.surface}` }}/>
                      </div>
                      <div style={{ display:"flex",justifyContent:"space-between",marginTop:5 }}>
                        <span style={{ fontSize:11,color:T.muted }}>{fmt.price(s.w52l)}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:T.text }}>{fmt.price(s.price)}</span>
                        <span style={{ fontSize:11,color:T.muted }}>{fmt.price(s.w52h)}</span>
                      </div>
                    </div>
                  </div>
                  {/* News */}
                  <div style={card()}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                      <p style={{ ...lbl,margin:0 }}>Recent News</p>
                      <button onClick={()=>handleAI("news",selected)} style={{ padding:"6px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,fontSize:12,fontWeight:600,cursor:"pointer",color:T.accent }} disabled={newsAI.loading}>{newsAI.loading?"Analyzing…":"✦ Summarize"}</button>
                    </div>
                    {news.map(n=>(
                      <div key={n.id} style={{ borderLeft:`3px solid ${SECTOR_COLORS[s.sector]||T.accent}`,paddingLeft:12,marginBottom:14 }}>
                        <p style={{ fontSize:13,fontWeight:600,color:T.text,margin:"0 0 3px",lineHeight:1.4 }}>{n.title}</p>
                        <p style={{ fontSize:12,color:T.muted,margin:"0 0 3px",lineHeight:1.5 }}>{n.body}</p>
                        <p style={{ fontSize:11,color:T.dim,margin:0 }}>{n.source} · {n.time}</p>
                      </div>
                    ))}
                    <AIPanel {...newsAI} label="AI News Summary" />
                  </div>
                </div>
                {/* Sidebar */}
                <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                  {pos && (
                    <div style={{ ...card(),border:`1px solid ${T.up}44`,background:T.upBg }}>
                      <p style={lbl}>Your Position</p>
                      {[["Shares",pos.shares.toFixed(4)],["Avg Cost",fmt.price(pos.avgCost)],["Value",fmt.price(pos.value)],["P&L",<span style={{color:pos.gain>=0?T.up:T.down,fontWeight:700}}>{fmt.price(pos.gain)}</span>],["Return",<span style={{color:pos.gainPct>=0?T.up:T.down,fontWeight:700}}>{fmt.pct(pos.gainPct)}</span>]].map(([k,v],i)=>(
                        <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}` }}>
                          <span style={{ fontSize:12,color:T.muted }}>{k}</span>
                          <span style={{ fontSize:13,fontWeight:600,color:T.text }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={card()}>
                    <p style={lbl}>Quick Trade</p>
                    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                      <button onClick={()=>setModal({ticker:selected,type:"buy"})} style={{ padding:"12px",borderRadius:12,border:"none",background:T.up,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer" }}>Buy {selected}</button>
                      <button onClick={()=>pos?setModal({ticker:selected,type:"sell"}):null} style={{ padding:"12px",borderRadius:12,border:`1px solid ${T.border}`,background:pos?T.surface:T.bg,color:pos?T.down:T.dim,fontSize:14,fontWeight:700,cursor:pos?"pointer":"not-allowed" }}>{pos?`Sell ${selected}`:"No position to sell"}</button>
                    </div>
                    <p style={{ fontSize:11,color:T.dim,margin:"10px 0 0",textAlign:"center" }}>Paper trading · No real money</p>
                  </div>
                  <div style={card()}>
                    <p style={lbl}>AI Analysis</p>
                    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                      <button onClick={()=>handleAI("explain",selected)} style={{ padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:12,fontWeight:600,cursor:"pointer",color:T.accent,textAlign:"left" }} disabled={explainAI.loading}>💡 {explainAI.loading?"Loading…":"What does this company do?"}</button>
                      <button onClick={()=>handleAI("view",selected)} style={{ padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:12,fontWeight:600,cursor:"pointer",color:T.accent,textAlign:"left" }} disabled={viewAI.loading}>◈ {viewAI.loading?"Generating…":"Investment view"}</button>
                      <button onClick={()=>setView("chat")} style={{ padding:"9px 14px",borderRadius:10,border:`1px solid ${T.border}`,background:T.surface,fontSize:12,fontWeight:600,cursor:"pointer",color:T.muted,textAlign:"left" }}>◉ Ask AI anything</button>
                    </div>
                    <p style={{ fontSize:10,color:T.dim,margin:"10px 0 0",fontStyle:"italic" }}>AI interprets data only. Not financial advice.</p>
                    <AIPanel {...explainAI} label="Plain English" />
                    <AIPanel {...viewAI} label="Investment View" />
                  </div>
                  <div style={card()}>
                    <p style={lbl}>Same Sector</p>
                    {Object.values(LIVE).filter(x=>x.sector===s.sector&&x.ticker!==selected).slice(0,5).map(x=>(
                      <div key={x.ticker} onClick={()=>openStock(x.ticker)} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}`,cursor:"pointer" }}>
                        <span style={{ fontSize:13,fontWeight:700,color:T.text }}>{x.ticker}</span>
                        <div style={{ textAlign:"right" }}>
                          <PriceCell value={x.price} up={x.pct>=0} />
                          <p style={{ fontSize:11,color:x.pct>=0?T.up:T.down,margin:0,fontWeight:600 }}>{fmt.pct(x.pct)}</p>
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
        {view==="portfolio" && (
          <div>
            <h2 style={{ fontSize:20,fontWeight:800,margin:"0 0 16px",color:T.text }}>My Portfolio</h2>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20 }}>
              {[["Total Value",fmt.price(totalValue),totalGain>=0?T.up:T.down],["Cash",fmt.price(cash),T.muted],["Invested",fmt.price(investedValue),T.muted],["Total Return",fmt.pct(totalGainPct),totalGainPct>=0?T.up:T.down]].map(([label,val,color])=>(
                <div key={label} style={card()}>
                  <p style={lbl}>{label}</p>
                  <p style={{ fontSize:22,fontWeight:800,color,margin:0 }}>{val}</p>
                </div>
              ))}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:16 }}>
              <div style={card()}>
                <p style={{ ...lbl,marginBottom:16 }}>Open Positions</p>
                {positions.length===0 ? (
                  <div style={{ textAlign:"center",padding:"40px 0" }}>
                    <p style={{ fontSize:15,color:T.muted }}>No positions yet.</p>
                    <button onClick={()=>setView("trade")} style={{ marginTop:8,padding:"10px 20px",borderRadius:10,border:"none",background:T.accent,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>Start Trading →</button>
                  </div>
                ):(
                  <table style={{ width:"100%",borderCollapse:"collapse" }}>
                    <thead><tr>{["Ticker","Shares","Avg Cost","Price","Value","P&L","Return"].map((h,i)=><th key={h} style={{ fontSize:11,color:T.muted,textAlign:i===0?"left":"right",padding:"0 10px 10px 0",fontWeight:600,letterSpacing:"0.04em" }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {positions.map(p=>(
                        <tr key={p.ticker} style={{ borderTop:`1px solid ${T.border}`,cursor:"pointer" }} onClick={()=>openStock(p.ticker)}>
                          <td style={{ padding:"12px 10px 12px 0" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:30,height:30,borderRadius:8,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:T.accent }}>{p.ticker.slice(0,2)}</div><div><p style={{ fontSize:13,fontWeight:800,color:T.text,margin:0 }}>{p.ticker}</p><p style={{ fontSize:10,color:T.muted,margin:0 }}>{p.s?.name}</p></div></div></td>
                          <td style={{ padding:"12px 10px",fontSize:13,color:T.text,textAlign:"right" }}>{p.shares.toFixed(4)}</td>
                          <td style={{ padding:"12px 10px",fontSize:13,color:T.muted,textAlign:"right" }}>{fmt.price(p.avgCost)}</td>
                          <td style={{ padding:"12px 10px",textAlign:"right" }}><PriceCell value={p.s?.price||0} up={p.gain>=0} /></td>
                          <td style={{ padding:"12px 10px",fontSize:13,color:T.text,textAlign:"right" }}>{fmt.price(p.value)}</td>
                          <td style={{ padding:"12px 10px",textAlign:"right" }}><span style={{ fontSize:13,fontWeight:700,color:p.gain>=0?T.up:T.down }}>{fmt.chg(p.gain)}</span></td>
                          <td style={{ padding:"12px 0",textAlign:"right" }}><Tag label={fmt.pct(p.gainPct)} color={p.gainPct>=0?T.up:T.down} bg={p.gainPct>=0?T.upBg:T.downBg} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {positions.length>0&&(
                  <div style={card()}>
                    <p style={lbl}>Allocation</p>
                    <div style={{ display:"flex",height:8,borderRadius:4,overflow:"hidden",gap:1,marginBottom:14 }}>
                      {positions.map((p,i)=>{const cols=["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6","#f97316"];return<div key={p.ticker} style={{ flex:p.value/investedValue,background:cols[i%cols.length] }}/>;}) }
                    </div>
                    {positions.map((p,i)=>{const cols=["#6366f1","#10b981","#f59e0b","#ec4899","#3b82f6","#f97316"];return(<div key={p.ticker} style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:8,height:8,borderRadius:2,background:cols[i%cols.length] }}/><span style={{ fontSize:13,fontWeight:700,color:T.text }}>{p.ticker}</span></div><span style={{ fontSize:12,color:T.muted }}>{((p.value/investedValue)*100).toFixed(1)}%</span></div>);})}
                  </div>
                )}
                <div style={card()}>
                  <p style={lbl}>Trade History</p>
                  {trades.length===0?<p style={{ fontSize:13,color:T.muted }}>No trades yet.</p>:trades.slice().reverse().slice(0,8).map((t,i)=>(
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${T.border}` }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}><Tag label={t.type.toUpperCase()} color={t.type==="buy"?T.up:T.down} bg={t.type==="buy"?T.upBg:T.downBg}/><span style={{ fontSize:13,fontWeight:700,color:T.text }}>{t.ticker}</span></div>
                      <div style={{ textAlign:"right" }}><p style={{ fontSize:12,color:T.text,margin:0 }}>{t.shares.toFixed(4)} × {fmt.price(t.price)}</p><p style={{ fontSize:10,color:T.muted,margin:0 }}>{new Date(t.date).toLocaleDateString()}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SCREENER ── */}
        {view==="screener" && (
          <div>
            <h2 style={{ fontSize:20,fontWeight:800,margin:"0 0 16px",color:T.text }}>Stock Screener</h2>
            <div style={{ ...card(),marginBottom:14,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
              <span style={{ fontSize:11,color:T.muted,fontWeight:700 }}>SECTOR:</span>
              {sectors.map(sec=>(
                <button key={sec} onClick={()=>setFilterSector(sec)} style={{ padding:"6px 14px",borderRadius:20,border:`1px solid ${filterSector===sec?T.accent:T.border}`,background:filterSector===sec?T.accentBg:T.surface,color:filterSector===sec?T.accent:T.muted,fontSize:12,fontWeight:600,cursor:"pointer" }}>{sec}</button>
              ))}
              <span style={{ marginLeft:"auto",fontSize:12,color:T.muted }}>{screenerData.length} results</span>
            </div>
            <div style={card()}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead><tr>
                  <th style={{ fontSize:11,color:T.muted,textAlign:"left",padding:"0 10px 10px 0",fontWeight:600,letterSpacing:"0.04em" }}>TICKER</th>
                  <th style={{ fontSize:11,color:T.muted,textAlign:"left",padding:"0 10px 10px 0",fontWeight:600,letterSpacing:"0.04em" }}>COMPANY</th>
                  <th style={{ fontSize:11,color:T.muted,textAlign:"left",padding:"0 10px 10px 0",fontWeight:600 }}>SECTOR</th>
                  <th style={{ fontSize:11,color:T.muted,textAlign:"left",padding:"0 10px 10px 0",fontWeight:600 }}>RISK</th>
                  {[["price","PRICE"],["pct","CHANGE"],["pe","P/E"],["beta","BETA"]].map(([col,h])=>(
                    <th key={col} onClick={()=>setSortBy(s=>({col,dir:s.col===col?-s.dir:-1}))} style={{ fontSize:11,color:sortBy.col===col?T.accent:T.muted,textAlign:"right",padding:"0 10px 10px 0",fontWeight:600,cursor:"pointer",letterSpacing:"0.04em" }}>{h} {sortBy.col===col?(sortBy.dir===-1?"↓":"↑"):""}</th>
                  ))}
                  <th/>
                </tr></thead>
                <tbody>
                  {screenerData.map(s=>{
                    const risk=RISK(s.beta,s.pe);
                    return (
                      <tr key={s.ticker} onClick={()=>openStock(s.ticker)} style={{ borderTop:`1px solid ${T.border}`,cursor:"pointer" }} onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{ padding:"12px 10px 12px 0" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:5,height:5,borderRadius:2,background:SECTOR_COLORS[s.sector]||T.accent }}/><span style={{ fontSize:13,fontWeight:800,color:T.text }}>{s.ticker}</span></div></td>
                        <td style={{ padding:"12px 10px",fontSize:12,color:T.muted }}>{s.name}</td>
                        <td style={{ padding:"12px 10px" }}><Tag label={s.sector} color={SECTOR_COLORS[s.sector]} bg={SECTOR_COLORS[s.sector]+"22"}/></td>
                        <td style={{ padding:"12px 10px" }}><Tag label={risk.label} color={risk.color} bg={risk.bg}/></td>
                        <td style={{ padding:"12px 10px",textAlign:"right" }}><PriceCell value={s.price} up={s.pct>=0}/></td>
                        <td style={{ padding:"12px 10px",textAlign:"right" }}><span style={{ fontSize:13,fontWeight:700,color:s.pct>=0?T.up:T.down }}>{fmt.pct(s.pct)}</span></td>
                        <td style={{ padding:"12px 10px",fontSize:12,color:T.muted,textAlign:"right" }}>{s.pe??"-"}</td>
                        <td style={{ padding:"12px 10px",fontSize:12,color:T.muted,textAlign:"right" }}>{s.beta}</td>
                        <td style={{ padding:"12px 0" }}><button onClick={e=>{e.stopPropagation();setModal({ticker:s.ticker,type:"buy"});}} style={{ padding:"5px 12px",borderRadius:8,border:"none",background:T.up,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer" }}>Buy</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LEARN ── */}
        {view==="learn" && (
          <div>
            <h2 style={{ fontSize:20,fontWeight:800,margin:"0 0 6px",color:T.text }}>Learning Center</h2>
            <p style={{ fontSize:14,color:T.muted,margin:"0 0 20px" }}>Understand the terms you see while trading. Hover the ? on any metric for an instant explanation.</p>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
              {Object.entries(TOOLTIPS).map(([term,tip])=>(
                <div key={term} style={card()}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:12 }}>
                    <div style={{ width:40,height:40,borderRadius:12,background:T.accentBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:T.accent }}>{term[0]}</div>
                    <h3 style={{ fontSize:15,fontWeight:800,color:T.text,margin:0 }}>{term}</h3>
                  </div>
                  <p style={{ fontSize:13,color:T.text,margin:"0 0 10px",lineHeight:1.6 }}>{tip.def}</p>
                  <div style={{ background:T.bg,borderRadius:T.rsm,padding:"8px 12px",marginBottom:10,fontFamily:"monospace",fontSize:12,color:T.accent }}>{tip.formula}</div>
                  <p style={{ fontSize:12,color:T.muted,margin:0,lineHeight:1.5 }}>💡 {tip.tip}</p>
                </div>
              ))}
            </div>
            {/* Quick reference table */}
            <div style={{ ...card(),marginTop:20 }}>
              <p style={lbl}>Quick Reference — Risk Levels</p>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
                {[
                  { label:"Conservative",color:T.up,bg:T.upBg,desc:"Beta < 1.2, low P/E. Examples: KO, WMT, JNJ. Moves less than the market. Good for beginners." },
                  { label:"Moderate",color:"#d97706",bg:"#fffbeb",desc:"Beta 1.2–2, medium P/E. Examples: AAPL, MSFT, JPM. Balanced risk/reward." },
                  { label:"Aggressive",color:T.down,bg:T.downBg,desc:"Beta > 2 or very high P/E. Examples: TSLA, COIN, AMD. Can gain or lose a lot quickly." },
                ].map(r=>(
                  <div key={r.label} style={{ background:r.bg,border:`1px solid ${r.color}44`,borderRadius:T.r,padding:16 }}>
                    <Tag label={r.label} color={r.color} bg={r.bg} />
                    <p style={{ fontSize:13,color:T.text,margin:"10px 0 0",lineHeight:1.6 }}>{r.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {view==="chat" && (
          <ChatPanel
            positions={positions}
            cash={cash}
            totalValue={totalValue}
            totalGainPct={totalGainPct}
            watchlist={watchlist}
            LIVE={LIVE}
          />
        )}
      </div>
    </div>
  );
}
