import { describe, it, expect, vi, afterEach } from "vitest";
import { ApiError, request } from "./request";

type StubResponse = {
  ok?: boolean;
  status?: number;
  statusText?: string;
  /** Raw response text, as the helper reads it. */
  text?: string;
};

function stubFetch(res: StubResponse) {
  const response = {
    ok: res.ok ?? true,
    status: res.status ?? 200,
    statusText: res.statusText ?? "OK",
    text: async () => res.text ?? "",
  } as Response;
  const spy = vi.fn<typeof fetch>(async () => response);
  vi.stubGlobal("fetch", spy);
  return spy;
}

/** Narrows the rejection so its status and message can be asserted. */
async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof ApiError) return err;
    throw new Error(`expected an ApiError, got ${String(err)}`);
  }
  throw new Error("expected the request to reject");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("returns the parsed JSON body on success", async () => {
    stubFetch({ text: '[{"id":"f1","name":"Go"}]' });

    const folders = await request<{ id: string; name: string }[]>("/folders");

    expect(folders).toEqual([{ id: "f1", name: "Go" }]);
  });

  it("prefixes the path with the API base URL", async () => {
    const spy = stubFetch({ text: "{}" });

    await request("/folders");

    expect(spy.mock.calls[0][0]).toBe("http://localhost:8080/folders");
  });

  // The whole point of the helper: the backend's {"error": ...} body is what
  // tells the user *why* something failed.
  it("throws the error message from the backend's JSON body", async () => {
    stubFetch({
      ok: false,
      status: 409,
      text: '{"error":"category name already exists"}',
    });

    const err = await rejection(request("/categories"));

    expect(err.message).toBe("category name already exists");
  });

  it("exposes the HTTP status on the thrown error", async () => {
    stubFetch({ ok: false, status: 404, text: '{"error":"folder not found"}' });

    const err = await rejection(request("/folders/ghost"));

    expect(err.status).toBe(404);
  });

  it("falls back to the status when the error body is not JSON", async () => {
    stubFetch({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      text: "<html>nginx</html>",
    });

    const err = await rejection(request("/banks"));

    expect(err.message).toContain("502");
  });

  it("falls back to the status when the error body is empty", async () => {
    stubFetch({ ok: false, status: 500, statusText: "Internal Server Error", text: "" });

    const err = await rejection(request("/banks"));

    expect(err.message).toContain("500");
  });

  // DELETE endpoints return 204 with no body — parsing it as JSON would throw.
  it("resolves without parsing when the response has no body", async () => {
    stubFetch({ status: 204, text: "" });

    await expect(
      request<void>("/folders/f1", { method: "DELETE" })
    ).resolves.toBeUndefined();
  });

  // A dead backend used to render as an empty library; it must read as an error.
  it("reports an unreachable server instead of a generic failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("Failed to fetch");
      })
    );

    const err = await rejection(request("/folders"));

    expect(err.message).toMatch(/could not reach/i);
    expect(err.status).toBe(0);
  });

  it("sends a JSON body with the correct content type", async () => {
    const spy = stubFetch({ text: "{}" });

    await request("/folders", { method: "POST", json: { name: "Go" } });

    const init = spy.mock.calls[0][1];
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe('{"name":"Go"}');
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("sends no body when there is nothing to send", async () => {
    const spy = stubFetch({ text: "{}" });

    await request("/sessions/s1/complete", { method: "POST" });

    expect(spy.mock.calls[0][1]?.body).toBeUndefined();
  });
});
