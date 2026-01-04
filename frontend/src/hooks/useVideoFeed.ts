import { useState, useEffect, useMemo, useRef } from "react";
import Fuse from "fuse.js";
import type { Channel, VideoWithChannel } from "../types";

const PAGE_SIZE = 20;
const STORAGE_KEY = "cleantube-filters";

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function loadFilters() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return { search: "", tags: [], public: [], channels: [] };
}

function saveFilters(search: string, tags: string[], pub: string[], channels: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ search, tags, public: pub, channels }));
  } catch {}
}

export function useVideoFeed() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const initialFilters = useMemo(() => loadFilters(), []);
  const [search, setSearch] = useState(initialFilters.search);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters.tags);
  const [selectedPublic, setSelectedPublic] = useState<string[]>(initialFilters.public);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(initialFilters.channels || []);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    saveFilters(search, selectedTags, selectedPublic, selectedChannels);
  }, [search, selectedTags, selectedPublic, selectedChannels]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}channels-data.json`)
      .then((res) => res.json())
      .then((data) => {
        setChannels(data);
        setLoading(false);
      });
  }, []);

  // Store shuffled order in a ref so it's only computed once on initial load
  const shuffledVideosRef = useRef<VideoWithChannel[] | null>(null);

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

    return result;
  }, [allVideos, search, selectedTags, selectedPublic, selectedChannels, fuse]);

  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount]
  );

  const hasMore = visibleCount < filteredVideos.length;

  const loadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setVisibleCount(PAGE_SIZE);
  };

  const togglePublic = (pub: string) => {
    setSelectedPublic((prev) =>
      prev.includes(pub) ? prev.filter((p) => p !== pub) : [...prev, pub]
    );
    setVisibleCount(PAGE_SIZE);
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
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
  };
}
