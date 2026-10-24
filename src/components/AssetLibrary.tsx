import { useState } from "react";
import { Check, Clipboard, Copy, ExternalLink, Image, Link2, Search, Trash2 } from "lucide-react";
import { Product } from "../types";

interface Props {
  products: Product[];
}

export default function AssetLibrary({ products }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Collate all optimization histories into a single list
  const allAssets = products.flatMap((p) => 
    p.history.map((hist) => ({
      ...hist,
      productTitle: p.title,
      productSku: p.sku,
    }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAssets = allAssets.filter(
    (asset) =>
      asset.productTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.transformationType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.optimizedUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Saved Photo Links</h2>
          <p className="text-xs text-slate-500">
            Grab easy, super-fast links for any picture you fixed to put directly in your shop!
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved pictures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/30"
          />
        </div>
      </div>

      {filteredAssets.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-2xl">
          <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-sm">No saved picture links here yet!</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Go click <strong>Fix Pictures</strong> at the top, pick an item, make it look beautiful, and save it to get a free link!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group border border-slate-150 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all bg-slate-50/10 flex flex-col justify-between"
            >
              {/* Thumbnail Display */}
              <div className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                <img
                  src={asset.optimizedUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain transition-transform group-hover:scale-105"
                />
                
                {/* Meta Indicator */}
                <span className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/80 backdrop-blur-[2px] text-white text-[9px] font-bold rounded-md">
                  {asset.transformationType}
                </span>

                <a
                  href={asset.optimizedUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open image in new tab"
                  className="absolute bottom-3 right-3 p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg shadow-sm border border-slate-200 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Asset Information Card */}
              <div className="p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">{asset.productSku}</span>
                  <h4 className="font-bold text-slate-900 text-sm truncate">{asset.productTitle}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Saved {new Date(asset.createdAt).toLocaleDateString()} at {new Date(asset.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Embedded Shopify Metadata Details */}
                <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between border-b border-slate-200/40 pb-1 font-bold text-slate-700">
                    <span className="flex items-center gap-1">🏷️ Embedded Shopify Tags</span>
                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black tracking-wider uppercase">ACTIVE</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-slate-500">
                    <div>x-amz-meta-sku:</div>
                    <div className="text-right truncate font-bold text-slate-700">{asset.productSku}</div>
                    <div>x-amz-meta-productid:</div>
                    <div className="text-right truncate text-slate-700 font-bold">prod-{asset.id.split('-')[1] || asset.id.substring(0, 6)}...</div>
                    <div>Local Sidecar:</div>
                    <div className="text-right text-emerald-600 font-bold">.metadata.json ✓</div>
                  </div>
                  <div className="text-[10px] leading-relaxed pt-1.5 border-t border-slate-200/40">
                    <span className="font-bold text-slate-700 block">Shopify ALT SEO tag suggestion:</span>
                    <span className="bg-white/80 p-1.5 rounded block text-slate-500 italic mt-0.5 border border-slate-200/50 break-words">
                      "{asset.productTitle} - SKU: {asset.productSku} - Professional high-resolution layout (Simple Shop Photo Fixer Optimized)"
                    </span>
                  </div>
                </div>

                {/* Copy Field bar */}
                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-1 border border-slate-200/50">
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 select-none pl-1.5 font-bold">LINK:</span>
                  <input
                    type="text"
                    readOnly
                    value={asset.optimizedUrl}
                    className="w-full text-[10px] bg-transparent border-none text-slate-600 font-mono px-0.5 focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(asset.id, asset.optimizedUrl)}
                    className={`p-1.5 rounded-md text-slate-500 shrink-0 cursor-pointer transition-colors ${
                      copiedId === asset.id ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "hover:bg-slate-200/60"
                    }`}
                    title="Copy cloud link"
                  >
                    {copiedId === asset.id ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
