import { useNavigate } from 'react-router-dom';
import { Deckr } from '../../api/client.js';
import { useQuery, dropCache } from '../../lib/cache.js';
import { availabilitySummary } from '../../lib/designs.js';
import { useToast } from '../../components/Toasts.jsx';
import { Spinner, ErrorBanner } from '../../components/common.jsx';
import { IconButton } from '../../components/Tooltip.jsx';

export default function DesignList() {
  const { data, error, loading, refetch } = useQuery('admin:designs', Deckr.listDesigns, {
    ttl: 10_000,
  });
  const { push } = useToast();
  const navigate = useNavigate();
  const designs = data?.designs || [];

  const bust = () => {
    dropCache('admin:designs');
    dropCache('designs');
    dropCache('cards');
    dropCache('community');
    refetch();
  };

  const create = async () => {
    const name = window.prompt('New design name');
    if (!name || !name.trim()) return;
    try {
      const { design } = await Deckr.createDesign({ name: name.trim() });
      bust();
      navigate(`/admin/designs/${design.slug}`);
    } catch (err) {
      push(err.message || 'Could not create the design');
    }
  };

  const duplicate = async (slug) => {
    try {
      await Deckr.duplicateDesign(slug);
      bust();
      push('Duplicated');
    } catch (err) {
      push(err.message || 'Could not duplicate');
    }
  };

  const remove = async (slug, name) => {
    if (!window.confirm(`Delete "${name}"? Cards already using it will fall back to their packaging.`))
      return;
    try {
      await Deckr.deleteDesign(slug);
      bust();
      push('Deleted');
    } catch (err) {
      push(err.message || 'Could not delete');
    }
  };

  return (
    <section className="panel admin-list">
      <div className="admin-list__head">
        <h2>Designs</h2>
        <button className="btn btn--sm" onClick={create}>
          New design
        </button>
      </div>

      <ErrorBanner error={error} />
      {loading ? <Spinner /> : null}

      {!loading && designs.length === 0 ? (
        <p className="hint">No designs yet. Create one to start.</p>
      ) : null}

      {designs.length ? (
        <div className="admin-table" role="table">
          <div className="admin-table__row admin-table__row--head" role="row">
            <span>Name</span>
            <span>Status</span>
            <span>Available</span>
            <span>Updated</span>
            <span aria-hidden="true" />
          </div>
          {designs.map((d) => (
            <div
              key={d.slug}
              className="admin-table__row admin-table__row--link"
              role="row"
              tabIndex={0}
              onClick={() => navigate(`/admin/designs/${d.slug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/admin/designs/${d.slug}`);
              }}
            >
              <span>
                <strong>{d.name}</strong>
                <small className="hint"> /{d.slug}</small>
              </span>
              <span>
                <span className={`status-pill status-pill--${d.status}`}>{d.status}</span>
              </span>
              <span>{availabilitySummary(d)}</span>
              <span>{new Date(d.updatedAt).toLocaleDateString()}</span>
              <span
                className="admin-table__actions"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <IconButton label="Duplicate" onClick={() => duplicate(d.slug)}>
                  <span aria-hidden="true">⧉</span>
                </IconButton>
                <IconButton label="Delete" tone="danger" onClick={() => remove(d.slug, d.name)}>
                  <span aria-hidden="true">✕</span>
                </IconButton>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
