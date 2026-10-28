import type { BoardDetail, BoardSummary } from "@kanbanana/shared";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api${path}`, {
      method,
      signal,
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      "Cannot reach the server. Check your connection and try again.",
    );
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success)
    throw new ApiError(
      result?.error ?? "The server could not complete this request.",
      response.status,
    );
  return result.data as T;
}
export const boardsQuery = {
  queryKey: ["boards"],
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    api<BoardSummary[]>("/boards", "GET", undefined, signal),
};
export const boardQuery = (id: string) => ({
  queryKey: ["board", id],
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    api<BoardDetail>(`/boards/${id}`, "GET", undefined, signal),
});
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
