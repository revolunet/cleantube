import { memo } from "react";
import type { VideoWithChannel } from "../types";

interface VideoCardProps {
  video: VideoWithChannel;
  onClick: () => void;
}

const PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect fill='%23ddd' width='16' height='9'/%3E%3C/svg%3E";

export const VideoCard = memo(function VideoCard({ video, onClick }: VideoCardProps) {
  const formatDuration = (duration: string) => {
    if (!duration) return "";
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "";
    const [, h, m, s] = match;
    const parts = [];
    if (h) parts.push(h);
    parts.push((m || "0").padStart(h ? 2 : 1, "0"));
    parts.push((s || "0").padStart(2, "0"));
    return parts.join(":");
  };

  return (
    <article className="video-card" onClick={onClick}>
      <div className="video-thumbnail">
        <img src={video.thumbnail || PLACEHOLDER} alt={video.title} loading="lazy" />
        {video.duration && (
          <span className="video-duration">{formatDuration(video.duration)}</span>
        )}
      </div>
      <div className="video-info">
        {video.channelThumbnail && (
          <img
            src={video.channelThumbnail}
            alt={video.channelName}
            className="channel-avatar"
          />
        )}
        <div className="video-meta">
          <h3 className="video-title">{video.title}</h3>
          <p className="channel-name">{video.channelName}</p>
        </div>
      </div>
    </article>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if video.id changes or onClick reference changes
  return prevProps.video.id === nextProps.video.id;
});
