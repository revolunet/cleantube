import { useMemo, useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useQueryState } from "nuqs";
import { useParams, Link } from "react-router-dom";
import { VideoCard } from "./components/VideoCard";
import { VideoModal } from "./components/VideoModal";
import { FilterPills } from "./components/FilterPills";
import { SearchBar } from "./components/SearchBar";
import { useVideoFeed } from "./hooks/useVideoFeed";
import type { CategoryInfo, Catalog } from "./types";
import "./App.css";

const EMPTY_MESSAGES = [
  { emoji: "🔍", text: "Aucune vidéo trouvée... Essayez d'autres filtres !" },
  {
    emoji: "🎯",
    text: "Pas de résultat, mais le catalogue regorge de pépites !",
  },
  { emoji: "🌟", text: "Rien ici, mais d'autres catégories vous attendent !" },
  { emoji: "🎬", text: "Oups, aucune vidéo ! Tentez une autre recherche ?" },
  { emoji: "🚀", text: "Zéro résultat... L'aventure continue ailleurs !" },
  {
    emoji: "💡",
    text: "Pas de match, mais plein d'autres vidéos à découvrir !",
  },
  { emoji: "🎲", text: "Rien trouvé ! Et si vous tentiez votre chance ?" },
  { emoji: "🌈", text: "Aucun résultat, mais le catalogue est vaste !" },
  { emoji: "🔮", text: "Pas de vidéo ici... Explorez une autre catégorie !" },
  {
    emoji: "✨",
    text: "Zéro trouvaille, mais mille possibilités vous attendent !",
  },
];

function App() {
  const { category = "youth" } = useParams<{ category: string }>();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [emptyMessageIndex, setEmptyMessageIndex] = useState(() =>
    Math.floor(Math.random() * EMPTY_MESSAGES.length)
  );

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}catalog.json`)
      .then((res) => res.json())
      .then((data: Catalog) => setCategories(data.categories))
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
    sortOrder,
    toggleSortOrder,
    durationFilter,
    setDurationFilter,
  } = useVideoFeed(category);

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

  // Change empty message each time results become empty
  useEffect(() => {
    if (totalCount === 0) {
      setEmptyMessageIndex(Math.floor(Math.random() * EMPTY_MESSAGES.length));
    }
  }, [totalCount]);

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
                  className={`category-link ${
                    cat.id === category ? "active" : ""
                  }`}
                  title={cat.description}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="header-right">
          <SearchBar value={search} onChange={setSearch} />
          <a
            href="https://github.com/revolunet/cleantube/edit/main/catalog.yaml"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            title="Éditer le catalogue sur GitHub"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
        </div>
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
        <div className="filter-group">
          <span className="filter-label">Durée</span>
          <div className="filter-pills">
            <button
              className={`pill ${durationFilter === "all" ? "active" : ""}`}
              onClick={() => setDurationFilter("all")}
            >
              Tout
            </button>
            <button
              className={`pill ${durationFilter === "5min" ? "active" : ""}`}
              onClick={() => setDurationFilter("5min")}
            >
              &lt; 5 min
            </button>
            <button
              className={`pill ${durationFilter === "30min" ? "active" : ""}`}
              onClick={() => setDurationFilter("30min")}
            >
              &lt; 30 min
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="results-header">
          <p className="results-count">{totalCount} vidéos</p>
          {totalCount > 0 && (
            <>
              <button
                className={`sort-button ${
                  sortOrder === "date" ? "active" : ""
                }`}
                onClick={toggleSortOrder}
              >
                {sortOrder === "date" ? "▼ Plus récentes" : "🎲 Aléatoire"}
              </button>
              <button
                className="lucky-button"
                onClick={() => {
                  const randomIndex = Math.floor(
                    Math.random() * filteredVideos.length
                  );
                  setVideoId(filteredVideos[randomIndex].id);
                }}
              >
                J'ai de la chance
              </button>
            </>
          )}
        </div>
        {totalCount === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">
              {EMPTY_MESSAGES[emptyMessageIndex].emoji}
            </span>
            <p className="empty-text">
              {EMPTY_MESSAGES[emptyMessageIndex].text}
            </p>
          </div>
        ) : (
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard
                key={`${video.channelId}-${video.id}`}
                video={video}
                onClick={() => setVideoId(video.id)}
              />
            ))}
          </div>
        )}
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
