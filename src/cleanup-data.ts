import { readdir, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, basename } from "node:path";

const CHANNELS_DIR = "channels";
const DATA_DIR = "data";

interface ChannelData {
  id: string;
  name: string;
}

async function getCategories(): Promise<string[]> {
  const files = await readdir(CHANNELS_DIR);
  return files.filter((f) => f.endsWith(".json")).map((f) => basename(f, ".json"));
}

async function getHandles(category: string): Promise<string[]> {
  const filePath = join(CHANNELS_DIR, `${category}.json`);
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as string[];
}

async function getDataFiles(category: string): Promise<string[]> {
  const categoryDir = join(DATA_DIR, category);
  if (!existsSync(categoryDir)) return [];
  const files = await readdir(categoryDir);
  return files.filter((f) => f.endsWith(".json"));
}

async function loadChannelData(category: string, filename: string): Promise<ChannelData | null> {
  try {
    const filePath = join(DATA_DIR, category, filename);
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as ChannelData;
  } catch {
    return null;
  }
}

function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]/g, "");
}

async function main() {
  const dryRun = !process.argv.includes("--delete");

  if (dryRun) {
    console.log("Mode simulation (ajouter --delete pour supprimer)\n");
  } else {
    console.log("Mode suppression actif\n");
  }

  const categories = await getCategories();
  let totalOrphaned = 0;

  // Check for orphaned category folders in data/
  if (existsSync(DATA_DIR)) {
    const dataFolders = await readdir(DATA_DIR);
    for (const folder of dataFolders) {
      if (!categories.includes(folder) && !folder.startsWith(".")) {
        console.log(`Dossier orphelin: data/${folder}/`);
        if (!dryRun) {
          await rm(join(DATA_DIR, folder), { recursive: true });
          console.log(`  -> Supprimé`);
        }
        totalOrphaned++;
      }
    }
  }

  // Check each category
  for (const category of categories) {
    console.log(`\n=== ${category} ===`);

    const handles = await getHandles(category);
    const dataFiles = await getDataFiles(category);

    console.log(`Handles dans channels/${category}.json: ${handles.length}`);
    console.log(`Fichiers dans data/${category}/: ${dataFiles.length}`);

    // Normalize handles for comparison
    const normalizedHandles = new Set(handles.map(normalizeForComparison));

    // Check each data file
    for (const file of dataFiles) {
      const channelData = await loadChannelData(category, file);
      if (!channelData) {
        console.log(`  Fichier invalide: ${file}`);
        continue;
      }

      // Try to match the channel name with any handle
      const normalizedName = normalizeForComparison(channelData.name);
      const isReferenced = normalizedHandles.has(normalizedName);

      if (!isReferenced) {
        // Also try partial matching
        const partialMatch = [...normalizedHandles].some(
          (h) => normalizedName.includes(h) || h.includes(normalizedName)
        );

        if (!partialMatch) {
          console.log(`  Orphelin: ${file} (${channelData.name})`);
          totalOrphaned++;

          if (!dryRun) {
            await rm(join(DATA_DIR, category, file));
            console.log(`    -> Supprimé`);
          }
        }
      }
    }
  }

  console.log(`\n${totalOrphaned} fichier(s) orphelin(s) trouvé(s)`);

  if (dryRun && totalOrphaned > 0) {
    console.log("\nUtiliser 'npm run cleanup -- --delete' pour supprimer");
  }
}

main().catch(console.error);
