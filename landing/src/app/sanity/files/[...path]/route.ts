import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await params;
  const filePath = pathParts.join("/");
  const sanityUrl = `https://cdn.sanity.io/files/${filePath}`;
  
  try {
    const response = await fetch(sanityUrl);
    if (!response.ok) {
      return new NextResponse("Not found", { status: response.status });
    }
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new NextResponse(`Proxy error: ${String(e)}`, { status: 502 });
  }
}
