export interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  published_at: string;
  thumbnail: string;
  tags: string[];
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  public: string;
  language: string;
  tags: string[];
  videos: Video[];
}

export interface VideoWithChannel extends Video {
  channelId: string;
  channelName: string;
  channelThumbnail: string;
  channelPublic: string;
  channelTags: string[];
}

export interface CategoryInfo {
  id: string;
  name: string;
  channelCount: number;
  videoCount: number;
}
