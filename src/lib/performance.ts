import { performance } from "node:perf_hooks";

export async function measureServerOperation<T>(
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (process.env.PERF_LOGGING !== "1") return operation();
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    console.info(
      JSON.stringify({
        type: "server-performance",
        label,
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
      }),
    );
  }
}
