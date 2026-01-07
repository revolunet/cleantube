import { readFile, readdir, unlink, rmdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";
import { parse as parseYaml } from "yaml";

const DATA_DIR = "data";
const CATALOG_PATH = "catalog.yaml";

interface CatalogCategory {
  name: string;
  description: string;
  channels: string[];
}

interface Catalog {
  title: string;
  description: string;
  categories: CatalogCategory[];
}

async function cleanup() {
  // Read catalog
  if (!existsSync(CATALOG_PATH)) {
    console.error(`Error: ${CATALOG_PATH} not found`);
    process.exit(1);
  }

  const catalogContent = await readFile(CATALOG_PATH, "utf-8");
  const catalog: Catalog = parseYaml(catalogContent);

  // Build a map of category -> channel IDs
  const catalogChannels = new Map<string, Set<string>>();
  const allCategories = new Set<string>();

  for (const category of catalog.categories) {
    allCategories.add(category.name);
    catalogChannels.set(category.name, new Set(category.channels));
  }

  console.log(`Catalog: ${catalog.title}`);
  console.log(`Categories in catalog: ${allCategories.size}`);

  if (!existsSync(DATA_DIR)) {
    console.log(`No data directory found, nothing to clean up.`);
    return;
  }

  let totalDeleted = 0;
  let totalKept = 0;
  let deletedDirs = 0;

  // Scan data directory
  const entries = await readdir(DATA_DIR);

  for (const entry of entries) {
    const entryPath = join(DATA_DIR, entry);

    // Skip non-directories and hidden files
    if (entry.startsWith(".")) {
      continue;
    }

    const category = entry;

    // Check if category exists in catalog
    if (!allCategories.has(category)) {
      console.log(`\n[${category}] Category not in catalog, removing directory...`);

      // Delete all files in the directory
      const files = await readdir(entryPath);
      for (const file of files) {
        await unlink(join(entryPath, file));
        console.log(`  Deleted: ${file}`);
        totalDeleted++;
      }

      // Remove the directory
      await rmdir(entryPath);
      console.log(`  Removed directory: ${category}/`);
      deletedDirs++;
      continue;
    }

    // Get valid channel IDs for this category
    const validChannels = catalogChannels.get(category)!;

    // Scan files in category directory
    const files = await readdir(entryPath);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    console.log(`\n[${category}] ${jsonFiles.length} files, ${validChannels.size} channels in catalog`);

    for (const file of jsonFiles) {
      const channelId = basename(file, ".json");
      const filePath = join(entryPath, file);

      if (!validChannels.has(channelId)) {
        console.log(`  Deleting: ${file} (not in catalog)`);
        await unlink(filePath);
        totalDeleted++;
      } else {
        totalKept++;
      }
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Files kept: ${totalKept}`);
  console.log(`Files deleted: ${totalDeleted}`);
  if (deletedDirs > 0) {
    console.log(`Directories removed: ${deletedDirs}`);
  }
}

cleanup().catch(console.error);
