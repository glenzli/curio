import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import * as fontkit from 'fontkit';
import { Resvg } from '@resvg/resvg-js';

const root = path.dirname(fileURLToPath(import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const number = (value) => Number(value.toFixed(5));

function textField(value, name) {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`book.json ${name} must be a nonempty single line`);
  }
  return value.trim();
}

async function loadFont(record, directory) {
  const bytes = await readFile(path.join(directory, record.file));
  if (hash(bytes) !== record.sha256) throw new Error(`Font checksum mismatch: ${record.file}`);
  const base = fontkit.create(bytes);
  if (base.version !== record.version) throw new Error(`Font version mismatch: ${record.file}`);
  for (const [axis, value] of Object.entries(record.axes ?? {})) {
    const allowed = base.variationAxes[axis];
    if (!allowed || value < allowed.min || value > allowed.max) throw new Error(`Invalid font axis ${axis}`);
  }
  return record.axes ? base.getVariation(record.axes) : base;
}

function outlinedLine(text, font, settings, width) {
  if (settings.direction === 'vertical') {
    const step = settings.fontSize + settings.lineGap;
    const lines = [...text].map((character, index) => outlinedLine(character, font, {
      ...settings, direction: 'horizontal', letterSpacing: 0,
      baseline: settings.baseline + index * step
    }, width));
    return {
      fontSize: settings.fontSize, left: settings.x, baseline: settings.baseline,
      direction: 'vertical', step,
      svg: `<g aria-label="${xml(text)}">${lines.map((line) => line.svg).join('')}</g>`
    };
  }
  for (const character of text) {
    if (!font.hasGlyphForCodePoint(character.codePointAt(0))) {
      throw new Error(`Missing glyph ${JSON.stringify(character)} in ${font.fullName}; no font fallback is allowed`);
    }
  }
  const run = font.layout(text);
  if (run.glyphs.some((glyph) => glyph.id === 0)) throw new Error('Shaping produced a missing glyph');
  const units = run.positions.reduce((sum, position) => sum + position.xAdvance, 0);
  const spacing = settings.letterSpacing * (run.glyphs.length - 1);
  const size = Math.min(settings.fontSize, (settings.maxWidth - spacing) * font.unitsPerEm / units);
  if (!Number.isFinite(size) || size < settings.minFontSize) throw new Error(`Text is too long for this cover: ${text}`);
  const scale = size / font.unitsPerEm;
  const advance = units * scale + spacing;
  const x = settings.x ?? (width - advance) / 2;
  if (x < 0 || x + advance > width) throw new Error(`Text falls outside the cover width: ${text}`);
  let cursorX = 0;
  let cursorY = 0;
  const glyphs = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const outline = glyph.path.toSVG();
    const result = outline ? `<path transform="translate(${number(cursorX + position.xOffset)} ${number(cursorY + position.yOffset)})" d="${outline}"/>` : '';
    cursorX += position.xAdvance + settings.letterSpacing / scale;
    cursorY += position.yAdvance;
    return result;
  }).join('');
  return {
    fontSize: number(size), advance: number(advance), left: number(x), baseline: settings.baseline,
    svg: `<g aria-label="${xml(text)}" fill="${settings.fill}" transform="translate(${number(x)} ${settings.baseline}) scale(${number(scale)} ${number(-scale)})">${glyphs}</g>`
  };
}

async function prepareOutput(directory, inputs) {
  for (const file of inputs) {
    const relative = path.relative(directory, file);
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) throw new Error('Output must not contain a source input');
  }
  let entries;
  try { entries = await readdir(directory); }
  catch (error) { if (error.code !== 'ENOENT') throw error; entries = []; }
  if (entries.length) {
    let previous;
    try { previous = JSON.parse(await readFile(path.join(directory, 'build.json'), 'utf8')); }
    catch { throw new Error('Refusing to overwrite a nonempty directory without this cover build record'); }
    if (previous.generator !== 'photographic-imaging-science-cover') throw new Error('Output belongs to another builder');
  }
  await mkdir(directory, { recursive: true });
}

async function main() {
  const { values } = parseArgs({ options: {
    art: { type: 'string', default: path.join(root, 'artwork-v2.png') },
    book: { type: 'string', default: path.join(root, '..', 'book.json') },
    layout: { type: 'string', default: path.join(root, 'cover-layout.json') },
    'font-dir': { type: 'string' },
    out: { type: 'string', default: path.join(root, 'out', 'candidate') },
    help: { type: 'boolean' }
  } });
  if (values.help) {
    console.log('node build-cover.mjs --font-dir DIRECTORY [--art PNG] [--book book.json] [--layout JSON] [--out DIRECTORY]');
    return;
  }
  if (!values['font-dir']) throw new Error('Provide --font-dir with the local font directory; font files are not bundled with the manuscript');
  const fontDirectory = path.resolve(values['font-dir']);
  const bookPath = path.resolve(values.book);
  const artPath = path.resolve(values.art);
  const layoutPath = path.resolve(values.layout);
  const out = path.resolve(values.out);
  const bookBytes = await readFile(bookPath);
  const book = JSON.parse(bookBytes);
  const title = textField(book.title, 'title');
  const author = textField(book.author, 'author');
  const art = await readFile(artPath);
  if (art.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || art.length < 24) throw new Error('Artwork must be a PNG');
  const artWidth = art.readUInt32BE(16);
  const artHeight = art.readUInt32BE(20);
  if (artWidth * 3 !== artHeight * 2) throw new Error('Artwork must have a 2:3 portrait aspect ratio');
  const layoutBytes = await readFile(layoutPath);
  const layout = JSON.parse(layoutBytes);
  if (layout.version !== 1 || layout.width !== 1024 || layout.height !== 1536) throw new Error('Unknown cover layout');
  for (const [item, text] of [[layout.title, title], [layout.author, author]]) {
    if (![item.fontSize, item.minFontSize, item.letterSpacing, item.maxWidth, item.baseline].every(Number.isFinite)
      || item.minFontSize <= 0 || item.fontSize < item.minFontSize || item.maxWidth <= 0 || item.maxWidth > layout.width
      || item.letterSpacing < 0 || item.baseline <= 0 || item.baseline >= layout.height || !/^#[a-f\d]{6}$/iu.test(item.fill)) {
      throw new Error('Invalid typography dimensions or color');
    }
    if (!['horizontal', 'vertical'].includes(item.direction ?? 'horizontal')
      || (item.x !== undefined && (!Number.isFinite(item.x) || item.x < 0))) {
      throw new Error('Invalid text direction or x position');
    }
    if (item.direction === 'vertical' && (!Number.isFinite(item.x)
      || !Number.isFinite(item.lineGap) || item.lineGap < 0
      || item.baseline < item.fontSize
      || item.baseline + ([...text].length - 1) * (item.fontSize + item.lineGap) + item.fontSize / 4 > layout.height)) {
      throw new Error('Vertical text does not fit inside the cover');
    }
  }
  const records = JSON.parse(await readFile(path.join(root, 'fonts', 'fonts.json'), 'utf8'));
  const chosen = [layout.title, layout.author].map((item) => {
    const record = records.fonts.find((font) => font.id === item.font);
    if (!record) throw new Error(`Unknown font: ${item.font}`);
    return record;
  });
  const fonts = await Promise.all(chosen.map((record) => loadFont(record, fontDirectory)));
  const lines = [outlinedLine(title, fonts[0], layout.title, layout.width), outlinedLine(author, fonts[1], layout.author, layout.width)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="cover-title cover-desc"><title id="cover-title">${xml(title)} — ${xml(author)}</title><desc id="cover-desc">${xml('镜头剖面与感光面的概念插画；书名和作者使用本地开源字体的字形轮廓合成。')}</desc><image x="0" y="0" width="${layout.width}" height="${layout.height}" href="data:image/png;base64,${art.toString('base64')}"/>${lines.map((line) => line.svg).join('')}</svg>\n`;
  const options = { font: { loadSystemFonts: false, fontFiles: [] } };
  const png = new Resvg(svg, options).render().asPng();
  const thumbnail = new Resvg(svg, { ...options, fitTo: { mode: 'width', value: 192 } }).render().asPng();
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  const output = { 'cover.svg': Buffer.from(svg), 'cover.png': png, 'cover-192.png': thumbnail };
  const report = {
    generator: 'photographic-imaging-science-cover', version: 1, title, author,
    width: layout.width, height: layout.height,
    source: {
      bookSha256: hash(bookBytes), artworkSha256: hash(art), layoutSha256: hash(layoutBytes),
      scriptSha256: hash(await readFile(fileURLToPath(import.meta.url))),
      lockSha256: hash(await readFile(path.join(root, 'package-lock.json')))
    },
    fonts: chosen.map((record, index) => ({ ...record, fontSize: lines[index].fontSize, left: lines[index].left, baseline: lines[index].baseline,
      ...(lines[index].direction === 'vertical' ? { direction: 'vertical', step: lines[index].step } : {}) })),
    renderer: { fontkit: lock.packages['node_modules/fontkit'].version, resvg: lock.packages['node_modules/@resvg/resvg-js'].version },
    files: Object.fromEntries(Object.entries(output).map(([name, bytes]) => [name, { bytes: bytes.length, sha256: hash(bytes) }]))
  };
  await prepareOutput(out, [bookPath, artPath, layoutPath, ...chosen.map((record) => path.join(fontDirectory, record.file))]);
  for (const [name, bytes] of Object.entries(output)) await writeFile(path.join(out, name), bytes);
  await writeFile(path.join(out, 'build.json'), json(report));
  console.log(json({ title, author, out, fonts: report.fonts.map(({ family, version, fontSize }) => ({ family, version, fontSize })), files: report.files }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
