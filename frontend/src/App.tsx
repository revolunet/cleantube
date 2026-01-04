import { useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useQueryState } from "nuqs";
import { VideoCard } from "./components/VideoCard";
import { VideoModal } from "./components/VideoModal";
import { FilterPills } from "./components/FilterPills";
import { SearchBar } from "./components/SearchBar";
import { useVideoFeed } from "./hooks/useVideoFeed";
import "./App.css";

function App() {
  const {
    loading,
    videos,
    allVideos,
    totalCount,
    hasMore,
    loadMore,
    search,
    setSearch,
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
  } = useVideoFeed();

  const [videoId, setVideoId] = useQueryState("v");

  const selectedVideo = useMemo(() => {
    if (!videoId) return null;
    return allVideos.find((v) => v.id === videoId) || null;
  }, [videoId, allVideos]);

  const { ref: loadMoreRef } = useInView({
    onChange: (inView) => {
      if (inView && hasMore) loadMore();
    },
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo" onClick={resetFilters}>CleanTube</h1>
        <SearchBar value={search} onChange={setSearch} />
      </header>

      <aside className="filters">
        <FilterPills
          label="Public"
          options={allPublic}
          selected={selectedPublic}
          onToggle={togglePublic}
        />
        <FilterPills
          label="Tags"
          options={allTags}
          selected={selectedTags}
          onToggle={toggleTag}
        />
        <FilterPills
          label="Chaînes"
          options={allChannelNames}
          selected={selectedChannels}
          onToggle={toggleChannel}
        />
      </aside>

      <main className="main">
        <p className="results-count">{totalCount} vidéos</p>
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard
              key={`${video.channelId}-${video.id}`}
              video={video}
              onClick={() => setVideoId(video.id)}
            />
          ))}
        </div>
        {hasMore && (
          <div ref={loadMoreRef} className="load-more">
            <div className="spinner" />
          </div>
        )}
      </main>

      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={() => setVideoId(null)}
          onTagClick={(tag) => {
            setVideoId(null);
            filterByTagOnly(tag);
          }}
        />
      )}
    </div>
  );
}

export default App;
