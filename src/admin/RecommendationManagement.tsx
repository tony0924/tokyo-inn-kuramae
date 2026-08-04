import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type Ref,
} from 'react';
import { useAuth } from '@/auth/AuthProvider';
import {
  activateAndReorderRecommendations,
  archiveRecommendations,
  bulkSetRecommendationActive,
  createRecommendation,
  deleteRecommendation,
  reorderRecommendations,
  setRecommendationActive,
  updateRecommendation,
  type RecommendationInput,
} from '@/lib/recommendations';
import { lookupGoogleMapPlace } from '@/lib/googleMaps';
import { useRecommendations } from './useRecommendations';
import { mapPlaces, type MapKey, type Place } from '@/guest/data/mapPlaces';
import type {
  Recommendation,
  RecommendationCategory,
  RecommendationSection,
} from '@/types';

type FormState = RecommendationInput & { active: boolean };
type CategoryFilter = 'all' | RecommendationCategory;
type StatusFilter = 'all' | 'active' | 'inactive' | 'archived';
type MoveDirection = 'up' | 'down' | 'first' | 'last';

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

const CATEGORY_ICONS: Record<RecommendationCategory, string> = {
  convenience: '🏪',
  supermarket: '🛒',
  restaurant: '🍜',
  cafe: '☕',
  sight: '🗺️',
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
  const { user } = useAuth();
  const { recommendations, loading } = useRecommendations();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [lookingUpPlace, setLookingUpPlace] = useState(false);
  const [importingDefaults, setImportingDefaults] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const actorUid = user?.uid ?? null;

  const counts = useMemo(() => {
    const archived = recommendations.filter(isArchived).length;
    const active = recommendations.filter((item) => item.active && !isArchived(item)).length;
    const inactive = recommendations.length - active - archived;
    return { total: recommendations.length, active, inactive, archived };
  }, [recommendations]);

  const filteredRecommendations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('zh-Hant');
    return recommendations.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter === 'all' && isArchived(item)) return false;
      if (statusFilter === 'active' && (!item.active || isArchived(item))) return false;
      if (statusFilter === 'inactive' && (item.active || isArchived(item))) return false;
      if (statusFilter === 'archived' && !isArchived(item)) return false;
      if (!normalizedQuery) return true;
      return [item.name, item.note, item.address, CATEGORY_LABELS[item.category]]
        .some((value) => value?.toLocaleLowerCase('zh-Hant').includes(normalizedQuery));
    });
  }, [categoryFilter, query, recommendations, statusFilter]);

  const groupedRecommendations = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as RecommendationCategory[])
        .map((category) => ({
          category,
          items: filteredRecommendations
            .filter((item) => item.category === category)
            .sort(compareRecommendationOrder),
        }))
        .filter((group) => group.items.length > 0),
    [filteredRecommendations]
  );

  const drawerDirty = serializeForm(form) !== serializeForm(initialForm);

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  function openCreate() {
    const category = categoryFilter === 'all' ? 'restaurant' : categoryFilter;
    const section = sectionForCategory(category);
    const next = {
      ...EMPTY_FORM,
      section,
      category,
      sortOrder: nextSortOrder(category, recommendations),
    };
    setEditingId(null);
    setForm(next);
    setInitialForm(next);
    setDrawerOpen(true);
    clearFeedback();
    window.setTimeout(() => nameInputRef.current?.focus(), 120);
  }

  function openEdit(item: Recommendation) {
    const next: FormState = {
      section: item.section,
      category: item.category,
      source: item.source,
      defaultKey: item.defaultKey,
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
    };
    setEditingId(item.id);
    setForm(next);
    setInitialForm(next);
    setDrawerOpen(true);
    clearFeedback();
    window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 120);
  }

  function closeDrawer(force = false) {
    if (!force && drawerDirty && !confirm('尚有未儲存的修改，確定要關閉嗎？')) return;
    setDrawerOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setInitialForm(EMPTY_FORM);
    setError(null);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (key === 'section') {
      const section = value as RecommendationSection;
      const category = SECTION_CATEGORIES[section][0];
      setForm((current) => ({
        ...current,
        section,
        category,
        sortOrder: nextSortOrder(category, recommendations),
      }));
      return;
    }
    if (key === 'category') {
      const category = value as RecommendationCategory;
      setForm((current) => ({
        ...current,
        category,
        section: sectionForCategory(category),
        sortOrder:
          category === initialForm.category
            ? initialForm.sortOrder
            : nextSortOrder(category, recommendations),
      }));
      return;
    }
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleLookupPlace() {
    if (!form.url.trim()) {
      setError('請先貼上 Google Maps 商家連結');
      return;
    }
    setLookingUpPlace(true);
    clearFeedback();
    try {
      const place = await lookupGoogleMapPlace(form.url);
      if (place.lat == null || place.lng == null || !place.name) {
        throw new Error('Google Maps 回傳的資料不完整，請展開進階設定手動輸入。');
      }
      setForm((current) => ({
        ...current,
        placeId: place.placeId || current.placeId,
        address: place.address || current.address,
        name: place.name || current.name,
        lat: place.lat!,
        lng: place.lng!,
        url: current.url.trim(),
      }));
      setMessage(`已自動帶入「${place.name}」的基本資料`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Maps 自動帶入失敗');
    } finally {
      setLookingUpPlace(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    clearFeedback();
    try {
      const duplicate = findDuplicate(form, recommendations, editingId);
      if (duplicate) {
        throw new Error(`這個 Google Maps 地點可能已存在：「${duplicate.name}」`);
      }
      if (!isGoogleMapsUrl(form.url)) {
        throw new Error('請使用有效的 Google Maps 連結');
      }

      if (editingId) {
        await updateRecommendation(editingId, form, { updatedBy: actorUid });
        if (initialForm.category !== form.category) {
          await normalizeCategory(initialForm.category, recommendations, actorUid, editingId);
        }
        setMessage(`已更新「${form.name}」`);
      } else {
        await createRecommendation(form, { updatedBy: actorUid });
        setMessage(`已新增「${form.name}」`);
      }
      closeDrawer(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存推薦地點失敗');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: Recommendation) {
    setBusy(item.id, true);
    clearFeedback();
    try {
      if (isArchived(item)) {
        await activateItems([item.id]);
        setMessage(`已恢復並顯示「${item.name}」`);
      } else if (!item.active) {
        await activateItems([item.id]);
        setMessage(`已顯示「${item.name}」`);
      } else {
        await setRecommendationActive(item.id, false, { updatedBy: actorUid });
        await normalizeCategoriesAfterRemoval([item.id]);
        setMessage(`已停用「${item.name}」`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新狀態失敗');
    } finally {
      setBusy(item.id, false);
    }
  }

  async function handleArchive(item: Recommendation) {
    if (!confirm(`要將「${item.name}」移到封存區嗎？之後仍可恢復。`)) return;
    setBusy(item.id, true);
    try {
      await archiveRecommendations([item.id], { updatedBy: actorUid });
      await normalizeCategoriesAfterRemoval([item.id]);
      setMessage(`已封存「${item.name}」`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '封存失敗');
    } finally {
      setBusy(item.id, false);
    }
  }

  async function handleDelete(item: Recommendation) {
    if (!confirm(`確定永久刪除「${item.name}」嗎？此操作無法復原。`)) return;
    setBusy(item.id, true);
    try {
      await deleteRecommendation(item.id);
      await normalizeCategoriesAfterRemoval([item.id]);
      setSelectedIds((current) => withoutId(current, item.id));
      setMessage(`已永久刪除「${item.name}」`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setBusy(item.id, false);
    }
  }

  async function handleDuplicate(item: Recommendation) {
    const name = `${item.name}（副本）`;
    try {
      await createRecommendation(
        {
          section: item.section,
          category: item.category,
          source: 'admin',
          name,
          placeId: '',
          address: item.address ?? '',
          lat: item.lat,
          lng: item.lng,
          url: item.url,
          note: item.note,
          rating: item.rating ?? 3,
          sortOrder: nextSortOrder(item.category, recommendations),
        },
        { updatedBy: actorUid }
      );
      setMessage(`已建立「${name}」，請編輯 Maps 連結避免重複。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '複製失敗');
    }
  }

  async function moveItem(item: Recommendation, direction: MoveDirection) {
    const items = activeCategoryItems(item.category, recommendations);
    const currentIndex = items.findIndex((candidate) => candidate.id === item.id);
    if (currentIndex < 0) return;
    const targetIndex =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? items.length - 1
          : direction === 'up'
            ? Math.max(0, currentIndex - 1)
            : Math.min(items.length - 1, currentIndex + 1);
    if (targetIndex === currentIndex) return;
    const next = [...items];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    await persistOrder(next);
  }

  async function handleDrop(target: Recommendation) {
    if (!draggedId || draggedId === target.id) return;
    const dragged = recommendations.find((item) => item.id === draggedId);
    if (!dragged || dragged.category !== target.category || !dragged.active || isArchived(dragged)) {
      setDraggedId(null);
      return;
    }
    const items = activeCategoryItems(target.category, recommendations);
    const fromIndex = items.findIndex((item) => item.id === dragged.id);
    const toIndex = items.findIndex((item) => item.id === target.id);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setDraggedId(null);
    await persistOrder(next);
  }

  async function persistOrder(items: Recommendation[]) {
    clearFeedback();
    try {
      await reorderRecommendations(
        items.map((item, index) => ({ id: item.id, sortOrder: index + 1 })),
        { updatedBy: actorUid }
      );
      setMessage('推薦順序已更新');
    } catch (err) {
      setError(err instanceof Error ? err.message : '排序更新失敗');
    }
  }

  async function handleBulk(action: 'enable' | 'disable' | 'archive' | 'restore') {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    clearFeedback();
    try {
      if (action === 'archive') {
        if (!confirm(`要封存選取的 ${ids.length} 個地點嗎？`)) return;
        await archiveRecommendations(ids, { updatedBy: actorUid });
        await normalizeCategoriesAfterRemoval(ids);
      } else if (action === 'restore' || action === 'enable') {
        await activateItems(ids);
      } else {
        await bulkSetRecommendationActive(ids, false, { updatedBy: actorUid });
        await normalizeCategoriesAfterRemoval(ids);
      }
      setSelectedIds(new Set());
      setMessage(`已完成 ${ids.length} 個地點的批次操作`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批次操作失敗');
    }
  }

  async function handleImportDefaults() {
    setImportingDefaults(true);
    clearFeedback();
    try {
      const existingDefaultKeys = new Set(
        recommendations.map((item) => item.defaultKey).filter(Boolean)
      );
      const defaults = getDefaultRecommendationInputs().filter(
        (item) => !existingDefaultKeys.has(item.defaultKey)
      );
      for (const item of defaults) {
        await createRecommendation(item, { updatedBy: actorUid });
      }
      setMessage(
        defaults.length
          ? `已匯入 ${defaults.length} 筆預設地點`
          : '所有預設地點都已在管理清單中'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯入預設地點失敗');
    } finally {
      setImportingDefaults(false);
    }
  }

  function setBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function activateItems(ids: string[]) {
    const selected = new Set(ids);
    const categories = new Set(
      recommendations
        .filter((item) => selected.has(item.id))
        .map((item) => item.category)
    );
    for (const category of categories) {
      const currentActive = activeCategoryItems(category, recommendations);
      const additions = recommendations
        .filter((item) => (
          selected.has(item.id)
          && item.category === category
          && (!item.active || isArchived(item))
        ))
        .sort(compareRecommendationOrder);
      const ordered = [...currentActive, ...additions];
      await activateAndReorderRecommendations(
        ordered.map((item, index) => ({ id: item.id, sortOrder: index + 1 })),
        { updatedBy: actorUid }
      );
    }
  }

  async function normalizeCategoriesAfterRemoval(ids: string[]) {
    const removed = new Set(ids);
    const categories = new Set(
      recommendations
        .filter((item) => removed.has(item.id))
        .map((item) => item.category)
    );
    for (const category of categories) {
      const remaining = activeCategoryItems(category, recommendations)
        .filter((item) => !removed.has(item.id));
      if (remaining.length > 0) {
        await reorderRecommendations(
          remaining.map((item, index) => ({ id: item.id, sortOrder: index + 1 })),
          { updatedBy: actorUid }
        );
      }
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="recommendation-admin">
      <header className="recommendation-admin-header">
        <div>
          <p>GUEST CONTENT</p>
          <h1 className="admin-page-title">推薦地點管理</h1>
          <span>管理房客頁、地圖與住宿期間首頁的每日推薦。</span>
        </div>
        <button type="button" className="btn-gold" onClick={openCreate}>
          ＋ 新增推薦地點
        </button>
      </header>

      <div className="recommendation-summary-grid">
        <Summary label="全部資料" value={counts.total} />
        <Summary label="房客顯示中" value={counts.active} tone="active" />
        <Summary label="暫停顯示" value={counts.inactive} tone="inactive" />
        <Summary label="封存" value={counts.archived} tone="archived" />
      </div>

      <section className="recommendation-toolbar" aria-label="推薦地點搜尋與篩選">
        <label className="recommendation-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜尋名稱、備註或地址"
          />
        </label>
        <select
          aria-label="分類篩選"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
        >
          <option value="all">所有分類</option>
          {(Object.keys(CATEGORY_LABELS) as RecommendationCategory[]).map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}（{recommendations.filter((item) => item.category === category && !isArchived(item)).length}）
            </option>
          ))}
        </select>
        <select
          aria-label="狀態篩選"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        >
          <option value="all">未封存全部</option>
          <option value="active">顯示中</option>
          <option value="inactive">已停用</option>
          <option value="archived">封存區</option>
        </select>
      </section>

      {selectedIds.size > 0 && (
        <section className="recommendation-bulk-bar" aria-label="批次操作">
          <strong>已選取 {selectedIds.size} 個地點</strong>
          <div>
            <button type="button" onClick={() => void handleBulk('enable')}>顯示</button>
            <button type="button" onClick={() => void handleBulk('disable')}>停用</button>
            {statusFilter === 'archived' ? (
              <button type="button" onClick={() => void handleBulk('restore')}>恢復</button>
            ) : (
              <button type="button" onClick={() => void handleBulk('archive')}>封存</button>
            )}
            <button type="button" onClick={() => setSelectedIds(new Set())}>取消選取</button>
          </div>
        </section>
      )}

      {error && <p className="field-error recommendation-feedback">{error}</p>}
      {message && <p className="recommendation-success recommendation-feedback">{message}</p>}

      {loading ? (
        <div className="recommendation-empty">正在載入推薦地點…</div>
      ) : groupedRecommendations.length === 0 ? (
        <div className="recommendation-empty">
          <span aria-hidden="true">📍</span>
          <strong>找不到符合條件的地點</strong>
          <p>調整搜尋或篩選條件，或新增第一個推薦地點。</p>
        </div>
      ) : (
        <div className="recommendation-groups">
          {groupedRecommendations.map(({ category, items }) => (
            <section className="recommendation-group" key={category}>
              <div className="recommendation-group-heading">
                <div>
                  <span aria-hidden="true">{CATEGORY_ICONS[category]}</span>
                  <h2>{CATEGORY_LABELS[category]}</h2>
                  <small>{items.length} 個</small>
                </div>
                <span>{SECTION_LABELS[sectionForCategory(category)]}</span>
              </div>
              <div className="recommendation-list">
                {items.map((item) => (
                  <RecommendationRow
                    key={item.id}
                    item={item}
                    allItems={recommendations}
                    selected={selectedIds.has(item.id)}
                    busy={busyIds.has(item.id)}
                    dragging={draggedId === item.id}
                    currentActorUid={actorUid}
                    onSelect={() => toggleSelected(item.id)}
                    onEdit={() => openEdit(item)}
                    onToggle={() => void handleToggle(item)}
                    onArchive={() => void handleArchive(item)}
                    onDelete={() => void handleDelete(item)}
                    onDuplicate={() => void handleDuplicate(item)}
                    onMove={(direction) => void moveItem(item, direction)}
                    onDragStart={() => setDraggedId(item.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      void handleDrop(item);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <details className="recommendation-maintenance">
        <summary>資料維護工具</summary>
        <div>
          <p>只有首次建立管理資料時需要匯入內建推薦；日常管理不需要操作。</p>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void handleImportDefaults()}
            disabled={importingDefaults}
          >
            {importingDefaults ? '匯入中…' : '匯入尚未管理的預設地點'}
          </button>
        </div>
      </details>

      {drawerOpen && (
        <RecommendationDrawer
          form={form}
          editing={Boolean(editingId)}
          saving={saving}
          lookingUpPlace={lookingUpPlace}
          error={error}
          nameInputRef={nameInputRef}
          onSubmit={handleSubmit}
          onClose={() => closeDrawer()}
          onLookup={() => void handleLookupPlace()}
          onUpdate={updateField}
        />
      )}
    </div>
  );
}

function RecommendationRow({
  item,
  allItems,
  selected,
  busy,
  dragging,
  currentActorUid,
  onSelect,
  onEdit,
  onToggle,
  onArchive,
  onDelete,
  onDuplicate,
  onMove,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  item: Recommendation;
  allItems: Recommendation[];
  selected: boolean;
  busy: boolean;
  dragging: boolean;
  currentActorUid: string | null;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: MoveDirection) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  const qualityIssues = recommendationIssues(item, allItems);
  const archived = isArchived(item);
  const reorderable = item.active && !archived;

  return (
    <article
      className={`recommendation-row${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}${archived ? ' archived' : ''}`}
      draggable={reorderable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (reorderable) event.preventDefault();
      }}
      onDrop={onDrop}
    >
      <label className="recommendation-select">
        <input type="checkbox" checked={selected} onChange={onSelect} />
        <span aria-hidden="true">{selected ? '✓' : ''}</span>
      </label>
      <span
        className={`recommendation-drag${reorderable ? '' : ' disabled'}`}
        title={reorderable ? '拖曳調整順序' : '只有顯示中的地點可以排序'}
        aria-hidden="true"
      >
        ⋮⋮
      </span>
      <button type="button" className="recommendation-row-main" onClick={onEdit}>
        <span className="recommendation-row-title">
          <strong>{item.name}</strong>
          <small>{CATEGORY_LABELS[item.category]}</small>
        </span>
        <StarDisplay rating={item.rating ?? 1} />
        <span className="recommendation-row-note">{item.note || '尚未填寫推薦介紹'}</span>
        <span className="recommendation-row-meta">
          排序 {item.sortOrder} · {item.source === 'default' ? '預設資料' : '後台新增'}
          {item.updatedAt ? ` · 更新 ${formatUpdatedAt(item)}` : ''}
          {item.updatedBy ? ` · ${item.updatedBy === currentActorUid ? '由目前帳號修改' : `修改者 ${shortActor(item.updatedBy)}`}` : ''}
        </span>
        {qualityIssues.length > 0 && (
          <span className="recommendation-quality-list">
            {qualityIssues.map((issue) => <small key={issue}>⚠ {issue}</small>)}
          </span>
        )}
      </button>
      <div className="recommendation-row-actions">
        <a href={item.url} target="_blank" rel="noreferrer" className="recommendation-map-link">
          地圖 ↗
        </a>
        <button
          type="button"
          role="switch"
          aria-checked={item.active && !archived}
          className={`recommendation-status-switch${item.active && !archived ? ' active' : ''}`}
          disabled={busy}
          onClick={onToggle}
        >
          <span />
          {archived ? '恢復' : item.active ? '顯示中' : '已停用'}
        </button>
        <details className="recommendation-more">
          <summary aria-label={`更多操作：${item.name}`}>•••</summary>
          <div>
            <button type="button" onClick={onEdit}>編輯</button>
            <button type="button" onClick={onDuplicate}>建立副本</button>
            {reorderable && (
              <>
                <button type="button" onClick={() => onMove('first')}>移到最前</button>
                <button type="button" onClick={() => onMove('up')}>向上移</button>
                <button type="button" onClick={() => onMove('down')}>向下移</button>
                <button type="button" onClick={() => onMove('last')}>移到最後</button>
              </>
            )}
            {!archived && <button type="button" onClick={onArchive}>移到封存區</button>}
            <button type="button" className="danger" onClick={onDelete}>永久刪除</button>
          </div>
        </details>
      </div>
    </article>
  );
}

function RecommendationDrawer({
  form,
  editing,
  saving,
  lookingUpPlace,
  error,
  nameInputRef,
  onSubmit,
  onClose,
  onLookup,
  onUpdate,
}: {
  form: FormState;
  editing: boolean;
  saving: boolean;
  lookingUpPlace: boolean;
  error: string | null;
  nameInputRef: Ref<HTMLInputElement>;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
  onLookup: () => void;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="recommendation-drawer-layer">
      <button
        type="button"
        className="recommendation-drawer-backdrop"
        aria-label="關閉推薦編輯"
        onClick={onClose}
      />
      <aside className="recommendation-drawer" aria-labelledby="recommendation-drawer-title">
        <form onSubmit={onSubmit}>
          <header className="recommendation-drawer-header">
            <div>
              <p>{editing ? 'EDIT PLACE' : 'NEW PLACE'}</p>
              <h2 id="recommendation-drawer-title">
                {editing ? '編輯推薦地點' : '新增推薦地點'}
              </h2>
            </div>
            <button type="button" aria-label="關閉" onClick={onClose}>×</button>
          </header>

          <div className="recommendation-drawer-content">
            <div className="form-field full">
              <label>Google Maps 連結 *</label>
              <div className="recommendation-map-lookup">
                <input
                  value={form.url}
                  onChange={(event) => onUpdate('url', event.target.value)}
                  placeholder="貼上 maps.app.goo.gl 或 Google Maps 連結"
                  required
                />
                <button type="button" onClick={onLookup} disabled={lookingUpPlace}>
                  {lookingUpPlace ? '帶入中…' : '自動帶入'}
                </button>
              </div>
              <p className="helper-text">貼上連結後可自動取得名稱、地址及座標。</p>
            </div>

            <div className="recommendation-form-grid">
              <div className="form-field full">
                <label>地點名稱 *</label>
                <input
                  ref={nameInputRef}
                  value={form.name}
                  onChange={(event) => onUpdate('name', event.target.value)}
                  placeholder="例如：Dandelion Chocolate"
                  required
                />
              </div>
              <div className="form-field">
                <label>分頁</label>
                <select
                  value={form.section}
                  onChange={(event) => onUpdate('section', event.target.value as RecommendationSection)}
                >
                  {Object.entries(SECTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>分類</label>
                <select
                  value={form.category}
                  onChange={(event) => onUpdate('category', event.target.value as RecommendationCategory)}
                >
                  {SECTION_CATEGORIES[form.section].map((category) => (
                    <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                  ))}
                </select>
              </div>
              <div className="form-field full">
                <label>推薦星等</label>
                <StarPicker rating={form.rating} onChange={(rating) => onUpdate('rating', rating)} />
              </div>
              <div className="form-field full">
                <label>推薦介紹</label>
                <textarea
                  value={form.note}
                  onChange={(event) => onUpdate('note', event.target.value)}
                  placeholder="例如：適合下午散步途中休息，招牌是熱巧克力。"
                  rows={4}
                />
                <p className="helper-text">這段文字會顯示在房客頁與「今日推薦」。</p>
              </div>
              <label className="recommendation-active-field">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => onUpdate('active', event.target.checked)}
                />
                <span />
                <div>
                  <strong>在房客頁顯示</strong>
                  <small>關閉後資料仍保留，但房客看不到。</small>
                </div>
              </label>
            </div>

            <details className="recommendation-advanced">
              <summary>進階設定</summary>
              <div className="recommendation-form-grid">
                <div className="form-field full">
                  <label>地址</label>
                  <input
                    value={form.address ?? ''}
                    onChange={(event) => onUpdate('address', event.target.value)}
                  />
                </div>
                <div className="form-field full">
                  <label>Google Place ID</label>
                  <input
                    value={form.placeId ?? ''}
                    onChange={(event) => onUpdate('placeId', event.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>緯度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.lat}
                    onChange={(event) => onUpdate('lat', Number(event.target.value))}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>經度</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={form.lng}
                    onChange={(event) => onUpdate('lng', Number(event.target.value))}
                    required
                  />
                </div>
              </div>
            </details>

            <RecommendationPreview form={form} />
            {error && <p className="field-error">{error}</p>}
          </div>

          <footer className="recommendation-drawer-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>取消</button>
            <button type="submit" className="btn-gold" disabled={saving}>
              {saving ? '儲存中…' : editing ? '儲存變更' : '新增推薦'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function RecommendationPreview({ form }: { form: FormState }) {
  const surfaces = recommendationSurfaces(form.category);
  return (
    <section className="recommendation-preview">
      <div className="recommendation-preview-heading">
        <div>
          <p>GUEST PREVIEW</p>
          <h3>房客畫面預覽</h3>
        </div>
        <span>{form.active ? '顯示中' : '暫停顯示'}</span>
      </div>
      <div className="recommendation-preview-card">
        <span aria-hidden="true">{CATEGORY_ICONS[form.category]}</span>
        <div>
          <small>{CATEGORY_LABELS[form.category]}</small>
          <strong>{form.name || '地點名稱'}</strong>
          <StarDisplay rating={form.rating} />
          <p>{form.note || '推薦介紹會顯示在這裡。'}</p>
        </div>
        <span>地圖 ↗</span>
      </div>
      <div className="recommendation-surfaces">
        <strong>會出現在</strong>
        {surfaces.map((surface) => <span key={surface}>{surface}</span>)}
      </div>
    </section>
  );
}

function StarPicker({ rating, onChange }: { rating: number; onChange: (rating: number) => void }) {
  return (
    <div className="recommendation-star-picker" role="radiogroup" aria-label="推薦星等">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={rating === value}
          aria-label={`${value} 顆星`}
          className={value <= rating ? 'active' : ''}
          onClick={() => onChange(value)}
        >
          ★
        </button>
      ))}
      <strong>{rating} / 5</strong>
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <span className="recommendation-stars" aria-label={`推薦 ${safeRating} 顆星`}>
      <span>{'★'.repeat(safeRating)}</span>
      <span aria-hidden="true">{'★'.repeat(5 - safeRating)}</span>
      <small>{safeRating}</small>
    </span>
  );
}

function Summary({
  label,
  value,
  tone = '',
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={`recommendation-summary ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function recommendationIssues(
  item: Recommendation,
  allItems: Recommendation[]
): string[] {
  const issues: string[] = [];
  if (!item.note?.trim()) issues.push('缺少推薦介紹');
  if ((item.rating ?? 1) <= 1) issues.push('星等偏低');
  if (!isGoogleMapsUrl(item.url)) issues.push('Maps 連結格式異常');
  if (findDuplicate(item, allItems, item.id)) issues.push('可能重複');
  return issues;
}

function findDuplicate(
  input: Pick<RecommendationInput, 'placeId' | 'url'>,
  allItems: Recommendation[],
  excludeId: string | null
): Recommendation | null {
  const placeId = input.placeId?.trim();
  const normalizedUrl = normalizeMapUrl(input.url);
  return allItems.find((item) => {
    if (item.id === excludeId) return false;
    return Boolean(
      (placeId && item.placeId?.trim() === placeId)
      || (normalizedUrl && normalizeMapUrl(item.url) === normalizedUrl)
    );
  }) ?? null;
}

function normalizeMapUrl(value: string): string {
  return value.trim().replace(/\/+$/, '').toLocaleLowerCase();
}

function isGoogleMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && (
        url.hostname === 'maps.app.goo.gl'
        || url.hostname === 'maps.google.com'
        || url.hostname.endsWith('.google.com')
        || url.hostname.endsWith('.google.co.jp')
      );
  } catch {
    return false;
  }
}

function recommendationSurfaces(category: RecommendationCategory): string[] {
  switch (category) {
    case 'restaurant':
    case 'cafe':
      return ['餐廳推薦頁', '住宿期間首頁「今日推薦」', '地圖'];
    case 'sight':
      return ['景點推薦頁', '住宿期間首頁「今日推薦」', '地圖'];
    case 'convenience':
    case 'supermarket':
      return ['超市／便利商店頁', '地圖'];
  }
}

function isArchived(item: Recommendation): boolean {
  return Boolean(item.archivedAt);
}

function compareRecommendationOrder(first: Recommendation, second: Recommendation): number {
  if (isArchived(first) !== isArchived(second)) return isArchived(first) ? 1 : -1;
  if (first.active !== second.active) return first.active ? -1 : 1;
  return first.sortOrder - second.sortOrder || first.name.localeCompare(second.name, 'zh-Hant');
}

function activeCategoryItems(
  category: RecommendationCategory,
  recommendations: Recommendation[]
): Recommendation[] {
  return recommendations
    .filter((item) => item.category === category && item.active && !isArchived(item))
    .sort(compareRecommendationOrder);
}

function nextSortOrder(
  category: RecommendationCategory,
  recommendations: Recommendation[]
): number {
  return activeCategoryItems(category, recommendations)
    .reduce((maximum, item) => Math.max(maximum, item.sortOrder), 0) + 1;
}

async function normalizeCategory(
  category: RecommendationCategory,
  recommendations: Recommendation[],
  updatedBy: string | null,
  excludeId?: string
) {
  const items = activeCategoryItems(category, recommendations)
    .filter((item) => item.id !== excludeId);
  if (items.length === 0) return;
  await reorderRecommendations(
    items.map((item, index) => ({ id: item.id, sortOrder: index + 1 })),
    { updatedBy }
  );
}

function sectionForCategory(category: RecommendationCategory): RecommendationSection {
  if (category === 'convenience' || category === 'supermarket') return 'services';
  if (category === 'sight') return 'cityguide';
  return 'restaurant';
}

function serializeForm(form: FormState): string {
  return JSON.stringify(form);
}

function withoutId(current: Set<string>, id: string): Set<string> {
  const next = new Set(current);
  next.delete(id);
  return next;
}

function formatUpdatedAt(item: Recommendation): string {
  const date = item.updatedAt?.toDate?.();
  if (!date) return '—';
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function shortActor(uid: string): string {
  return uid.length > 10 ? `${uid.slice(0, 6)}…${uid.slice(-4)}` : uid;
}

function getDefaultRecommendationInputs(): Array<RecommendationInput & { defaultKey: string }> {
  return (Object.entries(mapPlaces) as Array<[MapKey, Place[]]>).flatMap(([section, places]) => {
    const categoryCounts = new Map<RecommendationCategory, number>();
    return places.map((place, index) => {
      const category = place.category ?? SECTION_CATEGORIES[section][0];
      const nextOrder = (categoryCounts.get(category) ?? 0) + 1;
      categoryCounts.set(category, nextOrder);
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
        sortOrder: nextOrder,
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
