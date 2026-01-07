import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

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

const CHANNELS_DIR = "channels";
const DATA_DIR = "data";
const README_PATH = "README.md";

function getCategories(): string[] {
  return readdirSync(CHANNELS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""));
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

function generateChannelsSection(): string {
  const categories = getCategories();
  const lines: string[] = ["## Chaines", ""];

  for (const category of categories.sort()) {
    const channels = getChannelData(category);
    if (channels.length === 0) continue;

    const categoryName = formatCategoryName(category);
    lines.push(`### ${categoryName}`);
    lines.push("");
    lines.push("| Chaîne | Description |");
    lines.push("|--------|-------------|");

    for (const channel of channels.sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const link = `[${channel.name}](https://youtube.com/channel/${channel.id})`;
      const videoCount = channel.videos?.length || 0;
      lines.push(`| ${link} | ${channel.description.split("\n")[0]} |`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function updateReadme(): void {
  const readme = readFileSync(README_PATH, "utf-8");
  const channelsSection = generateChannelsSection();

  // Find and replace the Chaines section, or add it before ## Setup
  const chainesRegex = /## Chaines\n[\s\S]*?\n(?=## [A-Z])/;
  const setupRegex = /## Setup/;

  let newReadme: string;

  if (readme.includes("## Chaines\n")) {
    // Replace existing section
    newReadme = readme.replace(chainesRegex, channelsSection + "\n");
  } else if (setupRegex.test(readme)) {
    // Insert before License section
    newReadme = readme.replace(setupRegex, channelsSection + "\n## Setup");
  } else {
    // Append at the end
    newReadme = readme + "\n" + channelsSection;
  }

  writeFileSync(README_PATH, newReadme);
  console.log("README.md updated with channels section");
}

updateReadme();
