import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Catalog } from "../types";

export function HomePage() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}catalog.json`)
      .then((res) => res.json())
      .then((data: Catalog) => {
        // Shuffle categories randomly
        const shuffledCategories = [...data.categories].sort(() => Math.random() - 0.5);
        setCatalog({ ...data, categories: shuffledCategories });
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
                <p className="category-card-description">{category.description}</p>
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

      <footer className="home-footer">
        <p>Découvrez du contenu éducatif et culturel de qualité.</p>
        <p>
          <a href="https://github.com/revolunet/cleantube">Éditez sur GitHub</a>
        </p>
      </footer>
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
    rire: "😂",
    tech: "💻",
  };
  return icons[categoryId] || "📺";
}
