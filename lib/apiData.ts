export interface ApiCollection<T> {
  items?: T[];
  data?: T[];
}

export function asList<T>(response: ApiCollection<T> | T[] | null | undefined): T[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.items ?? response.data ?? [];
}
