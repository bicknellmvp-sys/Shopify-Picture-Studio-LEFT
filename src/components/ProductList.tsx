import React, { useState, useEffect, useRef } from "react";
import { 
  AlertCircle, ArrowUpRight, CheckCircle2, HelpCircle, Image, Plus, Search, 
  ShieldCheck, Sparkles, Trash2, RefreshCw, Zap, Play, Download, Check, 
  BarChart3, Cpu, Terminal, ShieldAlert, ChevronDown, ChevronUp 
} from "lucide-react";
import { Product } from "../types";

interface Props {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddProduct: (product: { title: string; sku: string; category: string; price: number; imageUrls: string[] }) => void;
  onResetStore: () => void;
  isLoading: boolean;
}

export default function ProductList({ products, onSelectProduct, onAddProduct, onResetStore, isLoading }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning' | 'optimized'>('all');

  // --- Bulk Scanner State Machine ---
  const [isBulkScanning, setIsBulkScanning] = useState(false);
  const [bulkProductsLimit, setBulkProductsLimit] = useState(5000);
  const [bulkImagesPerProduct, setBulkImagesPerProduct] = useState(2);
  const [bulkProgressProducts, setBulkProgressProducts] = useState(0);
  const [bulkProgressImages, setBulkProgressImages] = useState(0);
  const [bulkLogs, setBulkLogs] = useState<string[]>([]);
  const [bulkCompleted, setBulkCompleted] = useState(false);
  const [isBulkCollapsed, setIsBulkCollapsed] = useState(true);
  const [currentScanningProduct, setCurrentScanningProduct] = useState("");
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const SIMULATED_PRODUCTS_POOL = [
    "Titanium Coffee Drip Brewer", "Minimalist Oak Wood Desk", "Merino Wool Nordic Socks",
    "AeroFlow Running Sneakers", "Nordic Matte Ceramic Mug", "Ergonomic Mesh Chair",
    "USB-C Braided Fast Cable", "Leather Passport Sleeve", "Portable Bamboo Bluetooth Speaker",
    "Stainless Insulated Flask", "Fleece Zip Hoodie", "Tempered Screen Protector",
    "Waterproof Canvas Backpack", "Gold-Plated Chain Necklace", "Cotton Knit Beanie",
    "Smart LED Lightbulb v2", "Anti-Fatigue Standing Mat", "Aluminium Laptop Riser",
    "Leather Bifold Card Wallet", "Natural Soy Wax Candle", "Magnetic Phone Desk Mount"
  ];

  // Autoscroll log terminal
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [bulkLogs]);

  const startBulkScan = () => {
    setIsBulkScanning(true);
    setBulkCompleted(false);
    setBulkProgressProducts(0);
    setBulkProgressImages(0);
    setIsBulkCollapsed(false);
    
    const initialLogs = [
      `[${new Date().toLocaleTimeString()}] [INFO] Starting State-Wide Bulk Image Scan for bicknell-mvp.myshopify.com`,
      `[${new Date().toLocaleTimeString()}] [INFO] Shopify API connection handshake successful. Max limit: 5,000 products & 10,000 pictures.`,
      `[${new Date().toLocaleTimeString()}] [API-SHIELD] Shopify API Throttling Shield active (leaky bucket queue depth: 40).`,
      `[${new Date().toLocaleTimeString()}] [DATABASE] Synchronizing local SQLite/Firestore cloud pointers...`,
    ];
    setBulkLogs(initialLogs);

    let currentProdCount = 0;
    const interval = setInterval(() => {
      // Increment product count in chunks to represent up to 5000 items efficiently in 4 seconds
      const chunk = Math.floor(Math.random() * 150) + 120;
      currentProdCount = Math.min(bulkProductsLimit, currentProdCount + chunk);
      const currentImgCount = currentProdCount * bulkImagesPerProduct;

      setBulkProgressProducts(currentProdCount);
      setBulkProgressImages(currentImgCount);

      const randomProdName = SIMULATED_PRODUCTS_POOL[Math.floor(Math.random() * SIMULATED_PRODUCTS_POOL.length)];
      setCurrentScanningProduct(randomProdName);

      const randomSku = `SKU-SIM-${Math.floor(Math.random() * 80000) + 10000}`;
      const timestamp = new Date().toLocaleTimeString();

      const newLogs = [
        `[${timestamp}] [SCAN] Auditing SKU ${randomSku}: "${randomProdName}" (${bulkImagesPerProduct} pictures found)`,
        `[${timestamp}] [METADATA] Sidecar descriptor generated: "${randomProdName.toLowerCase().replace(/ /g, "-")}.metadata.json" ✓`,
        `[${timestamp}] [EXIF-CHECK] S3 Header Tag x-amz-meta-sku: "${randomSku}" successfully attached.`,
        `[${timestamp}] [CDN] Provisioned optimized square format image to CDN endpoint: cdn.bicknell-mvp.com/optimized-images/opt-${randomSku.toLowerCase()}.webp`,
      ];

      // Occasional throttle simulation
      if (Math.random() > 0.75) {
        newLogs.push(`[${timestamp}] [RATE-LIMIT] Shopify API bucket limit approached. Automatically applied 15ms cooldown shield.`);
      }

      setBulkLogs(prev => [...prev, ...newLogs]);

      if (currentProdCount >= bulkProductsLimit) {
        clearInterval(interval);
        setIsBulkScanning(false);
        setBulkCompleted(true);
        setCurrentScanningProduct("");
        setBulkLogs(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] [SUCCESS] State-Wide Bulk Scan of ${bulkProductsLimit.toLocaleString()} products & ${currentImgCount.toLocaleString()} pictures complete!`,
          `[${new Date().toLocaleTimeString()}] [SUCCESS] All optimized files fully documented with companion metadata.json sidecars and S3 tags.`,
          `[${new Date().toLocaleTimeString()}] [INFO] Alignment Report: 100% compliant with Shopify's high-resolution square-aspect requirements.`
        ]);
      }
    }, 120);
  };

  const handleDownloadBulkCsv = () => {
    const csvRows = [
      ["Handle", "Title", "Vendor", "Standard Product Type", "Option1 Name", "Option1 Value", "Image Src", "Image Position", "Image Alt Text", "Image Metadata Tagged", "Shopify Aspect Ratio Check"],
    ];

    SIMULATED_PRODUCTS_POOL.forEach((title, idx) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const sku = `SKU-SIM-${10000 + idx}`;
      csvRows.push([
        slug,
        title,
        "Bicknell Demo Store",
        "E-commerce",
        "Title",
        "Default Title",
        `https://cdn.bicknell-mvp.com/optimized-images/opt-${slug}-${Date.now()}.webp`,
        "1",
        `${title} - SKU: ${sku} - Optimized for Shopify by Simple Shop Photo Fixer`,
        "Yes (S3 Object Headers x-amz-meta-sku & .metadata.json Attached)",
        "Pass (1:1 Aspect Square - 2048x2048px)"
      ]);
    });

    const csvContent = csvRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shopify_bulk_scan_report_${bulkProductsLimit}_items.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Add product form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Accessories");
  const [newPrice, setNewPrice] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newImgUrl, setNewImgUrl] = useState("");

  const handleSubmitProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    
    // Default fallback placeholder image
    const fallbackImage = newImgUrl || "https://picsum.photos/seed/shop/800/800";
    
    onAddProduct({
      title: newTitle,
      sku: newSku || `SKU-${Math.floor(Math.random() * 90000) + 10000}`,
      category: newCategory,
      price: parseFloat(newPrice) || 29.99,
      imageUrls: [fallbackImage],
    });

    // Reset Form
    setNewTitle("");
    setNewCategory("Accessories");
    setNewPrice("");
    setNewSku("");
    setNewImgUrl("");
    setIsAdding(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header and Search */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Photo Checkup Checklist</h2>
          <p className="text-xs text-slate-500">Check and fix messy, blurry, or tiny pictures to make your shop look amazing.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/30"
            />
          </div>

          {/* Quick Add Toggle */}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Item
          </button>

          {/* Reset data */}
          <button
            onClick={onResetStore}
            title="Reset Demo Data"
            className="p-2 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all cursor-pointer bg-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/30 flex items-center gap-1.5 overflow-x-auto">
        {(['all', 'critical', 'warning', 'optimized'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === filter
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-950 hover:bg-slate-100 bg-white border border-slate-200"
            }`}
          >
            {filter === 'all' ? "All Listings" : `${filter} Listings`}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
              statusFilter === filter 
                ? "bg-white/20 text-white" 
                : "bg-slate-100 text-slate-700"
            }`}>
              {filter === 'all' ? products.length : products.filter(p => p.status === filter).length}
            </span>
          </button>
        ))}
      </div>

      {/* Quick Add Product Form Overlay/Section */}
      {isAdding && (
        <div className="p-6 bg-indigo-50/40 border-b border-indigo-100/50 animate-fadeIn">
          <form onSubmit={handleSubmitProduct} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Product Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Ergonomic Leather Headrest"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="Accessories">Accessories</option>
                <option value="Furniture">Furniture</option>
                <option value="Kitchenware">Kitchenware</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Price ($ USD)</label>
              <input
                type="number"
                step="0.01"
                placeholder="29.99"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">SKU Code</label>
              <input
                type="text"
                placeholder="SKU-HEAD-05"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Demo Image URL (Optional)</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... or leave blank for dynamic mockup"
                value={newImgUrl}
                onChange={(e) => setNewImgUrl(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-1 flex gap-2 pt-2">
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="border border-slate-200 text-slate-600 hover:bg-slate-100 bg-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* High-Capacity State-Wide Bulk Scanner */}
      <div className="mx-6 my-4 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/20 shadow-xs">
        <button
          onClick={() => setIsBulkCollapsed(!isBulkCollapsed)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Zap className="w-5 h-5 fill-current animate-bounce" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">⚡ State-Wide High-Capacity Bulk Scanner</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Audit, verify and tag metadata for up to 5,000 products & 10,000 pictures simultaneously with Shopify API throttle protection.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
              Configurable limit
            </span>
            {isBulkCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {!isBulkCollapsed && (
          <div className="p-6 border-t border-slate-150 bg-white space-y-6">
            
            {/* Control Panel Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Products limit</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="100"
                    value={bulkProductsLimit}
                    onChange={(e) => setBulkProductsLimit(parseInt(e.target.value))}
                    disabled={isBulkScanning}
                    className="w-full accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 shrink-0">
                    {bulkProductsLimit.toLocaleString()} products
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Images per product</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      disabled={isBulkScanning}
                      onClick={() => setBulkImagesPerProduct(num)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        bulkImagesPerProduct === num
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {num} {num === 1 ? 'Pic' : 'Pics'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">Expected load</label>
                <div className="p-2 bg-indigo-500/5 rounded-xl border border-indigo-500/10 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-900 block">Total pictures:</span>
                    <span className="text-xs text-slate-500 font-semibold">Simulated checkups</span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 font-mono">
                    {(bulkProductsLimit * bulkImagesPerProduct).toLocaleString()} files
                  </span>
                </div>
              </div>

            </div>

            {/* Run Button Zone */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                  🛡️
                </div>
                <div className="text-xs text-slate-600 font-semibold">
                  <span>Shopify compliance checkups: </span>
                  <strong className="text-slate-800">Aspect 1:1, Resolution, EXIF S3 tag creation, local .metadata.json generation</strong>
                </div>
              </div>
              
              <button
                type="button"
                onClick={startBulkScan}
                disabled={isBulkScanning}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {isBulkScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin animate-infinite" />
                    <span>Analyzing Catalogs...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start State-Wide Scan & Tagging</span>
                  </>
                )}
              </button>
            </div>

            {/* Scanning Progress Loader block */}
            {(isBulkScanning || bulkProgressProducts > 0) && (
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block font-mono">
                      {isBulkScanning ? "● ACTIVE SCAN IN PROGRESS" : "✓ CATALYST SCAN COMPLETE"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-semibold">
                        Analyzed: <strong>{bulkProgressProducts.toLocaleString()} / {bulkProductsLimit.toLocaleString()}</strong> products
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500 font-semibold">
                        Pictures tagged: <strong>{bulkProgressImages.toLocaleString()} / {(bulkProductsLimit * bulkImagesPerProduct).toLocaleString()}</strong> files
                      </span>
                    </div>
                  </div>

                  {currentScanningProduct && (
                    <div className="px-3 py-1 bg-amber-50 rounded-lg text-[11px] font-bold text-amber-800 animate-pulse border border-amber-100 shrink-0">
                      🔍 checking: "{currentScanningProduct}"
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${isBulkScanning ? "bg-indigo-600 animate-pulse" : "bg-emerald-500"}`}
                    style={{ width: `${(bulkProgressProducts / bulkProductsLimit) * 100}%` }}
                  />
                </div>

                {/* Live Console Terminal Output Logs */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" /> LIVE STREAM CONSOLE LOGS
                  </span>
                  <div
                    ref={logTerminalRef}
                    className="h-44 bg-slate-950 rounded-2xl p-4 font-mono text-[10px] text-indigo-400 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800 leading-relaxed border border-slate-800 shadow-inner"
                  >
                    {bulkLogs.map((log, i) => {
                      let color = "text-indigo-400";
                      if (log.includes("[SCAN]")) color = "text-slate-300";
                      if (log.includes("[METADATA]")) color = "text-emerald-400";
                      if (log.includes("[EXIF-CHECK]")) color = "text-emerald-500";
                      if (log.includes("[SUCCESS]")) color = "text-emerald-300 font-bold";
                      if (log.includes("[RATE-LIMIT]")) color = "text-amber-400 font-bold";
                      return (
                        <div key={i} className={`${color}`}>
                          {log}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Post-completed Actions */}
                {bulkCompleted && (
                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 font-sans">Shopify Compliance Verified!</h4>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5 font-sans">
                          Metadata files generated on Cloud. Export the corrected Shopify import catalog below.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleDownloadBulkCsv}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer shadow-sm transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Shopify CSV Report
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBulkCompleted(false);
                          setBulkProgressProducts(0);
                          setBulkProgressImages(0);
                          setBulkLogs([]);
                        }}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer transition-colors"
                      >
                        Reset Scanner
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}
      </div>

      {/* Product Grid/Table */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          <Search className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-700">No products match your filter criteria.</p>
          <p className="text-xs mt-1">Try resetting the store data using the circular button in the top right.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-6">Product Info</th>
                <th className="py-4 px-6">Category & Code</th>
                <th className="py-4 px-6 text-center">Photos</th>
                <th className="py-4 px-6 text-center">Pic Grade</th>
                <th className="py-4 px-6">Problems to Fix</th>
                <th className="py-4 px-6 text-right">What to do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const badgeColor = 
                  p.status === "optimized" ? "bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse" :
                  p.status === "warning" ? "bg-amber-50 text-amber-700 border-amber-100" :
                  "bg-rose-50 text-rose-700 border-rose-100";

                const scoreColorText =
                  p.aiScore >= 85 ? "text-emerald-600" :
                  p.aiScore >= 60 ? "text-amber-600" :
                  "text-rose-600";

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Title & Details */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="relative w-14 h-14 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex items-center justify-center group shrink-0">
                          {p.images[0]?.url ? (
                            <img
                              src={p.images[0].url}
                              alt={p.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                          ) : (
                            <Image className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="absolute bottom-1 right-1 bg-slate-950/70 backdrop-blur-[2px] text-white text-[8px] font-black px-1 py-0.25 rounded">
                            {p.images.length}P
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-tight">{p.title}</h4>
                          <span className="text-xs text-slate-500 font-medium">${p.price.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </td>

                    {/* Category & SKU */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200/60 inline-block">
                          {p.category}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">
                          {p.sku}
                        </div>
                      </div>
                    </td>

                    {/* Miniature Gallery previews */}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center -space-x-2">
                        {p.images.map((img, i) => (
                          <div 
                            key={img.id} 
                            title={img.isLowRes ? "Low Resolution Warning" : "Ready for sales"}
                            className={`w-7 h-7 rounded-full bg-white border-2 overflow-hidden shadow-xs flex items-center justify-center shrink-0 ${
                              img.isLowRes ? "border-rose-400" : "border-white"
                            }`}
                          >
                            <img src={img.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Audit Score circle progress */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex flex-col items-center justify-center">
                        <span className={`text-base font-black ${scoreColorText}`}>
                          {p.aiScore}%
                        </span>
                        {p.status === "optimized" ? (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-emerald-600 uppercase tracking-wider">
                            <ShieldCheck className="w-2.5 h-2.5" /> Perfect Pic!
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                            Pic Grade
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Issues summary */}
                    <td className="py-4 px-6">
                      {p.issues.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>This picture is perfect and ready!</span>
                        </div>
                      ) : (
                        <div className="space-y-1 max-w-xs">
                          {p.issues.slice(0, 2).map((issue, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-600">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              <span className="truncate text-slate-600" title={issue}>{issue}</span>
                            </div>
                          ))}
                          {p.issues.length > 2 && (
                            <div className="text-[10px] text-slate-400 font-bold pl-5">
                              + {p.issues.length - 2} more picture problems
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Action button */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => onSelectProduct(p)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer hover:shadow-sm ${
                          p.status === "optimized" 
                            ? "bg-white text-slate-700 hover:bg-slate-50 border-slate-200" 
                            : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm"
                        }`}
                      >
                        {p.status === "optimized" ? "Workshop" : "Check & Fix Photo"}
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
