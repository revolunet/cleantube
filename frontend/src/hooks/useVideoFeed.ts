import { useState, useEffect, useMemo, useRef } from "react";
import Fuse from "fuse.js";
import type { Channel, VideoWithChannel } from "../types";

const PAGE_SIZE = 20;

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

type SortOrder = "random" | "date";
type DurationFilter = "all" | "5min" | "30min";

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return (parseInt(h || "0") * 3600) + (parseInt(m || "0") * 60) + parseInt(s || "0");
}

export function useVideoFeed(category: string) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPublic, setSelectedPublic] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortOrder, setSortOrder] = useState<SortOrder>("random");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");

  // Store shuffled order in a ref so it's only computed once per category
  const shuffledVideosRef = useRef<VideoWithChannel[] | null>(null);
  const currentCategoryRef = useRef<string | null>(null);

  // Reset state when category changes
  useEffect(() => {
    const isInitialLoad = currentCategoryRef.current === null;
    currentCategoryRef.current = category;

    // Only show loading spinner on initial load
    if (isInitialLoad) {
      setLoading(true);
    }

    // Reset filters and shuffle ref for new category
    shuffledVideosRef.current = null;
    setSearch("");
    setSelectedTags([]);
    setSelectedPublic([]);
    setSelectedChannels([]);
    setVisibleCount(PAGE_SIZE);
    setSortOrder("random");
    setDurationFilter("all");

    fetch(`${import.meta.env.BASE_URL}channels/${category}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Category not found: ${category}`);
        return res.json();
      })
      .then((data) => {
        setChannels(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, [category]);

  const allVideos = useMemo(() => {
    if (channels.length === 0) {
      return [];
    }

    // Only shuffle once on initial load
    if (shuffledVideosRef.current !== null) {
      return shuffledVideosRef.current;
    }

    const videos: VideoWithChannel[] = [];
    for (const channel of channels) {
      for (const video of channel.videos) {
        videos.push({
          ...video,
          channelId: channel.id,
          channelName: channel.name,
          channelThumbnail: channel.thumbnail,
          channelPublic: channel.public,
          channelTags: channel.tags,
        });
      }
    }

    // Shuffle videos randomly for initial display
    const shuffled = shuffleArray(videos);
    shuffledVideosRef.current = shuffled;
    return shuffled;
  }, [channels]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const channel of channels) {
      channel.tags.forEach((t) => tags.add(t));
      channel.videos.forEach((v) => v.tags.forEach((t) => tags.add(t)));
    }
    return Array.from(tags).sort();
  }, [channels]);

  const allPublic = useMemo(() => {
    const publics = new Set<string>();
    for (const channel of channels) {
      publics.add(channel.public);
    }
    return Array.from(publics).sort();
  }, [channels]);

  const allChannelNames = useMemo(() => {
    return channels.map((c) => c.name).sort();
  }, [channels]);

  const fuse = useMemo(
    () =>
      new Fuse(allVideos, {
        keys: ["title", "description", "channelName"],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [allVideos]
  );

  const filteredVideos = useMemo(() => {
    let result = allVideos;

    if (search.trim()) {
      result = fuse.search(search).map((r) => r.item);
    }

    if (selectedTags.length > 0) {
      result = result.filter((v) =>
        selectedTags.some(
          (tag) => v.tags.includes(tag) || v.channelTags.includes(tag)
        )
      );
    }

    if (selectedPublic.length > 0) {
      result = result.filter((v) => selectedPublic.includes(v.channelPublic));
    }

    if (selectedChannels.length > 0) {
      result = result.filter((v) => selectedChannels.includes(v.channelName));
    }

    // Filter by duration
    if (durationFilter === "5min") {
      result = result.filter((v) => parseDuration(v.duration) < 5 * 60);
    } else if (durationFilter === "30min") {
      result = result.filter((v) => parseDuration(v.duration) < 30 * 60);
    }

    // Sort by date if requested
    if (sortOrder === "date") {
      result = [...result].sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
    }

    return result;
  }, [allVideos, search, selectedTags, selectedPublic, selectedChannels, fuse, sortOrder, durationFilter]);

  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount]
  );

  const hasMore = visibleCount < filteredVideos.length;

  const loadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const toggleTag = (tag: string) => {
    const isSelected = selectedTags.includes(tag);
    setSearch("");
    setSelectedTags(isSelected ? [] : [tag]);
    setSelectedPublic([]);
    setSelectedChannels([]);
    setVisibleCount(PAGE_SIZE);
  };

  const togglePublic = (pub: string) => {
    const isSelected = selectedPublic.includes(pub);
    setSearch("");
    setSelectedTags([]);
    setSelectedPublic(isSelected ? [] : [pub]);
    setSelectedChannels([]);
    setVisibleCount(PAGE_SIZE);
  };

  const toggleChannel = (channel: string) => {
    const isSelected = selectedChannels.includes(channel);
    setSearch("");
    setSelectedTags([]);
    setSelectedPublic([]);
    setSelectedChannels(isSelected ? [] : [channel]);
    setVisibleCount(PAGE_SIZE);
  };

  const updateSearch = (value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  };

  const filterByTagOnly = (tag: string) => {
    setSearch("");
    setSelectedTags([tag]);
    setSelectedPublic([]);
    setSelectedChannels([]);
    setVisibleCount(PAGE_SIZE);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedTags([]);
    setSelectedPublic([]);
    setSelectedChannels([]);
    setVisibleCount(PAGE_SIZE);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "random" ? "date" : "random"));
    setVisibleCount(PAGE_SIZE);
  };

  return {
    loading,
    videos: visibleVideos,
    filteredVideos,
    allVideos,
    totalCount: filteredVideos.length,
    hasMore,
    loadMore,
    search,
    setSearch: updateSearch,
    allTags,
    selectedTags,
    toggleTag,
    allPublic,
    selectedPublic,
    togglePublic,
    allChannelNames,
    selectedChannels,
    toggleChannel,
    filterByTagOnly,
    resetFilters,
    sortOrder,
    toggleSortOrder,
    durationFilter,
    setDurationFilter,
  };
}
