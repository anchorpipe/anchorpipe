import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { listDataSubjectRequests } from '@/lib/dsr-service';
import DsrClient from './request-client';

export const dynamic = 'force-dynamic';

function serializeRequest(request: any) {
  const serializeDate = (value: unknown) =>
    value instanceof Date ? value.toISOString() : ((value as string | null | undefined) ?? null);

  return {
    id: request.id,
    type: request.type,
    status: request.status,
    requestedAt: serializeDate(request.requestedAt),
    processedAt: serializeDate(request.processedAt),
    dueAt: serializeDate(request.dueAt),
    confirmationSentAt: serializeDate(request.confirmationSentAt),
    metadata: request.metadata ?? null,
    events: (request.events ?? []).map((event: any) => ({
      id: event.id,
      status: event.status,
      message: event.message,
      createdAt: serializeDate(event.createdAt),
    })),
    exportAvailable: Boolean(request.exportData),
  };
}

export default async function PrivacyPage() {
  const session = await readSession();
  const userId = session?.sub as string | undefined;

  if (!userId) {
    redirect('/login?from=/account/privacy');
  }

  const requests = (await listDataSubjectRequests(userId)) as unknown as any[];
  const serialized = requests.map(serializeRequest);

  return <DsrClient initialRequests={serialized} />;
}
