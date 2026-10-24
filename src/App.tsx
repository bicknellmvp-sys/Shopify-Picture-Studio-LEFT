import React, { useState, useEffect } from "react";
import { 
  Building2, Camera, Cloud, FolderClosed, HelpCircle, 
  Image, Layers, LayoutDashboard, Link2, Loader2, Play, 
  RefreshCw, ShieldAlert, Sparkles, Store, Wand2, FileSpreadsheet, Moon, Sun,
  Menu, X, ChevronDown, ChevronUp, Check, LogOut, Chrome
} from "lucide-react";
import { DashboardStats as StatsType, Product } from "./types";
import DashboardStats from "./components/DashboardStats";
import ProductList from "./components/ProductList";
import Workshop from "./components/Workshop";
import AssetLibrary from "./components/AssetLibrary";
import CsvDiagnosticStudio from "./components/CsvDiagnosticStudio";
import HelpCenter from "./components/HelpCenter";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'workshop' | 'library' | 'csv-studio' | 'help'>('diagnostics');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hamburger drawer configuration
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerAccordion, setDrawerAccordion] = useState<'modes' | 'accounts' | 'help' | null>('modes');

  // Shopify Store simulated configuration
  const [storeDomain, setStoreDomain] = useState("bicknell-mvp.myshopify.com");
  const [tempDomain, setTempDomain] = useState("bicknell-mvp.myshopify.com");
  const [isConnectingStore, setIsConnectingStore] = useState(false);
  const [storeConnected, setStoreConnected] = useState(true);

  // Additional connected accounts
  const [googleAccount, setGoogleAccount] = useState({
    connected: false,
    name: "Bicknell MVP",
    email: "bicknellmvp@gmail.com"
  });
  const [dropboxAccount, setDropboxAccount] = useState({
    connected: false,
    email: "bicknellmvp@dropbox.com"
  });

  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingDropbox, setIsConnectingDropbox] = useState(false);

  const handleConnectGoogle = () => {
    if (googleAccount.connected) {
      setGoogleAccount(prev => ({ ...prev, connected: false }));
    } else {
      setIsConnectingGoogle(true);
      setTimeout(() => {
        setGoogleAccount(prev => ({ ...prev, connected: true }));
        setIsConnectingGoogle(false);
      }, 1000);
    }
  };

  const handleConnectDropbox = () => {
    if (dropboxAccount.connected) {
      setDropboxAccount(prev => ({ ...prev, connected: false }));
    } else {
      setIsConnectingDropbox(true);
      setTimeout(() => {
        setDropboxAccount(prev => ({ ...prev, connected: true }));
        setIsConnectingDropbox(false);
      }, 1000);
    }
  };

  const handleToggleShopify = () => {
    if (storeConnected) {
      setStoreConnected(false);
    } else {
      setStoreConnected(true);
      fetchProducts();
    }
  };

  // Fetch products from fullstack Express API
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Could not contact server database");
      const data = await res.json();
      setProducts(data.products || []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch store inventory. Please make sure the dev server is active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Compute live dashboard metrics
  const getStats = (): StatsType => {
    const total = products.length;
    if (total === 0) {
      return {
        totalProducts: 0,
        criticalCount: 0,
        warningCount: 0,
        optimizedCount: 0,
        singleImageCount: 0,
        lowResCount: 0,
        clutteredBgCount: 0,
        averageScore: 100,
      };
    }

    let critical = 0;
    let warning = 0;
    let optimized = 0;
    let singleImg = 0;
    let lowRes = 0;
    let busyBg = 0;
    let totalScore = 0;

    products.forEach((p) => {
      totalScore += p.aiScore;
      if (p.status === "critical") critical++;
      else if (p.status === "warning") warning++;
      else optimized++;

      if (p.images.length === 1) singleImg++;
      
      p.images.forEach((img) => {
        if (img.isLowRes) lowRes++;
      });

      // Count if cluttered bg exists in product issues
      const hasClutteredBg = p.issues.some(issue => 
        issue.toLowerCase().includes("background") || 
        issue.toLowerCase().includes("cluttered")
      );
      if (hasClutteredBg) busyBg++;
    });

    return {
      totalProducts: total,
      criticalCount: critical,
      warningCount: warning,
      optimizedCount: optimized,
      singleImageCount: singleImg,
      lowResCount: lowRes,
      clutteredBgCount: busyBg,
      averageScore: totalScore / total,
    };
  };

  // Add customized product
  const handleAddProduct = async (prodDetails: { 
    title: string; sku: string; category: string; price: number; imageUrls: string[] 
  }) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prodDetails),
      });
      const data = await res.json();
      if (data.success) {
        // Refetch inventory to stay completely in sync
        await fetchProducts();
      }
    } catch (err) {
      console.error("Failed adding product:", err);
    }
  };

  // Reset demo store back to template defaults
  const handleResetStore = async () => {
    if (!confirm("Are you sure you want to restore the default Shopify demo products?")) return;
    try {
      const res = await fetch("/api/products/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchProducts();
        setSelectedProduct(null);
        setActiveTab('diagnostics');
      }
    } catch (err) {
      console.error("Failed resetting store:", err);
    }
  };

  // Connect different store mock API
  const handleConnectStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempDomain) return;
    setIsConnectingStore(true);
    setTimeout(() => {
      setStoreDomain(tempDomain);
      setStoreConnected(true);
      setIsConnectingStore(false);
      fetchProducts(); // Refresh
    }, 1200);
  };

  // Trigger Gemini Scan in fullstack backend
  const handleRefreshProductScan = async (productId: string, imageUrl: string): Promise<any> => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return null;

    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        imageUrl,
        title: p.title
      })
    });
    
    const data = await res.json();
    if (data.success) {
      // Fetch latest synced lists from backend
      await fetchProducts();
    }
    return data;
  };

  // Sync optimization result callback
  const handleSaveOptimizedImage = async (
    productId: string, 
    originalUrl: string, 
    optimizedUrl: string, 
    transformationType: string
  ) => {
    // Reload state store directly from server to update both listing images & stats instantly
    await fetchProducts();
  };

  // Workshop dynamic entry hook
  const handleLaunchWorkshop = (product: Product) => {
    setSelectedProduct(product);
    setActiveTab('workshop');
  };

  const stats = getStats();

  return (
    <div className={isDarkMode ? "dark min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col antialiased transition-colors duration-300" : "min-h-screen bg-slate-50/50 text-slate-800 font-sans flex flex-col antialiased transition-colors duration-300"}>
      
      {/* Drawer Overlay & Slide-out Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950 z-50 cursor-pointer"
            />
            {/* Slide-out Menu Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-80 sm:w-96 bg-white dark:bg-slate-900 z-50 shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                    <Camera className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-950 dark:text-white text-sm">Shop Photo Fixer</h3>
                    <p className="text-[10px] text-slate-500 font-semibold">Shopify Image Optimizer</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Accordion / Dropdown Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* Accordion 1: App Features & Modes */}
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
                  <button
                    onClick={() => setDrawerAccordion(drawerAccordion === 'modes' ? null : 'modes')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800"
                  >
                    <span className="flex items-center gap-2">🧭 APP FEATURES</span>
                    {drawerAccordion === 'modes' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {drawerAccordion === 'modes' && (
                    <div className="p-2 space-y-1 bg-white dark:bg-slate-900">
                      <button
                        onClick={() => { setActiveTab('diagnostics'); setIsDrawerOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors ${
                          activeTab === 'diagnostics' 
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                        <span>📸 Check Pictures (Diagnostics)</span>
                      </button>

                      <button
                        onClick={() => { 
                          if (products.length > 0 && !selectedProduct) {
                            setSelectedProduct(products[0]);
                          }
                          setActiveTab('workshop'); 
                          setIsDrawerOpen(false); 
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors ${
                          activeTab === 'workshop' 
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Wand2 className="w-4 h-4 text-purple-500" />
                        <span>🎨 Fix Pictures (Photo Studio)</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('library'); setIsDrawerOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors ${
                          activeTab === 'library' 
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Link2 className="w-4 h-4 text-emerald-500" />
                        <span>☁️ Saved Images (Cloud Storage)</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('csv-studio'); setIsDrawerOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors ${
                          activeTab === 'csv-studio' 
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                        <span>📄 Bulk CSV Edit (Spreadsheets)</span>
                      </button>

                      <button
                        onClick={() => { setActiveTab('help'); setIsDrawerOpen(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors ${
                          activeTab === 'help' 
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" 
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <HelpCircle className="w-4 h-4 text-sky-500" />
                        <span>❓ Help Center & FAQs</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Accordion 2: Connect Accounts */}
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
                  <button
                    onClick={() => setDrawerAccordion(drawerAccordion === 'accounts' ? null : 'accounts')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800"
                  >
                    <span className="flex items-center gap-2">🔑 CONNECT ACCOUNTS</span>
                    {drawerAccordion === 'accounts' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {drawerAccordion === 'accounts' && (
                    <div className="p-4 space-y-4 bg-white dark:bg-slate-900">
                      
                      {/* Shopify Section */}
                      <div className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Shopify Connect</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${storeConnected ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                            {storeConnected ? "● Active" : "○ Disconnected"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Current Shop: <strong>{storeDomain}</strong></p>
                        <button
                          onClick={handleToggleShopify}
                          className={`w-full text-center py-1.5 px-3 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            storeConnected 
                              ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400" 
                              : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                        >
                          {storeConnected ? "Disconnect Shopify Shop" : "Reconnect Shopify Shop"}
                        </button>
                      </div>

                      {/* Google Section */}
                      <div className="space-y-1.5 pb-3 border-b border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Google Accounts</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${googleAccount.connected ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                            {googleAccount.connected ? "● Connected" : "○ Disconnected"}
                          </span>
                        </div>
                        {googleAccount.connected ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-slate-950/50 rounded-lg">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                                BM
                              </div>
                              <div className="truncate">
                                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{googleAccount.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{googleAccount.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={handleConnectGoogle}
                              className="w-full text-center py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[10px] font-semibold rounded text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              Disconnect Google Account
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleConnectGoogle}
                            disabled={isConnectingGoogle}
                            className="w-full text-center py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            {isConnectingGoogle ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Chrome className="w-3.5 h-3.5 text-red-500" />
                                <span>Connect Google Account</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Dropbox Section */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Dropbox Sync</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dropboxAccount.connected ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20" : "bg-slate-100 text-slate-400 dark:bg-slate-800"}`}>
                            {dropboxAccount.connected ? "● Connected" : "○ Disconnected"}
                          </span>
                        </div>
                        {dropboxAccount.connected ? (
                          <div className="space-y-2">
                            <div className="p-2 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/50 rounded-lg text-[10px] text-blue-700 dark:text-blue-400">
                              ☁️ Dropbox Folder Sync Enabled: <strong>bicknell_shop_backup</strong>
                            </div>
                            <button
                              onClick={handleConnectDropbox}
                              className="w-full text-center py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[10px] font-semibold rounded text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                              Disconnect Dropbox Sync
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleConnectDropbox}
                            disabled={isConnectingDropbox}
                            className="w-full text-center py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            {isConnectingDropbox ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Cloud className="w-3.5 h-3.5 text-blue-500" />
                                <span>Connect Dropbox Folder</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Accordion 3: FAQ Help Topics */}
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
                  <button
                    onClick={() => setDrawerAccordion(drawerAccordion === 'help' ? null : 'help')}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800"
                  >
                    <span className="flex items-center gap-2">💡 SIMPLE PICTURE FAQS</span>
                    {drawerAccordion === 'help' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {drawerAccordion === 'help' && (
                    <div className="p-3 bg-white dark:bg-slate-900 space-y-3">
                      <div className="text-[11px] space-y-2">
                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                          <p className="font-bold text-slate-800 dark:text-slate-200">📐 What is the best size?</p>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">Use square photos that are at least 1024 pixels wide so customers can zoom in.</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                          <p className="font-bold text-slate-800 dark:text-slate-200">📂 Webp, PNG, or JPG?</p>
                          <p className="text-slate-500 dark:text-slate-400 mt-0.5">Use <strong>WEBP</strong> to make your shop load super fast, and <strong>PNG</strong> if you need empty backgrounds.</p>
                        </div>
                        <button
                          onClick={() => { setActiveTab('help'); setIsDrawerOpen(false); }}
                          className="w-full text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg mt-2 text-[11px] cursor-pointer"
                        >
                          Open Full Help Center & Q&A
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <p className="text-[9px] text-slate-400 text-center font-medium">Simple Shop Photo Fixer v2.0 • Bicknell MVP Partner</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Banner Area (Connected store domain) */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-row items-center justify-between gap-4">
          
          {/* Hamburger Icon & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              title="Open Options Menu"
              className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0">
                <Camera className="w-5.5 h-5.5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] rounded-md uppercase tracking-wider shrink-0">
                    Partner App
                  </span>
                  <span 
                    style={{ height: "15px", marginLeft: "40px" }}
                    className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:flex items-center gap-1"
                  >
                    <Cloud className="w-3 h-3 text-sky-400 animate-bounce" /> Free Cloud Link Provisioning
                  </span>
                </div>
                <h1 
                  style={{
                    textAlign: "center",
                    fontSize: "19px",
                    fontFamily: "Google Sans Flex",
                    paddingLeft: "0px",
                    marginLeft: "123px",
                    marginTop: "7px"
                  }}
                  className="text-lg font-extrabold text-slate-950 dark:text-white leading-none mt-1"
                >
                  Simple Shop Photo Fixer
                </h1>
              </div>
            </div>
          </div>

          {/* Connected Domain Action Bar & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <div className="hidden md:flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl">
              <form onSubmit={handleConnectStore} className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2">
                  <Store className="w-4 h-4 text-indigo-500" />
                  <input
                    type="text"
                    value={tempDomain}
                    onChange={(e) => setTempDomain(e.target.value)}
                    placeholder="store-domain.myshopify.com"
                    className="bg-transparent text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none w-44 font-mono border-b border-transparent hover:border-slate-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isConnectingStore}
                  className="bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer inline-flex items-center gap-1 shadow-xs"
                >
                  {isConnectingStore ? (
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                  ) : (
                    "Sync Domain"
                  )}
                </button>
              </form>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-800" />
              <button 
                onClick={handleToggleShopify}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 px-2 cursor-pointer bg-transparent border-none focus:outline-none"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${storeConnected ? "bg-emerald-500 animate-ping" : "bg-slate-300"}`} />
                {storeConnected ? "Connected" : "Offline"}
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Main App Layout Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Connection status card overlay if not synced */}
        {!storeConnected && (
          <div className="mb-6 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm animate-fadeIn">
            <ShieldAlert className="w-10 h-10 text-amber-500 shrink-0" />
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-bold text-amber-900 text-sm">Shopify Connection is Offline</h3>
              <p className="text-xs text-amber-700">Open the Hamburger menu in the top-left or use the header bar to sync your store catalog.</p>
            </div>
          </div>
        )}

        {/* Global tab toggles */}
        <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/60">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? "bg-white text-slate-950 border border-slate-200/50 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
            Check Pictures
          </button>
          
          <button
            onClick={() => {
              if (products.length > 0 && !selectedProduct) {
                setSelectedProduct(products[0]);
              }
              setActiveTab('workshop');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'workshop'
                ? "bg-white text-slate-950 border border-slate-200/50 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Wand2 className="w-4 h-4 text-indigo-500" />
            Fix Pictures
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'library'
                ? "bg-white text-slate-950 dark:bg-slate-900 dark:text-white border border-slate-200/50 dark:border-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Link2 className="w-4 h-4 text-emerald-500" />
            Saved Images
          </button>

          <button
            onClick={() => setActiveTab('csv-studio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'csv-studio'
                ? "bg-white text-slate-950 dark:bg-slate-900 dark:text-white border border-slate-200/50 dark:border-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
            Bulk CSV Edit
          </button>

          <button
            onClick={() => setActiveTab('help')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'help'
                ? "bg-white text-slate-950 dark:bg-slate-900 dark:text-white border border-slate-200/50 dark:border-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-sky-500" />
            Help & FAQs
          </button>
        </div>

        {/* Core Loading skeleton screen */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-xs">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 font-bold">Checking all listing photos on your shop...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-50 border border-red-200 text-red-700 rounded-2xl max-w-lg mx-auto">
            <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-base">Backend Connection Offline</h3>
            <p className="text-xs mt-2">{error}</p>
            <button 
              onClick={fetchProducts} 
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Try Reconnecting
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'diagnostics' && (
                <div className="space-y-6">
                  {/* Summary Metric cards */}
                  <DashboardStats 
                    stats={stats} 
                    onNavigateToWorkshop={() => {
                      const badProduct = products.find(p => p.status !== 'optimized');
                      if (badProduct) {
                        setSelectedProduct(badProduct);
                      } else if (products.length > 0) {
                        setSelectedProduct(products[0]);
                      }
                      setActiveTab('workshop');
                    }} 
                  />

                  {/* Complete audited catalog list */}
                  <ProductList 
                    products={products} 
                    onSelectProduct={handleLaunchWorkshop}
                    onAddProduct={handleAddProduct}
                    onResetStore={handleResetStore}
                    isLoading={loading}
                  />
                </div>
              )}

              {activeTab === 'workshop' && (
                selectedProduct ? (
                  <Workshop 
                    product={selectedProduct}
                    onSaveOptimizedImage={handleSaveOptimizedImage}
                    onRefreshProductScan={handleRefreshProductScan}
                    allProducts={products}
                    onRefreshInventory={fetchProducts}
                  />
                ) : (
                  <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                    <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700 text-sm">Select a product to edit</h3>
                    <p className="text-xs text-slate-500 mt-1">Please select an item from the check pictures checklist to begin optimizing backgrounds.</p>
                    <button
                      onClick={() => setActiveTab('diagnostics')}
                      className="mt-4 inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Browse Pictures Checklist
                    </button>
                  </div>
                )
              )}

              {activeTab === 'library' && (
                <AssetLibrary products={products} />
              )}

              {activeTab === 'csv-studio' && (
                <CsvDiagnosticStudio />
              )}

              {activeTab === 'help' && (
                <HelpCenter />
              )}
            </motion.div>
          </AnimatePresence>
        )}

      </main>

      {/* Humble Footer */}
      <footer className="mt-auto py-8 bg-white border-t border-slate-200 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Shopify Image Optimizer Partner Applet. Powered by full-stack cloud containers.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Developer Documentation</span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Privacy Policy</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
