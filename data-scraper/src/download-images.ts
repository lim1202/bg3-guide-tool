// Download images from database URLs to local storage
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

// Use absolute paths to avoid __dirname issues with ts-node
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(PROJECT_ROOT, 'bg3-guide/src-tauri/data/bg3_guide.db');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'bg3-guide/src-tauri/data/images');

async function downloadImages() {
  console.log(`Database path: ${DB_PATH}`);
  console.log(`Images directory: ${IMAGES_DIR}`);

  const SQL = await initSqlJs();
  const dbData = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(dbData);

  // Get all image URLs
  const result = db.exec('SELECT id, image FROM quest_steps WHERE image IS NOT NULL');
  if (!result[0]) {
    console.log('No images found');
    return;
  }

  const images = result[0].values as [number, string][];
  console.log(`Found ${images.length} images to download`);

  // Ensure images directory exists
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Download each image
  let downloaded = 0;
  let failed = 0;

  for (const [stepId, url] of images) {
    try {
      // Skip if already a local path
      if (url.startsWith('images/') || url.startsWith('/')) {
        downloaded++;
        continue;
      }

      // Generate local filename from URL
      const urlParts = url.split('/');
      const filename = `${stepId}_${urlParts[urlParts.length - 1]}`;
      const localPath = path.join(IMAGES_DIR, filename);

      // Skip if already exists
      if (fs.existsSync(localPath)) {
        // Update database with local path
        const localUrl = `images/${filename}`;
        db.run('UPDATE quest_steps SET image = ? WHERE id = ?', [localUrl, stepId]);
        downloaded++;
        continue;
      }

      // Download image
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000
      });

      fs.writeFileSync(localPath, response.data);
      downloaded++;

      // Update database with local path
      const localUrl = `images/${filename}`;
      db.run('UPDATE quest_steps SET image = ? WHERE id = ?', [localUrl, stepId]);

    } catch (error) {
      failed++;
      console.log(`Failed: ${url} - ${error}`);
    }
  }

  // Save updated database
  const updatedData = db.export();
  fs.writeFileSync(DB_PATH, updatedData);

  db.close();

  console.log(`\nCompleted: ${downloaded} downloaded, ${failed} failed`);
}

downloadImages().catch(console.error);