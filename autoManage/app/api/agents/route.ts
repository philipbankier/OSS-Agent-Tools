import { NextResponse } from 'next/server';
import { getIngestionService } from '../../../src/runtime/service';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const service = await getIngestionService();
  return NextResponse.json({
    agents: service.listAgents(),
  });
}
