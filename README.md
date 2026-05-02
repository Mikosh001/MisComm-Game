# MisComm Game

A simple real-time web game built with Node.js, Express, Socket.IO, and plain HTML/CSS/JavaScript.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Gameplay

- The host creates a room and shares the link or QR code.
- Players enter their names and join the room.
- The host does not play; the host only controls the room and timers.
- The host chooses up to 3 teams, a game mode, timer lengths, and a word list.
- Teams play one by one: Team 1, then Team 2, then Team 3.
- In the active team, one player is the Guesser and the others explain.
- Explainers take turns one by one.
- The host starts each explainer timer manually.
- The host also starts the guesser answer timer manually.
- The Guesser does not see the word.
- The active team's explainers see the word and the current speaker is highlighted.
- The Guesser submits an answer during the answer phase.
- A correct answer gives that team 1 point.

## Languages

The UI supports Kazakh, Russian, and English from the language selector in the header.

## Deploy

This app uses Socket.IO WebSockets and in-memory rooms. It must run on a long-running Node.js web service that supports WebSockets.

Do not deploy this version to Vercel Functions. Vercel Functions do not work as a persistent WebSocket server, and room state stored in memory can disappear between serverless invocations. That causes symptoms like:

- the app switching online/offline
- players not receiving real-time updates
- "room not found" even though the host created a room

Recommended simple deployment: Render Web Service.

1. Push this repo to GitHub.
2. Open Render and create a new Web Service.
3. Connect the GitHub repo.
4. Use:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Open the Render URL and create a room there.

For production with multiple server instances, replace in-memory rooms with Redis or another shared store.

Use:

```bash
npm start
```
