import { useEffect, useState } from "react";
import { watchExpenses } from "@/lib/expenses";
import type { Expense } from "@/types";
export function useExpenses(year: string | null) {
  const [state, setState] = useState<{
    key: string | null;
    items: Expense[];
    loading: boolean;
    error: string | null;
  }>({ key: year, items: [], loading: true, error: null });
  useEffect(() => {
    setState({ key: year, items: [], loading: true, error: null });
    return watchExpenses(
      year,
      (items) => setState({ key: year, items, loading: false, error: null }),
      (message) =>
        setState({
          key: year,
          items: [],
          loading: false,
          error: message ?? "支出載入失敗，請重新整理後再試。",
        }),
    );
  }, [year]);
  return state.key === year ? state : { items: [], loading: true, error: null };
}
