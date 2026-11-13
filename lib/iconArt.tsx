// Shared artwork for the app icon: a plate with the three course colours.
export function IconArt({ size }: { size: number }) {
  const s = size;
  return (
    <div
      style={{
        width: s,
        height: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #FF9A3C 0%, #EF5A2B 100%)",
      }}
    >
      <div
        style={{
          width: s * 0.66,
          height: s * 0.66,
          borderRadius: "50%",
          background: "#FFF8EE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 ${s * 0.02}px ${s * 0.05}px rgba(120,30,0,0.35)`,
        }}
      >
        <div
          style={{
            width: s * 0.5,
            height: s * 0.5,
            borderRadius: "50%",
            border: `${s * 0.012}px solid #F3DDBD`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: s * 0.03,
          }}
        >
          <div style={{ width: s * 0.11, height: s * 0.26, borderRadius: s * 0.06, background: "#EF6A2B", display: "flex" }} />
          <div style={{ width: s * 0.11, height: s * 0.26, borderRadius: s * 0.06, background: "#F2B01E", display: "flex" }} />
          <div style={{ width: s * 0.11, height: s * 0.26, borderRadius: s * 0.06, background: "#35A36A", display: "flex" }} />
        </div>
      </div>
    </div>
  );
}

/** Green bin icon for the separate Garbage Day app. */
export function GarbageIconArt({ size }: { size: number }) {
  const s = size;
  return (
    <div
      style={{
        width: s,
        height: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #3FBF7F 0%, #1F8A57 100%)",
      }}
    >
      <svg width={s * 0.56} height={s * 0.56} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" x2="10" y1="11" y2="17" />
        <line x1="14" x2="14" y1="11" y2="17" />
      </svg>
    </div>
  );
}
