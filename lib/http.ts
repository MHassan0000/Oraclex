export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpOptions<TBody> = {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
};

export class HttpError extends Error {
  status: number;
  info?: unknown;

  constructor(status: number, message: string, info?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.info = info;
  }
}

export async function http<TResponse, TBody = unknown>(
  input: RequestInfo | URL,
  options: HttpOptions<TBody> = {},
): Promise<TResponse> {
  const { method = "GET", body, headers, ...rest } = options;
  const response = await fetch(input, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    ...rest,
  });

  if (!response.ok) {
    let info: unknown;
    try {
      info = await response.json();
    } catch {
      info = await response.text();
    }
    throw new HttpError(response.status, response.statusText, info);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return response.json() as Promise<TResponse>;
}
