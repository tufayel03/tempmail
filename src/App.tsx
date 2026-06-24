import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { 
  Mail, 
  Copy, 
  Check, 
  RefreshCw, 
  Trash2, 
  Inbox, 
  AlertCircle, 
  ExternalLink, 
  Code, 
  Eye, 
  FileText, 
  Plus, 
  Settings, 
  HelpCircle, 
  Send, 
  Sparkles, 
  Globe, 
  Lock, 
  Shield, 
  ArrowRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface EmailMessage {
  _id: string;
  to_address: string;
  from_address: string;
  subject: string;
  body_text: string;
  body_html: string;
  created_at: string;
}

export default function App() {
  // Domain & Address Configuration
  const [domain, setDomain] = useState("tempmail.domain.com");
  const [prefix, setPrefix] = useState(() => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `temp_${rand}`;
  });

  const emailAddress = `${prefix}@${domain}`.toLowerCase();

  // Input states
  const [prefixInput, setPrefixInput] = useState(prefix);
  const [domainInput, setDomainInput] = useState(domain);

  // Email storage
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [viewMode, setViewMode] = useState<"html" | "text" | "raw">("html");
  const [dbMode, setDbMode] = useState<string>("in-memory-fallback");
  
  // Simulated Webhook Sender Modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simSender, setSimSender] = useState("netflix@verification.com");
  const [simSubject, setSimSubject] = useState("Action Required: Verify your Netflix profile login");
  const [simBody, setSimBody] = useState(""); // empty uses template

  // Info notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reference for iframe height
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate random email address
  const generateNewEmail = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let rand = "";
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newPrefix = `temp_${rand}`;
    setPrefix(newPrefix);
    setPrefixInput(newPrefix);
    setSelectedMessage(null);
    showToast("Generated new temporary email!");
  };

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch messages from Express backend
  const fetchMessages = async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/messages?email=${encodeURIComponent(emailAddress)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
        setDbMode(data.db_mode || "in-memory-fallback");
        // If selected message was deleted, deselect it
        if (selectedMessage && !data.messages.some((m: EmailMessage) => m._id === selectedMessage._id)) {
          setSelectedMessage(null);
        }
      }
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Copy email to clipboard
  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    showToast("Email address copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Copy message body text
  const copyMessageBody = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    showToast("Message body copied!");
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Delete individual message
  const deleteMessage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (response.ok) {
        showToast("Email deleted.");
        fetchMessages();
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  // Delete all messages (Clear mailbox)
  const clearMailbox = async () => {
    if (window.confirm("Are you sure you want to delete all messages in this inbox? This cannot be undone.")) {
      try {
        const response = await fetch(`/api/messages?email=${encodeURIComponent(emailAddress)}`, { method: "DELETE" });
        if (response.ok) {
          showToast("Mailbox cleared.");
          setMessages([]);
          setSelectedMessage(null);
        }
      } catch (err) {
        console.error("Error clearing mailbox:", err);
      }
    }
  };

  // Simulate incoming webhook email
  const triggerSimulation = async () => {
    try {
      const response = await fetch("/api/generate-mock-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_address: emailAddress,
          sender: simSender,
          subject: simSubject,
          body_html: simBody || undefined,
          body_text: simBody ? simBody.replace(/<[^>]*>/g, "") : undefined
        })
      });

      if (response.ok) {
        showToast("📥 Incoming Email Simulated Successfully!");
        setShowSimulateModal(false);
        // Clear custom body input for next simulation
        setSimBody("");
        // Reload messages
        fetchMessages(true);
      } else {
        const errData = await response.json();
        showToast(`Simulation failed: ${errData.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error triggering simulation:", err);
      showToast("Error simulating email connection.");
    }
  };

  // Apply custom email prefix and domain
  const applyCustomAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrefix = prefixInput.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const cleanDomain = domainInput.trim().toLowerCase();

    if (!cleanPrefix) {
      showToast("Please enter a valid email prefix");
      return;
    }
    if (!cleanDomain) {
      showToast("Please enter a valid domain name");
      return;
    }

    setPrefix(cleanPrefix);
    setDomain(cleanDomain);
    setSelectedMessage(null);
    showToast(`Switched address to: ${cleanPrefix}@${cleanDomain}`);
  };

  // Auto-refresh countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchMessages(false);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [emailAddress]);

  // Initial fetch on address change
  useEffect(() => {
    fetchMessages(true);
    setCountdown(10);
  }, [emailAddress]);

  // Formats UTC date string into clean human-readable text
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-200 selection:bg-indigo-500/30 selection:text-indigo-200 flex flex-col font-sans relative overflow-x-hidden">
      
      {/* Dynamic SEO Meta Management with React Helmet */}
      <Helmet>
        <title>Disposable Temp Mail - Free Secure Temporary Email Service</title>
        <meta name="description" content="Protect your personal inbox from spam, bots, and phishing with our highly secure, fully responsive, and fast temporary email generator. Free disposable email service." />
        <meta name="keywords" content="temporary email, disposable mail, free temp mail, secure inbox, fake email generator, secure throwaway email" />
        <meta property="og:title" content="Disposable Temp Mail - Secure Temporary Email Generator" />
        <meta property="og:description" content="Generate instant, temporary throwaway email addresses to stay secure and block spam forever." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Disposable Temp Mail" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Disposable Temp Mail - Free Secure Temporary Email" />
      </Helmet>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white font-medium px-5 py-3 rounded-lg shadow-xl shadow-indigo-900/30 flex items-center gap-2 border border-indigo-400/20"
            id="toast-notification"
          >
            <Sparkles className="w-4 h-4 text-indigo-200 animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Navigation */}
      <header className="border-b border-slate-800 bg-[#0f1524]/80 backdrop-blur-md sticky top-0 z-30" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/30">
              <Mail className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-white flex items-center gap-2">
                Temp<span className="text-indigo-400 font-extrabold">Mail</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v1.0
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSimulateModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg transition-all shadow-lg shadow-emerald-950/20 whitespace-nowrap"
              title="Simulate incoming emails directly inside this sandbox"
              id="btn-simulate-modal"
            >
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Simulate Incoming Email</span>
              <span className="sm:hidden">Simulate</span>
            </button>
            <span className="text-[10px] sm:text-xs text-slate-500 font-mono hidden md:inline-block px-2 py-1 rounded bg-slate-900 border border-slate-800">
              DB: {dbMode === "mongodb" ? "🟢 MongoDB" : "💾 In-Memory (Preview Mode)"}
            </span>
          </div>
        </div>
      </header>

      {/* TOP HEADER AD PLACEHOLDER (AdSense 728x90 Leaderboard / 320x50 Mobile) */}
      <div className="max-w-[960px] mx-auto w-full px-4 sm:px-6 mt-6" id="top-ad-wrapper">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[50px] md:min-h-[90px] w-full p-2">
          <span className="absolute top-1 left-2 text-[8px] font-bold tracking-widest text-slate-600 uppercase">Sponsored Advertisement</span>
          <div className="w-full h-[50px] md:h-[90px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
            <span className="font-mono text-[10px] md:text-xs">
              [Google AdSense Slot 1 - Top Header Leaderboard (728x90 Desktop, 320x50 Mobile)]
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout Container with Sidebar Skyscrapers */}
      <div className="max-w-[1550px] mx-auto w-full px-2.5 sm:px-4 md:px-6 py-4 sm:py-6 flex-grow flex flex-row items-start justify-center gap-3 sm:gap-6" id="app-layout-wrapper">
        
        {/* LEFT SKYSCRAPER AD ZONE (Red High-CTR Ad Placement) */}
        <aside className="hidden xl:flex flex-col gap-4 w-[160px] flex-shrink-0 sticky top-24" id="left-skyscraper-ad">
          <div className="bg-red-600/10 rounded-2xl border border-red-500/40 p-4 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden shadow-lg shadow-red-950/10">
            <span className="absolute top-2 left-2 text-[8px] font-bold tracking-widest text-red-400 uppercase">Sponsored Ad</span>
            <div className="w-full h-[560px] flex flex-col items-center justify-center text-xs text-red-400 border border-dashed border-red-500/25 rounded-lg bg-red-950/40 p-2 text-center gap-4">
              <span className="font-mono text-[10px] leading-relaxed">
                [Google AdSense]<br/>
                <strong className="text-red-400 font-bold uppercase tracking-wider text-[11px]">Wide Skyscraper<br/>(160x600)</strong><br/>
                High Conversion Zone
              </span>
              <div className="w-8 h-8 rounded-full border border-red-500/30 flex items-center justify-center text-red-400 text-xs font-bold animate-pulse">Ad</div>
            </div>
          </div>
        </aside>

        {/* CENTER MAIN COLUMN */}
        <main className="flex-grow max-w-[960px] w-full flex flex-col gap-6 overflow-hidden" id="app-main-content">
          
          {/* Email Generator Area */}
          <section className="bg-gradient-to-br from-[#121829] to-[#0d1222] rounded-2xl border border-slate-800 p-3 sm:p-5 shadow-xl relative overflow-hidden" id="email-generator">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            
            <div className="max-w-2xl mx-auto text-center mb-3">
              <h1 className="text-lg sm:text-2xl font-bold font-display tracking-tight text-white leading-tight mb-1">
                Instant Temporary Disposable Email Service
              </h1>
              <p className="text-slate-400 text-[10px] sm:text-xs max-w-lg mx-auto">
                Prevent spam, bypass quick registers, and keep your primary mailbox clean instantly.
              </p>
            </div>

          <div className="max-w-2xl mx-auto">
            {/* Generated Email Bar */}
            <div className="bg-[#090d16] rounded-xl border border-slate-700/80 p-1.5 sm:p-3 flex flex-row items-center gap-2 sm:gap-3 shadow-inner" id="email-display-box">
              <div className="flex items-center gap-2 sm:gap-3 flex-grow px-2 sm:px-3 overflow-hidden">
                <div className="bg-indigo-600/10 p-1.5 sm:p-2 rounded-lg text-indigo-400 flex-shrink-0">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-white font-mono font-semibold text-xs sm:text-lg tracking-wide truncate w-full select-all">
                  {emailAddress}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={copyEmailToClipboard}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-medium text-[11px] sm:text-sm transition-all shadow-lg shadow-indigo-900/30 cursor-pointer whitespace-nowrap"
                  id="btn-copy-email"
                >
                  {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  <span>{copied ? "Copied!" : "Copy Email"}</span>
                </button>
                <button
                  onClick={generateNewEmail}
                  className="flex items-center justify-center p-1.5 sm:p-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
                  title="Generate random new email address"
                  id="btn-new-email"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Config & Auto-Refresh Status Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 mt-3 px-1" id="config-status-row">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMessages(true)}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 disabled:opacity-50 text-slate-200 px-2.5 py-1.5 rounded-lg transition-all border border-slate-700 cursor-pointer"
                  id="btn-refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>

                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-400 font-mono">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span>Poll: <strong className="text-white">{countdown}s</strong></span>
                </div>
              </div>

              {/* Toggle Settings trigger */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-500 text-[11px] sm:text-xs">Custom?</span>
                <form onSubmit={applyCustomAddress} className="flex items-center gap-1 sm:gap-1.5">
                  <input
                    type="text"
                    value={prefixInput}
                    onChange={(e) => setPrefixInput(e.target.value)}
                    placeholder="prefix"
                    className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] sm:text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-20 sm:w-36"
                    id="input-custom-prefix"
                  />
                  <select
                    value={domainInput}
                    onChange={(e) => {
                      setDomainInput(e.target.value);
                      setDomain(e.target.value);
                      setSelectedMessage(null);
                      showToast(`Switched domain to ${e.target.value}`);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-[11px] sm:text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[100px] sm:max-w-none"
                    id="select-custom-domain"
                  >
                    <option value="tempmail.domain.com">@tempmail...</option>
                    <option value="disposable.domain.com">@dispos...</option>
                    <option value="freemail.domain.com">@freem...</option>
                    <option value="domain.com">@domain.com</option>
                  </select>
                  <button
                    type="submit"
                    className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[11px] sm:text-xs font-medium cursor-pointer"
                    id="btn-apply-prefix"
                  >
                    Set
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Inbox Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="inbox-layout-grid">
          
          {/* Leftbar Grid Group (Column 1-4) */}
          <div className="lg:col-span-4 flex flex-col gap-6 w-full" id="leftbar-container-group">
            {/* Messages Column (Left Sidebar on Large, Top on Mobile) */}
            <section className="bg-[#101625] rounded-2xl border border-slate-800 flex flex-col h-[500px] w-full" id="inbox-messages-column">
              
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#121a2d]">
                <div className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-display font-semibold text-white tracking-tight">Inbox Messages</h2>
                  <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
                    {messages.length}
                  </span>
                </div>
                {messages.length > 0 && (
                  <button
                    onClick={clearMailbox}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
                    id="btn-clear-inbox"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {/* Email list container */}
              <div className="flex-grow overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {isLoading && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-slate-500 gap-2">
                      <RefreshCw className="w-8 h-8 text-indigo-500/50 animate-spin" />
                      <span className="text-xs font-mono">Connecting and checking incoming stream...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 gap-3"
                      id="empty-mailbox-state"
                    >
                      <div className="bg-slate-900/80 p-4 rounded-full border border-slate-800/80 text-slate-600">
                        <Inbox className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-300">Your Inbox is Empty</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">
                          Waiting for incoming emails. Send an email to this address or use the simulation helper above to test instantly!
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSimSender("verify@discord.com");
                          setSimSubject("Discord - Your authentication code is 492049");
                          setShowSimulateModal(true);
                        }}
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline mt-2 flex items-center gap-1 mx-auto cursor-pointer"
                        id="btn-trigger-quick-simulate"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400 animate-bounce" />
                        Quick Test Simulation
                      </button>
                    </motion.div>
                  ) : (
                    messages.map((msg) => (
                      <motion.div
                        key={msg._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        onClick={() => setSelectedMessage(msg)}
                        className={`p-4 flex flex-col gap-1 cursor-pointer transition-all border-l-2 select-none ${
                          selectedMessage?._id === msg._id
                            ? "bg-indigo-600/10 border-indigo-500"
                            : "hover:bg-slate-800/40 border-transparent bg-transparent"
                        }`}
                        id={`inbox-item-${msg._id}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-300 truncate max-w-[150px]">
                            {msg.from_address}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-white truncate">
                          {msg.subject || "(No Subject)"}
                        </div>
                        <div className="flex items-center justify-between gap-4 mt-1.5">
                          <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {msg.body_text || "HTML Email Content"}
                          </span>
                          <button
                            onClick={(e) => deleteMessage(msg._id, e)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800/80 transition-colors"
                            title="Delete Email"
                            id={`btn-delete-${msg._id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* NEW Leftbar Sidebar Ad Slot (300x250 Medium Rectangle or Multi-size Banner) */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden" id="leftbar-sidebar-ad-card">
              <span className="absolute top-1 left-2 text-[8px] font-bold tracking-widest text-slate-600 uppercase">Sponsored Advertisement</span>
              <div className="w-full h-[210px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40 p-4 text-center">
                <span className="font-mono text-[10px] sm:text-xs leading-normal">
                  [Google AdSense Leftbar Slot]<br/>
                  <strong className="text-slate-400">Medium Rectangle (300x250)</strong><br/>
                  Perfect for High-CTR Sidebar conversions
                </span>
              </div>
            </div>
          </div>

          {/* Rightbar Grid Group (Column 5-12) */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full" id="rightbar-container-group">
            {/* Email View Column (Right Sidebar on Large, Bottom on Mobile) */}
            <section className="bg-[#101625] rounded-2xl border border-slate-800 flex flex-col h-[500px] w-full" id="email-view-panel">
              
              {/* Header / Actions */}
              {selectedMessage ? (
                <div className="flex flex-col h-full">
                  {/* Meta details header */}
                  <div className="p-4 border-b border-slate-800 bg-[#121a2d] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white leading-snug truncate max-w-xl">
                        {selectedMessage.subject}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                        <span>From: <strong className="text-slate-200">{selectedMessage.from_address}</strong></span>
                        <span className="text-slate-600">•</span>
                        <span>To: <strong className="text-slate-300">{selectedMessage.to_address}</strong></span>
                        <span className="text-slate-600">•</span>
                        <span className="font-mono text-[11px]">{new Date(selectedMessage.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* View Toggles & Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto bg-slate-950 p-1 rounded-lg border border-slate-800 flex-shrink-0">
                      <button
                        onClick={() => setViewMode("html")}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded ${
                          viewMode === "html" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                        id="btn-toggle-view-html"
                      >
                        <Eye className="w-3 h-3" />
                        <span>HTML</span>
                      </button>
                      <button
                        onClick={() => setViewMode("text")}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded ${
                          viewMode === "text" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                        id="btn-toggle-view-text"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Text</span>
                      </button>
                      <button
                        onClick={() => setViewMode("raw")}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded ${
                          viewMode === "raw" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                        id="btn-toggle-view-raw"
                      >
                        <Code className="w-3 h-3" />
                        <span>Source</span>
                      </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-grow p-4 bg-[#0a0e1a] overflow-auto flex flex-col">
                    {viewMode === "html" ? (
                      <div className="w-full h-full min-h-[300px] bg-white rounded-lg overflow-hidden border border-slate-800">
                        {/* Sandboxed Secure Iframe to prevent any active scripting (XSS Protection) */}
                        <iframe
                          ref={iframeRef}
                          title="Email Body Preview"
                          sandbox="allow-popups allow-popups-to-escape-sandbox"
                          referrerPolicy="no-referrer"
                          className="w-full h-full bg-white text-black"
                          srcDoc={selectedMessage.body_html || `<div style="font-family: sans-serif; padding: 20px;">${selectedMessage.body_text}</div>`}
                        />
                      </div>
                    ) : viewMode === "text" ? (
                      <div className="w-full h-full min-h-[300px] bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-300 font-sans text-sm whitespace-pre-wrap leading-relaxed select-text overflow-auto">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                          <span className="text-xs text-slate-500 uppercase font-mono">Parsed Plain Text Content</span>
                          <button
                            onClick={() => copyMessageBody(selectedMessage.body_text)}
                            className="flex items-center gap-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-all border border-slate-700 cursor-pointer"
                            id="btn-copy-body-text"
                          >
                            {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedText ? "Copied!" : "Copy Text"}</span>
                          </button>
                        </div>
                        {selectedMessage.body_text || "(No text content found inside email)"}
                      </div>
                    ) : (
                      <div className="w-full h-full min-h-[300px] bg-slate-950 p-4 rounded-lg border border-slate-800 text-slate-400 font-mono text-xs whitespace-pre select-text overflow-auto">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                          <span className="text-xs text-slate-500 uppercase font-mono">Raw HTML Source Code</span>
                          <button
                            onClick={() => copyMessageBody(selectedMessage.body_html)}
                            className="flex items-center gap-1 text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-all border border-slate-700 cursor-pointer"
                            id="btn-copy-body-html"
                          >
                            {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedText ? "Copied!" : "Copy Source"}</span>
                          </button>
                        </div>
                        {selectedMessage.body_html || "(No HTML content found inside email)"}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500 gap-3 bg-[#0a0e1a]/40 rounded-2xl">
                  <div className="bg-slate-900/60 p-4 rounded-full border border-slate-800/80 text-slate-600">
                    <Mail className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300">No Email Selected</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                      Select an email item from the inbox sidebar to view full contents, html, plain text and source code securely.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* NEW Rightbar Sidebar Ad Slot (Responsive Horizontal Banner) */}
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[120px] relative overflow-hidden" id="rightbar-sidebar-ad-card">
              <span className="absolute top-1 left-2 text-[8px] font-bold tracking-widest text-slate-600 uppercase">Sponsored Advertisement</span>
              <div className="w-full h-[80px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40 p-2 text-center">
                <span className="font-mono text-[10px] sm:text-xs leading-tight">
                  [Google AdSense Rightbar Slot]<br/>
                  <strong className="text-slate-400">Horizontal Responsive Banner (728x90 on Desktop, 320x50 on Mobile)</strong><br/>
                  Perfect for inline content matchmaking & dynamic ads
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* SIDEBAR/INLINE AD PLACEHOLDER (AdSense 300x250 Medium Rectangle) */}
        <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6" id="middle-ads-container">
          <div className="md:col-span-4 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col items-center justify-center min-h-[250px] relative overflow-hidden">
            <span className="absolute top-1 left-2 text-[8px] font-bold tracking-widest text-slate-600 uppercase">Sponsored Advertisement</span>
            <div className="w-full h-[250px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40 p-4 text-center">
              <span className="font-mono text-[10px] md:text-xs leading-normal">
                [Google AdSense Slot 2<br/>Medium Rectangle (300x250)<br/>Perfect for Sidebars & Inline flow]
              </span>
            </div>
          </div>

          {/* Quick How-to Tutorial Guide */}
          <div className="md:col-span-8 bg-[#101625] rounded-2xl border border-slate-800 p-6 flex flex-col justify-between" id="inbox-tutorial-panel">
            <div>
              <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span>How to use TempMail with Cloudflare Webhooks</span>
              </h2>
              
              <div className="space-y-4 text-sm text-slate-400">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold border border-indigo-500/20">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">Wildcard Catch-all Emails</h4>
                    <p className="text-xs mt-0.5">Activate Cloudflare Email Routing. Create a catch-all route pointing <strong>*@yourdomain.com</strong> to the Cloudflare Worker.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold border border-indigo-500/20">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">Cloudflare Worker Parsing</h4>
                    <p className="text-xs mt-0.5">Deploy our optimized <code>cloudflare-worker.js</code>. The worker uses <code>postal-mime</code> to automatically convert raw streams into structured JSON payloads.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold border border-indigo-500/20">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200">Authenticated Webhook Push</h4>
                    <p className="text-xs mt-0.5">The worker POSTs the payload safely to your VPS backend API with your secure <code>X-Webhook-Secret</code> key header. Real-time updates populate this inbox!</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Want to read the full self-hosting guide? Refer to the deployment markdown.
              </span>
              <a 
                href="#seo-info"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline"
              >
                <span>Read SEO FAQ Below</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Structured SEO Content Block at Bottom for AdSense and Indexing */}
        <section className="bg-[#101625] rounded-2xl border border-slate-800 p-6 md:p-8" id="seo-info">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold font-display text-white tracking-tight mb-4">
              Why use a Free Temporary Email Address? (Disposable Mail FAQ)
            </h2>
            
            <div className="space-y-6 text-sm text-slate-400 leading-relaxed">
              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1.5">What is a Temporary Email?</h3>
                <p>
                  A temporary email (also known as disposable mail, trash mail, or throwaway email) is a short-lived email box created to receive verification links, confirmations, newsletters, or downloads without exposing your real personal email address to potential spam, newsletters, or leaks.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1.5">How does the automatic cleanup work?</h3>
                <p>
                  Our system is built with high performance and strict storage cleanup policies. In your self-hosted MongoDB configuration, records are index-configured with a <strong>TTL (Time To Live) index of 3600 seconds</strong>. MongoDB automatically and transparently purges emails precisely one hour after creation, keeping the server database lightweight, secure, and clear of personal data logs.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1.5">Is it safe from malicious scripts?</h3>
                <p>
                  Absolutely. Unlike basic tools that directly render raw HTML scripts sent by third-parties, our frontend enforces absolute client-side protection. All incoming visual layouts are compiled inside a <strong>highly restrictive sandboxed iframe</strong>, disabling JavaScript runtime, cookie sharing, and outer context routing to fully block XSS (Cross-Site Scripting) exploits.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1.5">How to deploy it on custom Oracle VPS / Cloudflare setups?</h3>
                <p>
                  This repository contains 100% complete deployment files including Nginx reverse proxy configs, PM2 execution commands, Let's Encrypt Certbot SSL directives, and the Cloudflare worker integration. Access the <code>DEPLOYMENT.md</code> file in this source root for the detailed step-by-step terminal copy-pastes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM FOOTER AD PLACEHOLDER (AdSense 728x90 Leaderboard / 320x50 Mobile) */}
        <div className="w-full mt-2" id="bottom-ad-wrapper">
          <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[50px] md:min-h-[90px] w-full p-2">
            <span className="absolute top-1 left-2 text-[8px] font-bold tracking-widest text-slate-600 uppercase">Sponsored Advertisement</span>
            <div className="w-full h-[50px] md:h-[90px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
              <span className="font-mono text-[10px] md:text-xs">
                [Google AdSense Slot 3 - Bottom Footer Leaderboard (728x90 Desktop, 320x50 Mobile)]
              </span>
            </div>
          </div>
        </div>

      </main>

      {/* RIGHT SKYSCRAPER AD ZONE (Red High-CTR Ad Placement) */}
      <aside className="hidden xl:flex flex-col gap-4 w-[160px] flex-shrink-0 sticky top-24" id="right-skyscraper-ad">
        <div className="bg-red-600/10 rounded-2xl border border-red-500/40 p-4 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden shadow-lg shadow-red-950/10">
          <span className="absolute top-2 left-2 text-[8px] font-bold tracking-widest text-red-400 uppercase">Sponsored Ad</span>
          <div className="w-full h-[560px] flex flex-col items-center justify-center text-xs text-red-400 border border-dashed border-red-500/25 rounded-lg bg-red-950/40 p-2 text-center gap-4">
            <span className="font-mono text-[10px] leading-relaxed">
              [Google AdSense]<br/>
              <strong className="text-red-400 font-bold uppercase tracking-wider text-[11px]">Wide Skyscraper<br/>(160x600)</strong><br/>
              High Conversion Zone
            </span>
            <div className="w-8 h-8 rounded-full border border-red-500/30 flex items-center justify-center text-red-400 text-xs font-bold animate-pulse">Ad</div>
          </div>
        </div>
      </aside>

    </div>

      {/* Footer copyright */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-8 text-center text-xs text-slate-500" id="app-footer">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Secure & Private Trash Mailbox • Built for custom domain webhooks</span>
          </div>
          <div>
            <span>© 2026 TempMail Service. Built with MERN, Tailwind CSS & Cloudflare. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Webhook Email Simulator Dialog Modal */}
      <AnimatePresence>
        {showSimulateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="simulation-modal-backdrop">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSimulateModal(false)}
              className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            />

            {/* Content Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#101625] border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
              id="simulation-modal-content"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h3 className="font-display font-bold text-white text-lg">Incoming Webhook Simulator</h3>
                </div>
                <button
                  onClick={() => setShowSimulateModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-400 leading-relaxed bg-indigo-950/20 border border-indigo-500/10 rounded-lg p-3">
                <Info className="w-4 h-4 text-indigo-400 inline-block mr-1.5 align-middle" />
                This simulator makes a real <strong>POST request</strong> to your <code>/api/generate-mock-email</code> endpoint. It saves a realistic HTML email to the database which your inbox then fetches via active polling! Great for proving API validation.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">To (Your Temp Address):</label>
                  <input
                    type="text"
                    disabled
                    value={emailAddress}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-indigo-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">From Sender Address:</label>
                  <select
                    value={simSender}
                    onChange={(e) => {
                      setSimSender(e.target.value);
                      if (e.target.value === "netflix@verification.com") {
                        setSimSubject("Action Required: Verify your Netflix profile login");
                      } else if (e.target.value === "support@github.com") {
                        setSimSubject("[GitHub] Security Alert: New SSH keys authorized");
                      } else if (e.target.value === "team@figma.com") {
                        setSimSubject("Someone invited you to collaborate on Wireframes V2");
                      } else {
                        setSimSubject("Welcome to your disposable secure mailbox!");
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="netflix@verification.com">netflix@verification.com (HTML Login alert)</option>
                    <option value="support@github.com">support@github.com (Github Security Alert)</option>
                    <option value="team@figma.com">team@figma.com (Figma Collab notification)</option>
                    <option value="newsletter@medium.com">newsletter@medium.com (Weekly tech roundup)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Subject Title:</label>
                  <input
                    type="text"
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Custom HTML Body (Optional):</label>
                  <textarea
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    placeholder="Leave blank to automatically use our premium designer templates matching the selected sender!"
                    className="w-full h-24 bg-slate-950 border border-slate-800 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 mt-2">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={triggerSimulation}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 transition-all cursor-pointer"
                  id="btn-trigger-simulation-post"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simulate Webhook POST</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
