export function Sk({ w = '100%', h = 14, r = 8, style }) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function SkLines({ lines = 3, last = '60%' }) {
  return (
    <span className="sk-lines">
      {Array.from({ length: lines }).map((_, i) => (
        <Sk key={i} h={12} w={i === lines - 1 ? last : '100%'} />
      ))}
    </span>
  );
}

export function CardSkeleton() {
  return (
    <div className="flip-card-sk">
      <Sk w="46%" h={20} r={999} />
      <Sk w="80%" h={26} style={{ marginTop: 12 }} />
      <Sk w="55%" h={16} style={{ marginTop: 8 }} />
      <div style={{ marginTop: 14 }}>
        <SkLines lines={3} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <Sk w={54} h={20} r={999} />
        <Sk w={64} h={20} r={999} />
        <Sk w={48} h={20} r={999} />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }) {
  return (
    <div className="card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AchievementGridSkeleton({ count = 9 }) {
  return (
    <div className="ach-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel ach">
          <Sk w={54} h={18} r={999} style={{ position: 'absolute', top: 10, right: 10 }} />
          <Sk w="60%" h={18} style={{ marginTop: 6 }} />
          <div style={{ marginTop: 8 }}>
            <SkLines lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <>
      <div className="panel profile-head">
        <Sk w={88} h={88} r={999} />
        <div style={{ flex: 1 }}>
          <Sk w="45%" h={26} />
          <Sk w="60%" h={14} style={{ marginTop: 10 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Sk w={80} h={24} r={999} />
            <Sk w={120} h={24} r={999} />
            <Sk w={70} h={24} r={999} />
          </div>
        </div>
      </div>
      <Sk w={140} h={22} style={{ marginBottom: 18 }} />
      <CardGridSkeleton count={3} />
    </>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="panel" style={{ padding: 22, marginBottom: 22 }}>
        <Sk w={120} h={22} />
        <div className="row-2" style={{ marginTop: 16 }}>
          <Sk h={44} />
          <Sk h={44} />
        </div>
        <Sk h={80} style={{ marginTop: 14 }} />
      </div>
      <Sk w={90} h={24} style={{ marginBottom: 16 }} />
      <CardGridSkeleton count={3} />
    </>
  );
}
