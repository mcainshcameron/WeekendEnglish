/**
 * Image pipeline for WeekendEnglish.it
 *
 * The photographs ship as WebP with a JPEG fallback. They used to be PNGs —
 * a lossless format for photographs, which cost ~6.5 MB across three files.
 *
 * Sources are read from images/_originals/ so this script is idempotent:
 * re-running it never re-compresses an already-compressed file.
 *
 *   npm run optimize-images
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ORIGINALS = path.join(__dirname, 'images/_originals');
const OUT = path.join(__dirname, 'images');

// `width` is roughly 2x the largest size each image is ever displayed at.
const TARGETS = [
    { src: 'hero-confidence.png', name: 'hero-confidence', width: 1600 },
    { src: 'problem-trap.png',    name: 'problem-trap',    width: 1800 },
    { src: 'method-focus.png',    name: 'method-focus',    width: 1400 }
];

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(0);

async function run() {
    if (!fs.existsSync(ORIGINALS)) {
        console.error('Missing images/_originals — nothing to derive from.');
        process.exit(1);
    }

    let before = 0;
    let after = 0;

    for (const t of TARGETS) {
        const src = path.join(ORIGINALS, t.src);
        if (!fs.existsSync(src)) {
            console.warn(`skip ${t.src} (no original)`);
            continue;
        }

        before += fs.statSync(src).size;

        // The originals still carry the generator watermark in the bottom-right
        // corner; trim the rightmost 7% before doing anything else.
        const meta = await sharp(src).metadata();
        const cropped = sharp(src).extract({
            left: 0,
            top: 0,
            width: Math.round(meta.width * 0.93),
            height: meta.height
        }).resize({ width: t.width, withoutEnlargement: true });

        const webp = path.join(OUT, `${t.name}.webp`);
        const jpg = path.join(OUT, `${t.name}.jpg`);

        await cropped.clone().webp({ quality: 78, effort: 5 }).toFile(webp);
        await cropped.clone().jpeg({ quality: 80, mozjpeg: true }).toFile(jpg);

        after += fs.statSync(webp).size;
        console.log(`${t.name}: ${t.width}px  webp ${kb(webp)} KB  jpg ${kb(jpg)} KB`);
    }

    // Social card, cropped to the exact 1200x630 the meta tags advertise.
    const og = path.join(OUT, 'og-cover.jpg');
    await sharp(path.join(ORIGINALS, 'hero-confidence.png'))
        .resize(1200, 630, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(og + '.tmp');
    fs.renameSync(og + '.tmp', og);
    console.log(`og-cover.jpg: ${kb(og)} KB`);

    // The portrait is already small; just cap it at 2x its display size.
    const portrait = path.join(__dirname, 'Cameron.jpeg');
    if (fs.existsSync(portrait)) {
        // Read into a buffer first: sharp keeps a handle on a path input, and
        // writing back to that same path fails on Windows/OneDrive.
        const original = fs.readFileSync(portrait);
        const buf = await sharp(original)
            .resize({ width: 640, withoutEnlargement: true })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
        if (buf.length < original.length) {
            fs.writeFileSync(portrait, buf);
        }
        console.log(`Cameron.jpeg: ${kb(portrait)} KB`);
    }

    console.log(`\nphotographs: ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB (webp)`);
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
