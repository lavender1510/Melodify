const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {Readable} = require('node:stream');
const MIME = {'.mp3':'audio/mpeg','.flac':'audio/flac','.wav':'audio/wav','.ogg':'audio/ogg','.oga':'audio/ogg','.m4a':'audio/mp4','.aac':'audio/aac','.opus':'audio/ogg','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};

async function serveFile(file, request) {
  try {
    const stat = await fsp.stat(file);
    await fsp.access(file, fs.constants.R_OK);
    if (!stat.isFile() || stat.size === 0) {
      return new Response('Empty or unavailable audio file', {status: 404});
    }

    const extension = path.extname(file).toLowerCase();
    const headers = new Headers({
      'Content-Type': MIME[extension] || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
      'Access-Control-Allow-Headers': 'Range,Content-Type',
      'Access-Control-Expose-Headers': 'Accept-Ranges,Content-Length,Content-Range,Content-Type',
      'Cache-Control': 'no-store'
    });
    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    const requestedRange = request.headers.get('range');
    if (requestedRange) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(requestedRange.trim());
      if (!match || (!match[1] && !match[2])) {
        headers.set('Content-Range', `bytes */${stat.size}`);
        return new Response(null, {status: 416, headers});
      }
      if (!match[1]) {
        const suffix = Number(match[2]);
        if (!Number.isSafeInteger(suffix) || suffix <= 0) {
          headers.set('Content-Range', `bytes */${stat.size}`);
          return new Response(null, {status: 416, headers});
        }
        start = Math.max(0, stat.size - suffix);
      } else {
        start = Number(match[1]);
        if (match[2]) end = Number(match[2]);
      }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
          start >= stat.size || start > end) {
        headers.set('Content-Range', `bytes */${stat.size}`);
        return new Response(null, {status: 416, headers});
      }
      end = Math.min(end, stat.size - 1);
      status = 206;
      headers.set('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    }
    headers.set('Content-Length', String(end - start + 1));
    if (request.method === 'HEAD') return new Response(null, {status, headers});

    // Stream exact byte ranges: Chromium seeks and probes media files using
    // Range requests. Always returning 200 can make valid MP3s fail to load.
    const stream = fs.createReadStream(file, {start, end});
    return new Response(Readable.toWeb(stream), {status, headers});
  } catch (error) {
    console.error('[Melodify] unable to serve media file:', file, error);
    return new Response('File unavailable', {
      status: 404,
      headers: {'Content-Type': 'text/plain; charset=utf-8',
                'Access-Control-Allow-Origin': '*'}
    });
  }
}

module.exports = {serveFile};
