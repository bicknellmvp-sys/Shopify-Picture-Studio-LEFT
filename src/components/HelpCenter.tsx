import React, { useState } from "react";
import { 
  HelpCircle, Image as ImageIcon, ShieldCheck, Key, HelpCircle as FAQIcon, 
  Sparkles, Layers, FileSpreadsheet, Chrome, Laptop, RefreshCw, FileText
} from "lucide-react";

export default function HelpCenter() {
  const [activeFaq, setActiveFaq] = useState<string | null>("what_does_app_do");

  const toggleFaq = (id: string) => {
    setActiveFaq(activeFaq === id ? null : id);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Friendly Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-md">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Super Simple Help Center 🌟</h2>
        <p className="text-indigo-100 text-sm mt-2 max-w-2xl">
          No tech talk here! Just quick, easy answers on how to make your shop photos look beautiful and get more sales.
        </p>
      </div>

      {/* Main Grid: Features Guide & FAQ sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Quick Guides for Features */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Easy Guides for Every Tool
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Guide 1: Check Pictures */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                1
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">📸 Check Pictures (Photo Scanner)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This screen scans your Shopify listings automatically. It finds pictures that are too small, fuzzy, or have messy backgrounds. It gives your shop a simple "Photo Grade" so you know what needs fixing!
              </p>
            </div>

            {/* Guide 2: Fix Pictures */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg">
                2
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">🎨 Fix Pictures (Photo Studio)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Pick a product and clean it up! Click <strong>"Cut Out Background"</strong> to erase messy rooms or shadows. Then click any of our ready-made backdrops (like marble or clean white tables) to make it look expensive. Click <strong>"Create Free Public Link"</strong> to save!
              </p>
            </div>

            {/* Guide 3: Saved Images */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                3
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">☁️ Saved Images (Cloud Storage)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every picture you fix and save goes here! We give you a permanent, free web link (URL) for each photo. Just click the clipboard icon to copy the link and paste it directly into Shopify!
              </p>
            </div>

            {/* Guide 4: Bulk CSV Edit */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg">
                4
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">📄 Bulk CSV Edit (Spreadsheet Fixer)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Got hundreds of items? Export your product list from Shopify as a CSV file, upload it here, and we'll check all image links inside. You can swap old links with your fresh cloud links, and download a finished file!
              </p>
            </div>

          </div>

          {/* Picture Basics & Quality section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-slate-950 dark:text-white text-base flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-indigo-500" />
              Easy Guide to Product Pictures
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You don't need a professional camera to take amazing shop pictures. Just follow these simple rules to make your items look trustworthy and double your sales:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">📐 Make It Square</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Always use square (1:1 ratio) pictures. This keeps your shop layout looking neat and aligned!
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">💡 Bright, White Lights</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Take photos near a sunny window or under bright white light. Avoid dark shadows!
                </p>
              </div>

              <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">🔎 Keep It High-Res</span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Make your photos at least 1024 pixels wide so customers can zoom in to see details!
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Frequently Asked Questions (FAQ) */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
            <FAQIcon className="w-5 h-5 text-indigo-500" />
            Simple Q&A Help
          </h3>

          <div className="space-y-3">
            
            {/* FAQ 1: What does this app do? */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <button 
                onClick={() => toggleFaq("what_does_app_do")}
                className="w-full p-4 text-left font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                <span>🤔 What exactly does this app do?</span>
                <span className="text-indigo-500 font-extrabold">{activeFaq === "what_does_app_do" ? "−" : "+"}</span>
              </button>
              {activeFaq === "what_does_app_do" && (
                <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 space-y-2">
                  <p>This app is a fast helper for your online store. It checks your product pictures, finds any mistakes (like bad size or messy backgrounds), and lets you fix them with one click!</p>
                  <p>You can automatically erase bad backgrounds, place products on luxurious tables, and save them as permanent cloud links to use in Shopify.</p>
                </div>
              )}
            </div>

            {/* FAQ 2: File formats WEBP, PNG, JPG */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <button 
                onClick={() => toggleFaq("file_extensions")}
                className="w-full p-4 text-left font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                <span>📁 Which photo extension/format is best?</span>
                <span className="text-indigo-500 font-extrabold">{activeFaq === "file_extensions" ? "−" : "+"}</span>
              </button>
              {activeFaq === "file_extensions" && (
                <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 space-y-3">
                  <p>Here is a breakdown of popular image extensions in plain terms:</p>
                  <div className="space-y-2">
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">✨ WEBP (.webp) - The New King</strong>
                      <span className="block text-[11px]">This is the best format for Shopify! It makes files super small so your shop loads lightning fast, but keeps your pictures looking crystal clear.</span>
                    </div>
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">🖼️ PNG (.png) - Best for Transparent Cutouts</strong>
                      <span className="block text-[11px]">Best if you want a zero-background look. Keeps the background transparent so you can layer your product on top of other colors or designs.</span>
                    </div>
                    <div>
                      <strong className="text-slate-700 dark:text-slate-200 block">📷 JPEG (.jpg) - Great for Standard Photos</strong>
                      <span className="block text-[11px]">Best for typical rich photographs with lots of colors and realistic lighting shadows.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FAQ 3: Shopify requirements */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <button 
                onClick={() => toggleFaq("shopify_rules")}
                className="w-full p-4 text-left font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                <span>🛍️ What are Shopify's picture requirements?</span>
                <span className="text-indigo-500 font-extrabold">{activeFaq === "shopify_rules" ? "−" : "+"}</span>
              </button>
              {activeFaq === "shopify_rules" && (
                <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 space-y-2">
                  <p>Shopify recommends following these rules so your store is fast and professional:</p>
                  <ul className="list-disc list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-350">
                    <li><strong>Size:</strong> Keep images under 20 Megapixels and under 2MB.</li>
                    <li><strong>Resolution:</strong> 1024x1024 up to 2048x2048 pixels is perfect.</li>
                    <li><strong>Safety Margin:</strong> Keep the product centered with about 10% empty space around the edges.</li>
                    <li><strong>SEO Alt Text:</strong> Always fill out the "image description" in Shopify. This helps Google find your store!</li>
                  </ul>
                </div>
              )}
            </div>

            {/* FAQ 4: Shopify Best Use Cases */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <button 
                onClick={() => toggleFaq("shopify_best_cases")}
                className="w-full p-4 text-left font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                <span>🌟 What backgrounds work best on Shopify?</span>
                <span className="text-indigo-500 font-extrabold">{activeFaq === "shopify_best_cases" ? "−" : "+"}</span>
              </button>
              {activeFaq === "shopify_best_cases" && (
                <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 space-y-2">
                  <p>According to top Shopify sellers, these backdrops get the most sales:</p>
                  <div className="space-y-1.5 text-[11px]">
                    <p>💡 <strong>Pure White:</strong> Best for your primary listing picture. It makes products pop and matches other platforms.</p>
                    <p>💡 <strong>Light Grey or Soft Cream:</strong> Gives a warm, elegant look for luxury or home items.</p>
                    <p>💡 <strong>Marble or Wood Table:</strong> Excellent for cosmetic products, jewelry, or food items.</p>
                    <p>💡 <strong>Consistent Themes:</strong> Keep all your catalog images on similar backgrounds to make your store look clean.</p>
                  </div>
                </div>
              )}
            </div>

            {/* FAQ 5: Accounts and Logging */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
              <button 
                onClick={() => toggleFaq("accounts_logging")}
                className="w-full p-4 text-left font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                <span>🔑 Accounts, Logging & Troubleshooting</span>
                <span className="text-indigo-500 font-extrabold">{activeFaq === "accounts_logging" ? "−" : "+"}</span>
              </button>
              {activeFaq === "accounts_logging" && (
                <div className="px-4 pb-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-3 space-y-2">
                  <p><strong>Connected Accounts:</strong></p>
                  <p className="text-[11px]">Open the top-left Hamburger menu to connect Google, Dropbox, or Shopify. Syncing Google matches your user profile, Shopify keeps your inventory updated, and Dropbox allows saving outputs directly into your cloud files.</p>
                  <p className="mt-2"><strong>What do we log?</strong></p>
                  <p className="text-[11px]">We log your picture check history and active link swaps to make sure you never lose your progress. If something goes wrong, click "Sync Domain" or "Reset Demo Data" to get a fresh start.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
