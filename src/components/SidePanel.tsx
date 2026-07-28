import type { ReactNode } from "react";

type SidePanelProps = {
  disabled?: boolean;
  overlayText?: string;
  children: ReactNode;
};

const SidePanel = ({ disabled = false, overlayText, children }: SidePanelProps) => {
  return (
    <div className="relative min-h-0">
      <div
        className={`
          bg-white p-6 rounded-2xl shadow transition h-full overflow-y-auto
          ${disabled ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        {children}
      </div>

      {disabled && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-2xl">
          <p className="text-sm text-gray-600 font-medium">{overlayText}</p>
        </div>
      )}
    </div>
  );
};

export default SidePanel;
