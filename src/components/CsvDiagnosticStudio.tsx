import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { 
  AlertCircle, AlertTriangle, CheckCircle2, Cloud, Cpu, Download, FileSpreadsheet, 
  Globe, HardDrive, HelpCircle, Image as ImageIcon, Info, Link, Loader2, 
  RefreshCw, Settings, ShieldCheck, Sparkles, Trash2, Upload 
} from "lucide-react";

interface CsvProduct {
  handle: string;
  title: string;
  sku: string;
  category: string;
  imageUrls: string[];
  variantImageUrls: string[];
  scannedImages: {
    url: string;
    width: number;
    height: number;
    isLowRes: boolean;
    isLoaded: boolean;
  }[];
  score: number;
  status: 'optimized' | 'warning' | 'critical';
  issues: string[];
}

export default function CsvDiagnosticStudio() {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'cloud'>('audit');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [isParsing, setIsParsing] = useState(false);
  const [scannedProducts, setScannedProducts] = useState<CsvProduct[]>([]);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
  const [isScanningImages, setIsScanningImages] = useState(false);

  // Cloud Config settings state
  const [awsAccessKey, setAwsAccessKey] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [awsRegion, setAwsRegion] = useState("us-east-1");
  const [awsBucket, setAwsBucket] = useState("");
  const [awsEndpoint, setAwsEndpoint] = useState("");
  const [cdnPrefix, setCdnPrefix] = useState("");
  const [cloudConfigured, setCloudConfigured] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Mappings state: original_url -> optimized_cloud_url
  const [urlMappings, setUrlMappings] = useState<Record<string, string>>({});
  const [newMappingOriginal, setNewMappingOriginal] = useState("");
  const [newMappingOptimized, setNewMappingOptimized] = useState("");

  // Load cloud config from server on mount
  const fetchCloudConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch("/api/cloud-config");
      const data = await res.json();
      if (data.success) {
        setCloudConfigured(data.isConfigured);
        if (data.config) {
          setAwsAccessKey(data.config.AWS_ACCESS_KEY_ID || "");
          setAwsRegion(data.config.AWS_REGION || "us-east-1");
          setAwsBucket(data.config.AWS_S3_BUCKET || "");
          setAwsEndpoint(data.config.AWS_S3_ENDPOINT || "");
          setCdnPrefix(data.config.CDN_URL_PREFIX || "");
        }
      }
    } catch (e) {
      console.error("Failed to load cloud configurations:", e);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchCloudConfig();
  }, []);

  const handleSaveCloudConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch("/api/cloud-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          AWS_ACCESS_KEY_ID: awsAccessKey,
          AWS_SECRET_ACCESS_KEY: awsSecretKey || undefined, // only send if filled
          AWS_REGION: awsRegion,
          AWS_S3_BUCKET: awsBucket,
          AWS_S3_ENDPOINT: awsEndpoint,
          CDN_URL_PREFIX: cdnPrefix,
        })
      });
      const data = await res.json();
      if (data.success) {
        setCloudConfigured(data.isConfigured);
        alert("Cloud storage credentials saved successfully in full-stack memory!");
        fetchCloudConfig();
      }
    } catch (e) {
      alert("Failed saving cloud configurations.");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // CSV drag & drop parser
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setCsvFile(file);
    setIsParsing(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          parseProductsFromCsv(results.data as any[]);
        },
        error: (err) => {
          console.error(err);
          alert("Failed to parse CSV syntax. Ensure the file conforms to standard CSV format.");
          setIsParsing(false);
        }
      });
    };
    reader.readAsText(file);
  };

  const parseProductsFromCsv = async (rows: any[]) => {
    const productsMap: Record<string, CsvProduct> = {};

    rows.forEach((row) => {
      const handle = row["URL handle"] || row["Handle"];
      if (!handle) return;

      const title = row["Title"] || "";
      const sku = row["SKU"] || "";
      const category = row["Product category"] || row["Type"] || "General";
      const productImgUrl = row["Product image URL"] || row["Image Src"] || "";
      const variantImgUrl = row["Variant image URL"] || row["Variant Image"] || "";

      if (!productsMap[handle]) {
        productsMap[handle] = {
          handle,
          title: title || handle,
          sku: sku || "N/A",
          category: category || "General",
          imageUrls: [],
          variantImageUrls: [],
          scannedImages: [],
          score: 100,
          status: "optimized",
          issues: []
        };
      }

      const p = productsMap[handle];
      if (title && p.title === handle) p.title = title;
      if (sku && p.sku === "N/A") p.sku = sku;
      if (category && p.category === "General") p.category = category;

      if (productImgUrl && !p.imageUrls.includes(productImgUrl)) {
        p.imageUrls.push(productImgUrl);
      }
      if (variantImgUrl && !p.variantImageUrls.includes(variantImgUrl)) {
        p.variantImageUrls.push(variantImgUrl);
      }
    });

    const parsedList = Object.values(productsMap);
    setScannedProducts(parsedList);
    setIsParsing(false);

    // Automatically trigger resolution checking for all discovered URLs
    await scanImageResolutions(parsedList);
  };

  const scanImageResolutions = async (list: CsvProduct[]) => {
    setIsScanningImages(true);
    
    // Collect all unique URLs from products
    const uniqueUrls: string[] = [];
    list.forEach(p => {
      [...p.imageUrls, ...p.variantImageUrls].forEach(url => {
        if (url && !uniqueUrls.includes(url)) {
          uniqueUrls.push(url);
        }
      });
    });

    setScanProgress({ current: 0, total: uniqueUrls.length });

    // In-memory cache of scanned sizes
    const sizeCache: Record<string, { w: number; h: number; isLowRes: boolean }> = {};

    let counter = 0;
    for (const url of uniqueUrls) {
      try {
        const size = await checkImgSizeInBrowser(url);
        sizeCache[url] = {
          w: size.width,
          h: size.height,
          isLowRes: size.width < 1000 || size.height < 1000
        };
      } catch (err) {
        // Fallback for load errors (e.g. CORS or offline)
        sizeCache[url] = {
          w: 0,
          h: 0,
          isLowRes: true
        };
      }
      counter++;
      setScanProgress({ current: counter, total: uniqueUrls.length });
    }

    // Map resolutions back to products and recalculate e-commerce scores
    const updatedList = list.map(p => {
      const allUrls = [...p.imageUrls, ...p.variantImageUrls];
      const scannedImages = allUrls.map(url => {
        const cache = sizeCache[url] || { w: 0, h: 0, isLowRes: true };
        return {
          url,
          width: cache.w,
          height: cache.h,
          isLowRes: cache.isLowRes,
          isLoaded: cache.w > 0
        };
      });

      const hasLowRes = scannedImages.some(img => img.isLowRes);
      const totalImages = allUrls.length;

      const issues: string[] = [];
      let score = 100;

      if (totalImages < 3) {
        issues.push(`Less than 3 images present (Count: ${totalImages}). Recommend 3-5 images for conversion optimization.`);
        score -= 25;
      }
      if (hasLowRes) {
        issues.push("Listing contains suboptimal resolutions below 1000x1000 pixels.");
        score -= 25;
      }

      score = Math.max(15, score);
      const status: 'optimized' | 'warning' | 'critical' = 
        score >= 85 ? 'optimized' : (score >= 60 ? 'warning' : 'critical');

      return {
        ...p,
        scannedImages,
        score,
        status,
        issues
      };
    });

    setScannedProducts(updatedList);
    setIsScanningImages(false);

    // Pre-populate URL Mappings so user has editable fields in the mapper
    const initialMappings: Record<string, string> = {};
    uniqueUrls.forEach(url => {
      initialMappings[url] = urlMappings[url] || "";
    });
    setUrlMappings(initialMappings);
  };

  const checkImgSizeInBrowser = (url: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        // If block by CORS, check if it has a mock Shopify query parameters we can parse, or resolve fallback
        if (url.includes("?width=")) {
          const widthMatch = url.match(/\?width=(\d+)/);
          const w = widthMatch ? parseInt(widthMatch[1]) : 800;
          resolve({ width: w, height: w });
        } else {
          reject(new Error("Image load blocked or failed"));
        }
      };
      img.src = url;
    });
  };

  const handleMappingChange = (origUrl: string, val: string) => {
    setUrlMappings(prev => ({
      ...prev,
      [origUrl]: val
    }));
  };

  const handleAddCustomMapping = () => {
    if (!newMappingOriginal || !newMappingOptimized) {
      alert("Please fill in both original and optimized URL fields.");
      return;
    }
    setUrlMappings(prev => ({
      ...prev,
      [newMappingOriginal]: newMappingOptimized
    }));
    setNewMappingOriginal("");
    setNewMappingOptimized("");
  };

  const handleExportCorrectedCsv = async () => {
    if (!csvText) {
      alert("Please upload and scan a Shopify product CSV file first.");
      return;
    }

    // Filter out empty mapping fields (retain original URLs if no replacement was specified)
    const activeReplacements: Record<string, string> = {};
    Object.entries(urlMappings).forEach(([orig, replacement]) => {
      const val = replacement as string;
      if (val && val.trim() !== "") {
        activeReplacements[orig] = val.trim();
      }
    });

    if (Object.keys(activeReplacements).length === 0) {
      alert("No replacements have been mapped yet. All image URLs will remain original.");
    }

    try {
      const res = await fetch("/api/edit-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv_content: csvText,
          replacements: activeReplacements
        })
      });

      const data = await res.json();
      if (data.success && data.csv_text) {
        // Initiate browser CSV download
        const blob = new Blob([data.csv_text], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `optimized_${csvFile?.name || "shopify_export.csv"}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert("Your corrected Shopify CSV was created and downloaded successfully! The new cloud-stored URLs have been put in the correct category columns.");
      } else {
        alert("Failed to compile corrected CSV output from server.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during CSV replacement processing.");
    }
  };

  // Compute stats of CSV
  const totalListings = scannedProducts.length;
  const criticalListings = scannedProducts.filter(p => p.status === 'critical').length;
  const warningListings = scannedProducts.filter(p => p.status === 'warning').length;
  const avgComplianceScore = totalListings > 0 
    ? Math.round(scannedProducts.reduce((acc, p) => acc + p.score, 0) / totalListings)
    : 100;

  return (
    <div className="space-y-6">
      
      {/* Upper sub-tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1 gap-1 border">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`flex-1 py-2.5 text-xs font-bold text-center rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'audit'
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Check Spreadsheet List ({totalListings})
        </button>
        <button
          onClick={() => setActiveSubTab('cloud')}
          className={`flex-1 py-2.5 text-xs font-bold text-center rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'cloud'
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Cloud className="w-4 h-4" />
          Cloud Storage & Links Mapper
        </button>
      </div>

      {activeSubTab === 'audit' ? (
        <div className="space-y-6">
          
          {/* CSV File Selection Zone */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-full text-indigo-600 dark:text-indigo-400 text-xl">
                📂
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-950 dark:text-white">Fix Photos in Spreadsheet Lists</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload your shop's exported product sheet. We will automatically find all the image links, check which ones are blurry or too small, and let you fix them!
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <label className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer shadow-sm transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Pick Spreadsheet File (.csv)
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                </label>
                {scannedProducts.length > 0 && (
                  <button
                    onClick={() => parseProductsFromCsv(Papa.parse(csvText, { header: true }).data as any[])}
                    className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-scan File
                  </button>
                )}
              </div>

              {csvFile && (
                <p className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 py-1 px-3.5 rounded-full inline-block">
                  📂 Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          {/* Image scanning progress state */}
          {isScanningImages && (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-2xl space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolving image dimensions directly from host providers...
                </span>
                <span>{scanProgress.current} / {scanProgress.total} image URLs</span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Results reporting metrics */}
          {totalListings > 0 && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-center shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Audited Products</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block">{totalListings}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-center shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Critical Failures</span>
                  <span className="text-2xl font-black text-rose-500 block">{criticalListings}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-center shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Warning Listings</span>
                  <span className="text-2xl font-black text-amber-500 block">{warningListings}</span>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl text-center shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Store Compliance Score</span>
                  <span className={`text-2xl font-black block ${avgComplianceScore >= 85 ? "text-emerald-500" : "text-amber-500"}`}>{avgComplianceScore}%</span>
                </div>
              </div>

              {/* Products Table report */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-950 dark:text-white">Shopify CSV Resolution Audit Listings</h3>
                  <p className="text-xs text-slate-500">A detail report of product rows identified with suboptimal visual specifications.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="py-4 px-6">Product Details</th>
                        <th className="py-4 px-6">Image URL & Size (CORS checked)</th>
                        <th className="py-4 px-6 text-center">Score</th>
                        <th className="py-4 px-6">Identified Impediments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {scannedProducts.map((p, idx) => {
                        const scoreColor = 
                          p.score >= 85 ? "text-emerald-600 dark:text-emerald-400" :
                          p.score >= 60 ? "text-amber-600 dark:text-amber-400" :
                          "text-rose-600 dark:text-rose-400";

                        const badgeColor =
                          p.status === 'optimized' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          p.status === 'warning' ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                          "bg-rose-500/10 text-rose-600 border-rose-500/20";

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            {/* Product titles */}
                            <td className="py-4 px-6 max-w-xs">
                              <div className="font-bold text-slate-900 dark:text-white truncate">{p.title}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="px-1.5 py-0.25 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[9px] rounded uppercase tracking-tight">SKU: {p.sku}</span>
                                <span className="px-1.5 py-0.25 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[9px] rounded">{p.category}</span>
                              </div>
                            </td>

                            {/* Evaluated Image URLs and dimensions */}
                            <td className="py-4 px-6 max-w-sm">
                              {p.scannedImages.length === 0 ? (
                                <span className="text-rose-500 font-semibold block">⚠️ No image URLs found on this row!</span>
                              ) : (
                                <div className="space-y-1.5">
                                  {p.scannedImages.map((img, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded bg-slate-100 dark:bg-slate-950 border overflow-hidden flex items-center justify-center shrink-0 ${
                                        img.isLowRes ? "border-rose-400" : "border-slate-200 dark:border-slate-800"
                                      }`}>
                                        <img src={img.url} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display='none')} />
                                      </div>
                                      <div className="truncate min-w-0">
                                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 block truncate leading-none" title={img.url}>{img.url}</span>
                                        <span className={`text-[9px] font-bold ${
                                          img.isLowRes ? "text-rose-500" : "text-emerald-500"
                                        }`}>
                                          {img.width > 0 ? `${img.width}x${img.height}px` : "Scanned via burst"}
                                          {img.isLowRes && " (Suboptimal - Under 1000px)"}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Compliance score */}
                            <td className="py-4 px-6 text-center">
                              <span className={`text-sm font-black ${scoreColor} block`}>{p.score}%</span>
                              <span className={`text-[8px] font-bold uppercase tracking-wider border px-1.5 py-0.25 rounded-md inline-block mt-1 ${badgeColor}`}>{p.status}</span>
                            </td>

                            {/* Issues list */}
                            <td className="py-4 px-6 max-w-xs">
                              {p.issues.length === 0 ? (
                                <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  Ready to sell
                                </div>
                              ) : (
                                <ul className="space-y-1">
                                  {p.issues.map((issue, i) => (
                                    <li key={i} className="text-slate-600 dark:text-slate-400 text-[11px] leading-snug flex items-start gap-1">
                                      <span className="text-amber-500 shrink-0 mt-0.5">●</span>
                                      <span>{issue}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Cloud Storage config setting (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <span className="text-[9px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded uppercase">AWS S3 / R2 SDK configuration</span>
                <h3 class="text-sm font-extrabold text-slate-950 dark:text-white mt-1.5">Configure cloud pipeline</h3>
                <p class="text-xs text-slate-500 mt-1">Specify your target S3 or Cloudflare R2 credentials. This allows the tool to automatically save images directly to public CDNs.</p>
              </div>

              <form onSubmit={handleSaveCloudConfig} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Access Key ID</label>
                  <input
                    type="text"
                    required
                    value={awsAccessKey}
                    onChange={(e) => setAwsAccessKey(e.target.value)}
                    placeholder="AKIAxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Secret Access Key</label>
                  <input
                    type="password"
                    placeholder={cloudConfigured ? "●●●●●●●●●●●●●●●●●●●●" : "Paste AWS / Cloudflare Secret Key"}
                    value={awsSecretKey}
                    onChange={(e) => setAwsSecretKey(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Region</label>
                    <input
                      type="text"
                      required
                      value={awsRegion}
                      onChange={(e) => setAwsRegion(e.target.value)}
                      placeholder="us-east-1"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">S3 Bucket Name</label>
                    <input
                      type="text"
                      required
                      value={awsBucket}
                      onChange={(e) => setAwsBucket(e.target.value)}
                      placeholder="my-shopify-images"
                      className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Custom S3 Endpoint (Optional - e.g. for Cloudflare R2)</label>
                  <input
                    type="url"
                    value={awsEndpoint}
                    onChange={(e) => setAwsEndpoint(e.target.value)}
                    placeholder="https://<account_id>.r2.cloudflarestorage.com"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">CDN URL Prefix (Optional - e.g. CloudFront / Cloudflare)</label>
                  <input
                    type="url"
                    value={cdnPrefix}
                    onChange={(e) => setCdnPrefix(e.target.value)}
                    placeholder="https://cdn.my-shopify-store.com"
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isSavingConfig}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer shadow-sm transition-colors inline-flex items-center gap-1"
                  >
                    {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Credentials"}
                  </button>
                </div>
              </form>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">S3 Connection State</span>
                  <span className="text-[11px] text-slate-400 block">
                    {cloudConfigured ? "Connected with Cloud Delivery API" : "Using server upload fallback folder (/uploads)"}
                  </span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                  cloudConfigured 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}>
                  {cloudConfigured ? "CDN ACTIVE" : "LOCAL BACKUP"}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive URL Mapper Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[9px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded uppercase">CDN cell alignments</span>
                  <h3 className="text-sm font-extrabold text-slate-950 dark:text-white mt-1.5">Shopify CSV URL Mapping Console</h3>
                  <p className="text-xs text-slate-500">Map original image URLs to cloud-hosted optimized links.</p>
                </div>

                {totalListings > 0 && (
                  <button
                    onClick={handleExportCorrectedCsv}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition-colors cursor-pointer self-start sm:self-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Updated CSV
                  </button>
                )}
              </div>

              {/* Mapper listing */}
              {Object.keys(urlMappings).length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Link className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Console empty</h4>
                  <p className="text-[10px] text-slate-500 mt-1">First upload and scan a Shopify product CSV in the previous tab to automatically populate individual URL nodes here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  
                  {/* New Custom Mapping Quick-Add Row */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-150 dark:border-slate-800 space-y-3">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Add Quick Custom URL Overlay Mapping</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="url"
                        placeholder="Original URL (e.g. burst.shopifycdn...)"
                        value={newMappingOriginal}
                        onChange={(e) => setNewMappingOriginal(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-[11px] focus:outline-none"
                      />
                      <input
                        type="url"
                        placeholder="New Cloud / CDN URL (e.g. aws-s3/cdn...)"
                        value={newMappingOptimized}
                        onChange={(e) => setNewMappingOptimized(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-[11px] focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleAddCustomMapping}
                      className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold py-1.5 px-3 rounded-lg cursor-pointer"
                    >
                      + Append Mapping Node
                    </button>
                  </div>

                  {/* Complete Mapping Nodes List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {Object.entries(urlMappings).map(([origUrl, mappedUrl], idx) => (
                      <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[9px] text-slate-400 truncate max-w-xs block" title={origUrl}>
                            🔗 Original: {origUrl}
                          </span>
                          <button
                            onClick={() => {
                              const copy = { ...urlMappings };
                              delete copy[origUrl];
                              setUrlMappings(copy);
                            }}
                            title="Remove mapping"
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={mappedUrl}
                            onChange={(e) => handleMappingChange(origUrl, e.target.value)}
                            placeholder="Paste newly generated Cloud/CDN URL link..."
                            className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-[11px] focus:outline-none font-mono text-indigo-600 dark:text-indigo-400 focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
