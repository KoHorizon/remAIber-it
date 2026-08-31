export const API_BASE = "http://localhost:8080";

/** An HTTP failure carrying the backend's own message and status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Like RequestInit, but `json` is serialized for you and sets the content type. */
export type RequestOptions = Omit<RequestInit, "body"> & { json?: unknown };

/**
 * Performs a request against the backend and returns the parsed body.
 *
 * Throws an ApiError carrying the `{"error": ...}` message the backend
 * produces, so callers can show the user what actually went wrong rather
 * than a hardcoded string.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { json, headers, ...init } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers:
        json === undefined
          ? headers
          : { "Content-Type": "application/json", ...headers },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  } catch {
    // Status 0: there was no response, so there's no status to report. The
    // original error isn't carried along — fetch's rejection is a bare
    // "Failed to fetch" TypeError that adds nothing to the message above.
    throw new ApiError("Could not reach the server. Is the backend running?", 0);
  }

  // Read as text first: error bodies and 204s are not always valid JSON.
  const body = await res.text();

  if (!res.ok) {
    throw new ApiError(errorMessage(body, res), res.status);
  }

  return (body ? (JSON.parse(body) as T) : (undefined as T));
}

/** Prefers the backend's own message, falling back to the HTTP status. */
function errorMessage(body: string, res: Response): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "error" in parsed &&
      typeof parsed.error === "string" &&
      parsed.error !== ""
    ) {
      return parsed.error;
    }
  } catch {
    // Not JSON — fall through to the status-based message.
  }
  return res.statusText
    ? `Request failed: ${res.status} ${res.statusText}`
    : `Request failed with status ${res.status}`;
}

export const get = <T>(path: string) => request<T>(path);

export const post = <T>(path: string, json?: unknown) =>
  request<T>(path, { method: "POST", json });

export const put = <T>(path: string, json: unknown) =>
  request<T>(path, { method: "PUT", json });

export const patch = <T>(path: string, json: unknown) =>
  request<T>(path, { method: "PATCH", json });

export const del = (path: string) => request<void>(path, { method: "DELETE" });
