import { useCallback, useEffect, useState, type DependencyList } from 'react';

import { ApiError, toApiError } from '@/api/client';

// 서버에서 불러오기 (작은 react-query 대신)
// - data: 처음엔 undefined, 불러오면 값
// - error: 실패하면 ApiError
// - reload(): 다시 불러오기 (당겨서 새로고침, 화면 다시 들어올 때 등)
// - setData: 화면에서 바로 고친 값 반영 (수락·삭제 후 목록에서 빼기 등)
export function useApi<T>(load: () => Promise<T>, deps: DependencyList) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    load().then(
      (v) => {
        if (!alive) return;
        setData(v);
        setError(undefined);
      },
      (e) => {
        if (alive) setError(toApiError(e));
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading: data === undefined && !error, reload, setData };
}
