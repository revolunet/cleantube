import { useEffect } from "react";
import type { VideoWithChannel } from "../types";

interface VideoModalProps {
  video: VideoWithChannel;
  onClose: () => void;
  onTagClick: (tag: string) => void;
}

export function VideoModal({ video, onClose, onTagClick }: VideoModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

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
            <p className="modal-description">{video.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
