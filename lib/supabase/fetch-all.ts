/**
 * Fetch every row from a Supabase query, paging past PostgREST's default
 * 1,000-row cap. Pass a callback that applies .range(from, to) to your
 * already-built select/order/filter chain.
 */

const PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      return { data: all, error: error.message };
    }

    const page = data ?? [];
    all.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return { data: all, error: null };
}
