import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Precompute CRC32 table for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createWordleIconPng(size) {
  // Colors:
  // Background: #121213 -> (18, 18, 19)
  // Absent tile: #3a3a3c -> (58, 58, 60)
  // Present tile: #b59f3b -> (181, 159, 59)
  // Correct tile: #538d4e -> (83, 141, 78)
  const bg = [18, 18, 19, 255];
  const absent = [58, 58, 60, 255];
  const present = [181, 159, 59, 255];
  const correct = [83, 141, 78, 255];

  const gridColors = [
    [absent, present, absent],
    [correct, absent, present],
    [correct, correct, correct],
  ];

  const padding = Math.round(size * 0.14);
  const gap = Math.round(size * 0.05);
  const tileSize = Math.floor((size - padding * 2 - gap * 2) / 3);

  const rawData = Buffer.alloc(size * (size * 4 + 1));

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    rawData[rowStart] = 0; // PNG filter type 0 (None)
    for (let x = 0; x < size; x++) {
      let color = bg;
      for (let r = 0; r < 3; r++) {
        const ty = padding + r * (tileSize + gap);
        if (y >= ty && y < ty + tileSize) {
          for (let c = 0; c < 3; c++) {
            const tx = padding + c * (tileSize + gap);
            if (x >= tx && x < tx + tileSize) {
              color = gridColors[r][c];
              break;
            }
          }
        }
      }
      const pxOffset = rowStart + 1 + x * 4;
      rawData[pxOffset] = color[0];
      rawData[pxOffset + 1] = color[1];
      rawData[pxOffset + 2] = color[2];
      rawData[pxOffset + 3] = color[3];
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth 8
  ihdr[9] = 6; // color type 6 (RGBA)
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ]);
}

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, { recursive: true });

for (const size of [192, 512]) {
  const pngBuffer = createWordleIconPng(size);
  const outPath = path.join(publicDir, `pwa-${size}x${size}.png`);
  fs.writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${outPath} (${pngBuffer.length} bytes)`);
}
