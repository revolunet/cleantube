import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { parse as parseYaml } from "yaml";
import type { Channel, Video, Tag, AgeGroup } from "./types.js";

interface CatalogCategory {
  name: string;
  description: string;
  channels: string[];
  videos?: string[];
}

interface Catalog {
  title: string;
  categories: CatalogCategory[];
}

const API_KEY = process.env.YOUTUBE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

if (!API_KEY) {
  console.error("Error: YOUTUBE_API_KEY environment variable is required");
  console.error("Create a .env file with your API key (see .env.example)");
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required");
  console.error("Create a .env file with your API key (see .env.example)");
  process.exit(1);
}

const anthropic = new Anthropic();

const VALID_TAGS: Tag[] = [
  "scolaire",
  "elementaire",
  "college",
  "lycee",
  "orientation",
  "metiers",
  "mathematiques",
  "sciences",
  "francais",
  "anglais",
  "espagnol",
  "langues",
  "histoire",
  "geographie",
  "physique",
  "chimie",
  "biologie",
  "economie",
  "arts",
  "musique",
  "litterature",
  "philosophie",
  "informatique",
  "technologie",
  "sport",
  "environnement",
];

const VALID_AGE_GROUPS: AgeGroup[] = [
  "tout public",
  "3-5 ans",
  "5-10 ans",
  "10-15 ans",
  "15 ans et plus",
  "adultes",
];

const DEFAULT_VIDEO_LIMIT = 50;

interface CliOptions {
  limit: number;
  forceInfer: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let limit = DEFAULT_VIDEO_LIMIT;
  let forceInfer = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      const parsed = parseInt(args[i + 1], 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = parsed;
      }
      i++;
    } else if (args[i] === "--all") {
      limit = Infinity;
    } else if (args[i] === "--force-infer") {
      forceInfer = true;
    }
  }

  return { limit, forceInfer };
}

async function fetchYouTubeAPI<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  url.searchParams.set("key", API_KEY!);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YouTube API error: ${response.status} - ${error}`);
  }
  return response.json() as Promise<T>;
}

interface YouTubeChannelResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
    };
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }>;
}

interface YouTubePlaylistItemsResponse {
  items?: Array<{
    snippet: {
      resourceId: {
        videoId: string;
      };
    };
  }>;
  nextPageToken?: string;
}

interface YouTubeVideosResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
    };
    contentDetails: {
      duration: string;
    };
  }>;
}

// Check if string looks like a YouTube channel ID
function isChannelId(str: string): boolean {
  return str.startsWith("UC") && str.length === 24;
}

async function getChannelByIdOrHandle(
  idOrHandle: string
): Promise<YouTubeChannelResponse["items"]> {
  // If it's a channel ID, fetch by ID
  if (isChannelId(idOrHandle)) {
    const response = await fetchYouTubeAPI<YouTubeChannelResponse>("channels", {
      id: idOrHandle,
      part: "snippet,contentDetails",
    });
    return response.items;
  }

  // Otherwise, treat as handle
  const cleanHandle = idOrHandle.startsWith("@")
    ? idOrHandle.slice(1)
    : idOrHandle;

  const response = await fetchYouTubeAPI<YouTubeChannelResponse>("channels", {
    forHandle: cleanHandle,
    part: "snippet,contentDetails",
  });

  return response.items;
}

async function getChannelVideos(
  uploadsPlaylistId: string,
  limit: number
): Promise<string[]> {
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const remaining = limit - videoIds.length;
    const batchSize = Math.min(50, remaining);

    const params: Record<string, string> = {
      playlistId: uploadsPlaylistId,
      part: "snippet",
      maxResults: batchSize.toString(),
    };
    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await fetchYouTubeAPI<YouTubePlaylistItemsResponse>(
      "playlistItems",
      params
    );

    const ids =
      response.items?.map((item) => item.snippet.resourceId.videoId) ?? [];
    videoIds.push(...ids);

    pageToken = response.nextPageToken;

    if (pageToken && videoIds.length < limit) {
      console.log(`    Fetched ${videoIds.length} video IDs...`);
    }
  } while (pageToken && videoIds.length < limit);

  return videoIds;
}

async function getVideoDetails(
  videoIds: string[]
): Promise<YouTubeVideosResponse["items"]> {
  if (videoIds.length === 0) return [];

  const allItems: NonNullable<YouTubeVideosResponse["items"]> = [];

  // YouTube API allows max 50 videos per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const response = await fetchYouTubeAPI<YouTubeVideosResponse>("videos", {
      id: batch.join(","),
      part: "snippet,contentDetails",
    });

    if (response.items) {
      allItems.push(...response.items);
    }

    if (i + 50 < videoIds.length) {
      console.log(
        `    Fetched details for ${allItems.length}/${videoIds.length} videos...`
      );
    }
  }

  return allItems;
}

async function loadExistingChannel(
  category: string,
  channelId: string
): Promise<Channel | null> {
  const filePath = `data/${category}/${channelId}.json`;
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content) as Channel;
  } catch {
    return null;
  }
}

interface ChannelInference {
  tags: Tag[];
  public: AgeGroup;
}

async function inferChannelMetadata(
  name: string,
  description: string,
  sampleVideoTitles: string[]
): Promise<ChannelInference> {
  const prompt = `Analyse cette chaîne YouTube éducative et détermine:
1. Les tags appropriés parmi: ${VALID_TAGS.join(", ")}
2. La tranche d'âge cible parmi: ${VALID_AGE_GROUPS.join(", ")}

Chaîne: ${name}
Description: ${description}
Exemples de titres de vidéos:
${sampleVideoTitles
  .slice(0, 10)
  .map((t) => `- ${t}`)
  .join("\n")}

Réponds UNIQUEMENT en JSON avec ce format exact:
{"tags": ["tag1", "tag2"], "public": "tranche d'âge"}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and filter tags
    const tags = (parsed.tags as string[]).filter((t): t is Tag =>
      VALID_TAGS.includes(t as Tag)
    );

    // Validate age group
    const ageGroup = VALID_AGE_GROUPS.includes(parsed.public as AgeGroup)
      ? (parsed.public as AgeGroup)
      : "tout public";

    return { tags, public: ageGroup };
  } catch (error) {
    console.error("    Error inferring channel metadata:", error);
    return { tags: [], public: "tout public" };
  }
}

async function inferVideoTags(
  videos: Array<{ title: string; description: string }>
): Promise<Map<number, Tag[]>> {
  if (videos.length === 0) return new Map();

  // Process videos in batches to avoid too large prompts
  const batchSize = 20;
  const results = new Map<number, Tag[]>();

  for (let i = 0; i < videos.length; i += batchSize) {
    const batch = videos.slice(i, i + batchSize);
    const videosText = batch
      .map((v, idx) => `[${i + idx}] ${v.title}`)
      .join("\n");

    const prompt = `Analyse ces vidéos YouTube éducatives et attribue des tags à chacune.
Tags disponibles: ${VALID_TAGS.join(", ")}

Vidéos:
${videosText}

Réponds UNIQUEMENT en JSON avec ce format exact:
{"videos": [{"index": 0, "tags": ["tag1", "tag2"]}, ...]}

Attribue 1 à 3 tags pertinents par vidéo. Si aucun tag ne correspond, utilise un tableau vide.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);

      for (const item of parsed.videos ?? []) {
        const validTags = (item.tags as string[]).filter((t): t is Tag =>
          VALID_TAGS.includes(t as Tag)
        );
        results.set(item.index, validTags);
      }
    } catch (error) {
      console.error(`    Error inferring tags for batch ${i}:`, error);
    }
  }

  return results;
}

async function fetchChannelData(
  idOrHandle: string,
  category: string,
  videoLimit: number,
  forceInfer: boolean
): Promise<Channel | null> {
  console.log(`Fetching channel: ${idOrHandle}`);

  const channels = await getChannelByIdOrHandle(idOrHandle);
  if (!channels || channels.length === 0) {
    console.error(`  Channel not found: ${idOrHandle}`);
    return null;
  }

  const channel = channels[0];
  const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;

  console.log(`  Found: ${channel.snippet.title} (${channel.id})`);

  // Load existing channel data to preserve manual edits
  const existingData = await loadExistingChannel(category, channel.id);
  if (existingData) {
    console.log(`  Found existing data, will merge videos`);
  }

  // Build a map of existing videos to preserve their tags
  const existingVideosMap = new Map<string, Video>();
  if (existingData?.videos) {
    for (const video of existingData.videos) {
      existingVideosMap.set(video.id, video);
    }
  }

  const limitLabel = videoLimit === Infinity ? "all" : videoLimit.toString();
  console.log(`  Fetching video IDs (limit: ${limitLabel})...`);
  const videoIds = await getChannelVideos(uploadsPlaylistId, videoLimit);
  console.log(`  Found ${videoIds.length} videos`);

  // Find which videos we need to fetch details for (new ones)
  const newVideoIds = videoIds.filter((id) => !existingVideosMap.has(id));
  console.log(`  ${newVideoIds.length} new videos to fetch details for`);

  // Fetch details only for new videos
  const newVideoDetails = await getVideoDetails(newVideoIds);

  // Create video objects for new videos (without tags for now)
  const newVideos: Video[] =
    newVideoDetails?.map((video) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      duration: video.contentDetails.duration,
      published_at: video.snippet.publishedAt,
      thumbnail:
        video.snippet.thumbnails.high?.url ??
        video.snippet.thumbnails.medium?.url ??
        video.snippet.thumbnails.default?.url,
      tags: [],
    })) ?? [];

  // Add new videos to the map
  for (const video of newVideos) {
    existingVideosMap.set(video.id, video);
  }

  // Build final video list: newest first, then older videos not in current fetch
  const fetchedVideoIds = new Set(videoIds);
  const olderVideos = existingData?.videos.filter((v) => !fetchedVideoIds.has(v.id)) ?? [];

  const allVideos: Video[] = [
    // Recent videos in YouTube order (newest first)
    ...videoIds
      .map((id) => existingVideosMap.get(id))
      .filter((v): v is Video => v !== undefined),
    // Older videos that are no longer in the fetch window
    ...olderVideos,
  ];

  console.log(`  Total videos after merge: ${allVideos.length} (${olderVideos.length} older preserved)`);

  // Find videos that need tag inference (new videos + existing with empty tags)
  const videosNeedingTags = allVideos
    .map((video, index) => ({ video, index }))
    .filter(({ video }) => {
      const hasNoTags = !video.tags || video.tags.length === 0;
      const isNew = newVideos.some((nv) => nv.id === video.id);
      return forceInfer || isNew;
    });

  if (videosNeedingTags.length > 0) {
    console.log(
      `  Inferring tags for ${videosNeedingTags.length} videos with Claude...`
    );
    const videoTagsMap = await inferVideoTags(
      videosNeedingTags.map(({ video }) => ({
        title: video.title,
        description: video.description ?? "",
      }))
    );

    // Apply inferred tags
    videosNeedingTags.forEach(({ video }, idx) => {
      const inferredTags = videoTagsMap.get(idx);
      if (inferredTags) {
        video.tags = inferredTags;
      }
    });
  }

  // Infer channel metadata if new, forced, or has empty tags
  let channelTags = existingData?.tags ?? [];
  let channelPublic = existingData?.public ?? "tout public";
  const needsChannelInference =
    forceInfer || !existingData || channelTags.length === 0;

  if (needsChannelInference) {
    console.log(`  Inferring channel metadata with Claude...`);
    const sampleTitles = allVideos.slice(0, 10).map((v) => v.title);
    const inference = await inferChannelMetadata(
      channel.snippet.title,
      channel.snippet.description,
      sampleTitles
    );
    channelTags = inference.tags;
    channelPublic = inference.public;
    console.log(`    Tags: ${channelTags.join(", ") || "(none)"}`);
    console.log(`    Public: ${channelPublic}`);
  }

  return {
    id: channel.id,
    name: channel.snippet.title,
    description: channel.snippet.description,
    thumbnail:
      channel.snippet.thumbnails.high?.url ??
      channel.snippet.thumbnails.medium?.url ??
      channel.snippet.thumbnails.default?.url,
    public: channelPublic,
    language: existingData?.language ?? "fr",
    tags: channelTags,
    videos: allVideos,
  };
}

async function fetchStandaloneVideos(
  videoIds: string[],
  category: string,
  forceInfer: boolean
): Promise<Channel | null> {
  if (videoIds.length === 0) return null;

  console.log(`Fetching ${videoIds.length} standalone videos for "Autres"...`);

  // Load existing "Autres" channel data
  const existingData = await loadExistingChannel(category, "autres");

  // Build a map of existing videos to preserve their tags
  const existingVideosMap = new Map<string, Video>();
  if (existingData?.videos) {
    for (const video of existingData.videos) {
      existingVideosMap.set(video.id, video);
    }
  }

  // Find which videos we need to fetch details for (new ones)
  const newVideoIds = videoIds.filter((id) => !existingVideosMap.has(id));
  console.log(`  ${newVideoIds.length} new videos to fetch details for`);

  // Fetch details only for new videos
  const newVideoDetails = await getVideoDetails(newVideoIds);

  // Create video objects for new videos (without tags for now)
  const newVideos: Video[] =
    newVideoDetails?.map((video) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      duration: video.contentDetails.duration,
      published_at: video.snippet.publishedAt,
      thumbnail:
        video.snippet.thumbnails.high?.url ??
        video.snippet.thumbnails.medium?.url ??
        video.snippet.thumbnails.default?.url,
      tags: [],
    })) ?? [];

  // Add new videos to the map
  for (const video of newVideos) {
    existingVideosMap.set(video.id, video);
  }

  // Build final video list in the order from catalog
  const allVideos: Video[] = videoIds
    .map((id) => existingVideosMap.get(id))
    .filter((v): v is Video => v !== undefined);

  console.log(`  Total videos in "Autres": ${allVideos.length}`);

  // Find videos that need tag inference
  const videosNeedingTags = allVideos
    .map((video, index) => ({ video, index }))
    .filter(({ video }) => {
      const isNew = newVideos.some((nv) => nv.id === video.id);
      return forceInfer || isNew;
    });

  if (videosNeedingTags.length > 0) {
    console.log(
      `  Inferring tags for ${videosNeedingTags.length} videos with Claude...`
    );
    const videoTagsMap = await inferVideoTags(
      videosNeedingTags.map(({ video }) => ({
        title: video.title,
        description: video.description ?? "",
      }))
    );

    // Apply inferred tags
    videosNeedingTags.forEach(({ video }, idx) => {
      const inferredTags = videoTagsMap.get(idx);
      if (inferredTags) {
        video.tags = inferredTags;
      }
    });
  }

  return {
    id: "autres",
    name: "Autres",
    description: "Vidéos diverses sélectionnées manuellement",
    thumbnail: undefined,
    public: existingData?.public ?? "tout public",
    language: existingData?.language ?? "fr",
    tags: existingData?.tags ?? [],
    videos: allVideos,
  };
}

async function main() {
  const { limit, forceInfer } = parseArgs();

  // Read catalog.yaml
  const catalogPath = "catalog.yaml";
  if (!existsSync(catalogPath)) {
    console.error(`Error: ${catalogPath} not found`);
    process.exit(1);
  }

  const catalogContent = await readFile(catalogPath, "utf-8");
  const catalog: Catalog = parseYaml(catalogContent);

  const limitLabel = limit === Infinity ? "all" : limit.toString();
  console.log(`Catalog: ${catalog.title}`);
  console.log(`Found ${catalog.categories.length} categories`);
  console.log(`Options: video limit=${limitLabel}, force-infer=${forceInfer}\n`);

  // Ensure data directory exists
  if (!existsSync("data")) {
    await mkdir("data");
  }

  // Process each category
  for (const category of catalog.categories) {
    const categoryDataDir = join("data", category.name);

    console.log(`\n=== Processing category: ${category.name} ===`);
    console.log(`    ${category.description}\n`);

    // Ensure category data directory exists
    if (!existsSync(categoryDataDir)) {
      await mkdir(categoryDataDir, { recursive: true });
    }

    console.log(`Found ${category.channels.length} channels in ${category.name}\n`);

    for (const channelId of category.channels) {
      try {
        const channelData = await fetchChannelData(
          channelId,
          category.name,
          limit,
          forceInfer
        );
        if (channelData) {
          const outputPath = join(categoryDataDir, `${channelData.id}.json`);
          await writeFile(outputPath, JSON.stringify(channelData, null, 2));
          console.log(`  Saved to ${outputPath}\n`);
        }
      } catch (error) {
        console.error(`  Error fetching ${channelId}:`, error);
      }
    }

    // Process standalone videos if any
    if (category.videos && category.videos.length > 0) {
      try {
        const autresChannel = await fetchStandaloneVideos(
          category.videos,
          category.name,
          forceInfer
        );
        if (autresChannel) {
          const outputPath = join(categoryDataDir, "autres.json");
          await writeFile(outputPath, JSON.stringify(autresChannel, null, 2));
          console.log(`  Saved to ${outputPath}\n`);
        }
      } catch (error) {
        console.error(`  Error fetching standalone videos:`, error);
      }
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
