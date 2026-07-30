import { Sparkles } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className="brand" href="/" aria-label="像素课代表首页">
      <span className="brand-mark" aria-hidden="true">
        <Sparkles size={compact ? 17 : 20} strokeWidth={2.8} />
      </span>
      <span>像素课代表</span>
      {!compact && <em>Beta</em>}
    </a>
  );
}
