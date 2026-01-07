import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";

interface ChannelData {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  public: string;
  language: string;
  tags: string[];
  videos: unknown[];
}

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

const CATALOG_PATH = "catalog.yaml";
const DATA_DIR = "data";
const README_PATH = "README.md";

function loadCatalog(): Catalog {
  if (!existsSync(CATALOG_PATH)) {
    console.error(`Error: ${CATALOG_PATH} not found`);
    process.exit(1);
  }
  const content = readFileSync(CATALOG_PATH, "utf-8");
  return parseYaml(content);
}

function getChannelData(category: string): ChannelData[] {
  const categoryDir = join(DATA_DIR, category);
  try {
    const files = readdirSync(categoryDir).filter((f) => f.endsWith(".json"));
    return files.map((f) => {
      const content = readFileSync(join(categoryDir, f), "utf-8");
      return JSON.parse(content) as ChannelData;
    });
  } catch {
    return [];
  }
}

function formatCategoryName(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function generateChannelsSection(catalog: Catalog): string {
  const lines: string[] = ["## Chaines", ""];

  for (const category of catalog.categories) {
    const channels = getChannelData(category.name);
    if (channels.length === 0) continue;

    const categoryName = formatCategoryName(category.name);
    lines.push(`### ${categoryName}`);
    lines.push("");
    lines.push(`> ${category.description}`);
    lines.push("");
    lines.push("| Chaîne | Description |");
    lines.push("|--------|-------------|");

    for (const channel of channels.sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const link = `[${channel.name}](https://youtube.com/channel/${channel.id})`;
      const description = channel.description.split("\n")[0].slice(0, 100);
      lines.push(
        `| ${link} | ${description}${
          channel.description.length > 100 ? "..." : ""
        } |`
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

function updateReadme(): void {
  const catalog = loadCatalog();
  const readme = readFileSync(README_PATH, "utf-8");
  const channelsSection = generateChannelsSection(catalog);

  // Find and replace the Chaines section, or add it before ## Setup
  const chainesRegex = /## Chaines\n[\s\S]*?\n(?=## [A-Z])/;
  const setupRegex = /## Setup/;

  let newReadme: string;

  if (readme.includes("## Chaines\n")) {
    // Replace existing section
    newReadme = readme.replace(chainesRegex, channelsSection + "\n");
  } else if (setupRegex.test(readme)) {
    // Insert before Setup section
    newReadme = readme.replace(setupRegex, channelsSection + "\n## Setup");
  } else {
    // Append at the end
    newReadme = readme + "\n" + channelsSection;
  }

  writeFileSync(README_PATH, newReadme);
  console.log("README.md updated with channels section");
}

updateReadme();
