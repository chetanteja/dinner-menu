import { Trash2 } from "lucide-react";

/** App mark for the garbage space: same rounded tile as the dinner logo, in green. */
export function GarbageLogo({ size = 72 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center text-white shadow-card"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: "linear-gradient(135deg, #3FBF7F 0%, #1F8A57 100%)",
      }}
    >
      <Trash2 size={size * 0.48} strokeWidth={2.2} />
    </div>
  );
}
