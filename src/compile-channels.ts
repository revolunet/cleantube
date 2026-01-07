import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DATA_DIR = "data";
const OUTPUT_DIR = "frontend/public";
const CHANNELS_OUTPUT_DIR = "frontend/public/channels";

interface CategoryInfo {
  id: string;
  name: string;
  channelCount: number;
  videoCount: number;
}

async function compileChannels() {
  // Ensure output directories exist
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }
  if (!existsSync(CHANNELS_OUTPUT_DIR)) {
    await mkdir(CHANNELS_OUTPUT_DIR, { recursive: true });
  }

  // Get all category directories
  const entries = await readdir(DATA_DIR);
  const categories: CategoryInfo[] = [];

  for (const entry of entries) {
    const entryPath = join(DATA_DIR, entry);
    const entryStat = await stat(entryPath);

    if (!entryStat.isDirectory()) {
      continue;
    }

    const category = entry;
    const categoryDir = entryPath;

    // Get all JSON files in this category
    const files = await readdir(categoryDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
      console.log(`Skipping empty category: ${category}`);
      continue;
    }

    console.log(`Processing category: ${category} (${jsonFiles.length} channels)`);

    const channels = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await readFile(join(categoryDir, file), "utf-8");
        return JSON.parse(content);
      })
    );

    // Calculate total videos
    const totalVideos = channels.reduce((sum, ch) => sum + (ch.videos?.length || 0), 0);

    // Write category data file
    const outputFile = join(CHANNELS_OUTPUT_DIR, `${category}.json`);
    await writeFile(outputFile, JSON.stringify(channels, null, 2));
    console.log(`  Compiled ${channels.length} channels (${totalVideos} videos) to ${outputFile}`);

    // Add to categories list
    categories.push({
      id: category,
      name: formatCategoryName(category),
      channelCount: channels.length,
      videoCount: totalVideos,
    });
  }

  // Write categories index file
  const indexFile = join(OUTPUT_DIR, "categories.json");
  await writeFile(indexFile, JSON.stringify(categories, null, 2));
  console.log(`\nWrote categories index to ${indexFile}`);
  console.log(`Total categories: ${categories.length}`);
}

function formatCategoryName(category: string): string {
  // Simple formatting: capitalize first letter
  return category.charAt(0).toUpperCase() + category.slice(1);
}

compileChannels().catch(console.error);
