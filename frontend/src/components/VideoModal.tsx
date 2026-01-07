import { useEffect } from "react";
import type { VideoWithChannel } from "../types";

function linkifyDescription(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="description-link"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

interface VideoModalProps {
  video: VideoWithChannel;
  onClose: () => void;
  onTagClick: (tag: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function VideoModal({ video, onClose, onTagClick, onNext, onPrevious }: VideoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        onNext?.();
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        onPrevious?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, onNext, onPrevious]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="video-embed">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div className="modal-info">
          <h2>{video.title}</h2>
          <p className="modal-channel">{video.channelName}</p>
          {video.tags.length > 0 && (
            <div className="modal-tags">
              {video.tags.map((tag) => (
                <button
                  key={tag}
                  className="modal-tag"
                  onClick={() => onTagClick(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          {video.description && (
            <p className="modal-description">{linkifyDescription(video.description)}</p>
          )}
        </div>
      </div>
    </div>
  );
}
