<p align="center">
  <img src="https://raw.githubusercontent.com/Dark-Avian-Labs/.github/refs/heads/main/banner.png" alt="Dark Avian Labs">
</p>

# Outfitter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/Dark-Avian-Labs/Outfitter/ci.yml?style=flat-square&label=CI)](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/ci.yml)
[![PR](https://img.shields.io/github/actions/workflow/status/Dark-Avian-Labs/Outfitter/pr.yml?style=flat-square&label=PR)](https://github.com/Dark-Avian-Labs/Outfitter/actions/workflows/pr.yml)
![Node](https://img.shields.io/badge/Node-%3E%3D26-339933?logo=node.js&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white&style=flat-square)
![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
[![Cursor](https://img.shields.io/badge/Cursor-IDE-141414?logo=cursor&logoColor=white&style=flat-square)](https://cursor.com)

Outfitter is a Watcher of Realms stash you can actually search. Drop mythic gear and artifacts in, then ask for a loadout that hits the stat floors you care about. One outfit per hero, so the next swap is a save instead of another inventory rummage.

Paste a screenshot and it reads the rolls. Hero names and combat bases come from Codex, which is also where portraits live.

Live: [outfitter.darkavianlabs.com](https://outfitter.darkavianlabs.com)

## Gotchas

- Needs a populated Codex Watcher of Realms database at `CODEX_WOR_DB_PATH`. First boot copies the catalog when that path exists.
- App and session SQLite files must be different paths.

## License

MIT
