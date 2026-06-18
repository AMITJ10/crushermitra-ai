import { Factory } from "lucide-react";

interface CrusherMitraLogoProps {
  compact?: boolean;
  inverse?: boolean;
}

export function CrusherMitraLogo({ compact = false, inverse = false }: CrusherMitraLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-10 place-items-center rounded-md ${
          inverse ? "bg-cyan-400 text-slate-950" : "bg-slate-950 text-white"
        }`}
        aria-hidden="true"
      >
        <Factory size={22} />
      </span>
      {compact ? null : (
        <span className="grid">
          <span className={`text-sm font-black ${inverse ? "text-white" : "text-slate-950"}`}>CrusherMitra AI</span>
          <span className={`text-xs ${inverse ? "text-slate-300" : "text-slate-600"}`}>Plant operations ERP</span>
        </span>
      )}
    </div>
  );
}
