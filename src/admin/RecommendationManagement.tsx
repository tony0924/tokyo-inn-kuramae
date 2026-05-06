import { useMemo, useState, type FormEvent } from 'react';
import {
  createRecommendation,
  deleteRecommendation,
  setRecommendationActive,
  updateRecommendation,
  type RecommendationInput,
} from '@/lib/recommendations';
import { useRecommendations } from './useRecommendations';
import { mapPlaces, type MapKey, type Place } from '@/guest/data/mapPlaces';
import type { Recommendation, RecommendationCategory, RecommendationSection } from '@/types';

type FormState = RecommendationInput & { active: boolean };
type SortKey = 'section' | 'category' | 'name' | 'source' | 'note' | 'rating' | 'sortOrder' | 'status';
type SortDirection = 'asc' | 'desc';

const SECTION_LABELS: Record<RecommendationSection, string> = {
  services: '超市 / 便利商店',
  restaurant: '餐廳 / 咖啡廳',
  cityguide: '景點',
};

const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  convenience: '便利商店',
  supermarket: '超市',
  restaurant: '餐廳',
  cafe: '咖啡廳 / 甜點',
  sight: '景點',
};

const SECTION_CATEGORIES: Record<RecommendationSection, RecommendationCategory[]> = {
  services: ['convenience', 'supermarket'],
  restaurant: ['restaurant', 'cafe'],
  cityguide: ['sight'],
};

const EMPTY_FORM: FormState = {
  section: 'restaurant',
  category: 'restaurant',
  name: '',
  lat: 35.7073,
  lng: 139.7876,
  url: '',
  note: '',
  rating: 1,
  sortOrder: 100,
  active: true,
};

export function RecommendationManagement() {
  const { recommendations, loading } = useRecommendations();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importingDefaults, setImportingDefaults] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const sortedRecommendations = useMemo(
    () =>
      [...recommendations].sort((a, b) => {
        const direction = sortDirection === 'asc' ? 1 : -1;
        const primary = compareRecommendations(a, b, sortKey) * direction;
        if (primary !== 0) return primary;
        return a.name.localeCompare(b.name, 'zh-Hant') * direction;
      }),
    [recommendations, sortDirection, sortKey]
  );

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('asc');
  }

  function renderSortHeader(label: string, key: SortKey) {
    const active = sortKey === key;
    const arrow = active ? (sortDirection === 'asc' ? '↑' : '↓') : '';
    return (
      <button
        type="button"
        className={`table-sort-button${active ? ' active' : ''}`}
        onClick={() => toggleSort(key)}
      >
        <span>{label}</span>
        <span className="table-sort-indicator" aria-hidden="true">{arrow}</span>
      </button>
    );
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key === 'section') {
      const section = value as RecommendationSection;
      setForm((current) => ({
        ...current,
        section,
        category: SECTION_CATEGORIES[section][0],
      }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (editingId) {
        await updateRecommendation(editingId, form);
        setMessage(`已更新「${form.name}」`);
      } else {
        await createRecommendation(form);
        setMessage(`已新增「${form.name}」`);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存推薦地點失敗');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: Recommendation) {
    setEditingId(item.id);
    setForm({
      section: item.section,
      category: item.category,
      name: item.name,
      lat: item.lat,
      lng: item.lng,
      url: item.url,
      note: item.note,
      rating: item.rating ?? 1,
      sortOrder: item.sortOrder,
      active: item.active,
    });
    setMessage(null);
    setError(null);
  }

  async function handleDelete(item: Recommendation) {
    if (!confirm(`確定刪除「${item.name}」嗎？`)) return;
    setError(null);
    try {
      await deleteRecommendation(item.id);
      setMessage(`已刪除「${item.name}」`);
      if (editingId === item.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除推薦地點失敗');
    }
  }

  async function handleImportDefaults() {
    setImportingDefaults(true);
    setMessage(null);
    setError(null);
    try {
      const existingDefaultKeys = new Set(
        recommendations.map((item) => item.defaultKey).filter(Boolean)
      );
      const defaults = getDefaultRecommendationInputs().filter(
        (item) => !existingDefaultKeys.has(item.defaultKey)
      );

      for (const item of defaults) {
        await createRecommendation(item);
      }

      setMessage(
        defaults.length > 0
          ? `已匯入 ${defaults.length} 筆現有預設地點，現在可以編輯、停用或刪除。`
          : '現有預設地點都已經在清單中。'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯入預設地點失敗');
    } finally {
      setImportingDefaults(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">推薦地點</h1>
          <p style={{ color: 'var(--text-mid)', fontSize: 13, marginTop: 8 }}>
            可管理房客頁面的餐廳、景點、超市。若要編輯原本已有的地點，請先匯入目前預設清單。
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={handleImportDefaults}
          disabled={importingDefaults}
        >
          {importingDefaults ? '匯入中…' : '匯入目前預設清單'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="admin-table" style={{ padding: 18, marginBottom: 24 }}>
        <h2 style={sectionTitleStyle}>{editingId ? '編輯推薦地點' : '新增推薦地點'}</h2>
        <div className="form-grid">
          <div className="form-field">
            <label>分頁 *</label>
            <select
              value={form.section}
              onChange={(e) => updateField('section', e.target.value as RecommendationSection)}
            >
              {Object.entries(SECTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>分類 *</label>
            <select
              value={form.category}
              onChange={(e) => updateField('category', e.target.value as RecommendationCategory)}
            >
              {SECTION_CATEGORIES[form.section].map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>名稱 *</label>
            <input
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="例如：淺草炸肉餅"
              required
            />
          </div>
          <div className="form-field">
            <label>推薦星等</label>
            <input
              type="number"
              min={1}
              max={5}
              value={form.rating}
              onChange={(e) => updateField('rating', Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label>排序</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => updateField('sortOrder', Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label>緯度 lat *</label>
            <input
              type="number"
              step="0.000001"
              value={form.lat}
              onChange={(e) => updateField('lat', Number(e.target.value))}
              required
            />
          </div>
          <div className="form-field">
            <label>經度 lng *</label>
            <input
              type="number"
              step="0.000001"
              value={form.lng}
              onChange={(e) => updateField('lng', Number(e.target.value))}
              required
            />
          </div>
          <div className="form-field full">
            <label>Google Maps 連結 *</label>
            <input
              value={form.url}
              onChange={(e) => updateField('url', e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              required
            />
          </div>
          <div className="form-field full">
            <label>備註</label>
            <textarea
              value={form.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="例如：排隊名店、適合早餐、雨天備案"
            />
          </div>
          {editingId && (
            <div className="form-field">
              <label>狀態</label>
              <select
                value={form.active ? 'active' : 'inactive'}
                onChange={(e) => updateField('active', e.target.value === 'active')}
              >
                <option value="active">顯示中</option>
                <option value="inactive">停用</option>
              </select>
            </div>
          )}
        </div>

        {error && <p className="field-error" style={{ marginTop: 14 }}>{error}</p>}
        {message && (
          <p style={{ color: 'var(--gold-light)', marginTop: 14, fontSize: 13 }}>{message}</p>
        )}

        <div className="form-actions">
          {editingId && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              取消編輯
            </button>
          )}
          <button type="submit" className="btn-gold" disabled={saving}>
            {saving ? '儲存中…' : editingId ? '儲存變更' : '新增推薦'}
          </button>
        </div>
      </form>

      {loading ? (
        <p style={{ color: 'var(--text-mid)' }}>載入中…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>{renderSortHeader('分頁', 'section')}</th>
              <th>{renderSortHeader('分類', 'category')}</th>
              <th>{renderSortHeader('名稱', 'name')}</th>
              <th>{renderSortHeader('來源', 'source')}</th>
              <th>{renderSortHeader('備註', 'note')}</th>
              <th>{renderSortHeader('星等', 'rating')}</th>
              <th>{renderSortHeader('排序', 'sortOrder')}</th>
              <th>{renderSortHeader('狀態', 'status')}</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecommendations.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ color: 'var(--text-mid)' }}>
                  尚未匯入或新增推薦。按上方「匯入目前預設清單」後，就能看到現在房客頁面的現有地點。
                </td>
              </tr>
            ) : (
              sortedRecommendations.map((item) => (
                <tr key={item.id}>
                  <td>{SECTION_LABELS[item.section]}</td>
                  <td>{CATEGORY_LABELS[item.category]}</td>
                  <td style={{ color: 'var(--text)' }}>
                    <a href={item.url} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                      {item.name}
                    </a>
                  </td>
                  <td style={{ color: 'var(--text-mid)' }}>
                    {item.source === 'default' ? '預設清單' : '後台新增'}
                  </td>
                  <td style={{ color: 'var(--text-mid)', maxWidth: 320 }}>{item.note || '—'}</td>
                  <td style={{ color: 'var(--gold-light)' }}>{renderStars(item.rating ?? 1)}</td>
                  <td style={{ color: 'var(--text-mid)' }}>{item.sortOrder}</td>
                  <td>
                    <span className={`badge ${item.active ? 'paid' : 'role-pending'}`}>
                      {item.active ? '顯示中' : '已停用'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button type="button" className="btn-ghost" onClick={() => startEdit(item)}>
                        編輯
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setRecommendationActive(item.id, !item.active)}
                      >
                        {item.active ? '停用' : '啟用'}
                      </button>
                      <button type="button" className="btn-danger" onClick={() => handleDelete(item)}>
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

const sectionTitleStyle = {
  fontFamily: "'Noto Serif TC', serif",
  fontSize: 18,
  color: 'var(--gold-light)',
  marginBottom: 16,
};

function getRecommendationStatusRank(active: boolean): number {
  return active ? 0 : 1;
}

function compareText(a: string, b: string): number {
  return (a || '').localeCompare(b || '', 'zh-Hant');
}

function compareRecommendations(a: Recommendation, b: Recommendation, sortKey: SortKey): number {
  switch (sortKey) {
    case 'section':
      return compareText(SECTION_LABELS[a.section], SECTION_LABELS[b.section]);
    case 'category':
      return compareText(CATEGORY_LABELS[a.category], CATEGORY_LABELS[b.category]);
    case 'name':
      return compareText(a.name, b.name);
    case 'source':
      return compareText(a.source === 'default' ? '預設清單' : '後台新增', b.source === 'default' ? '預設清單' : '後台新增');
    case 'note':
      return compareText(a.note, b.note);
    case 'rating':
      return (a.rating ?? 1) - (b.rating ?? 1);
    case 'sortOrder':
      return a.sortOrder - b.sortOrder;
    case 'status':
      return getRecommendationStatusRank(a.active) - getRecommendationStatusRank(b.active);
    default:
      return 0;
  }
}

function renderStars(rating: number): string {
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
  return '★'.repeat(safeRating);
}

function getDefaultRecommendationInputs(): Array<RecommendationInput & { defaultKey: string }> {
  return (Object.entries(mapPlaces) as Array<[MapKey, Place[]]>).flatMap(([section, places]) =>
    places.map((place, index) => {
      const category = place.category ?? SECTION_CATEGORIES[section][0];
      return {
        section,
        category,
        source: 'default',
        defaultKey: makeDefaultKey(section, index, place.name),
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        url: place.url,
        note: place.note ?? '',
        rating: place.rating ?? 1,
        sortOrder: index + 1,
      };
    })
  );
}

function makeDefaultKey(section: MapKey, index: number, name: string): string {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `default-${section}-${index + 1}-${safeName}`;
}
