import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.webm': 'audio/webm',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const url = new URL(request.url);
  const urlPath = url.pathname;

  const publicDir = path.join(process.cwd(), 'public');
  let filePath = path.join(publicDir, urlPath);

  // Security: prevent path traversal
  if (!filePath.startsWith(publicDir)) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  // Try to find the file
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    // File doesn't exist at exact path — try with .html extension
    if (!path.extname(filePath)) {
      const htmlPath = filePath + '.html';
      try {
        await stat(htmlPath);
        filePath = htmlPath;
      } catch {
        return new NextResponse('Not found', { status: 404 });
      }
    } else {
      return new NextResponse('Not found', { status: 404 });
    }
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    };

    if (urlPath.startsWith('/_nuxt/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
    }

    return new NextResponse(data, { headers });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
