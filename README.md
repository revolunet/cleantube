# CleanTube

Discover and browse educational YouTube content in French. Videos are automatically tagged using Claude AI.

## Features

- AI-powered video categorization (age groups, educational tags)
- Fuzzy search and smart filtering
- Random video picker ("J'ai de la chance")
- Privacy-focused (youtube-nocookie.com embeds)

## Setup

```bash
# Install dependencies
npm install
cd frontend && npm install

# Configure environment
cp .env.example .env
# Add YOUTUBE_API_KEY and ANTHROPIC_API_KEY
```

## Usage

```bash
# Update channel data
npm run update

# Run frontend
cd frontend && npm run dev
```

## Adding Channels

Edit `channels.json` and run `npm run update`.

## GitHub Workflows

- **Deploy**: Build and publish to GitHub Pages on push to `main`
- **Update Channels**: Daily update at 18h UTC (requires `YOUTUBE_API_KEY` and `ANTHROPIC_API_KEY` secrets)

## License

MIT
