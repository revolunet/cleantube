# CleanTube

A full-stack web application for discovering and browsing educational YouTube content in French. CleanTube aggregates educational channels, analyzes content using Claude AI for intelligent categorization, and provides a modern search and filter interface.

## Features

- **AI-Powered Tagging**: Automatic categorization of videos using Claude AI
- **Advanced Search**: Fuzzy search across video titles, descriptions, and channel names
- **Smart Filtering**: Filter by age groups, educational tags, and channels
- **Curated Content**: Focus on French educational YouTube channels
- **Infinite Scroll**: Smooth browsing experience with lazy loading
- **Shareable Links**: Direct video links via URL query parameters
- **Privacy-Focused**: Uses youtube-nocookie.com for video embeds

## Tech Stack

**Backend**
- TypeScript / Node.js
- Anthropic Claude AI SDK
- YouTube Data API v3

**Frontend**
- React 19 + TypeScript
- Vite
- fuse.js (fuzzy search)
- nuqs (URL state management)

## Prerequisites

- Node.js 18+
- YouTube Data API key
- Anthropic API key

## Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
YOUTUBE_API_KEY=your_youtube_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Usage

### Fetching Channel Data

```bash
# Fetch videos from all channels (default: 50 videos per channel)
npm run fetch-channels

# Fetch all videos from channels
npm run fetch-channels -- --all

# Limit videos per channel
npm run fetch-channels -- --limit 100

# Force re-inference of AI tags
npm run fetch-channels -- --force-infer
```

### Compiling Data

```bash
npm run compile-channels
```

This compiles individual channel JSON files into `channels-data.json` and copies it to the frontend.

### Running the Frontend

```bash
cd frontend

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
cleantube/
├── src/                          # Backend source
│   ├── types.ts                  # Type definitions
│   ├── fetch-channels.ts         # YouTube API & Claude integration
│   └── compile-channels.ts       # Data compilation
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── App.tsx              # Main app component
│   │   ├── components/          # UI components
│   │   └── hooks/               # Custom React hooks
│   └── public/                  # Static assets
├── data/                        # Individual channel JSON files
├── channels.json                # List of channel handles to crawl
├── channels-data.json           # Compiled channel data
└── channel.schema.json          # JSON Schema for validation
```

## Educational Tags

Videos are categorized into educational tags including:

`mathematiques`, `sciences`, `francais`, `anglais`, `histoire`, `geographie`, `physique`, `chimie`, `biologie`, `informatique`, `philosophie`, `arts`, `musique`, `litterature`, `environnement`, and more.

## Age Groups

Content is classified by target audience:

- Tout public (General audience)
- 3-5 ans
- 5-10 ans
- 10-15 ans
- 15 ans et plus
- Adultes

## Adding New Channels

Edit `channels.json` to add new YouTube channel handles:

```json
[
  "@ExistingChannel",
  "@NewEducationalChannel"
]
```

Then run `npm run fetch-channels` to fetch the new channel's data.

## License

MIT
