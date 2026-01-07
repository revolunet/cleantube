import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryState } from "nuqs";
import { VideoCard } from "./VideoCard";
import { VideoModal } from "./VideoModal";
import type { Catalog, Channel, VideoWithChannel } from "../types";

export function HomePage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [allVideos, setAllVideos] = useState<VideoWithChannel[]>([]);
  const [latestVideos, setLatestVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoId, setVideoId] = useQueryState("v");

  const selectedVideo = videoId
    ? allVideos.find((v) => v.id === videoId) || null
    : null;

  const playRandomVideo = () => {
    if (allVideos.length === 0) return;
    const randomIndex = Math.floor(Math.random() * allVideos.length);
    setVideoId(allVideos[randomIndex].id);
  };

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}catalog.json`)
      .then((res) => res.json())
      .then(async (data: Catalog) => {
        // Shuffle categories randomly
        const shuffledCategories = [...data.categories].sort(
          () => Math.random() - 0.5
        );
        setCatalog({ ...data, categories: shuffledCategories });

        // Fetch all category data to get latest videos
        const videos: VideoWithChannel[] = [];
        await Promise.all(
          data.categories.map(async (cat) => {
            try {
              const res = await fetch(
                `${import.meta.env.BASE_URL}channels/${cat.id}.json`
              );
              if (!res.ok) return;
              const channels: Channel[] = await res.json();
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
            } catch (e) {
              console.error(e);
            }
          })
        );

        // Store all videos for random selection
        setAllVideos(videos);

        // Sort by published_at descending, take top 20, then shuffle
        const sortedVideos = [...videos].sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime()
        );
        const top20 = sortedVideos.slice(0, 20);
        // Fisher-Yates shuffle
        for (let i = top20.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [top20[i], top20[j]] = [top20[j], top20[i]];
        }
        setLatestVideos(top20);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error);
        setLoading(false);
      });
  }, []);

  if (loading || !catalog) {
    return (
      <div className="home-page">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <h1 className="home-logo">{catalog.title}</h1>
        <p className="home-tagline">{catalog.description}</p>
      </header>

      <main className="home-main">
        <h2 className="home-section-title">Explorez par catégorie</h2>
        <div className="category-cards">
          {catalog.categories.map((category) => (
            <Link
              key={category.id}
              to={`/${category.id}`}
              className="category-card"
            >
              <div className="category-card-icon">
                {getCategoryIcon(category.id)}
              </div>
              <h3 className="category-card-title">{category.name}</h3>
              {category.description && (
                <p className="category-card-description">
                  {category.description}
                </p>
              )}
              <div className="category-card-stats">
                <span>{category.channelCount} chaînes</span>
                <span className="separator">•</span>
                <span>{category.videoCount} vidéos</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <section className="home-lucky">
        {allVideos.length > 0 && (
          <div className="home-random">
            <button className="random-video-button" onClick={playRandomVideo}>
              J'ai de la chance
              <p className="home-total-videos">
                parmi {allVideos.length.toLocaleString("fr-FR")} vidéos
              </p>
            </button>
          </div>
        )}
      </section>

      {latestVideos.length > 0 && (
        <section className="home-latest">
          <h2 className="home-section-title">Dernières vidéos</h2>
          <div className="video-grid">
            {latestVideos.map((video) => (
              <VideoCard
                key={`${video.channelId}-${video.id}`}
                video={video}
                onClick={() => setVideoId(video.id)}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="home-footer">
        <p>Découvrez du contenu éducatif et culturel de qualité.</p>
        <p>
          <a href="https://github.com/revolunet/cleantube">Éditez sur GitHub</a>
        </p>
      </footer>

      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={() => setVideoId(null)}
          onTagClick={() => setVideoId(null)}
        />
      )}
    </div>
  );
}

function getCategoryIcon(categoryId: string): string {
  const icons: Record<string, string> = {
    jeunesse: "👶",
    sciences: "🔬",
    philo: "🤔",
    piano: "🎹",
    ukulele: "🎸",
    "dessins-animes": "🎬",
    "courts-metrages": "🎥",
    cinema: "🎞️",
    monde: "🌍",
    humour: "😂",
    tech: "💻",
  };
  return icons[categoryId] || "📺";
}
