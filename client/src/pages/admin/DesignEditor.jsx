import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Deckr } from '../../api/client.js';
import { useQuery, dropCache } from '../../lib/cache.js';
import { COLOR_TOKENS, FONT_ROLES, resolveColor } from '../../lib/designs.js';
import { BOUND_FIELDS } from '../../lib/cardValues.js';
import { SAMPLE_CARDS } from '../../data/sampleCards.js';
import { DesignElement } from '../../components/DesignRenderer.jsx';
import { useToast } from '../../components/Toasts.jsx';
import { Spinner, ErrorBanner } from '../../components/common.jsx';
import Select from '../../components/Select.jsx';
import NumberField from '../../components/NumberField.jsx';

const SCALE = 2; // stage is rendered at 2x the 320x480 reference
const REF_W = 320;
const REF_H = 480;
const MIN = 8;
let seq = 0;
const uid = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;

const ELEMENT_LABELS = {
  text: 'Text',
  field: 'Bound field',
  stars: 'Star rating',
  chips: 'Tech chips',
  band: 'Band',
  rect: 'Rectangle',
  line: 'Line',
  star: 'Star shape',
};

function defaultsFor(type, grid) {
  const g = (n) => Math.round(n / grid) * grid;
  const common = { id: uid(), type, x: g(120), y: g(200), w: g(80), h: g(40), z: 1, rotation: 0 };
  switch (type) {
    case 'text':
      return { ...common, text: 'Text', font: 'display', size: 18, weight: 800, color: 'token:card-ink', align: 'left' };
    case 'field':
      return { ...common, w: g(200), bind: 'projectName', font: 'display', size: 24, weight: 800, color: 'token:card-ink', align: 'left' };
    case 'stars':
      return { ...common, w: g(120), h: g(24), bind: 'stars', max: 5, starMode: 'scaled', size: 16, gap: 3, filled: 'token:theme-ink' };
    case 'chips':
      return { ...common, w: g(240), h: g(28), max: 4, size: 8, bg: 'token:card-body', textColor: 'token:card-ink', borderColor: 'token:card-ink', gap: 4 };
    case 'band':
      return { ...common, x: 0, y: g(40), w: REF_W, h: g(40), fill: 'token:theme-ink', strokeWidth: 0 };
    case 'rect':
      return { ...common, fill: 'token:pastel-2', stroke: 'token:card-ink', strokeWidth: 3, radius: 0 };
    case 'line':
      return { ...common, w: g(200), h: 3, fill: 'token:card-ink', strokeWidth: 0 };
    case 'star':
      return { ...common, w: g(48), h: g(48), fill: 'token:theme-ink', strokeWidth: 0 };
    default:
      return common;
  }
}

/* ---------- small labelled control ---------- */
function Row({ label, children }) {
  return (
    <label className="db-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ColorField({ value, onChange, allowClear }) {
  const isHex = value && value.startsWith('#');
  return (
    <div className="color-field">
      {COLOR_TOKENS.map((t) => (
        <button
          key={t}
          type="button"
          className={`color-field__tok ${value === `token:${t}` ? 'is-on' : ''}`}
          style={{ background: `var(--${t})` }}
          title={t}
          aria-label={t}
          onClick={() => onChange(`token:${t}`)}
        />
      ))}
      <input
        type="color"
        className="color-field__hex"
        value={isHex ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        title="Custom colour"
      />
      {allowClear ? (
        <button
          type="button"
          className={`color-field__tok ${!value ? 'is-on' : ''}`}
          title="None"
          aria-label="none"
          onClick={() => onChange('')}
        >
          ∅
        </button>
      ) : null}
    </div>
  );
}

/* ---------- the stage ---------- */
function Stage({ design, sel, setSel, previewCard, updateEl, grid, snap }) {
  const stageRef = useRef(null);
  const drag = useRef(null);

  const snapV = useCallback((v) => (snap ? Math.round(v / grid) * grid : Math.round(v)), [snap, grid]);

  const onDown = (e, el, handle) => {
    e.stopPropagation();
    e.preventDefault();
    setSel(el.id);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = {
      id: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      box: { x: el.x, y: el.y, w: el.w, h: el.h },
    };
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / SCALE;
    const dy = (e.clientY - d.startY) / SCALE;
    const b = d.box;
    let next;
    if (!d.handle) {
      next = {
        x: Math.max(0, Math.min(REF_W - b.w, snapV(b.x + dx))),
        y: Math.max(0, Math.min(REF_H - b.h, snapV(b.y + dy))),
      };
    } else {
      let { x, y, w, h } = b;
      if (d.handle.includes('e')) w = Math.max(MIN, snapV(b.w + dx));
      if (d.handle.includes('s')) h = Math.max(MIN, snapV(b.h + dy));
      if (d.handle.includes('w')) {
        const nx = Math.min(b.x + b.w - MIN, snapV(b.x + dx));
        w = b.w + (b.x - nx);
        x = nx;
      }
      if (d.handle.includes('n')) {
        const ny = Math.min(b.y + b.h - MIN, snapV(b.y + dy));
        h = b.h + (b.y - ny);
        y = ny;
      }
      next = { x, y, w, h };
    }
    updateEl(d.id, next);
  };

  const onUp = () => {
    drag.current = null;
  };

  const dotGrid = grid * SCALE;

  return (
    <div className="db-stage-wrap">
      <div
        ref={stageRef}
        className="db-stage"
        style={{
          width: REF_W * SCALE,
          height: REF_H * SCALE,
          '--db-dot': `${dotGrid}px`,
        }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        onPointerDown={() => setSel(null)}
      >
        <div
          className="db-stage__face card-theme"
          style={{ background: resolveColor(design.canvas?.background) || 'var(--card-body)' }}
          data-theme="butter"
        >
          {[...(design.elements || [])]
            .sort((a, b) => (a.z || 0) - (b.z || 0))
            .map((el) => (
              <div
                key={el.id}
                className={`db-el-wrap ${sel === el.id ? 'is-sel' : ''}`}
                style={{
                  left: `${(el.x / REF_W) * 100}%`,
                  top: `${(el.y / REF_H) * 100}%`,
                  width: `${(el.w / REF_W) * 100}%`,
                  height: `${(el.h / REF_H) * 100}%`,
                  zIndex: (el.z || 0) + 1,
                }}
                onPointerDown={(e) => onDown(e, el)}
              >
                <div className="db-el-wrap__inner">
                  <DesignElement el={{ ...el, x: 0, y: 0, w: REF_W, h: REF_H }} card={previewCard} />
                </div>
                {sel === el.id
                  ? ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => (
                      <i
                        key={h}
                        className={`db-handle db-handle--${h}`}
                        onPointerDown={(e) => onDown(e, el, h)}
                      />
                    ))
                  : null}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- inspector ---------- */
function Inspector({ design, setDesign, sel, updateEl, removeEl, dupeEl, bumpZ }) {
  const el = design.elements?.find((e) => e.id === sel);

  if (!el) {
    const av = design.availability || { mode: 'always' };
    const toDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
    return (
      <div className="db-inspector">
        <h3>Design</h3>
        <Row label="Status">
          <Select
            value={design.status}
            onChange={(v) => setDesign((d) => ({ ...d, status: v }))}
            options={['draft', 'published', 'archived']}
          />
        </Row>
        <Row label="Card background">
          <ColorField
            value={design.canvas?.background}
            onChange={(v) => setDesign((d) => ({ ...d, canvas: { ...d.canvas, background: v } }))}
          />
        </Row>
        <Row label="Availability">
          <Select
            value={av.mode || 'always'}
            onChange={(v) =>
              setDesign((d) => ({ ...d, availability: { ...d.availability, mode: v } }))
            }
            options={[
              { value: 'always', label: 'Always' },
              { value: 'window', label: 'Time window' },
            ]}
          />
        </Row>
        {av.mode === 'window' ? (
          <>
            <Row label="Available from">
              <input
                type="date"
                className="input"
                value={toDate(av.start)}
                onChange={(e) =>
                  setDesign((d) => ({
                    ...d,
                    availability: {
                      ...d.availability,
                      start: e.target.value ? new Date(e.target.value).toISOString() : null,
                    },
                  }))
                }
              />
            </Row>
            <Row label="Available until">
              <input
                type="date"
                className="input"
                value={toDate(av.end)}
                onChange={(e) =>
                  setDesign((d) => ({
                    ...d,
                    availability: {
                      ...d.availability,
                      end: e.target.value
                        ? new Date(`${e.target.value}T23:59:59`).toISOString()
                        : null,
                    },
                  }))
                }
              />
            </Row>
          </>
        ) : null}
        <p className="hint">Select an element on the canvas to edit it.</p>
      </div>
    );
  }

  const set = (patch) => updateEl(el.id, patch);
  const isText = el.type === 'text' || el.type === 'field';
  const isShape = el.type === 'rect' || el.type === 'band' || el.type === 'line';

  return (
    <div className="db-inspector">
      <div className="db-inspector__head">
        <h3>{ELEMENT_LABELS[el.type]}</h3>
        <div className="db-inspector__z">
          <button className="btn btn--sm btn--ghost" onClick={() => bumpZ(el.id, -1)} title="Send back">
            ↓
          </button>
          <button className="btn btn--sm btn--ghost" onClick={() => bumpZ(el.id, 1)} title="Bring forward">
            ↑
          </button>
          <button className="btn btn--sm btn--ghost" onClick={() => dupeEl(el.id)} title="Duplicate">
            ⧉
          </button>
          <button className="btn btn--sm btn--ghost" onClick={() => removeEl(el.id)} title="Delete">
            ✕
          </button>
        </div>
      </div>

      <div className="db-grid4">
        <Row label="X">
          <NumberField value={el.x} onChange={(n) => set({ x: n ?? 0 })} min={0} max={REF_W} />
        </Row>
        <Row label="Y">
          <NumberField value={el.y} onChange={(n) => set({ y: n ?? 0 })} min={0} max={REF_H} />
        </Row>
        <Row label="W">
          <NumberField value={el.w} onChange={(n) => set({ w: n ?? MIN })} min={MIN} max={REF_W} />
        </Row>
        <Row label="H">
          <NumberField value={el.h} onChange={(n) => set({ h: n ?? MIN })} min={MIN} max={REF_H} />
        </Row>
      </div>
      <Row label="Rotation">
        <NumberField value={el.rotation || 0} onChange={(n) => set({ rotation: n ?? 0 })} min={-180} max={180} />
      </Row>

      {el.type === 'field' ? (
        <Row label="Field">
          <Select
            value={el.bind}
            onChange={(v) => set({ bind: v })}
            options={BOUND_FIELDS.map((f) => ({ value: f.key, label: f.label }))}
          />
        </Row>
      ) : null}
      {el.type === 'text' ? (
        <Row label="Text">
          <input className="input" value={el.text || ''} onChange={(e) => set({ text: e.target.value })} />
        </Row>
      ) : null}

      {isText ? (
        <>
          <Row label="Prefix">
            <input className="input" value={el.prefix || ''} onChange={(e) => set({ prefix: e.target.value })} />
          </Row>
          <Row label="Suffix">
            <input className="input" value={el.suffix || ''} onChange={(e) => set({ suffix: e.target.value })} />
          </Row>
          <Row label="Font">
            <Select
              value={el.font || 'body'}
              onChange={(v) => set({ font: v })}
              options={FONT_ROLES.map((f) => ({ value: f.key, label: f.label }))}
            />
          </Row>
          <div className="db-grid4">
            <Row label="Size">
              <NumberField value={el.size || 16} onChange={(n) => set({ size: n ?? 16 })} min={4} max={120} />
            </Row>
            <Row label="Weight">
              <Select
                value={String(el.weight || 700)}
                onChange={(v) => set({ weight: Number(v) })}
                options={['400', '500', '700', '800']}
              />
            </Row>
          </div>
          <Row label="Align">
            <Select
              value={el.align || 'left'}
              onChange={(v) => set({ align: v })}
              options={['left', 'center', 'right']}
            />
          </Row>
          <Row label="Colour">
            <ColorField value={el.color} onChange={(v) => set({ color: v })} />
          </Row>
          <label className="db-row db-row--check">
            <input
              type="checkbox"
              checked={!!el.uppercase}
              onChange={(e) => set({ uppercase: e.target.checked })}
            />
            <span>Uppercase</span>
          </label>
        </>
      ) : null}

      {el.type === 'stars' ? (
        <>
          <div className="db-grid4">
            <Row label="Out of">
              <Select value={String(el.max || 5)} onChange={(v) => set({ max: Number(v) })} options={['3', '5', '10']} />
            </Row>
            <Row label="Size">
              <NumberField value={el.size || 16} onChange={(n) => set({ size: n ?? 16 })} min={6} max={60} />
            </Row>
          </div>
          <Row label="Scale">
            <Select
              value={el.starMode || 'scaled'}
              onChange={(v) => set({ starMode: v })}
              options={[
                { value: 'scaled', label: 'Scaled to stars' },
                { value: 'exact', label: 'Exact count' },
              ]}
            />
          </Row>
          <Row label="Filled colour">
            <ColorField value={el.filled} onChange={(v) => set({ filled: v })} />
          </Row>
          <Row label="Empty colour">
            <ColorField value={el.empty} onChange={(v) => set({ empty: v })} allowClear />
          </Row>
        </>
      ) : null}

      {el.type === 'chips' ? (
        <>
          <div className="db-grid4">
            <Row label="Max">
              <NumberField value={el.max || 4} onChange={(n) => set({ max: n ?? 4 })} min={1} max={10} />
            </Row>
            <Row label="Size">
              <NumberField value={el.size || 8} onChange={(n) => set({ size: n ?? 8 })} min={5} max={20} />
            </Row>
          </div>
          <Row label="Fill">
            <ColorField value={el.bg} onChange={(v) => set({ bg: v })} />
          </Row>
          <Row label="Text">
            <ColorField value={el.textColor} onChange={(v) => set({ textColor: v })} />
          </Row>
          <Row label="Border">
            <ColorField value={el.borderColor} onChange={(v) => set({ borderColor: v })} />
          </Row>
          <Row label="Radius">
            <NumberField value={el.radius ?? 999} onChange={(n) => set({ radius: n ?? 0 })} min={0} max={999} />
          </Row>
        </>
      ) : null}

      {isShape || el.type === 'star' ? (
        <>
          <Row label="Fill">
            <ColorField value={el.fill} onChange={(v) => set({ fill: v })} />
          </Row>
          <Row label="Stroke">
            <ColorField value={el.stroke} onChange={(v) => set({ stroke: v })} allowClear />
          </Row>
          <div className="db-grid4">
            <Row label="Stroke w">
              <NumberField
                value={el.strokeWidth || 0}
                onChange={(n) => set({ strokeWidth: n ?? 0 })}
                min={0}
                max={12}
              />
            </Row>
            {isShape ? (
              <Row label="Radius">
                <NumberField value={el.radius || 0} onChange={(n) => set({ radius: n ?? 0 })} min={0} max={80} />
              </Row>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ---------- page ---------- */
export default function DesignEditor() {
  const { slug } = useParams();
  const { push } = useToast();
  const { data, error, loading } = useQuery(
    `admin:design:${slug}`,
    () => Deckr.getDesignAdmin(slug),
    { ttl: 5000 }
  );

  const [design, setDesign] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [sel, setSel] = useState(null);
  const [sampleIdx, setSampleIdx] = useState(0);
  const [snap, setSnap] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.design && !design) setDesign(data.design);
  }, [data, design]);

  const grid = design?.canvas?.grid || 8;
  const previewCard = useMemo(
    () => ({ ...SAMPLE_CARDS[sampleIdx % SAMPLE_CARDS.length], theme: 'butter' }),
    [sampleIdx]
  );

  const mutate = useCallback((fn) => {
    setDesign((d) => (d ? fn(d) : d));
    setDirty(true);
  }, []);

  const updateEl = useCallback(
    (id, patch) => mutate((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    [mutate]
  );
  const removeEl = useCallback(
    (id) => {
      mutate((d) => ({ ...d, elements: d.elements.filter((e) => e.id !== id) }));
      setSel(null);
    },
    [mutate]
  );
  const dupeEl = useCallback(
    (id) =>
      mutate((d) => {
        const src = d.elements.find((e) => e.id === id);
        if (!src) return d;
        const copy = { ...src, id: uid(), x: src.x + grid, y: src.y + grid, z: (src.z || 0) + 1 };
        return { ...d, elements: [...d.elements, copy] };
      }),
    [mutate, grid]
  );
  const bumpZ = useCallback(
    (id, dir) => mutate((d) => ({ ...d, elements: d.elements.map((e) => (e.id === id ? { ...e, z: Math.max(0, (e.z || 0) + dir) } : e)) })),
    [mutate]
  );
  const addElement = (type) => {
    const elNew = defaultsFor(type, grid);
    mutate((d) => ({ ...d, elements: [...(d.elements || []), elNew] }));
    setSel(elNew.id);
  };

  // keyboard nudge / delete / duplicate
  useEffect(() => {
    if (!sel) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const step = e.shiftKey ? grid * 5 : grid;
      if (e.key === 'ArrowLeft') updateEl(sel, adjust(design, sel, { x: -step }));
      else if (e.key === 'ArrowRight') updateEl(sel, adjust(design, sel, { x: step }));
      else if (e.key === 'ArrowUp') updateEl(sel, adjust(design, sel, { y: -step }));
      else if (e.key === 'ArrowDown') updateEl(sel, adjust(design, sel, { y: step }));
      else if (e.key === 'Delete' || e.key === 'Backspace') removeEl(sel);
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        dupeEl(sel);
      } else if (e.key === 'Escape') setSel(null);
      else if (e.key === '[') bumpZ(sel, -1);
      else if (e.key === ']') bumpZ(sel, 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel, grid, design, updateEl, removeEl, dupeEl, bumpZ]);

  const save = async () => {
    if (!design) return;
    setSaving(true);
    try {
      const { design: saved } = await Deckr.updateDesign(slug, {
        name: design.name,
        status: design.status,
        canvas: design.canvas,
        elements: design.elements,
        availability: design.availability,
      });
      setDesign(saved);
      setDirty(false);
      dropCache('admin:designs');
      dropCache(`admin:design:${slug}`);
      dropCache('designs');
      dropCache(`design:${slug}`);
      dropCache('cards');
      dropCache('community');
      push('Design saved');
    } catch (err) {
      push(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || (!design && !error)) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  if (!design) return null;

  return (
    <div className="db-editor">
      <div className="db-toolbar">
        <Link to="/admin/designs" className="btn btn--sm btn--ghost">
          ‹ Designs
        </Link>
        <input
          className="input db-toolbar__name"
          value={design.name}
          onChange={(e) => mutate((d) => ({ ...d, name: e.target.value }))}
        />
        <span className={`status-pill status-pill--${design.status}`}>{design.status}</span>
        <div className="db-toolbar__spacer" />
        <label className="db-row--check">
          <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
          <span>Snap ({grid})</span>
        </label>
        <Select
          value={String(sampleIdx)}
          onChange={(v) => setSampleIdx(Number(v))}
          aria-label="Preview data"
          options={SAMPLE_CARDS.map((c, i) => ({ value: String(i), label: `Preview: ${c.projectName}` }))}
        />
        <button className="btn btn--sm" disabled={!dirty || saving} onClick={save}>
          {saving ? 'Saving' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>

      <div className="db-editor__body">
        <div className="db-palette">
          <h3>Add</h3>
          {Object.keys(ELEMENT_LABELS).map((t) => (
            <button key={t} className="btn btn--sm btn--ghost" onClick={() => addElement(t)}>
              {ELEMENT_LABELS[t]}
            </button>
          ))}
        </div>

        <Stage
          design={design}
          sel={sel}
          setSel={setSel}
          previewCard={previewCard}
          updateEl={updateEl}
          grid={grid}
          snap={snap}
        />

        <Inspector
          design={design}
          setDesign={mutate}
          sel={sel}
          updateEl={updateEl}
          removeEl={removeEl}
          dupeEl={dupeEl}
          bumpZ={bumpZ}
        />
      </div>
    </div>
  );
}

function adjust(design, id, delta) {
  const el = design.elements.find((e) => e.id === id);
  if (!el) return {};
  const out = {};
  if (delta.x != null) out.x = Math.max(0, Math.min(REF_W - el.w, el.x + delta.x));
  if (delta.y != null) out.y = Math.max(0, Math.min(REF_H - el.h, el.y + delta.y));
  return out;
}
