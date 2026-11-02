const API = import.meta.env.VITE_API_URL as string | undefined;

export type AnalyticsOverview = {
  cards: {
    inspectionRate: number;
    inspectionRateDelta: number;
    failureRate: number;
    failureRateDelta: number;
    overdueVessels: number;
    totalInspectors: number;
    newInspectorsThisMonth: number;
  };
  trends: { month: string; total: number; pass: number; fail: number }[];
  distribution: { pass: number; fail: number; pending: number };
  vesselsByType: { label: string; count: number }[];
  stats: {
    totalDataPoints: number;
    passRate: number;
    avgInspectionTimeHours: number | null;
    avgInspectionTimeDeltaPct: number | null;
    benchmarkPassRate: number;
  };
};

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

const readErrorMessage = async (response: Response, fallback: string) => {
  try {
    const err = await response.json();
    if (typeof err?.message === "string" && err.message.trim()) return err.message;
  } catch {}
  try {
    const txt = await response.text();
    if (txt?.trim()) return txt;
  } catch {}
  return fallback;
};

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function request<T>(
  path: string,
  options: { method: HttpMethod; body?: unknown } = { method: "GET" }
): Promise<T> {
  if (!API) throw new Error("VITE_API_URL is missing. Add frontend/.env and restart Vite.");

  const token = getToken();
  const url = `${API}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const msg = await readErrorMessage(response, `Request failed (${response.status})`);
    throw new Error(msg);
  }

  if (response.status === 204) return undefined as unknown as T;

  const text = await response.text();
  if (!text) return undefined as unknown as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export const getAnalyticsOverview = async (
  months: number = 6,
  overdueDays: number = 365
): Promise<AnalyticsOverview> =>
  request<AnalyticsOverview>(
    `/analytics/overview?months=${months}&overdueDays=${overdueDays}`,
    { method: "GET" }
  );