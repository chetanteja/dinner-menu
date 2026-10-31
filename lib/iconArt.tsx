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
