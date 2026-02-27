import { NextRequest, NextResponse } from 'next/server';
import { getIngestionService } from '../../../../../src/runtime/service';

export const dynamic = 'force-dynamic';

interface Params {
  params: {
    agentId: string;
  };
}

export async function GET(request: NextRequest, { params }: Params): Promise<NextResponse> {
  const service = await getIngestionService();
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : 100;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;

  return NextResponse.json({
    agentId: params.agentId,
    events: service.listAgentEvents(decodeURIComponent(params.agentId), limit),
  });
}
