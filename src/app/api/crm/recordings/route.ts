import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return new NextResponse('Missing recording URL', { status: 400 });
    }

    // Fetch the recording from the actual source (S3 or Vapi)
    // This server-side fetch ignores any browser extensions (like ModHeader)
    // that might incorrectly inject Authorization headers and break S3.
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        // We explicitly do NOT pass any Authorization headers here 
        // because S3 presigned URLs fail if they receive an unexpected Auth header.
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch recording. Status: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error('Response body:', text);
      return new NextResponse(`Failed to fetch recording from source: ${response.statusText}`, { status: response.status });
    }

    // Stream the response back to the client
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'audio/wav');
    headers.set('Content-Disposition', 'inline');
    headers.set('Cache-Control', 'public, max-age=3600');
    
    if (response.headers.has('Content-Length')) {
      headers.set('Content-Length', response.headers.get('Content-Length') as string);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Proxy recording error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
