import { AlertTriangle, Camera, CheckCircle, Image, Sparkles, Sliders } from "lucide-react";
import { DashboardStats as StatsType } from "../types";

interface Props {
  stats: StatsType;
  onNavigateToWorkshop: () => void;
}

export default function DashboardStats({ stats, onNavigateToWorkshop }: Props) {
  // SVG Gauge calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.averageScore / 100) * circumference;

  const scoreColor = 
    stats.averageScore >= 85 ? "stroke-emerald-500" :
    stats.averageScore >= 60 ? "stroke-amber-500" :
    "stroke-rose-500";

  const scoreBgColor = 
    stats.averageScore >= 85 ? "bg-emerald-50 text-emerald-700" :
    stats.averageScore >= 60 ? "bg-amber-50 text-amber-700" :
    "bg-rose-50 text-rose-700";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Average Store Score Gauge */}
      <div id="stat-card-score" className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Photo Quality Score</span>
          <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.averageScore.toFixed(0)}%</h3>
          <p className="text-xs text-slate-500">
            The overall grade of all your shop photos combined.
          </p>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${scoreBgColor}`}>
            {stats.averageScore >= 85 ? "Looks Beautiful!" : stats.averageScore >= 60 ? "Could Be Better" : "Needs Immediate Fixes!"}
          </div>
        </div>

        <div className="relative flex items-center justify-center w-28 h-28">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Progress Circle */}
            <circle
              cx="56"
              cy="56"
              r={radius}
              className={`transition-all duration-1000 ease-out ${scoreColor}`}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-800">{stats.averageScore.toFixed(0)}</span>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Score</span>
          </div>
        </div>
      </div>

      {/* Audit Stats */}
      <div id="stat-card-overview" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">How your photos look</span>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
              <span className="text-2xl font-bold text-emerald-600 block">{stats.optimizedCount}</span>
              <span className="text-[10px] font-semibold text-slate-500">Perfect Pics</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50/50 border border-amber-100/50">
              <span className="text-2xl font-bold text-amber-600 block">{stats.warningCount}</span>
              <span className="text-[10px] font-semibold text-slate-500">Need Tweak</span>
            </div>
            <div className="text-center p-3 rounded-xl bg-rose-50/50 border border-rose-100/50">
              <span className="text-2xl font-bold text-rose-600 block">{stats.criticalCount}</span>
              <span className="text-[10px] font-semibold text-slate-500">Need Fix</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
          Total pictures checked: <span className="font-semibold text-slate-700">{stats.totalProducts}</span>
        </p>
      </div>

      {/* Critical Issues Breakdown */}
      <div id="stat-card-alerts" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Found Problems</span>
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Image className="w-4 h-4 text-rose-500" />
                <span>Only has 1 photo</span>
              </div>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{stats.singleImageCount} items</span>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Camera className="w-4 h-4 text-amber-500" />
                <span>Too fuzzy or small (<span className="text-[10px]">under 1000px</span>)</span>
              </div>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{stats.lowResCount} images</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Messy background</span>
              </div>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{stats.clutteredBgCount} images</span>
            </div>
          </div>
        </div>

        {stats.criticalCount + stats.warningCount > 0 ? (
          <button
            onClick={onNavigateToWorkshop}
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition-all cursor-pointer group"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            🚀 Fix Blurry or Messy Photos
          </button>
        ) : (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-bold py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircle className="w-3.5 h-3.5" />
            All your pictures look perfect! 🌟
          </div>
        )}
      </div>
    </div>
  );
}
