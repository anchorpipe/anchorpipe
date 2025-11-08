type TelemetryEvent = {
  eventType: string;
  properties?: Record<string, unknown>;
  requestId?: string;
  timestampMs?: number;
};

const enabled = (process.env.TELEMETRY_ENABLED || 'false') === 'true';

export async function recordTelemetry(event: TelemetryEvent) {
  if (!enabled) return;
  // Basic, privacy-conscious console sink for now
  // Intentionally avoiding PII; only structural fields allowed
  const safe = {
    eventType: event.eventType,
    properties: event.properties,
    requestId: event.requestId,
    timestampMs: event.timestampMs ?? Date.now(),
  };
  // In future: publish to MQ or persist via ingestion service
  console.log(`[telemetry] ${JSON.stringify(safe)}`);
}

export function isTelemetryEnabled() {
  return enabled;
}
