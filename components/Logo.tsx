export function Logo({ size = 72 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center shadow-card"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: "linear-gradient(135deg, #FF9A3C 0%, #EF5A2B 100%)",
      }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: size * 0.66, height: size * 0.66, background: "#FFF8EE" }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: size * 0.5, height: size * 0.5, border: "1px solid #F3DDBD", gap: size * 0.03 }}
        >
          <span style={{ width: size * 0.11, height: size * 0.26, borderRadius: size, background: "#EF6A2B" }} />
          <span style={{ width: size * 0.11, height: size * 0.26, borderRadius: size, background: "#F2B01E" }} />
          <span style={{ width: size * 0.11, height: size * 0.26, borderRadius: size, background: "#35A36A" }} />
        </div>
      </div>
    </div>
  );
}
