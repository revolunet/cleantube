import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = "data";
const OUTPUT_FILE = "frontend/public/channels-data.json";

async function compileChannels() {
  const files = await readdir(DATA_DIR);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  console.log(`Found ${jsonFiles.length} JSON files in ${DATA_DIR}/`);

  const channels = await Promise.all(
    jsonFiles.map(async (file) => {
      const content = await readFile(join(DATA_DIR, file), "utf-8");
      return JSON.parse(content);
    })
  );

  await writeFile(OUTPUT_FILE, JSON.stringify(channels, null, 2));
  console.log(`Compiled ${channels.length} channels to ${OUTPUT_FILE}`);
}

compileChannels().catch(console.error);
