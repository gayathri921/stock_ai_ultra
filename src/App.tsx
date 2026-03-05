import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Briefcase, 
  MessageSquare, 
  Mic, 
  Settings, 
  LogOut,
  ChevronRight,
  Shield,
  Fingerprint,
  Lock,
  Globe,
  Moon,
  Sun,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Bell,
  Star,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useTranslation } from 'react-i18next';
import './i18n';
import { analyzeStock } from './services/geminiService';
import { cn } from './utils/cn';

// --- Types ---
type Tab = 'market' | 'search' | 'watchlist' | 'ai' | 'settings';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

// --- Auth Context ---
const AuthContext = createContext<{
  user: any;
  login: (data: any) => void;
  logout: () => void;
} | null>(null);

// --- App Component ---
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('market');
  const [user, setUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (!process.env.GEMINI_API_KEY) {
      setApiKeyMissing(true);
    }
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }

    const socket = io();
    socket.on('stock_update', (data) => setPrices(data));
    return () => { socket.disconnect(); };
  }, []);

  const login = (data: any) => {
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setIsLoggedIn(true);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
  };

  const handleAnalyzeStock = (symbol: string) => {
    setPendingPrompt(`Analyze ${symbol} stock performance and give me a recommendation.`);
    setActiveTab('ai');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="flex flex-col h-screen bg-[#050A18] text-white font-sans overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 flex justify-between items-center border-b border-white/5 bg-[#050A18]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">StockAI <span className="text-blue-500">Ultra</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Bell className="w-5 h-5 text-gray-400" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          {apiKeyMissing && (
            <div className="absolute top-0 left-0 right-0 bg-rose-500/10 border-b border-rose-500/20 p-2 text-center z-[60] backdrop-blur-md">
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Gemini API Key Missing — AI Features Disabled</p>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "max-w-2xl mx-auto w-full h-full",
                activeTab === 'ai' ? "p-0" : "p-6 overflow-y-auto pb-24"
              )}
            >
              {activeTab === 'market' && <MarketScreen onAnalyze={handleAnalyzeStock} prices={prices} />}
              {activeTab === 'search' && <SearchScreen onAnalyze={handleAnalyzeStock} prices={prices} />}
              {activeTab === 'watchlist' && <WatchlistScreen onAddStock={() => setActiveTab('search')} onAnalyze={handleAnalyzeStock} prices={prices} />}
              {activeTab === 'ai' && <AIScreen pendingPrompt={pendingPrompt} clearPendingPrompt={() => setPendingPrompt(null)} />}
              {activeTab === 'settings' && <SettingsScreen onLogout={logout} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {activeTab !== 'ai' && <VoiceGuide activeTab={activeTab} prices={prices} onVoiceInput={(text) => {
          setPendingPrompt(text);
          setActiveTab('ai');
        }} />}

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0A1227]/95 backdrop-blur-lg border-t border-white/5 px-4 py-3 flex justify-around items-center z-50">
          <NavButton icon={LayoutDashboard} label={t('market')} active={activeTab === 'market'} onClick={() => setActiveTab('market')} />
          <NavButton icon={Search} label={t('search')} active={activeTab === 'search'} onClick={() => setActiveTab('search')} />
          <NavButton icon={Briefcase} label={t('watchlist')} active={activeTab === 'watchlist'} onClick={() => setActiveTab('watchlist')} />
          <NavButton icon={MessageSquare} label={t('ai')} active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
          <NavButton icon={Settings} label={t('settings')} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </div>
    </AuthContext.Provider>
  );
}

// --- Screens ---

function LoginScreen({ onLogin }: { onLogin: (data: any) => void }) {
  const [email, setEmail] = useState('demo@stockai.com');
  const [password, setPassword] = useState('password123');
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      if (isSignup) {
        setIsSignup(false);
        alert("Account created! Please login.");
      } else {
        onLogin(data);
      }
    } else {
      alert(data.error);
    }
  };

  return (
    <div className="h-screen bg-[#050A18] flex flex-col items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">StockAI <span className="text-blue-500">Ultra</span></h1>
          <p className="text-gray-400">Secure AI-Powered Stock Intelligence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0A1227] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#0A1227] border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]">
            {isSignup ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsSignup(!isSignup)}
            className="text-blue-500 text-sm font-medium hover:underline"
          >
            {isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function VoiceGuide({ activeTab, prices, onVoiceInput }: { activeTab: Tab, prices: Record<string, number>, onVoiceInput: (text: string) => void }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { t, i18n } = useTranslation();

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceAction = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleGuide();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsListening(true);
      window.speechSynthesis.cancel();
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const transcript = event.results[i][0].transcript;
          onVoiceInput(transcript);
          setIsListening(false);
          recognition.stop();
        }
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleGuide = () => {
    let guideText = "";
    if (activeTab === 'market') {
      const spx = prices['SPX'] || 5847;
      guideText = `You are on the Market screen. The S&P 500 is currently at ${spx}. Global markets are active 24/7. You can see top gainers and losers below.`;
    } else if (activeTab === 'watchlist') {
      guideText = "This is your personal watchlist. Here you can track stocks you're interested in and see their real-time performance.";
    } else if (activeTab === 'ai') {
      guideText = "Welcome to the AI Assistant. You can ask me complex questions about market trends, technical analysis, or specific stock recommendations.";
    } else if (activeTab === 'search') {
      guideText = "Use the search bar to find any stock or index. Click on a result to see detailed charts and AI-powered insights.";
    } else {
      guideText = "Welcome to StockAI Ultra. I'm here to help you navigate the markets with real-time data and AI intelligence.";
    }
    speak(guideText);
  };

  return (
    <div className="fixed bottom-24 right-6 flex flex-col gap-3 items-end z-50">
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="bg-blue-600 text-white px-4 py-2 rounded-2xl text-xs font-bold shadow-xl mb-2"
          >
            Listening...
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        <button 
          onClick={handleGuide}
          className={cn(
            "p-4 rounded-full shadow-2xl transition-all active:scale-90",
            isSpeaking ? "bg-emerald-500 animate-pulse" : "bg-white/10 backdrop-blur-md border border-white/10"
          )}
        >
          <Globe className="w-5 h-5 text-white" />
        </button>
        <button 
          onClick={handleVoiceAction}
          className={cn(
            "p-4 rounded-full shadow-2xl transition-all active:scale-90",
            isListening ? "bg-rose-500 animate-pulse" : "bg-blue-600"
          )}
        >
          <Mic className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

function MarketScreen({ onAnalyze, prices }: { onAnalyze: (symbol: string) => void, prices: Record<string, number> }) {
  const { t } = useTranslation();
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  if (selectedStock) {
    return <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} onAnalyze={onAnalyze} prices={prices} />;
  }

  const globalMarkets = [
    { name: 'NYSE', time: '24/7', status: 'Active', flag: '🇺🇸' },
    { name: 'NSDQ', time: '24/7', status: 'Active', flag: '🇺🇸' },
    { name: 'NSE', time: '24/7', status: 'Active', flag: '🇮🇳' },
    { name: 'BSE', time: '24/7', status: 'Active', flag: '🇮🇳' },
  ];

  const indices = [
    { name: 'S&P 500', value: prices['SPX']?.toLocaleString() || '5,847.23', change: '+ 0.73%', color: 'text-emerald-400' },
    { name: 'NASDAQ', value: prices['IXIC']?.toLocaleString() || '20,891.54', change: '+ 1.12%', color: 'text-emerald-400' },
    { name: 'DOW', value: prices['DJI']?.toLocaleString() || '43,524.12', change: '+ 0.48%', color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Good afternoon, {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email.split('@')[0] : 'Trader'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-400 font-medium">{t('market_open')} — 24/7 ACTIVE</span>
            </div>
          </div>
          <button className="p-3 bg-blue-600/20 rounded-2xl text-blue-400">
            <TrendingUp className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t('global_markets')}</h3>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold">LIVE 24/7</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {globalMarkets.map((m, i) => (
              <div key={i} className="min-w-[100px] bg-[#0A1227] p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex justify-center text-xl">{m.flag}</div>
                <div className="text-center">
                  <p className="text-xs font-bold">{m.name}</p>
                  <p className="text-[10px] text-gray-500">{m.time}</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] text-emerald-400 font-bold uppercase">{m.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0A1227] p-6 rounded-3xl border border-white/5 space-y-4">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{t('us_indices')}</h3>
        <div className="flex justify-between items-center">
          {indices.map((idx, i) => (
            <div key={i} className="text-center space-y-1">
              <p className="text-[10px] text-gray-500 font-bold">{idx.name}</p>
              <p className="text-sm font-bold">{idx.value}</p>
              <p className={cn("text-[10px] font-bold", idx.color)}>{idx.change}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {t('top_gainers')}
          </h3>
          <button className="text-blue-500 text-sm font-medium">{t('see_all')}</button>
        </div>
        <div className="space-y-3">
          {(Object.entries(prices) as [string, number][]).slice(0, 6).map(([symbol, price]) => (
            <StockRow key={symbol} symbol={symbol} price={price} change={Math.random() * 3 + 1} onClick={() => setSelectedStock(symbol)} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            {t('top_losers')}
          </h3>
        </div>
        <div className="space-y-3">
          {(Object.entries(prices) as [string, number][]).slice(6, 12).map(([symbol, price]) => (
            <StockRow key={symbol} symbol={symbol} price={price} change={-(Math.random() * 3 + 1)} onClick={() => setSelectedStock(symbol)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StockDetail({ symbol, onBack, onAnalyze, prices }: { symbol: string, onBack: () => void, onAnalyze: (symbol: string) => void, prices: Record<string, number> }) {
  const { t } = useTranslation();
  const [price, setPrice] = useState(prices[symbol] || 0);
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Check if already in watchlist
    fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.some((s: any) => s.symbol === symbol)) {
        setIsAdded(true);
      }
    });
    // ... existing chart data logic ...
    // Initialize chart data
    const initialData = Array.from({ length: 20 }, (_, i) => ({ 
      name: i, 
      value: 200 + Math.random() * 50 
    }));
    setChartData(initialData);

    const socket = io();
    socket.on('stock_update', (data) => {
      if (data[symbol]) {
        const newPrice = data[symbol];
        setPrice(newPrice);
        setChartData(prev => {
          const newData = [...prev.slice(1), { name: prev.length, value: newPrice }];
          return newData;
        });
      }
    });
    return () => { socket.disconnect(); };
  }, [symbol]);

  const addToWatchlist = async () => {
    if (isAdded) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ symbol, quantity: 1, buy_price: price })
      });
      if (res.ok) {
        setIsAdded(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-[#0A1227] rounded-xl border border-white/5">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <div className="text-center flex-1">
          <h2 className="text-xl font-bold">{symbol}</h2>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">NASDAQ · Technology</p>
        </div>
        <button 
          onClick={addToWatchlist}
          disabled={isAdding || isAdded}
          className={cn(
            "p-2 rounded-xl border border-white/5 transition-all",
            isAdded ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" : "text-blue-400 hover:bg-white/5",
            isAdding && "opacity-50"
          )}
        >
          {isAdded ? <CheckCircle className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      <div className="space-y-1 text-center">
        <p className="text-gray-400 text-sm">{symbol} Inc.</p>
        <h2 className="text-5xl font-bold">${price.toLocaleString()}</h2>
        <div className="flex items-center justify-center gap-2">
          <span className="text-emerald-400 text-sm font-medium">▲ 1.30%</span>
          <span className="text-gray-500 text-xs">Vol: 72.2M</span>
        </div>
      </div>

      <div className="h-64 w-full bg-[#0A1227] rounded-3xl border border-white/5 p-4 overflow-hidden relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0A1227', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Price']}
            />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <button 
        onClick={() => onAnalyze(symbol)}
        className="w-full bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
      >
        <TrendingUp className="w-5 h-5" />
        AI Analysis
      </button>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-400">Key Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Market Cap" value="$454.3B" />
          <MetricCard label="P/E Ratio" value="24.1" />
          <MetricCard label="EPS" value="$8.45" />
          <MetricCard label="Beta" value="1.86" sub="High volatility" />
          <MetricCard label="52W High" value="$288.21" />
          <MetricCard label="52W Low" value="$153.71" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string, value: string, sub?: string }) {
  return (
    <div className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 space-y-1">
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}

function SearchScreen({ onAnalyze, prices }: { onAnalyze: (symbol: string) => void, prices: Record<string, number> }) {
  const [search, setSearch] = useState('');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  if (selectedStock) {
    return <StockDetail symbol={selectedStock} onBack={() => setSelectedStock(null)} onAnalyze={onAnalyze} prices={prices} />;
  }

  const filteredStocks = (Object.entries(prices) as [string, number][]).filter(([symbol]) => 
    symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input 
          type="text"
          placeholder="Search stocks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#0A1227] border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="space-y-3">
        {filteredStocks.length > 0 ? (
          filteredStocks.map(([symbol, price]) => (
            <StockRow 
              key={symbol} 
              symbol={symbol} 
              price={price} 
              change={(Math.random() - 0.5) * 4} 
              onClick={() => setSelectedStock(symbol)}
            />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            No stocks found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

function WatchlistScreen({ onAddStock, onAnalyze, prices }: { onAddStock: () => void, onAnalyze: (symbol: string) => void, prices: Record<string, number> }) {
  const { t } = useTranslation();
  const [stocks, setStocks] = useState<any[]>([]);
  const [selectedStock, setSelectedStock] = useState<string | null>(null);

  const fetchWatchlist = () => {
    fetch('/api/portfolio', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => setStocks(data));
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  if (selectedStock) {
    return <StockDetail symbol={selectedStock} onBack={() => { setSelectedStock(null); fetchWatchlist(); }} onAnalyze={onAnalyze} prices={prices} />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">{t('watchlist')}</h2>
        <button 
          onClick={onAddStock}
          className="p-2 bg-[#0A1227] rounded-xl border border-white/5 text-blue-400"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {stocks.length > 0 ? (
        <div className="space-y-3 overflow-y-auto no-scrollbar">
          {stocks.map((stock) => (
            <StockRow 
              key={stock.symbol} 
              symbol={stock.symbol} 
              price={prices[stock.symbol] || stock.buy_price} 
              change={(prices[stock.symbol] ? ((prices[stock.symbol] - stock.buy_price) / stock.buy_price) * 100 : 0)}
              onClick={() => setSelectedStock(stock.symbol)}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <div className="w-32 h-32 bg-[#0A1227] rounded-[40px] border border-white/5 flex items-center justify-center relative">
            <div className="absolute inset-0 bg-blue-500/5 rounded-[40px] blur-2xl" />
            <TrendingUp className="w-16 h-16 text-gray-600 opacity-20 relative z-10" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Your watchlist is empty</h3>
            <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed">Search for stocks and add them here to track their performance</p>
          </div>
          <button 
            onClick={onAddStock}
            className="bg-blue-500 text-white font-bold px-10 py-5 rounded-3xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            Browse Stocks
          </button>
        </div>
      )}
    </div>
  );
}

function AIScreen({ pendingPrompt, clearPendingPrompt }: { pendingPrompt: string | null, clearPendingPrompt: () => void }) {
  return (
    <div className="space-y-6">
      <ChatScreen pendingPrompt={pendingPrompt} clearPendingPrompt={clearPendingPrompt} />
    </div>
  );
}

function ChatScreen({ pendingPrompt, clearPendingPrompt }: { pendingPrompt: string | null, clearPendingPrompt: () => void }) {
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<any[]>([
    { role: 'ai', content: 'Hello! I am your StockAI Assistant. Ask me anything about the market.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (pendingPrompt) {
      handleSend(pendingPrompt);
      clearPendingPrompt();
    }
  }, [pendingPrompt]);

  const handleSend = async (text?: string, isVoice = false) => {
    const messageText = text || input;
    if (!messageText.trim()) return;
    
    const userMsg = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const analysis = await analyzeStock("General", messageText);
      setMessages(prev => [...prev, { role: 'ai', content: analysis }]);
      if (isVoice && analysis.summary) {
        speak(analysis.summary);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: { explanation: "Sorry, I couldn't analyze that right now." } }]);
    } finally {
      setLoading(false);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'en' ? 'en-US' : i18n.language;
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      window.speechSynthesis.cancel();
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const finalTranscript = event.results[i][0].transcript;
          setInput(prev => prev + ' ' + finalTranscript);
          handleSend(finalTranscript, true);
          setIsListening(false);
          recognition.stop();
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col h-full bg-[#050A18]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-6 no-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] p-4 rounded-2xl",
              msg.role === 'user' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-[#0A1227] border border-white/5"
            )}>
              {/* ... same message rendering logic ... */}
              {typeof msg.content === 'string' ? (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "px-2 py-1 rounded text-[10px] font-bold uppercase",
                      msg.content.recommendation === 'Buy' ? "bg-emerald-500/20 text-emerald-400" :
                      msg.content.recommendation === 'Sell' ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {msg.content.recommendation}
                    </span>
                    <span className="text-xs text-gray-400">Confidence: {msg.content.confidence}%</span>
                  </div>
                  <p className="text-sm font-medium">{msg.content.summary}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{msg.content.explanation}</p>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] text-gray-500 italic">{msg.content.disclaimer}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 animate-pulse">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-[#0A1227]/90 backdrop-blur-xl border-t border-white/5 flex gap-2 items-center pb-[100px] z-40 relative">
        <div className="relative flex-1">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Ask about a stock..."}
            className="w-full bg-[#050A18] border border-white/10 rounded-2xl pl-4 pr-14 py-4 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-600"
          />
          <button 
            onClick={toggleListening}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-xl transition-all z-50",
              isListening ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40" : "text-gray-500 hover:text-blue-500 hover:bg-white/5"
            )}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
        <button 
          onClick={() => handleSend()}
          disabled={loading}
          className="bg-blue-600 p-4 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

function VoiceScreen() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const toggleListening = () => {
    setIsListening(!isListening);
    if (!isListening) {
      // Mock voice recognition
      setTimeout(() => {
        setTranscript("How is Apple stock performing today?");
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Voice Assistant</h2>
        <p className="text-gray-400">Speak to analyze stocks or manage portfolio</p>
      </div>

      <div className="relative">
        <AnimatePresence>
          {isListening && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.2 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-blue-500 rounded-full"
            />
          )}
        </AnimatePresence>
        <button 
          onClick={toggleListening}
          className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl",
            isListening ? "bg-rose-500 shadow-rose-500/40" : "bg-blue-600 shadow-blue-500/40"
          )}
        >
          <Mic className="w-12 h-12 text-white" />
        </button>
      </div>

      <div className="w-full max-w-sm bg-[#0A1227] p-6 rounded-3xl border border-white/5 min-h-[100px] flex items-center justify-center text-center">
        {transcript ? (
          <p className="text-lg font-medium italic">"{transcript}"</p>
        ) : (
          <p className="text-gray-500">Tap the mic to start speaking</p>
        )}
      </div>
    </div>
  );
}

function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const { t, i18n } = useTranslation();
  const [biometrics, setBiometrics] = useState(() => localStorage.getItem('biometrics') === 'true');
  const [newsAlerts, setNewsAlerts] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [modalType, setModalType] = useState<string | null>(null);

  const [userName, setUserName] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).email.split('@')[0] : 'Trader';
  });
  const [userEmail, setUserEmail] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).email : 'user@example.com';
  });

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleToggleBiometrics = () => {
    const newVal = !biometrics;
    setBiometrics(newVal);
    localStorage.setItem('biometrics', String(newVal));
  };

  const handleSaveProfile = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.email = userEmail;
    user.name = userName;
    localStorage.setItem('user', JSON.stringify(user));
    setIsEditingProfile(false);
    alert('Profile updated successfully!');
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action is permanent and will delete all your data.')) {
      try {
        const res = await fetch('/api/user', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          onLogout();
          alert('Account deleted successfully.');
        } else {
          alert('Failed to delete account.');
        }
      } catch (e) {
        console.error(e);
        alert('An error occurred while deleting your account.');
      }
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="p-6 bg-[#0A1227] rounded-3xl border border-white/5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-500/20">
            {userEmail[0].toUpperCase()}
          </div>
          <div className="flex-1">
            {isEditingProfile ? (
              <div className="space-y-2">
                <input 
                  value={userName} 
                  onChange={e => setUserName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
                <input 
                  value={userEmail} 
                  onChange={e => setUserEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold">{userName}</h3>
                <p className="text-gray-400 text-sm mb-2">{userEmail}</p>
              </>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">
              <span className="text-xs">💎</span> {t('pro_trader')}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditingProfile ? (
            <>
              <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-xl">{t('save')}</button>
              <button onClick={() => setIsEditingProfile(false)} className="flex-1 bg-white/5 text-gray-400 text-xs font-bold py-2 rounded-xl">{t('cancel')}</button>
            </>
          ) : (
            <button onClick={() => setIsEditingProfile(true)} className="w-full bg-white/5 text-blue-400 text-xs font-bold py-2 rounded-xl border border-white/5">{t('edit_profile')}</button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('preferences')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden relative">
          <SettingsRow icon={Globe} label={t('language')} value={
            <div className="flex items-center gap-2 text-gray-400">
              <select 
                className="bg-[#0A1227] text-sm font-medium focus:outline-none appearance-none text-right pr-6"
                onChange={(e) => changeLanguage(e.target.value)}
                value={i18n.language}
              >
                <option value="en">🇺🇸 English</option>
                <option value="te">🇮🇳 Telugu</option>
                <option value="hi">🇮🇳 Hindi</option>
                <option value="es">🇪🇸 Spanish</option>
                <option value="fr">🇫🇷 French</option>
                <option value="de">🇩🇪 German</option>
                <option value="zh">🇨🇳 Chinese</option>
                <option value="ja">🇯🇵 Japanese</option>
                <option value="ko">🇰🇷 Korean</option>
                <option value="ar">🇸🇦 Arabic</option>
                <option value="ru">🇷🇺 Russian</option>
                <option value="pt">🇵🇹 Portuguese</option>
                <option value="it">🇮🇹 Italian</option>
                <option value="tr">🇹🇷 Turkish</option>
                <option value="id">🇮🇩 Indonesian</option>
                <option value="th">🇹🇭 Thai</option>
                <option value="vi">🇻🇳 Vietnamese</option>
                <option value="bn">🇧🇩 Bengali</option>
                <option value="ur">🇵🇰 Urdu</option>
                <option value="ta">🇮🇳 Tamil</option>
                <option value="ml">🇮🇳 Malayalam</option>
                <option value="kn">🇮🇳 Kannada</option>
              </select>
              <ChevronRight className="w-4 h-4 absolute right-4 pointer-events-none" />
            </div>
          } />
          <SettingsRow icon={Fingerprint} label={t('biometrics')} value={
            <Toggle active={biometrics} onToggle={handleToggleBiometrics} />
          } />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('notifications')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <SettingsRow icon={Bell} label={t('price_alerts')} value={
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold">PERMANENT 24/7</span>
          } />
          <SettingsRow icon={LayoutDashboard} label={t('market_open_close')} value={
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-bold">PERMANENT 24/7</span>
          } />
          <SettingsRow icon={MessageSquare} label={t('breaking_news')} value={
            <Toggle active={newsAlerts} onToggle={() => setNewsAlerts(!newsAlerts)} />
          } />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('account')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <button onClick={() => setModalType('account')} className="w-full text-left">
            <SettingsRow icon={MessageSquare} label={t('email')} value={<span className="text-xs text-gray-500">{userEmail} <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('security')} className="w-full text-left">
            <SettingsRow icon={Shield} label={t('two_factor_auth')} value={<span className="text-xs text-gray-500">Enabled <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('security')} className="w-full text-left">
            <SettingsRow icon={Lock} label={t('change_password')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('data_privacy')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <button onClick={() => setModalType('data_usage')} className="w-full text-left">
            <SettingsRow icon={Briefcase} label={t('data_usage')} value={<span className="text-xs text-gray-500">Optimized <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('privacy')} className="w-full text-left">
            <SettingsRow icon={Shield} label={t('privacy_policy')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
          <button onClick={() => setModalType('terms')} className="w-full text-left">
            <SettingsRow icon={Briefcase} label={t('terms_of_service')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-2">{t('about')}</h4>
        <div className="bg-[#0A1227] rounded-3xl border border-white/5 overflow-hidden">
          <button onClick={() => setModalType('about')} className="w-full text-left">
            <SettingsRow icon={Bell} label={t('version')} value={<span className="text-xs text-gray-500">1.2.4 <ChevronRight className="inline w-4 h-4" /></span>} />
          </button>
          <button onClick={() => setModalType('rate')} className="w-full text-left active:scale-[0.98] transition-all">
            <SettingsRow icon={Star} label={t('rate_the_app')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
          <button onClick={() => setModalType('feedback')} className="w-full text-left active:scale-[0.98] transition-all">
            <SettingsRow icon={MessageSquare} label={t('send_feedback')} value={<ChevronRight className="w-5 h-5 text-gray-600" />} />
          </button>
        </div>
      </div>

      <button 
        onClick={onLogout}
        className="w-full bg-[#0A1227] border border-white/5 text-rose-500 font-bold py-5 rounded-3xl flex items-center justify-center gap-2 hover:bg-rose-500/5 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        {t('sign_out')}
      </button>

      <button 
        onClick={handleDeleteAccount}
        className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-colors text-xs"
      >
        {t('delete_account')}
      </button>

      <div className="text-center space-y-1 opacity-30 pb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest">StockAI Ultra v1.2.4</p>
        <p className="text-[10px]">AI-Powered Market Intelligence</p>
      </div>

      <AnimatePresence>
        {modalType && (
          <Modal type={modalType} onClose={() => setModalType(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ type, onClose }: { type: string, onClose: () => void }) {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(onClose, 1500);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update password');
      }
    } catch (e) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = () => {
    setLoading(true);
    setTimeout(() => {
      setSubmitted(true);
      setLoading(false);
      setTimeout(onClose, 1500);
    }, 400);
  };

  const ThankYou = ({ message }: { message: string }) => (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4 text-center"
    >
      <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
        <CheckCircle className="w-10 h-10 text-emerald-500" />
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">Thank You!</h3>
        <p className="text-gray-400">{message}</p>
      </div>
    </motion.div>
  );

  const content: Record<string, { title: string, body: React.ReactNode }> = {
    account: {
      title: t('account'),
      body: (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Manage your account details and subscription status.</p>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
            <p className="text-xs text-gray-500 uppercase font-bold">Subscription</p>
            <p className="text-lg font-bold text-amber-500">Pro Lifetime Plan</p>
            <p className="text-[10px] text-gray-400">Active since March 2024</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Email Address</label>
            <input 
              type="email" 
              defaultValue={localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).email : ''}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={() => { alert('Email update request sent!'); onClose(); }} className="w-full bg-blue-600 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20">Update Email</button>
        </div>
      )
    },
    security: {
      title: t('security'),
      body: submitted ? <ThankYou message="Your password has been updated successfully." /> : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Enhance your account security with 2FA and strong passwords.</p>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
              <div>
                <p className="text-sm font-bold">Two-Factor Auth</p>
                <p className="text-[10px] text-emerald-400">Enabled via Authenticator App</p>
              </div>
              <Toggle active={true} onToggle={() => alert('For security, 2FA can only be disabled via email verification.')} />
            </div>
            
            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <p className="text-sm font-bold">Change Password</p>
              <input 
                type="password" 
                placeholder="Current Password" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" 
              />
              <input 
                type="password" 
                placeholder="New Password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" 
              />
              <button 
                onClick={handlePasswordUpdate} 
                disabled={loading}
                className="w-full bg-blue-600 py-2 rounded-xl font-bold text-xs disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
              <p className="text-sm font-bold">Manage Devices</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-xs">iPhone 15 Pro (This device)</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Active</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    <span className="text-xs">MacBook Pro 16"</span>
                  </div>
                  <button className="text-[10px] text-rose-500 font-bold">Revoke</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    feedback: {
      title: t('send_feedback'),
      body: submitted ? <ThankYou message="We appreciate your feedback!" /> : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">We'd love to hear your thoughts on how to improve StockAI Ultra.</p>
          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="text-2xl hover:scale-110 transition-transform">⭐</button>
            ))}
          </div>
          <textarea 
            placeholder="Tell us what you think..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm h-32 focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleSubmitFeedback} 
            disabled={loading}
            className="w-full bg-blue-600 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Submit Feedback'}
          </button>
        </div>
      )
    },
    data_usage: {
      title: t('data_usage'),
      body: (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Control how the app consumes data and stores information.</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Cache Size</span>
              <span>124 MB</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-1/3" />
            </div>
          </div>
          <button className="w-full bg-rose-500/10 text-rose-500 py-3 rounded-xl font-bold text-sm border border-rose-500/20">Clear Cache</button>
        </div>
      )
    },
    privacy: {
      title: t('privacy_policy'),
      body: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
          <p className="text-sm text-gray-400 leading-relaxed">
            At StockAI Ultra, your privacy is our top priority. We use end-to-end encryption for all your portfolio data and chat history.
            <br/><br/>
            1. We do not sell your data to third parties.
            <br/>
            2. AI analysis is performed locally where possible.
            <br/>
            3. Biometric data never leaves your device.
            <br/><br/>
            Our servers are located in secure facilities with 24/7 monitoring.
          </p>
        </div>
      )
    },
    terms: {
      title: t('terms_of_service'),
      body: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
          <p className="text-sm text-gray-400 leading-relaxed">
            By using StockAI Ultra, you agree to our terms of service.
            <br/><br/>
            - The app is for informational purposes only.
            - We are not responsible for financial losses.
            - AI recommendations are not financial advice.
            - You must be 18+ to use trading features.
            <br/><br/>
            Trading stocks involves significant risk. Always consult with a professional advisor.
          </p>
        </div>
      )
    },
    rate: {
      title: t('rate_the_app'),
      body: submitted ? <ThankYou message="Thank you for rating us!" /> : (
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">How would you rate your experience with StockAI Ultra?</p>
            <div className="flex justify-center gap-3 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} className="text-4xl hover:scale-125 transition-transform">⭐</button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <textarea 
              placeholder="What can we do better?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm h-24 focus:outline-none focus:border-blue-500"
            />
            <button 
              onClick={handleSubmitFeedback} 
              disabled={loading}
              className="w-full bg-blue-600 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>
      )
    },
    about: {
      title: t('about'),
      body: (
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">StockAI Ultra</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Version 1.2.4 (Build 452)</p>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            The world's most advanced AI-powered stock intelligence platform. Built for traders who demand precision and speed.
          </p>
          <div className="pt-4 border-t border-white/5 flex justify-center gap-6">
            <span className="text-[10px] text-gray-600 font-bold uppercase">© 2026 StockAI Inc.</span>
          </div>
        </div>
      )
    }
  };

  const current = content[type] || { title: 'Info', body: null };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-[#0A1227] rounded-t-[40px] border-t border-white/10 p-8 space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-2" />
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">{current.title}</h2>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-gray-500">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
        <div className="pb-8">
          {current.body}
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- UI Components ---

function NavButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-blue-500 scale-110" : "text-gray-500 hover:text-gray-300"
      )}
    >
      <Icon className={cn("w-6 h-6", active && "fill-blue-500/10")} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

interface StockRowProps {
  symbol: string;
  price: number;
  change: number;
  key?: string | number;
  onClick?: () => void;
}

function StockRow({ symbol, price, change, onClick }: StockRowProps) {
  const isPositive = change >= 0;
  const initials = symbol.slice(0, 2);
  
  // Generate a consistent color based on symbol
  const colors = [
    'bg-emerald-500/20 text-emerald-400',
    'bg-blue-500/20 text-blue-400',
    'bg-rose-500/20 text-rose-400',
    'bg-amber-500/20 text-amber-400',
    'bg-indigo-500/20 text-indigo-400',
    'bg-purple-500/20 text-purple-400'
  ];
  const colorIndex = symbol.charCodeAt(0) % colors.length;
  const colorClass = colors[colorIndex];

  return (
    <div 
      onClick={onClick}
      className="bg-[#0A1227] p-4 rounded-2xl border border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs", colorClass)}>
          {initials}
        </div>
        <div>
          <p className="font-bold">{symbol}</p>
          <p className="text-gray-500 text-[10px]">{symbol === 'AAPL' ? 'Apple Inc.' : symbol === 'TSLA' ? 'Tesla Inc.' : 'Company Name'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold">${price.toLocaleString()}</p>
        <div className={cn("flex items-center justify-end gap-1 text-[10px] font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
          {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div>{value}</div>
    </div>
  );
}

function Toggle({ active, onToggle }: { active: boolean, onToggle: () => void }) {
  return (
    <button 
      onClick={onToggle}
      className={cn(
        "w-10 h-5 rounded-full relative transition-colors",
        active ? "bg-blue-600" : "bg-gray-700"
      )}
    >
      <div className={cn(
        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
        active ? "right-1" : "left-1"
      )} />
    </button>
  );
}
