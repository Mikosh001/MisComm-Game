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
- The host chooses up to 3 teams, a game mode, and a word list.
- Teams play one by one: Team 1, then Team 2, then Team 3.
- In the active team, one player is the Guesser and the others explain.
- Explainers take turns automatically, 20 seconds per person.
- The Guesser does not see the word.
- The active team's explainers see the word and the current speaker is highlighted.
- The Guesser submits an answer after the explaining turns end.
- A correct answer gives that team 1 point.

## Languages

The UI supports Kazakh, Russian, and English from the language selector in the header.

## Deploy

This app uses in-memory rooms, so game state resets when the server restarts. It can be deployed to any Node.js host that supports WebSockets.

Use:

```bash
npm start
```
