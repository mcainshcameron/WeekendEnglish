const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesToOptimize = [
  { input: 'images/hero-confidence.png', output: 'images/hero-confidence.png', quality: 85 },
  { input: 'images/problem-trap.png', output: 'images/problem-trap.png', quality: 85 },
  { input: 'images/method-focus.png', output: 'images/method-focus.png', quality: 85 },
  { input: 'images/hero-interview.jpeg', output: 'images/hero-interview.jpeg', quality: 82 },
  { input: 'images/interview.jpeg', output: 'images/interview.jpeg', quality: 82 },
  { input: 'images/collaboration.jpeg', output: 'images/collaboration.jpeg', quality: 82 },
  { input: 'images/presentation.jpeg', output: 'images/presentation.jpeg', quality: 82 },
  { input: 'Cameron.jpeg', output: 'Cameron.jpeg', quality: 82 }
];

async function optimizeImages() {
  console.log('Starting image optimization...\n');

  for (const img of imagesToOptimize) {
    try {
      const inputPath = path.join(__dirname, img.input);
      const outputPath = path.join(__dirname, img.output);

      // Get original file size
      const statsBefore = fs.statSync(inputPath);
      const sizeBefore = (statsBefore.size / 1024 / 1024).toFixed(2);

      // Create backup
      const backupPath = inputPath + '.backup';
      fs.copyFileSync(inputPath, backupPath);

      // Optimize based on file type
      const ext = path.extname(img.input).toLowerCase();

      if (ext === '.png') {
        await sharp(inputPath)
          .png({
            quality: img.quality,
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true
          })
          .toFile(outputPath + '.tmp');
      } else if (ext === '.jpeg' || ext === '.jpg') {
        await sharp(inputPath)
          .jpeg({
            quality: img.quality,
            progressive: true,
            mozjpeg: true
          })
          .toFile(outputPath + '.tmp');
      }

      // Replace original with optimized
      fs.unlinkSync(outputPath);
      fs.renameSync(outputPath + '.tmp', outputPath);

      // Get new file size
      const statsAfter = fs.statSync(outputPath);
      const sizeAfter = (statsAfter.size / 1024 / 1024).toFixed(2);
      const reduction = ((1 - statsAfter.size / statsBefore.size) * 100).toFixed(1);

      console.log(`✓ ${img.input}`);
      console.log(`  ${sizeBefore}MB → ${sizeAfter}MB (${reduction}% reduction)\n`);

    } catch (error) {
      console.error(`✗ Error optimizing ${img.input}:`, error.message);
    }
  }

  console.log('Image optimization complete!');
}

optimizeImages().catch(console.error);
