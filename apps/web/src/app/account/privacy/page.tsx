import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { listDataSubjectRequests } from '@/lib/dsr-service';
import DsrClient from './request-client';

export default async function PrivacyPage() {
  const session = await readSession();
  const userId = session?.sub as string | undefined;

  if (!userId) {
    redirect('/login?from=/account/privacy');
  }

  const requests = (await listDataSubjectRequests(userId)) as unknown as any[];

  const serialized = requests.map((request: any) => ({
    id: request.id,
    type: request.type,
    status: request.status,
    requestedAt: request.requestedAt?.toISOString?.() ?? request.requestedAt,
    processedAt: request.processedAt?.toISOString?.() ?? request.processedAt,
    dueAt: request.dueAt?.toISOString?.() ?? request.dueAt,
    confirmationSentAt: request.confirmationSentAt?.toISOString?.() ?? request.confirmationSentAt,
    metadata: request.metadata ?? null,
    events: request.events.map((event: any) => ({
      id: event.id,
      status: event.status,
      message: event.message,
      createdAt: event.createdAt?.toISOString?.() ?? event.createdAt,
    })),
    exportAvailable: Boolean(request.exportData),
  }));

  return <DsrClient initialRequests={serialized} />;
}
