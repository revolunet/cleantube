import { useMemo, useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useQueryState } from "nuqs";
import { useParams, useNavigate, Link } from "react-router-dom";
import { VideoCard } from "./components/VideoCard";
import { VideoModal } from "./components/VideoModal";
import { FilterPills } from "./components/FilterPills";
import { SearchBar } from "./components/SearchBar";
import { useVideoFeed } from "./hooks/useVideoFeed";
import type { CategoryInfo } from "./types";
import "./App.css";

function App() {
  const { category = "youth" } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}categories.json`)
      .then((res) => res.json())
      .then(setCategories)
      .catch(console.error);
  }, []);

  const {
    loading,
    videos,
    filteredVideos,
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
  } = useVideoFeed(category);

  const currentCategory = categories.find((c) => c.id === category);

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
        <div className="header-left">
          <Link to="/" className="logo-link">
            <h1 className="logo">CleanTube</h1>
          </Link>
          {categories.length > 1 && (
            <nav className="category-nav">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/${cat.id}`}
                  className={`category-link ${cat.id === category ? "active" : ""}`}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
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
        <div className="results-header">
          <p className="results-count">{totalCount} vidéos</p>
          {totalCount > 0 && (
            <button
              className="lucky-button"
              onClick={() => {
                const randomIndex = Math.floor(Math.random() * filteredVideos.length);
                setVideoId(filteredVideos[randomIndex].id);
              }}
            >
              J'ai de la chance
            </button>
          )}
        </div>
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
