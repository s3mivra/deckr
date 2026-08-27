import { Deckr } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useQuery } from '../lib/cache.js';
import { useTitle } from '../components/RouteEffects.jsx';
import { ErrorBanner } from '../components/common.jsx';
import { AchievementGridSkeleton } from '../components/Skeleton.jsx';
import { timeAgo } from '../lib/format.js';

export default function Achievements() {
  const { user } = useAuth();
  useTitle('Achievements');
  const { data, error, loading } = useQuery('achievements', Deckr.achievements, {
    persist: true,
    ttl: 5 * 60 * 1000,
  });

  const unlockedCount = data ? data.achievements.filter((a) => a.unlocked).length : 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Achievements</h1>
          <p className="hint">
            {loading
              ? 'Loading the catalog'
              : user
                ? `You have unlocked ${unlockedCount} of ${data.total}.`
                : `${data?.total ?? 22} to collect. Sign in to start unlocking them.`}
          </p>
        </div>
      </div>

      <ErrorBanner error={error} />

      {loading ? (
        <AchievementGridSkeleton count={12} />
      ) : (
        <div className="ach-grid">
          {data.achievements.map((a) => (
            <div key={a.key} className={`panel ach ${a.unlocked ? '' : 'is-locked'}`}>
              <span className="ach__tier" data-tier={a.tier}>
                {a.tier}
              </span>
              <h4>{a.name}</h4>
              <p className="hint">{a.description}</p>
              {a.unlocked ? (
                <span className="tag" style={{ marginTop: 8 }}>
                  Unlocked{a.unlockedAt ? ` ${timeAgo(a.unlockedAt)}` : ''}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
