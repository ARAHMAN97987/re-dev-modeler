/**
 * LoadingSkeleton — pulsing placeholder blocks for async/loading states.
 *
 * Usage:
 *   <LoadingSkeleton variant="card" />          — project/asset card
 *   <LoadingSkeleton variant="table" rows={4} /> — CF / results table
 *   <LoadingSkeleton variant="dashboard" />      — dashboard grid of cards
 *   <LoadingSkeleton />                          — single generic line
 */

const pulse = {
  background: "linear-gradient(90deg, #f0f1f5 25%, #e5e7ec 50%, #f0f1f5 75%)",
  backgroundSize: "200% 100%",
  animation: "zSkeletonPulse 1.4s ease-in-out infinite",
  borderRadius: 6,
};

// Inject keyframe once
if (typeof document !== "undefined" && !document.getElementById("z-skeleton-style")) {
  const s = document.createElement("style");
  s.id = "z-skeleton-style";
  s.textContent = `@keyframes zSkeletonPulse { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
  document.head.appendChild(s);
}

function Block({ w = "100%", h = 14, mb = 8, radius = 6 }) {
  return <div style={{ ...pulse, width: w, height: h, marginBottom: mb, borderRadius: radius }} />;
}

function CardSkeleton() {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7ec", borderRadius: 12, padding: "16px 18px" }}>
      <Block h={12} w="40%" mb={12} />
      <Block h={18} w="70%" mb={8} />
      <Block h={10} w="55%" mb={4} />
      <Block h={10} w="45%" mb={0} />
    </div>
  );
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div style={{ border: "1px solid #e5e7ec", borderRadius: 8, overflow: "hidden" }}>
      {/* header */}
      <div style={{ background: "#f8f9fb", padding: "8px 12px", display: "flex", gap: 12 }}>
        <Block h={10} w="25%" mb={0} />
        <Block h={10} w="15%" mb={0} />
        <Block h={10} w="15%" mb={0} />
        <Block h={10} w="15%" mb={0} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ padding: "8px 12px", display: "flex", gap: 12, borderTop: "1px solid #f0f1f5" }}>
          <Block h={11} w="25%" mb={0} />
          <Block h={11} w="15%" mb={0} />
          <Block h={11} w="15%" mb={0} />
          <Block h={11} w="15%" mb={0} />
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
      {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );
}

export default function LoadingSkeleton({ variant = "line", rows = 5 }) {
  if (variant === "card") return <CardSkeleton />;
  if (variant === "table") return <TableSkeleton rows={rows} />;
  if (variant === "dashboard") return <DashboardSkeleton />;
  return <Block />;
}
