import { memo } from 'react';

function ScopeOverlayNode({ data }) {
  return (
    <div className="-translate-x-1/2 pointer-events-none">
      <div
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold shadow-sm whitespace-nowrap ${data.colorClass} ${data.borderColorClass} ${data.bgColorClass}`}
      >
        <span>{data.label}</span>
      </div>
    </div>
  );
}

export default memo(ScopeOverlayNode);
