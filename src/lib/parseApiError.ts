/**
 * Reads a JSON `{ error: string }` body from a failed fetch Response.
 * Falls back to `fallback` when the body is missing, empty, or not JSON.
 */
export async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string" &&
      (body as { error: string }).error.length > 0
    ) {
      return (body as { error: string }).error;
    }
  } catch {
    // Ignore unparseable bodies; the status-based fallback is sufficient.
  }
  return fallback;
}

export async function throwIfNotOk(
  response: Response,
  fallback: string,
): Promise<void> {
  if (response.ok) {
    return;
  }
  throw new Error(await parseApiError(response, fallback));
}
