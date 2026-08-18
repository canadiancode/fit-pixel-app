import { getFitPixelApiBaseUrl } from "./config";

type ApiErrorBody = {
  ok?: false;
  code?: string;
  message?: string;
};

export class FitPixelApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "FitPixelApiError";
    this.status = status;
    this.code = code;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export type ApiFetchOptions = {
  method?: "GET" | "POST" | "DELETE";
  accessToken?: string | null;
  json?: unknown;
  requireAuth?: boolean;
};

/**
 * Fit Pixel API fetch. Attaches the user JWT when provided.
 * Food and sync require a session — fail closed without a token.
 */
export async function fitPixelFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const requireAuth = options.requireAuth ?? true;
  const token = options.accessToken?.trim() ?? "";
  if (requireAuth && !token) {
    throw new FitPixelApiError(
      401,
      "Sign in to use this feature.",
      "UNAUTHORIZED",
    );
  }

  const base = getFitPixelApiBaseUrl();
  const url = `${base}${path}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      ...(options.json !== undefined
        ? { body: JSON.stringify(options.json) }
        : {}),
    });
  } catch {
    throw new FitPixelApiError(
      0,
      "Could not reach Fit Pixel API. Check your connection and EXPO_PUBLIC_FIT_PIXEL_API_URL.",
    );
  }

  const body = await parseJson(response);

  if (!response.ok) {
    const err = body as ApiErrorBody | null;
    const message =
      err?.message ??
      (response.status === 401
        ? "Sign in to use this feature."
        : response.status === 501
          ? "This feature is not available yet on the server."
          : `Fit Pixel API error (${response.status})`);
    throw new FitPixelApiError(response.status, message, err?.code);
  }

  return body as T;
}
