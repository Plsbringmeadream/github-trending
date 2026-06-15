# 🔥 GitHub Trending

A beautiful, dark-themed website showcasing the hottest GitHub repositories from the last 30 days.

![Astro](https://img.shields.io/badge/Astro-FF5D01?style=flat&logo=astro&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

## Features

- 🔥 Browse the most starred new repositories from the last 30 days
- 🌐 Filter by programming language (Python, JavaScript, TypeScript, Rust, Go, etc.)
- 📊 Sort by stars, recently updated, or name
- 📱 Fully responsive design (3/2/1 column grid)
- 🌙 Dark theme inspired by GitHub
- ✨ Smooth card animations
- 🚀 Static site generation for fast loading
- 🔍 SEO optimized

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | No | GitHub Personal Access Token for higher API rate limits |

Without a token: 60 requests/hour  
With a token: 5,000 requests/hour

Create a token at: https://github.com/settings/tokens

## Project Structure

```
/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── FilterBar.astro    # Language & sort filters
│   │   ├── Pagination.astro   # Page navigation
│   │   └── ProjectCard.astro  # Repository card
│   ├── layouts/
│   │   └── Layout.astro       # Base HTML layout
│   ├── lib/
│   │   └── github.ts          # GitHub API & utilities
│   ├── pages/
│   │   ├── index.astro        # Main trending page
│   │   └── about.astro        # About page
│   └── styles/
│       └── global.css         # Tailwind & custom styles
├── .env.example
├── astro.config.mjs
├── package.json
└── README.md
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set `GITHUB_TOKEN` in environment variables
4. Deploy!

For automatic updates, add a Vercel Cron job to rebuild daily.

### Netlify

1. Push to GitHub
2. Import project in Netlify
3. Set `GITHUB_TOKEN` in environment variables
4. Deploy!

### Static Hosting

```bash
npm run build
# Upload the dist/ folder to any static host
```

## Tech Stack

- [Astro](https://astro.build) - Web framework
- [Tailwind CSS v4](https://tailwindcss.com) - Utility-first CSS
- [GitHub Search API](https://docs.github.com/en/rest/search) - Data source

## License

MIT
