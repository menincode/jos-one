---
name: frontend-tanstack-react-query
description: Best practices and patterns for TanStack React Query (server state, useQuery, useMutation, cache invalidation). Use when building data-fetching hooks, API integration, or managing server state in React.
---

# TanStack React Query

## Description

TanStack React Query (formerly React Query) manages server state: fetching, caching, synchronizing, and updating. Use for API calls, list/detail views, mutations with cache invalidation, and optional optimistic updates.

## When to Use

- Replacing useState/useEffect data fetching with cached, deduped requests
- Building hooks that call backend APIs (CRUD, search, pagination)
- Invalidating or refetching after create/update/delete
- Pagination, infinite scroll, or dependent queries

---

## Setup (v5)

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      gcTime: 1000 * 60 * 10,     // 10 min (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: 1 },
  },
});

// App root
<QueryClientProvider client={queryClient}>
  <App />
  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider>
```

---

## Core Patterns (v5 object API)

All hooks use a **single options object** (no positional overloads).

### useQuery

```tsx
import { useQuery } from '@tanstack/react-query';

// List
function useItems(params: ListParams = {}) {
  return useQuery({
    queryKey: ['items', params.page, params.limit, params.search],
    queryFn: () => itemApi.getPaginated(params),
  });
}

// Single by id (conditional fetch)
function useItem(id: string) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: () => itemApi.getById(id),
    enabled: !!id,
  });
}

// Nested/dependent
function useItemOrders(id: string, page = 1) {
  return useQuery({
    queryKey: ['item', id, 'orders', page],
    queryFn: () => itemApi.getOrders(id, { page }),
    enabled: !!id,
  });
}
```

### useMutation + invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ItemInput) => itemApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

function useUpdateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ItemUpdateInput }) =>
      itemApi.update(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['item', variables.id] });
    },
  });
}

function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => itemApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

### Query key hierarchy

Design keys for precise invalidation:

- **Lists**: `['customers']`, `['customers', 'paginated', page, pageSize, search, ...]`
- **Single**: `['customer', id]`
- **Nested**: `['customer', id, 'orders', page]`

Invalidate with prefix: `invalidateQueries({ queryKey: ['customers'] })` refetches all customer-related queries.

---

## Best Practices

1. **API layer first**: Keep `*.api.ts` with pure functions (axios/fetch). Hooks in `use*.ts` call API and use useQuery/useMutation.
2. **Stable query keys**: Include all variables that affect the result (filters, page, id). Use `null`/`''` for â€œanyâ€ to keep key shape consistent.
3. **enabled**: Use `enabled: !!id` (or similar) for detail/dependent queries so they donâ€™t run with invalid ids.
4. **Invalidate after mutations**: In `onSuccess`, invalidate every query key that could be stale (list + detail if updated).
5. **TypeScript**: Type the generic on useQuery when needed: `useQuery<Item>({ ... })`. Type mutation variables and result in mutationFn/onSuccess.

---

## Usage in components

```tsx
function ItemPage({ id }: { id: string }) {
  const { data, isPending, error } = useItem(id);
  const updateItem = useUpdateItem();

  if (isPending) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!data) return null;

  return (
    <Form
      defaultValues={data}
      onSubmit={(values) => updateItem.mutate({ id, data: values })}
    />
  );
}
```

- **Loading**: `isPending` (v5; formerly `isLoading`).
- **Mutation**: `mutate()` or `mutateAsync()`; use `isPending`, `isError`, `error` from the mutation result for UI state.

---

## Optional: Optimistic updates

For instant UI feedback, update cache in `onMutate` and rollback in `onError`:

```tsx
return useMutation({
  mutationFn: (data) => itemApi.update(id, data),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['item', id] });
    const previous = queryClient.getQueryData(['item', id]);
    queryClient.setQueryData(['item', id], (old) => ({ ...old, ...newData }));
    return { previous };
  },
  onError: (_err, _vars, context) => {
    if (context?.previous) {
      queryClient.setQueryData(['item', id], context.previous);
    }
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['item', id] });
  },
});
```

---

## Common pitfalls

- **Wrong v5 shape**: Use `useQuery({ queryKey, queryFn, ... })` and `useMutation({ mutationFn, ... })`, not positional args.
- **Missing invalidation**: After create/update/delete, invalidate list and any affected detail keys.
- **Key mismatch**: Query key in useQuery must match the key (or prefix) used in invalidateQueries.
- **Fetching without enabled**: Detail query with `id === ''` will still run; use `enabled: !!id`.

---

## References

- [TanStack Query React â€“ Overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- [useQuery](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery)
- [useMutation](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation)
- [Migrating to v5](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5)