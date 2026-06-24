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
  BookOpen,
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
  // Pages & Navigation Tab Mode
  const [currentTab, setCurrentTab] = useState<"mail" | "blog" | "admin">("mail");
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(null);

  // Dynamic Data
  const [blogs, setBlogs] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  
  // Admin Panel Auth & Sub-tabs
  const [adminPassword, setAdminPassword] = useState("");
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [adminTab, setAdminTab] = useState<"blogs" | "domains" | "ads">("blogs");

  // Create Blog state
  const [newBlogTitle, setNewBlogTitle] = useState("");
  const [newBlogCover, setNewBlogCover] = useState("");
  const [newBlogExcerpt, setNewBlogExcerpt] = useState("");
  const [newBlogContent, setNewBlogContent] = useState("");

  // Create Domain state
  const [newDomainName, setNewDomainName] = useState("");

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

  // Fetch blogs from API
  const fetchBlogs = async () => {
    try {
      const response = await fetch("/api/blogs");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setBlogs(data.blogs || []);
        }
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
    }
  };

  // Fetch custom domains from API
  const fetchDomains = async () => {
    try {
      const response = await fetch("/api/domains");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDomains(data.domains || []);
        }
      }
    } catch (err) {
      console.error("Error fetching domains:", err);
    }
  };

  // Fetch Ads configurations
  const fetchAds = async () => {
    try {
      const response = await fetch("/api/ads");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAds(data.ads || []);
        }
      }
    } catch (err) {
      console.error("Error fetching ads:", err);
    }
  };

  // Verify Admin password
  const handleVerifyAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      const data = await response.json();
      if (data.success) {
        setIsAdminVerified(true);
        showToast("Access granted. Welcome to the Admin Panel!");
      } else {
        showToast("Error: " + (data.error || "Invalid Password"));
      }
    } catch (err) {
      showToast("Verification failed. Check server console.");
    }
  };

  // Create Blog action
  const handleCreateBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlogTitle || !newBlogContent) {
      showToast("Title and Content are required.");
      return;
    }
    try {
      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({
          title: newBlogTitle,
          coverImage: newBlogCover,
          excerpt: newBlogExcerpt,
          content: newBlogContent
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast("Blog post published successfully!");
        setNewBlogTitle("");
        setNewBlogCover("");
        setNewBlogExcerpt("");
        setNewBlogContent("");
        fetchBlogs();
      } else {
        showToast("Failed to create blog: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      showToast("Error publishing blog.");
    }
  };

  // Delete Blog action
  const handleDeleteBlog = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    try {
      const response = await fetch(`/api/blogs/${id}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast("Blog post deleted.");
        fetchBlogs();
      } else {
        showToast("Failed to delete: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      showToast("Error deleting blog.");
    }
  };

  // Create Domain action
  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDomain = newDomainName.trim().toLowerCase();
    if (!cleanDomain) {
      showToast("Domain name cannot be empty.");
      return;
    }
    try {
      const response = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ domain: cleanDomain })
      });
      const data = await response.json();
      if (data.success) {
        showToast(`Domain ${cleanDomain} added successfully!`);
        setNewDomainName("");
        fetchDomains();
      } else {
        showToast("Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      showToast("Error adding domain.");
    }
  };

  // Delete Domain action
  const handleDeleteDomain = async (domainName: string) => {
    if (!window.confirm(`Are you sure you want to delete domain @${domainName}?`)) return;
    try {
      const response = await fetch(`/api/domains/${encodeURIComponent(domainName)}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword
        }
      });
      const data = await response.json();
      if (data.success) {
        showToast("Domain deleted.");
        fetchDomains();
      } else {
        showToast("Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      showToast("Error deleting domain.");
    }
  };

  // Save Ad Configuration
  const handleSaveAd = async (slot: string, isActive: boolean, codeOrText: string) => {
    try {
      const response = await fetch("/api/ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword
        },
        body: JSON.stringify({ slot, isActive, codeOrText })
      });
      const data = await response.json();
      if (data.success) {
        showToast("Ad setting updated successfully!");
        fetchAds();
      } else {
        showToast("Failed to save: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      showToast("Error updating ad slot.");
    }
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

  // Load custom domains, blogs, and ads configurations once on mount
  useEffect(() => {
    fetchDomains();
    fetchBlogs();
    fetchAds();
  }, []);

  // Update default domain name once custom domains are fetched
  useEffect(() => {
    if (domains.length > 0) {
      const defaultDom = domains[0].domain;
      setDomain(defaultDom);
      setDomainInput(defaultDom);
    }
  }, [domains]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <div className="bg-indigo-600/20 p-2 rounded-lg border border-indigo-500/30 hidden xs:block flex-shrink-0">
              <Mail className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-shrink-0">
              <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                Temp<span className="text-indigo-400 font-extrabold">Mail</span>
              </span>
            </div>
            
            {/* Dynamic Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 p-0.5 sm:p-1 rounded-lg ml-1 sm:ml-4">
              <button
                onClick={() => { setCurrentTab("mail"); setSelectedBlogSlug(null); }}
                className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all ${
                  currentTab === "mail" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-slate-400 hover:text-white"
                }`}
                id="tab-mail"
              >
                <Mail className="w-3 h-3" />
                <span>Mail</span>
              </button>
              <button
                onClick={() => { setCurrentTab("blog"); setSelectedBlogSlug(null); }}
                className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all ${
                  currentTab === "blog" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-slate-400 hover:text-white"
                }`}
                id="tab-blog"
              >
                <BookOpen className="w-3 h-3" />
                <span>Blog</span>
              </button>
              <button
                onClick={() => { setCurrentTab("admin"); }}
                className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-semibold transition-all ${
                  currentTab === "admin" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-slate-400 hover:text-white"
                }`}
                id="tab-admin"
              >
                <Settings className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSimulateModal(true)}
              className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all"
              title="Simulate incoming emails directly inside this sandbox"
              id="btn-simulate-modal"
            >
              <Send className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Simulate Mail</span>
            </button>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono hidden md:inline-block px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
              DB: {dbMode === "mongodb" ? "🟢 Mongo" : "💾 Memory"}
            </span>
          </div>
        </div>
      </header>

      {/* TOP HEADER AD PLACEHOLDER (AdSense 728x90 Leaderboard / 320x50 Mobile) */}
      {(() => {
        const topAd = ads.find(a => a.slot === "top_leaderboard");
        if (topAd && !topAd.isActive) return null;
        return (
          <div className="max-w-[960px] mx-auto w-full px-4 sm:px-6 mt-6" id="top-ad-wrapper">
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[50px] md:min-h-[90px] w-full p-2">
              <span className="absolute top-1 left-2 text-[8px] font-bold tracking-widest text-slate-600 uppercase">Sponsored Advertisement</span>
              <div className="w-full h-[50px] md:h-[90px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
                <span className="font-mono text-[10px] md:text-xs text-center px-4">
                  {topAd?.codeOrText || "[Google AdSense Slot 1 - Top Header Leaderboard (728x90 Desktop, 320x50 Mobile)]"}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Layout Container with Sidebar Skyscrapers */}
      <div className="max-w-[1550px] mx-auto w-full px-2.5 sm:px-4 md:px-6 py-4 sm:py-6 flex-grow flex flex-row items-start justify-center gap-3 sm:gap-6" id="app-layout-wrapper">
        
        {/* LEFT SKYSCRAPER AD ZONE (Red High-CTR Ad Placement) */}
        {(() => {
          const leftAd = ads.find(a => a.slot === "left_skyscraper");
          if (leftAd && !leftAd.isActive) return null;
          return (
            <aside className="hidden xl:flex flex-col gap-4 w-[160px] flex-shrink-0 sticky top-24" id="left-skyscraper-ad">
              <div className="bg-red-600/10 rounded-2xl border border-red-500/40 p-4 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden shadow-lg shadow-red-950/10">
                <span className="absolute top-2 left-2 text-[8px] font-bold tracking-widest text-red-400 uppercase">Sponsored Ad</span>
                <div className="w-full h-[560px] flex flex-col items-center justify-center text-xs text-red-400 border border-dashed border-red-500/25 rounded-lg bg-red-950/40 p-2 text-center gap-4">
                  <span className="font-mono text-[10px] leading-relaxed">
                    {leftAd?.codeOrText || "[Google AdSense - Wide Skyscraper (160x600)]"}
                  </span>
                  <div className="w-8 h-8 rounded-full border border-red-500/30 flex items-center justify-center text-red-400 text-xs font-bold animate-pulse">Ad</div>
                </div>
              </div>
            </aside>
          );
        })()}

        {/* CENTER MAIN COLUMN */}
        <main className="flex-grow max-w-[960px] w-full flex flex-col gap-6 overflow-hidden" id="app-main-content">
          
          {currentTab === "mail" && (
            <>
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
                    {domains.length === 0 ? (
                      <>
                        <option value="tempmail.domain.com">@tempmail...</option>
                        <option value="disposable.domain.com">@dispos...</option>
                        <option value="freemail.domain.com">@freem...</option>
                        <option value="domain.com">@domain.com</option>
                      </>
                    ) : (
                      domains.map((dom) => (
                        <option key={dom._id || dom.domain} value={dom.domain}>
                          @{dom.domain.length > 15 ? dom.domain.substring(0, 12) + "..." : dom.domain}
                        </option>
                      ))
                    )}
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
              {(() => {
                const bottomAd = ads.find(a => a.slot === "sidebar_right");
                if (bottomAd && !bottomAd.isActive) return null;
                return (
                  <div className="w-full mt-2" id="bottom-ad-wrapper">
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden min-h-[50px] md:min-h-[90px] w-full p-2">
                      <span className="absolute top-1 left-2 text-[8px] font-bold tracking-widest text-slate-600 uppercase">Sponsored Advertisement</span>
                      <div className="w-full h-[50px] md:h-[90px] flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg bg-slate-950/40">
                        <span className="font-mono text-[10px] md:text-xs text-center px-4">
                          {bottomAd?.codeOrText || "[Google AdSense Slot 3 - Bottom Footer Leaderboard (728x90 Desktop, 320x50 Mobile)]"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {currentTab === "blog" && (
            <div className="flex flex-col gap-6" id="blog-posts-view">
              {!selectedBlogSlug ? (
                // Blogs List View
                <div className="bg-[#101625] rounded-2xl border border-slate-800 p-4 sm:p-6 flex flex-col gap-6">
                  <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-indigo-400" />
                        <span>Security & Privacy Blog</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Learn about email privacy, cybersecurity best practices, and temporary mail hosting.
                      </p>
                    </div>
                  </div>

                  {blogs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                      <p className="text-sm">No blog posts found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {blogs.map((blog) => (
                        <div key={blog._id} className="bg-slate-900/60 rounded-xl border border-slate-800/80 overflow-hidden flex flex-col h-full hover:border-slate-700 transition-all group">
                          {blog.coverImage && (
                            <div className="relative h-44 overflow-hidden bg-slate-950">
                              <img 
                                src={blog.coverImage} 
                                alt={blog.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          <div className="p-4 flex flex-col flex-grow gap-2">
                            <span className="text-[10px] font-mono text-indigo-400">
                              {new Date(blog.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <h3 className="font-display font-bold text-white text-base group-hover:text-indigo-400 transition-colors line-clamp-2">
                              {blog.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed flex-grow">
                              {blog.excerpt}
                            </p>
                            <button
                              onClick={() => setSelectedBlogSlug(blog.slug)}
                              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2 self-start cursor-pointer group-hover:underline"
                            >
                              <span>Read Post</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Single Blog Post Reader View
                (() => {
                  const blog = blogs.find(b => b.slug === selectedBlogSlug);
                  if (!blog) {
                    return (
                      <div className="bg-[#101625] rounded-2xl border border-slate-800 p-8 text-center text-slate-500">
                        <p>Blog post not found or loading...</p>
                        <button onClick={() => setSelectedBlogSlug(null)} className="text-xs text-indigo-400 underline mt-2">Go back</button>
                      </div>
                    );
                  }
                  return (
                    <article className="bg-[#101625] rounded-2xl border border-slate-800 overflow-hidden shadow-xl" id="blog-post-content">
                      {blog.coverImage && (
                        <div className="relative h-64 sm:h-80 w-full bg-slate-950">
                          <img 
                            src={blog.coverImage} 
                            alt={blog.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#101625] via-transparent to-transparent"></div>
                          <button
                            onClick={() => setSelectedBlogSlug(null)}
                            className="absolute top-4 left-4 bg-slate-950/80 hover:bg-slate-950 text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur"
                          >
                            <span>← Back to blogs</span>
                          </button>
                        </div>
                      )}
                      
                      <div className="p-6 sm:p-8 flex flex-col gap-4">
                        {!blog.coverImage && (
                          <button
                            onClick={() => setSelectedBlogSlug(null)}
                            className="bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer self-start mb-2"
                          >
                            <span>← Back to blogs</span>
                          </button>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                          <span>Published on</span>
                          <span className="text-indigo-400">
                            {new Date(blog.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                        
                        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight leading-tight">
                          {blog.title}
                        </h1>

                        <div className="text-slate-300 text-sm sm:text-base leading-relaxed space-y-4 whitespace-pre-wrap border-t border-slate-800/80 pt-6 mt-2 select-text">
                          {blog.content}
                        </div>
                      </div>
                    </article>
                  );
                })()
              )}
            </div>
          )}

          {currentTab === "admin" && (
            <div className="bg-[#101625] rounded-2xl border border-slate-800 p-4 sm:p-6 flex flex-col gap-6" id="admin-panel-view">
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                    <Settings className="w-5.5 h-5.5 text-indigo-400" />
                    <span>Server Administrative Panel</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage available email domains, publish blog posts, and configure active ad placements.
                  </p>
                </div>
                {isAdminVerified && (
                  <button
                    onClick={() => { setIsAdminVerified(false); setAdminPassword(""); }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
                  >
                    Lock Session
                  </button>
                )}
              </div>

              {!isAdminVerified ? (
                // Authentication Form
                <div className="max-w-md mx-auto w-full py-8 flex flex-col gap-4" id="admin-auth-section">
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2.5 justify-center mb-1 text-center">
                      <Lock className="w-5 h-5 text-indigo-400" />
                      <span className="font-semibold text-white">Enter Administrator Password</span>
                    </div>
                    
                    <form onSubmit={handleVerifyAdmin} className="flex flex-col gap-3">
                      <input
                        type="password"
                        placeholder="Admin Password (default: admin123)"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                      />
                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2.5 text-xs font-semibold shadow transition-all cursor-pointer"
                      >
                        Unlock Panel
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                // Verified Admin Console
                <div className="flex flex-col gap-6" id="admin-console-section">
                  {/* Admin Tab Selector */}
                  <div className="flex items-center gap-1 border-b border-slate-800 pb-0.5">
                    <button
                      onClick={() => setAdminTab("blogs")}
                      className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                        adminTab === "blogs"
                          ? "border-indigo-500 text-white bg-indigo-500/5"
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      Blogging Engine
                    </button>
                    <button
                      onClick={() => setAdminTab("domains")}
                      className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                        adminTab === "domains"
                          ? "border-indigo-500 text-white bg-indigo-500/5"
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      Domain Routing
                    </button>
                    <button
                      onClick={() => setAdminTab("ads")}
                      className={`px-3 sm:px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                        adminTab === "ads"
                          ? "border-indigo-500 text-white bg-indigo-500/5"
                          : "border-transparent text-slate-400 hover:text-white"
                      }`}
                    >
                      Ads Manager
                    </button>
                  </div>

                  {/* 1. Manage Blogs Sub-tab */}
                  {adminTab === "blogs" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Create Blog Form */}
                      <form onSubmit={handleCreateBlog} className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col gap-4">
                        <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-indigo-400">Publish New Blog Post</h3>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Blog Title:</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 5 Ways to Spot a Phishing Attack"
                            value={newBlogTitle}
                            onChange={(e) => setNewBlogTitle(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Cover Image URL (Optional):</label>
                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/photo-..."
                            value={newBlogCover}
                            onChange={(e) => setNewBlogCover(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Short Excerpt:</label>
                          <input
                            type="text"
                            placeholder="Brief 1-2 sentence description..."
                            value={newBlogExcerpt}
                            onChange={(e) => setNewBlogExcerpt(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Article Content (Plain text / Markdown style):</label>
                          <textarea
                            required
                            placeholder="Write the full content of your post here..."
                            value={newBlogContent}
                            onChange={(e) => setNewBlogContent(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 h-44 resize-y font-sans leading-relaxed"
                          />
                        </div>

                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-semibold shadow cursor-pointer transition-all mt-1"
                        >
                          Publish Post
                        </button>
                      </form>

                      {/* Existing Blogs List */}
                      <div className="lg:col-span-5 flex flex-col gap-3">
                        <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-slate-400">Current Blog Posts</h3>
                        
                        {blogs.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-500">No blogs published yet.</div>
                        ) : (
                          <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto custom-scrollbar">
                            {blogs.map((b) => (
                              <div key={b._id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div className="overflow-hidden min-w-0">
                                  <h4 className="font-semibold text-white text-xs truncate">{b.title}</h4>
                                  <span className="text-[9px] text-slate-500 font-mono">slug: {b.slug}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlog(b._id)}
                                  className="text-rose-400 hover:text-rose-300 text-xs p-1 cursor-pointer hover:bg-rose-500/10 rounded flex-shrink-0"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. Manage Domains Sub-tab */}
                  {adminTab === "domains" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Add Domain Form */}
                      <form onSubmit={handleCreateDomain} className="lg:col-span-5 bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                        <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-indigo-400">Add New Domain Routing</h3>
                        <p className="text-[10px] text-slate-400 font-sans leading-relaxed">
                          Add domains that are already configured with catch-all routing in your Cloudflare account to forward emails here.
                        </p>
                        
                        <div className="flex flex-col gap-1 mt-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Domain Name:</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. securemail.com"
                            value={newDomainName}
                            onChange={(e) => setNewDomainName(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-xs font-semibold shadow cursor-pointer transition-all mt-1"
                        >
                          Register Domain
                        </button>
                      </form>

                      {/* Domains List */}
                      <div className="lg:col-span-7 flex flex-col gap-3">
                        <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-slate-400">Active Domains List</h3>
                        
                        {domains.length === 0 ? (
                          <div className="text-center py-6 text-xs text-slate-500">No domains added.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {domains.map((dom) => (
                              <div key={dom._id || dom.domain} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                  <span className="font-mono text-xs text-white truncate">@{dom.domain}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDomain(dom.domain)}
                                  className="text-rose-400 hover:text-rose-300 text-xs p-1 cursor-pointer hover:bg-rose-500/10 rounded flex-shrink-0"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 3. Manage Ads Sub-tab */}
                  {adminTab === "ads" && (
                    <div className="flex flex-col gap-4">
                      <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl">
                        <h3 className="font-semibold text-white text-xs uppercase tracking-wider text-indigo-400 mb-2">Advertisements Slot Configuration</h3>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                          Control high-exposure banners and skyscraper containers. Turn them off instantly or paste your AdSense HTML responsive codes to optimize monetization formats!
                        </p>
                      </div>

                      <div className="flex flex-col gap-4">
                        {[
                          { slot: "top_leaderboard", title: "Header Horizontal Leaderboard (728x90 / 320x50 Mobile)" },
                          { slot: "left_skyscraper", title: "Left Sidebar Skyscraper High-CTR Slot (160x600)" },
                          { slot: "right_skyscraper", title: "Right Sidebar Skyscraper High-CTR Slot (160x600)" },
                          { slot: "sidebar_left", title: "Middle Sidebar Left Square Spot (300x250)" },
                          { slot: "sidebar_right", title: "Middle Responsive Horizontal Grid Banner" }
                        ].map((spot) => {
                          const matchingAd = ads.find(a => a.slot === spot.slot) || { isActive: false, codeOrText: "" };
                          return (
                            <div key={spot.slot} className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
                                <div className="font-semibold text-xs text-white flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                  <span>{spot.title}</span>
                                  <span className="text-[9px] text-slate-500 font-mono">({spot.slot})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Status:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveAd(spot.slot, !matchingAd.isActive, matchingAd.codeOrText)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                      matchingAd.isActive 
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20" 
                                        : "bg-slate-800 text-slate-500 border border-slate-700 hover:text-white"
                                    }`}
                                  >
                                    {matchingAd.isActive ? "● Active / Visible" : "○ Disabled"}
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Ad Code / Alternate text:</label>
                                <textarea
                                  placeholder="Paste Google AdSense code or placeholder description..."
                                  defaultValue={matchingAd.codeOrText}
                                  onBlur={(e) => {
                                    if (e.target.value !== matchingAd.codeOrText) {
                                      handleSaveAd(spot.slot, matchingAd.isActive, e.target.value);
                                    }
                                  }}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 font-mono h-20 resize-y"
                                />
                                <span className="text-[9px] text-slate-500 italic">💡 Saving triggers automatically when the textarea loses focus.</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

      </main>

      {/* RIGHT SKYSCRAPER AD ZONE (Red High-CTR Ad Placement) */}
      {(() => {
        const rightAd = ads.find(a => a.slot === "right_skyscraper");
        if (rightAd && !rightAd.isActive) return null;
        return (
          <aside className="hidden xl:flex flex-col gap-4 w-[160px] flex-shrink-0 sticky top-24" id="right-skyscraper-ad">
            <div className="bg-red-600/10 rounded-2xl border border-red-500/40 p-4 flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden shadow-lg shadow-red-950/10">
              <span className="absolute top-2 left-2 text-[8px] font-bold tracking-widest text-red-400 uppercase">Sponsored Ad</span>
              <div className="w-full h-[560px] flex flex-col items-center justify-center text-xs text-red-400 border border-dashed border-red-500/25 rounded-lg bg-red-950/40 p-2 text-center gap-4">
                <span className="font-mono text-[10px] leading-relaxed">
                  {rightAd?.codeOrText || "[Google AdSense - Wide Skyscraper (160x600)]"}
                </span>
                <div className="w-8 h-8 rounded-full border border-red-500/30 flex items-center justify-center text-red-400 text-xs font-bold animate-pulse">Ad</div>
              </div>
            </div>
          </aside>
        );
      })()}

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
