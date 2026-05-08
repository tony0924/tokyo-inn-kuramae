import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  createRecommendation,
  deleteRecommendation,
  setRecommendationActive,
  updateRecommendation,
  type RecommendationInput,
} from '@/lib/recommendations';
import { lookupGoogleMapPlace } from '@/lib/googleMaps';
import { useRecommendations } from './useRecommendations';
import { mapPlaces, type MapKey, type Place } from '@/guest/data/mapPlaces';
import type { Recommendation, RecommendationCategory, RecommendationSection } from '@/types';

type FormState = RecommendationInput & { active: boolean };
type SortKey = 'section' | 'category' | 'name' | 'source' | 'note' | 'rating' | 'sortOrder' | 'status';
type SortDirection = 'asc' | 'desc';
type FilterKey = 'all' | RecommendationCategory;

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
  placeId: '',
  address: '',
  name: '',
  lat: 35.7073,
  lng: 139.7876,
  url: '',
  note: '',
  rating: 3,
  sortOrder: 1,
  active: true,
};

export function RecommendationManagement() {
  const { recommendations, loading } = useRecommendations();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importingDefaults, setImportingDefaults] = useState(false);
  const [lookingUpPlace, setLookingUpPlace] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterKey, setFilterKey] = useState<FilterKey>('all');
  const formRef = useRef<HTMLFormElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const filteredRecommendations = useMemo(
    () =>
      filterKey === 'all'
        ? recommendations
        : recommendations.filter((item) => item.category === filterKey),
    [filterKey, recommendations]
  );
  const sortedRecommendations = useMemo(
    () =>
      [...filteredRecommendations].sort((a, b) => {
        const direction = sortDirection === 'asc' ? 1 : -1;
        const primary = compareRecommendations(a, b, sortKey) * direction;
        if (primary !== 0) return primary;
        return a.name.localeCompare(b.name, 'zh-Hant') * direction;
      }),
    [filteredRecommendations, sortDirection, sortKey]
  );

  useEffect(() => {
    if (!editingId) return;
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 220);
  }, [editingId]);

  useEffect(() => {
    if (editingId) return;
    setForm((current) => ({
      ...current,
      sortOrder: getNextAvailableSortOrder(current.category, recommendations),
    }));
  }, [editingId, form.category, form.section, recommendations]);

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
      const editingItem = editingId
        ? recommendations.find((item) => item.id === editingId) ?? null
        : null;
      const conflict = recommendations.find(
        (item) =>
          item.category === form.category &&
          item.sortOrder === form.sortOrder &&
          item.id !== editingId
      );
      if (conflict && !editingId) {
        throw new Error(
          `「${CATEGORY_LABELS[form.category]}」分類內的排序 ${form.sortOrder} 已被「${conflict.name}」使用，請改成其他數字。`
        );
      }

      if (editingId) {
        if (!editingItem) {
          throw new Error('找不到要編輯的推薦地點，請重新整理後再試一次');
        }
        if (conflict && conflict.sortOrder !== editingItem.sortOrder) {
          await updateRecommendation(conflict.id, {
            section: conflict.section,
            category: conflict.category,
            placeId: conflict.placeId ?? '',
            address: conflict.address ?? '',
            name: conflict.name,
            lat: conflict.lat,
            lng: conflict.lng,
            url: conflict.url,
            note: conflict.note,
            rating: conflict.rating ?? 3,
            sortOrder: editingItem.sortOrder,
            active: conflict.active,
          });
        }
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

  async function handleLookupPlace() {
    if (!form.url.trim()) {
      setError('請先貼上 Google Maps 商家連結');
      return;
    }

    setLookingUpPlace(true);
    setError(null);
    setMessage(null);

    try {
      const place = await lookupGoogleMapPlace(form.url);
      if (place.lat == null || place.lng == null || !place.name) {
        throw new Error('Google Maps 回傳的資料不完整，請改用手動輸入。');
      }
      const lat = place.lat;
      const lng = place.lng;

      setForm((current) => ({
        ...current,
        placeId: place.placeId || current.placeId,
        address: place.address || current.address,
        name: place.name || current.name,
        lat,
        lng,
        url: current.url.trim(),
      }));
      setMessage(`已自動帶入「${place.name}」的基本資料`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Maps 自動帶入失敗');
    } finally {
      setLookingUpPlace(false);
    }
  }

  function startEdit(item: Recommendation) {
    setEditingId(item.id);
    setForm({
      section: item.section,
      category: item.category,
      placeId: item.placeId ?? '',
      address: item.address ?? '',
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

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="admin-table"
        style={{ padding: 18, marginBottom: 24, scrollMarginTop: 96 }}
      >
        <h2 style={sectionTitleStyle}>{editingId ? '編輯推薦地點' : '新增推薦地點'}</h2>
        {editingId && (
          <p style={{ color: 'var(--gold-light)', fontSize: 13, marginBottom: 14 }}>
            已帶入要編輯的資料，修改後直接按「儲存變更」即可。
          </p>
        )}
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
              ref={nameInputRef}
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="例如：淺草炸肉餅"
              required
            />
          </div>
          <div className="form-field">
            <label>Google Place ID</label>
            <input
              value={form.placeId ?? ''}
              onChange={(e) => updateField('placeId', e.target.value)}
              placeholder="自動帶入後會填入"
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
            <p className="helper-text">切換分類時會自動帶入該分類目前可用的最小排序值。</p>
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
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                value={form.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                required
                style={{ flex: '1 1 380px' }}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={handleLookupPlace}
                disabled={lookingUpPlace}
                style={{ minWidth: 120 }}
              >
                {lookingUpPlace ? '查詢中…' : '自動帶入'}
              </button>
            </div>
            <p className="helper-text">最省錢版本目前只支援「貼 Google Maps 連結後手動按自動帶入」。</p>
          </div>
          <div className="form-field full">
            <label>地址</label>
            <input
              value={form.address ?? ''}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="自動帶入後會填入，可手動修改"
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
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              type="button"
              className={filterKey === 'all' ? 'btn-gold' : 'btn-ghost'}
              onClick={() => setFilterKey('all')}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              全部
            </button>
            {(Object.entries(CATEGORY_LABELS) as Array<[RecommendationCategory, string]>).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filterKey === value ? 'btn-gold' : 'btn-ghost'}
                  onClick={() => setFilterKey(value)}
                  style={{ padding: '6px 14px', fontSize: 13 }}
                >
                  {label}
                </button>
              )
            )}
          </div>

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
                    {filterKey === 'all'
                      ? '尚未匯入或新增推薦。按上方「匯入目前預設清單」後，就能看到現在房客頁面的現有地點。'
                      : `目前沒有「${CATEGORY_LABELS[filterKey]}」分類的推薦地點。`}
                  </td>
                </tr>
              ) : (
                sortedRecommendations.map((item) => (
                  <tr
                    key={item.id}
                    style={editingId === item.id ? { outline: '1px solid rgba(201,168,76,0.4)' } : undefined}
                  >
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
        </>
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

function getNextAvailableSortOrder(
  category: RecommendationCategory,
  recommendations: Recommendation[]
): number {
  const used = new Set(
    recommendations
      .filter((item) => item.category === category)
      .map((item) => item.sortOrder)
      .filter((value) => Number.isInteger(value) && value > 0)
  );

  let next = 1;
  while (used.has(next)) {
    next += 1;
  }
  return next;
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
  return (Object.entries(mapPlaces) as Array<[MapKey, Place[]]>).flatMap(([section, places]) => {
    const categoryCounts = new Map<RecommendationCategory, number>();
    return places.map((place, index) => {
      const category = place.category ?? SECTION_CATEGORIES[section][0];
      const nextSortOrder = (categoryCounts.get(category) ?? 0) + 1;
      categoryCounts.set(category, nextSortOrder);
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
        sortOrder: nextSortOrder,
      };
    });
  });
}

function makeDefaultKey(section: MapKey, index: number, name: string): string {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `default-${section}-${index + 1}-${safeName}`;
}
