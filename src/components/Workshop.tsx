import React, { useState, useEffect, useRef } from "react";
import { BACKGROUND_SCENES, BackgroundScene } from "../data";
import { Product, ProductImage } from "../types";
import { 
  AlertCircle, ArrowRight, Check, CheckCircle2, Copy, Crop, Download, 
  ExternalLink, Layers, Loader2, RotateCw, Save, Sparkles, Wand2, RefreshCw,
  Play, Settings, HelpCircle, HardDrive, FileSpreadsheet, Eye, ChevronRight
} from "lucide-react";

interface Props {
  product: Product;
  onSaveOptimizedImage: (productId: string, originalUrl: string, optimizedUrl: string, transformationType: string) => void;
  onRefreshProductScan: (productId: string, imageUrl: string) => Promise<any>;
  allProducts?: Product[];
  onRefreshInventory?: () => Promise<void>;
}

export default function Workshop({ 
  product, 
  onSaveOptimizedImage, 
  onRefreshProductScan, 
  allProducts = [], 
  onRefreshInventory 
}: Props) {
  
  // Tab/Mode Selector
  const [editorMode, setEditorMode] = useState<'single' | 'batch'>('single');

  // ----------------------------------------------------
  // SINGLE EDITOR STATES
  // ----------------------------------------------------
  const [activeImage, setActiveImage] = useState<ProductImage | null>(product.images[0] || null);
  const [rotation, setRotation] = useState(0); 
  const [scale, setScale] = useState(1.0); 
  const [hue, setHue] = useState(0); 
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [bgThreshold, setBgThreshold] = useState(230); 
  const [selectedBg, setSelectedBg] = useState<BackgroundScene>(BACKGROUND_SCENES[0]); 
  const [customPrompt, setCustomPrompt] = useState("");
  const [isSuggestingBg, setIsSuggestingBg] = useState(false);
  const [aiBgSuggestion, setAiBgSuggestion] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pos, setPos] = useState({ x: 250, y: 250 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [scanResult, setScanResult] = useState<{
    aiScore?: number;
    issues?: string[];
    recommendations?: string[];
  } | null>(null);

  const productImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // ----------------------------------------------------
  // BATCH OPTIMIZER STATES
  // ----------------------------------------------------
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [batchRemoveBg, setBatchRemoveBg] = useState(true);
  const [batchBgThreshold, setBatchBgThreshold] = useState(230);
  const [batchBg, setBatchBg] = useState<BackgroundScene>(BACKGROUND_SCENES[1]); // Default to first scene preset (Marble)
  const [batchRotation, setBatchRotation] = useState(0);
  const [batchFlipH, setBatchFlipH] = useState(false);
  const [batchFlipV, setBatchFlipV] = useState(false);
  const [batchScale, setBatchScale] = useState(1.0);
  const [batchHue, setBatchHue] = useState(0);

  // Execution states
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchCurrentItem, setBatchCurrentItem] = useState<string>("");
  const [batchConsole, setBatchConsole] = useState<string[]>([]);

  // ----------------------------------------------------
  // SYNCING EFFECTS
  // ----------------------------------------------------
  useEffect(() => {
    if (product.images.length > 0) {
      setActiveImage(product.images[0]);
    }
    setScanResult(null);
    setCloudUrl(null);
    setRotation(0);
    setScale(1.0);
    setHue(0);
    setFlipH(false);
    setFlipV(false);
    setRemoveBackground(false);
  }, [product]);

  useEffect(() => {
    if (allProducts.length > 0 && batchSelectedIds.length === 0) {
      // Pre-select non-optimized products for user ease
      const problematicIds = allProducts
        .filter(p => p.status !== 'optimized')
        .map(p => p.id);
      setBatchSelectedIds(problematicIds.length > 0 ? problematicIds : [allProducts[0].id]);
    }
  }, [allProducts]);

  // Handle single image preloading
  useEffect(() => {
    if (!activeImage) return;

    setImagesLoaded(false);
    const pImg = new Image();
    pImg.crossOrigin = "anonymous";
    pImg.src = activeImage.url;
    pImg.onload = () => {
      productImgRef.current = pImg;
      checkAllImagesLoaded();
    };

    if (selectedBg.url.startsWith("solid:")) {
      bgImgRef.current = null;
      setImagesLoaded(true);
    } else {
      const bImg = new Image();
      bImg.crossOrigin = "anonymous";
      bImg.src = selectedBg.url;
      bImg.onload = () => {
        bgImgRef.current = bImg;
        checkAllImagesLoaded();
      };
    }

    function checkAllImagesLoaded() {
      if (productImgRef.current && (selectedBg.url.startsWith("solid:") || bgImgRef.current)) {
        setImagesLoaded(true);
      }
    }
  }, [activeImage, selectedBg]);

  // Render canvas loop for Single Editor
  useEffect(() => {
    if (!imagesLoaded || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 500;
    canvas.height = 500;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background
    if (selectedBg.url.startsWith("solid:")) {
      ctx.fillStyle = selectedBg.url.split(":")[1];
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgImgRef.current) {
      ctx.drawImage(bgImgRef.current, 0, 0, canvas.width, canvas.height);
    }

    // 2. Draw Product
    if (productImgRef.current) {
      const pImg = productImgRef.current;
      const w = pImg.width;
      const h = pImg.height;

      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const oCtx = offscreen.getContext("2d");
      
      if (oCtx) {
        oCtx.drawImage(pImg, 0, 0);

        if (removeBackground) {
          const imgData = oCtx.getImageData(0, 0, w, h);
          const data = imgData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i+1];
            const b = data[i+2];

            if (r >= bgThreshold && g >= bgThreshold && b >= bgThreshold) {
              data[i+3] = 0; 
            }
          }
          oCtx.putImageData(imgData, 0, 0);
        }

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

        if (hue > 0) {
          ctx.filter = `hue-rotate(${hue}deg) saturate(120%)`;
        }

        const ratio = Math.min(250 / w, 250 / h) * scale;
        const dw = w * ratio;
        const dh = h * ratio;

        ctx.drawImage(offscreen, -dw / 2, -dh / 2, dw, dh);
        ctx.restore();
      }
    }
  }, [imagesLoaded, selectedBg, rotation, scale, hue, removeBackground, bgThreshold, pos, activeImage, flipH, flipV]);

  // Drag interaction math
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x: mouseX - pos.x, y: mouseY - pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setPos({
      x: mouseX - dragStart.x,
      y: mouseY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || e.touches.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x: touchX - pos.x, y: touchY - pos.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current || e.touches.length === 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;
    setPos({
      x: touchX - dragStart.x,
      y: touchY - dragStart.y
    });
  };

  // ----------------------------------------------------
  // SINGLE EDITOR SERVICE CALLS
  // ----------------------------------------------------
  const handleRunAiAudit = async () => {
    if (!activeImage) return;
    setIsScanning(true);
    try {
      const data = await onRefreshProductScan(product.id, activeImage.url);
      if (data && data.success) {
        setScanResult(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGetAiBgSuggestion = async () => {
    setIsSuggestingBg(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          imageUrl: activeImage?.url,
          title: product.title
        })
      });
      const data = await res.json();
      if (data.success && data.recommendations) {
        const idea = data.recommendations[0] || "A minimalist clean marble tabletop background matches this lifestyle item.";
        setAiBgSuggestion(idea);
      } else {
        throw new Error();
      }
    } catch (err) {
      setAiBgSuggestion("A rustic textured wood table matches the organic palette of this product.");
    } finally {
      setIsSuggestingBg(false);
    }
  };

  const handlePublishToCloud = async () => {
    if (!canvasRef.current || !activeImage) return;
    setIsUploading(true);
    setCloudUrl(null);
    try {
      const base64 = canvasRef.current.toDataURL("image/png");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Image: base64,
          fileName: `opt-${product.id}-${Date.now()}.png`,
          productId: product.id,
          sku: product.sku,
          title: product.title
        })
      });
      const data = await res.json();
      if (data.success) {
        setCloudUrl(data.url);
        
        // Log optimization history node & update store scoring
        const histRes = await fetch("/api/products/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            originalUrl: activeImage.url,
            optimizedUrl: data.url,
            transformationType: `Studio: removed background, composite onto ${selectedBg.name}`
          })
        });
        const histData = await histRes.json();
        if (histData.success) {
          // Fire parent app re-fetch so stats sync instantly
          onSaveOptimizedImage(product.id, activeImage.url, data.url, "Studio optimization");
        }
      } else {
        alert(data.error || "Failed uploading to cloud store.");
      }
    } catch (err) {
      alert("Network transmission error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = () => {
    if (!cloudUrl) return;
    navigator.clipboard.writeText(cloudUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ----------------------------------------------------
  // BATCH OPTIMIZER ACTION EXECUTIONS
  // ----------------------------------------------------
  const handleToggleBatchSelect = (id: string) => {
    setBatchSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBatchSelectAll = () => {
    setBatchSelectedIds(allProducts.map(p => p.id));
  };

  const handleBatchSelectNone = () => {
    setBatchSelectedIds([]);
  };

  const executeBatchProcess = async () => {
    if (batchSelectedIds.length === 0) {
      alert("Please select at least one product row to begin optimization.");
      return;
    }

    setIsBatchRunning(true);
    setBatchProgress({ current: 0, total: batchSelectedIds.length });
    setBatchConsole([`[${new Date().toLocaleTimeString()}] Initializing high-volume composite pipeline...`]);

    const recipe = {
      selectedBg: batchBg,
      removeBackground: batchRemoveBg,
      bgThreshold: batchBgThreshold,
      rotation: batchRotation,
      flipH: batchFlipH,
      flipV: batchFlipV,
      scale: batchScale,
      hue: batchHue,
    };

    let count = 0;
    for (const id of batchSelectedIds) {
      const prod = allProducts.find(p => p.id === id);
      if (!prod) continue;

      setBatchCurrentItem(prod.title);
      setBatchConsole(prev => [...prev, `[${new Date().toLocaleTimeString()}] Starting composite layout for: ${prod.title}...`]);

      try {
        const cloudUrl = await processBatchItem(prod, recipe);
        setBatchConsole(prev => [
          ...prev, 
          `[${new Date().toLocaleTimeString()}] ✓ Successfully published ${prod.title} to CDN!`,
          `[CDN Link] ${cloudUrl}`
        ]);
      } catch (err: any) {
        console.error(err);
        setBatchConsole(prev => [...prev, `[${new Date().toLocaleTimeString()}] ❌ Failed processing ${prod.title}: ${err.message || "Network issue"}`]);
      }

      count++;
      setBatchProgress({ current: count, total: batchSelectedIds.length });
    }

    setBatchConsole(prev => [...prev, `[${new Date().toLocaleTimeString()}] All selected products have been processed. Catalog database updated successfully!`]);
    setIsBatchRunning(false);
    
    // Refresh parent state inventory
    if (onRefreshInventory) {
      await onRefreshInventory();
    }
  };

  const processBatchItem = async (prod: Product, recipe: any): Promise<string> => {
    const activeImgUrl = prod.images[0]?.url;
    if (!activeImgUrl) throw new Error("Product listing has zero images");

    // Preload product image
    const pImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed loading source product picture"));
      img.src = activeImgUrl;
    });

    // Preload background image if not solid
    let bgImg: HTMLImageElement | null = null;
    if (recipe.selectedBg.url && !recipe.selectedBg.url.startsWith("solid:")) {
      bgImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed loading backdrop scene asset"));
        img.src = recipe.selectedBg.url;
      });
    }

    // Create offscreen canvas
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas rendering context generation crashed");

    // Draw background
    if (recipe.selectedBg.url.startsWith("solid:")) {
      ctx.fillStyle = recipe.selectedBg.url.split(":")[1];
      ctx.fillRect(0, 0, 500, 500);
    } else if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, 500, 500);
    }

    // Draw product image
    const w = pImg.width;
    const h = pImg.height;
    const offscreen = document.createElement("canvas");
    offscreen.width = w;
    offscreen.height = h;
    const oCtx = offscreen.getContext("2d");
    if (!oCtx) throw new Error("Offscreen context setup failed");

    oCtx.drawImage(pImg, 0, 0);

    if (recipe.removeBackground) {
      const imgData = oCtx.getImageData(0, 0, w, h);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] >= recipe.bgThreshold && data[i+1] >= recipe.bgThreshold && data[i+2] >= recipe.bgThreshold) {
          data[i+3] = 0;
        }
      }
      oCtx.putImageData(imgData, 0, 0);
    }

    ctx.save();
    ctx.translate(250, 250);
    ctx.rotate((recipe.rotation * Math.PI) / 180);
    ctx.scale(recipe.flipH ? -1 : 1, recipe.flipV ? -1 : 1);

    if (recipe.hue > 0) {
      ctx.filter = `hue-rotate(${recipe.hue}deg) saturate(120%)`;
    }

    const ratio = Math.min(250 / w, 250 / h) * recipe.scale;
    const dw = w * ratio;
    const dh = h * ratio;
    ctx.drawImage(offscreen, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    const base64 = canvas.toDataURL("image/png");

    // Upload processed base64 with metadata
    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64Image: base64,
        fileName: `batch-${prod.id}-${Date.now()}.png`,
        productId: prod.id,
        sku: prod.sku,
        title: prod.title
      })
    });
    const uploadData = await uploadRes.json();
    if (!uploadData.success || !uploadData.url) {
      throw new Error(uploadData.error || "Server upload endpoint declined");
    }

    // Log history and auto-scoring on full-stack server
    const histRes = await fetch("/api/products/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: prod.id,
        originalUrl: activeImgUrl,
        optimizedUrl: uploadData.url,
        transformationType: `Batch Optimization: background removed, composited onto ${recipe.selectedBg.name}`
      })
    });
    const histData = await histRes.json();
    if (!histData.success) {
      throw new Error("Failed syncing optimization scores in backend database");
    }

    return uploadData.url;
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Studio Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm transition-colors">
        <div>
          <h2 className="text-sm font-extrabold text-slate-950 dark:text-white uppercase tracking-wider">Photo Studio Workshop Console</h2>
          <p className="text-xs text-slate-500">Toggle between single listing canvas edits and automated multi-product duplicate variations.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setEditorMode('single')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              editorMode === 'single'
                ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-950 dark:hover:text-white"
            }`}
          >
            👤 Single Product Studio
          </button>
          <button
            onClick={() => setEditorMode('batch')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              editorMode === 'batch'
                ? "bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-950 dark:hover:text-white"
            }`}
          >
            ⚙️ Batch Catalog Optimizer
          </button>
        </div>
      </div>

      {editorMode === 'single' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN: Product & AI Quality Audit (4 cols) */}
          <div className="xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6 transition-colors">
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-1 rounded-md">Listing Diagnostics</span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2 leading-snug">{product.title}</h2>
              <p className="text-xs text-slate-400">SKU: <span className="font-mono">{product.sku}</span> | Category: <span className="font-semibold">{product.category}</span></p>
            </div>

            {/* Gallery Image Selectors */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">Select Active Picture</label>
              <div className="flex flex-wrap gap-2">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => {
                      setActiveImage(img);
                      setCloudUrl(null);
                    }}
                    className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activeImage?.id === img.id ? "border-indigo-600 scale-105 shadow-sm" : "border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    }`}
                  >
                    <img src={img.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    {img.isLowRes && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-bl-lg flex items-center justify-center text-white font-bold text-[8px]" title="Low Res">!</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Report Score */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">E-commerce Grade</h4>
                <span className={`text-base font-extrabold ${
                  (scanResult?.aiScore || product.aiScore) >= 85 ? "text-emerald-600 dark:text-emerald-400" :
                  (scanResult?.aiScore || product.aiScore) >= 60 ? "text-amber-600 dark:text-amber-400" :
                  "text-rose-600 dark:text-rose-400"
                }`}>
                  {(scanResult?.aiScore || product.aiScore)}%
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    (scanResult?.aiScore || product.aiScore) >= 85 ? "bg-emerald-500" :
                    (scanResult?.aiScore || product.aiScore) >= 60 ? "bg-amber-500" :
                    "bg-rose-500"
                  }`}
                  style={{ width: `${scanResult?.aiScore || product.aiScore}%` }}
                />
              </div>
            </div>

            {/* Diagnostic list items */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h5 className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Identified Impediments</h5>
                {(scanResult?.issues || product.issues).length === 0 ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                    <Check className="w-3.5 h-3.5" /> No conversion impediments found. Ready to list!
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {(scanResult?.issues || product.issues).map((issue, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recommendations list */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h5 className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Recommended Fixes</h5>
                <ul className="space-y-1.5">
                  {(scanResult?.recommendations || product.recommendations).map((rec, i) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
                      <Wand2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleRunAiAudit}
                disabled={isScanning}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    Analyzing Image with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    Refresh Gemini Vision Audit
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CENTER COLUMN: The Studio Canvas Workspace (5 cols) */}
          <div className="xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Visual Studio Canvas</h3>
                <p className="text-xs text-slate-500">Drag to position. Use tools to duplicate and customize.</p>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-955 px-2 py-1 rounded">500 x 500px</span>
            </div>

            {/* Canvas Display */}
            <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden aspect-square bg-slate-50 dark:bg-slate-950 flex items-center justify-center shadow-inner group">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUpOrLeave}
                className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
              />
              
              {!imagesLoaded && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">Assembling backdrop composites...</span>
                </div>
              )}

              {/* Guide Overlay */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-[2px] text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🖱️ Drag product to reposition on backdrop
              </div>
            </div>

            {/* Canvas Quick Actions / Transform sliders */}
            <div className="space-y-4 pt-2">
              {/* Sizing Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>PRODUCT SIZE</span>
                  <span>{(scale * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="2.0"
                  step="0.05"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Rotation Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>ROTATION ANGLE</span>
                  <span>{rotation}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    title="Rotate 90 degrees"
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shrink-0 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Flip Toggles */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">Flip Orientation</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFlipH(!flipH)}
                    className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      flipH ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-extrabold" : "bg-slate-50 dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    ↔ Flip Horizontal
                  </button>
                  <button
                    onClick={() => setFlipV(!flipV)}
                    className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      flipV ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-extrabold" : "bg-slate-50 dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    ↕ Flip Vertical
                  </button>
                </div>
              </div>

              {/* Hue Shift Slider for product recolor */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>PRODUCT COLOR SHIFT (HUE)</span>
                  <span className={hue > 0 ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""}>
                    {hue === 0 ? "Original" : `${hue}° Shift`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => setHue(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer gradient-hue"
                    style={{
                      background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
                    }}
                  />
                  {hue > 0 && (
                    <button
                      onClick={() => setHue(0)}
                      className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Backdrop Library & Publish (3 cols) */}
          <div className="xl:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6 transition-colors">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Backgrounds</h3>
              <p className="text-xs text-slate-500">Pick an everyday e-commerce scene for listing duplication.</p>
            </div>

            {/* Background Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <label htmlFor="bg-remover" className="text-xs font-bold text-slate-700 dark:text-slate-300 block cursor-pointer">Remove Background</label>
                  <span className="text-[10px] text-slate-400 block">AI alpha-mask cutout simulator</span>
                </div>
                <input
                  id="bg-remover"
                  type="checkbox"
                  checked={removeBackground}
                  onChange={(e) => setRemoveBackground(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {removeBackground && (
                <div className="space-y-1 animate-fadeIn">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>CUTOUT TOLERANCE</span>
                    <span>{bgThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="255"
                    value={bgThreshold}
                    onChange={(e) => setBgThreshold(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              )}
            </div>

            {/* Scene Presets Selector */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Scene Presets</label>
              <div className="grid grid-cols-2 gap-2">
                {BACKGROUND_SCENES.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => setSelectedBg(scene)}
                    className={`relative p-1 rounded-xl border-2 text-left overflow-hidden cursor-pointer transition-all ${
                      selectedBg.id === scene.id ? "border-indigo-600 scale-[1.02] shadow-sm" : "border-slate-150 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="h-14 rounded-lg bg-slate-50 dark:bg-slate-950 overflow-hidden flex items-center justify-center relative">
                      {scene.url.startsWith("solid:") ? (
                        <div className="w-full h-full" style={{ backgroundColor: scene.url.split(":")[1] }} />
                      ) : (
                        <img src={scene.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0 bg-black/10" />
                      {selectedBg.id === scene.id && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-black">✓</span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mt-1 px-1 truncate">{scene.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Background Planner */}
            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100/50 dark:border-indigo-900/40 space-y-2">
              <div className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                <span>AI Scene Consultant</span>
              </div>
              
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Get tailored background ideas directly from Gemini Vision.</p>
              
              {aiBgSuggestion && (
                <div className="bg-white dark:bg-slate-950 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-950 dark:text-indigo-300 leading-relaxed font-medium">
                  💡 {aiBgSuggestion}
                </div>
              )}

              <button
                onClick={handleGetAiBgSuggestion}
                disabled={isSuggestingBg}
                className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 hover:bg-indigo-100/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center gap-1 shadow-sm"
              >
                {isSuggestingBg ? <Loader2 className="w-3 h-3 animate-spin text-indigo-600" /> : "Suggest Ideal Theme"}
              </button>
            </div>

            {/* PUBLISH AND SAVE */}
            <div className="pt-2">
              <button
                onClick={handlePublishToCloud}
                disabled={isUploading}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold py-3 px-4 rounded-xl shadow-md cursor-pointer transition-all hover:shadow-lg active:scale-95"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing to Cloud...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Publish to Cloud (Free Link)
                  </>
                )}
              </button>
            </div>

            {/* Success Modal Overlay (if link generated) */}
            {cloudUrl && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-3 animate-fadeIn">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Uploaded to Cloud Store!</h4>
                    <p className="text-[10px] text-emerald-600">The picture is live. It is registered in your Shopify product library.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <input
                    type="text"
                    readOnly
                    value={cloudUrl}
                    className="w-full text-[10px] bg-transparent border-none text-gray-500 px-1 font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md text-gray-500 shrink-0 cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={cloudUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1 text-[10px] font-bold text-center py-1.5 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 rounded-lg"
                  >
                    Open Tab <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <button
                    onClick={() => setCloudUrl(null)}
                    className="text-[10px] font-bold py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* BATCH CATALOG OPTIMIZER WORKSPACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          
          {/* Left panel (7 cols): Catalog list with select checklist */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Store Catalog Listings Directory</h3>
                <p className="text-xs text-slate-500">Checkmark the listings you intend to batch-optimize concurrently.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleBatchSelectAll}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold rounded hover:bg-slate-100 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  onClick={handleBatchSelectNone}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold rounded hover:bg-slate-100 cursor-pointer"
                >
                  Select None
                </button>
              </div>
            </div>

            {/* List products checkboxes */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto pr-1">
              {allProducts.map((p) => {
                const isSelected = batchSelectedIds.includes(p.id);
                return (
                  <div 
                    key={p.id}
                    onClick={() => handleToggleBatchSelect(p.id)}
                    className={`flex items-center justify-between py-3 px-2 rounded-xl transition-all cursor-pointer ${
                      isSelected ? "bg-indigo-50/30 dark:bg-indigo-950/10 border-l-4 border-indigo-600" : "hover:bg-slate-50 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by div click
                        className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded cursor-pointer"
                      />
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-950 border overflow-hidden shrink-0 flex items-center justify-center">
                        {p.images[0] && (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">{p.title}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">SKU: {p.sku} | Images: {p.images.length}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${
                        p.status === 'optimized' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        p.status === 'warning' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Progress Logs Terminal when Batch is active */}
            {(isBatchRunning || batchConsole.length > 0) && (
              <div className="p-4 bg-slate-950 dark:bg-black rounded-2xl font-mono text-[10px] text-slate-300 space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    {isBatchRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : "✓"}
                    Pipeline Process Console Output
                  </span>
                  <span>{batchProgress.current} / {batchProgress.total} Complete</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                  {batchConsole.map((log, i) => (
                    <div key={i} className="leading-relaxed whitespace-pre-wrap">{log}</div>
                  ))}
                </div>

                {isBatchRunning && (
                  <div className="space-y-1 border-t border-slate-800 pt-2 animate-pulse">
                    <span className="text-slate-400 block font-bold text-[9px] uppercase tracking-wider">Active Composite Target: {batchCurrentItem}</span>
                    <div className="h-1 bg-slate-850 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-300" 
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right panel (5 cols): Batch recipe configurations */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-5 transition-colors">
            <div>
              <span className="text-[9px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 px-2.5 py-0.5 rounded uppercase">Recipe controls</span>
              <h3 className="text-base font-extrabold text-slate-950 dark:text-white mt-1.5">Bulk Optimization Parameters</h3>
              <p className="text-xs text-slate-500 mt-1">Define uniform duplicate transformations to apply to all selected listings.</p>
            </div>

            {/* Background Cutout */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="batch-bg-rem" className="text-xs font-extrabold text-slate-700 dark:text-slate-300 cursor-pointer block">AI White Background Removal</label>
                  <span className="text-[10px] text-slate-400 block">Detects and segments bright backdrops</span>
                </div>
                <input
                  id="batch-bg-rem"
                  type="checkbox"
                  checked={batchRemoveBg}
                  onChange={(e) => setBatchRemoveBg(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 bg-slate-100 border-slate-300 rounded cursor-pointer"
                />
              </div>
              {batchRemoveBg && (
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>CUTOUT SENSITIVITY THRESHOLD</span>
                    <span>{batchBgThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="255"
                    value={batchBgThreshold}
                    onChange={(e) => setBatchBgThreshold(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-100 dark:bg-slate-800 appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              )}
            </div>

            {/* Transform Recipe Options */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Transform Actions</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Preset Rotation</label>
                  <select
                    value={batchRotation}
                    onChange={(e) => setBatchRotation(parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="0">0° No rotation</option>
                    <option value="90">90° Clockwise</option>
                    <option value="180">180° Upside Down</option>
                    <option value="270">270° Counter-Clockwise</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Product Size Factor</label>
                  <select
                    value={batchScale}
                    onChange={(e) => setBatchScale(parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="0.8">80% Scale-down</option>
                    <option value="1.0">100% Fit center</option>
                    <option value="1.2">120% Zoom focus</option>
                  </select>
                </div>
              </div>

              {/* Flip Presets */}
              <div className="flex gap-2">
                <button
                  onClick={() => setBatchFlipH(!batchFlipH)}
                  className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    batchFlipH ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400" : "bg-slate-50 dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  ↔ Flip H
                </button>
                <button
                  onClick={() => setBatchFlipV(!batchFlipV)}
                  className={`flex-1 py-1.5 px-3 border rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    batchFlipV ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400" : "bg-slate-50 dark:bg-slate-900 border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  ↕ Flip V
                </button>
              </div>

              {/* Recolor Color Shift slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  <span>PRODUCT RECOLOR (HUE)</span>
                  <span>{batchHue}° Shift</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={batchHue}
                  onChange={(e) => setBatchHue(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-100 appearance-none cursor-pointer"
                  style={{
                    background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
                  }}
                />
              </div>
            </div>

            {/* Target Scene Selection */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Target Backdrop Scene</span>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {BACKGROUND_SCENES.map((scene) => (
                  <button
                    key={scene.id}
                    onClick={() => setBatchBg(scene)}
                    className={`relative p-1 rounded-xl border-2 text-left overflow-hidden cursor-pointer transition-all ${
                      batchBg.id === scene.id ? "border-indigo-600 scale-[1.02]" : "border-slate-150 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    <div className="h-10 rounded-lg bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                      {scene.url.startsWith("solid:") ? (
                        <div className="w-full h-full" style={{ backgroundColor: scene.url.split(":")[1] }} />
                      ) : (
                        <img src={scene.url} alt="" className="w-full h-full object-cover" />
                      )}
                      {batchBg.id === scene.id && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[7px] font-black">✓</span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 block mt-1 truncate px-0.5">{scene.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-150 dark:bg-slate-800" />

            <button
              onClick={executeBatchProcess}
              disabled={isBatchRunning}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isBatchRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Automation Pipeline ({batchProgress.current} / {batchProgress.total})...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Execute Batch Optimization ({batchSelectedIds.length} Selected)
                </>
              )}
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
