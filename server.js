const express = require("express");
const http = require("http");
const path = require("path");
const QRCode = require("qrcode");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;
const DEFAULT_EXPLAINER_SECONDS = 20;
const DEFAULT_GUESS_SECONDS = 20;
const MAX_TEAMS = 3;
const MODES = ["Gesture only", "One word only", "Emotion only", "No rules"];
const DEFAULT_WORDS = [
  "Rainbow",
  "Microwave",
  "Spaceship",
  "Birthday cake",
  "Thunderstorm",
  "Backpack",
  "Robot",
  "Sandcastle",
  "Pancake",
  "Treasure map"
];

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = new Map();
const socketRooms = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/join/:roomCode", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/qr/:roomCode", async (req, res) => {
  const roomCode = sanitizeRoomCode(req.params.roomCode);
  const joinUrl = `${getRequestOrigin(req)}/join/${roomCode}`;

  try {
    const image = await QRCode.toBuffer(joinUrl, {
      type: "png",
      width: 360,
      margin: 1,
      color: {
        dark: "#172033",
        light: "#ffffff"
      }
    });

    res.setHeader("Content-Type", "image/png");
    res.send(image);
  } catch {
    res.status(500).send("Unable to generate QR code.");
  }
});

io.on("connection", (socket) => {
  socket.on("createRoom", ({ hostName } = {}) => {
    const name = sanitizeName(hostName);
    if (!name) {
      emitError(socket, "createNameRequired");
      return;
    }

    leaveCurrentRoom(socket);

    const roomCode = createRoomCode();
    const room = {
      code: roomCode,
      hostId: socket.id,
      phase: "lobby",
      settings: {
        teamCount: 3,
        words: [...DEFAULT_WORDS],
        mode: MODES[0],
        explainerSeconds: DEFAULT_EXPLAINER_SECONDS,
        guessSeconds: DEFAULT_GUESS_SECONDS
      },
      players: new Map(),
      teams: [],
      usedWords: [],
      round: null,
      cycleNumber: 0,
      turnNumber: 0,
      createdAt: Date.now()
    };

    room.players.set(socket.id, createPlayer(socket.id, name));
    rooms.set(roomCode, room);
    socketRooms.set(socket.id, roomCode);
    socket.join(roomCode);

    emitRoomState(room);
  });

  socket.on("joinRoom", ({ roomCode, name } = {}) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms.get(code);
    const playerName = sanitizeName(name);

    if (!room) {
      emitError(socket, "roomNotFound");
      return;
    }

    if (!playerName) {
      emitError(socket, "joinNameRequired");
      return;
    }

    leaveCurrentRoom(socket);

    room.players.set(socket.id, createPlayer(socket.id, playerName));
    socketRooms.set(socket.id, code);
    socket.join(code);

    if (room.phase !== "lobby") {
      placeLateJoiner(room, socket.id);
    }

    emitRoomState(room);
  });

  socket.on("updateSettings", ({ roomCode, teamCount, words, mode, explainerSeconds, guessSeconds } = {}) => {
    const room = getHostedRoom(socket, roomCode);
    if (!room) {
      return;
    }

    if (room.phase === "ready" || room.phase === "round" || room.phase === "answer") {
      emitError(socket, "settingsLocked");
      return;
    }

    const nextTeamCount = sanitizeTeamCount(teamCount);
    const nextWords = sanitizeWords(words);
    const nextMode = MODES.includes(mode) ? mode : room.settings.mode;

    if (!nextWords.length) {
      emitError(socket, "wordsRequired");
      return;
    }

    room.settings = {
      teamCount: nextTeamCount,
      words: nextWords,
      mode: nextMode,
      explainerSeconds: sanitizeSeconds(explainerSeconds, room.settings.explainerSeconds),
      guessSeconds: sanitizeSeconds(guessSeconds, room.settings.guessSeconds)
    };
    room.usedWords = room.usedWords.filter((word) => nextWords.includes(word));

    emitRoomState(room);
  });

  socket.on("startGame", ({ roomCode } = {}) => {
    const room = getHostedRoom(socket, roomCode);
    if (!room) {
      return;
    }

    const playerIds = getPlayablePlayerIds(room);

    if (playerIds.length < room.settings.teamCount * 2) {
      emitError(socket, "twoPlayersPerTeam");
      return;
    }

    if (!room.settings.words.length) {
      emitError(socket, "wordsRequired");
      return;
    }

    clearRoundTimer(room);
    room.teams = assignTeams(playerIds, room.settings.teamCount);
    room.teams.forEach((team) => {
      team.score = 0;
    });
    room.usedWords = [];
    room.round = null;
    room.cycleNumber = 0;
    room.turnNumber = 0;
    startCycle(room);
  });

  socket.on("startNextRound", ({ roomCode } = {}) => {
    const room = getHostedRoom(socket, roomCode);
    if (!room) {
      return;
    }

    if (!room.teams.length) {
      emitError(socket, "startGameFirst");
      return;
    }

    if (room.phase === "ready") {
      startCurrentTimer(room);
      return;
    }

    if (room.phase === "round") {
      enterAnswerPhase(room);
      return;
    }

    if (room.phase === "answer") {
      finalizeTeamTurn(room);
      return;
    }

    startNextTeamTurn(room);
  });

  socket.on("revealNow", ({ roomCode } = {}) => {
    const room = getHostedRoom(socket, roomCode);
    if (!room) {
      return;
    }

    if (room.phase === "ready" || room.phase === "round") {
      enterAnswerPhase(room);
      return;
    }

    if (room.phase === "answer") {
      finalizeTeamTurn(room);
    }
  });

  socket.on("startTimer", ({ roomCode } = {}) => {
    const room = getHostedRoom(socket, roomCode);
    if (!room) {
      return;
    }

    startCurrentTimer(room);
  });

  socket.on("submitGuess", ({ roomCode, answer } = {}) => {
    const code = sanitizeRoomCode(roomCode);
    const room = rooms.get(code);

    if (!room || !room.players.has(socket.id)) {
      emitError(socket, "joinFirst");
      return;
    }

    if (room.phase !== "answer") {
      emitError(socket, "guessClosed");
      return;
    }

    const team = getActiveTeam(room);
    if (!team || team.guesserId !== socket.id) {
      emitError(socket, "onlyGuesser");
      return;
    }

    const cleanAnswer = sanitizeGuess(answer);
    if (!cleanAnswer) {
      emitError(socket, "answerRequired");
      return;
    }

    room.round.submissions[team.id] = {
      teamId: team.id,
      teamName: team.name,
      playerId: socket.id,
      answer: cleanAnswer,
      correct: false
    };

    finalizeTeamTurn(room);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
  });
});

function createPlayer(id, name) {
  return {
    id,
    name,
    joinedAt: Date.now()
  };
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  do {
    code = "";
    for (let index = 0; index < 5; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  } while (rooms.has(code));

  return code;
}

function assignTeams(playerIds, teamCount) {
  const shuffledPlayers = shuffle(playerIds);
  const teams = Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    number: index + 1,
    name: `Team ${index + 1}`,
    score: 0,
    playerIds: [],
    guesserId: null
  }));

  shuffledPlayers.forEach((playerId, index) => {
    teams[index % teamCount].playerIds.push(playerId);
  });

  return teams;
}

function startCycle(room) {
  room.cycleNumber += 1;
  assignGuessers(room);
  startTeamTurn(room, 0);
}

function assignGuessers(room) {
  refreshTeamMembership(room);
  room.teams.forEach((team) => {
    team.guesserId = pickRandom(team.playerIds);
  });
}

function startNextTeamTurn(room) {
  const currentIndex = room.round ? room.round.teamIndex : -1;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= room.teams.length) {
    startCycle(room);
    return;
  }

  startTeamTurn(room, nextIndex);
}

function startTeamTurn(room, teamIndex) {
  clearRoundTimer(room);
  refreshTeamMembership(room);

  const team = room.teams[teamIndex];
  if (!team || team.playerIds.length < 2) {
    room.phase = "reveal";
    emitRoomState(room);
    return;
  }

  if (!team.guesserId || !team.playerIds.includes(team.guesserId)) {
    team.guesserId = pickRandom(team.playerIds);
  }

  const explainers = getExplainerIds(team);
  if (!explainers.length) {
    room.phase = "reveal";
    emitRoomState(room);
    return;
  }

  room.turnNumber += 1;
  room.phase = "ready";
  room.round = {
    number: room.cycleNumber,
    turnNumber: room.turnNumber,
    teamIndex,
    activeTeamId: team.id,
    activeExplainerIndex: 0,
    activeExplainerId: explainers[0],
    word: chooseNextWord(room),
    secondsLeft: room.settings.explainerSeconds,
    explainerSeconds: room.settings.explainerSeconds,
    guessSeconds: room.settings.guessSeconds,
    timerType: "explainer",
    isTimerRunning: false,
    submissions: {},
    scored: false,
    timer: null
  };

  emitRoomState(room);
  io.to(room.code).emit("timerTick", room.round.secondsLeft);
}

function startCurrentTimer(room) {
  if (!room.round || room.round.timer) {
    return;
  }

  if (room.phase === "ready") {
    startExplainerTimer(room);
    return;
  }

  if (room.phase === "answer") {
    startAnswerTimer(room);
  }
}

function startExplainerTimer(room) {
  if (!room.round || room.phase !== "ready") {
    return;
  }

  room.phase = "round";
  room.round.timerType = "explainer";
  room.round.isTimerRunning = true;
  room.round.secondsLeft = room.round.secondsLeft || room.settings.explainerSeconds;
  emitRoomState(room);

  room.round.timer = setInterval(() => {
    if (!room.round || room.phase !== "round") {
      clearRoundTimer(room);
      return;
    }

    room.round.secondsLeft -= 1;

    if (room.round.secondsLeft <= 0) {
      clearRoundTimer(room);
      const moved = moveToNextExplainer(room);
      if (moved) {
        io.to(room.code).emit("speakerChanged", createSpeakerPayload(room));
        emitRoomState(room);
        io.to(room.code).emit("timerTick", room.round.secondsLeft);
        return;
      }

      enterAnswerPhase(room);
      return;
    }

    io.to(room.code).emit("timerTick", room.round.secondsLeft);
  }, 1000);
}

function startAnswerTimer(room) {
  if (!room.round || room.phase !== "answer") {
    return;
  }

  room.round.timerType = "answer";
  room.round.isTimerRunning = true;
  room.round.secondsLeft = room.round.secondsLeft || room.settings.guessSeconds;
  emitRoomState(room);
  io.to(room.code).emit("timerTick", room.round.secondsLeft);

  room.round.timer = setInterval(() => {
    if (!room.round || room.phase !== "answer") {
      clearRoundTimer(room);
      return;
    }

    room.round.secondsLeft -= 1;
    io.to(room.code).emit("timerTick", room.round.secondsLeft);

    if (room.round.secondsLeft <= 0) {
      finalizeTeamTurn(room);
    }
  }, 1000);
}

function moveToNextExplainer(room) {
  const team = getActiveTeam(room);
  if (!team) {
    return false;
  }

  const explainers = getExplainerIds(team);
  const nextIndex = room.round.activeExplainerIndex + 1;

  if (nextIndex >= explainers.length) {
    return false;
  }

  room.round.activeExplainerIndex = nextIndex;
  room.round.activeExplainerId = explainers[nextIndex];
  room.round.secondsLeft = room.settings.explainerSeconds;
  room.round.timerType = "explainer";
  room.round.isTimerRunning = false;
  room.phase = "ready";
  return true;
}

function enterAnswerPhase(room) {
  if (!room.round || (room.phase !== "ready" && room.phase !== "round")) {
    return;
  }

  clearRoundTimer(room);
  room.phase = "answer";
  room.round.secondsLeft = room.settings.guessSeconds;
  room.round.timerType = "answer";
  room.round.isTimerRunning = false;
  io.to(room.code).emit("roundEnded", {
    phase: "answer",
    message: "timeUp"
  });
  emitRoomState(room);
}

function finalizeTeamTurn(room) {
  if (!room.round || room.phase === "reveal") {
    return;
  }

  clearRoundTimer(room);
  room.phase = "reveal";
  room.round.secondsLeft = 0;

  const team = getActiveTeam(room);
  if (team && !room.round.scored) {
    const submission = room.round.submissions[team.id] || {
      teamId: team.id,
      teamName: team.name,
      playerId: team.guesserId,
      answer: "",
      correct: false
    };

    submission.correct = normalizeAnswer(submission.answer) === normalizeAnswer(room.round.word);
    room.round.submissions[team.id] = submission;

    if (submission.correct) {
      team.score += 1;
    }

    room.round.scored = true;
  }

  io.to(room.code).emit("roundEnded", createRevealPayload(room));
  emitRoomState(room);
}

function chooseNextWord(room) {
  const availableWords = room.settings.words.filter((word) => !room.usedWords.includes(word));

  if (!availableWords.length) {
    room.usedWords = [];
    availableWords.push(...room.settings.words);
  }

  const word = pickRandom(availableWords);
  room.usedWords.push(word);
  return word;
}

function refreshTeamMembership(room) {
  if (!room.teams.length) {
    return;
  }

  room.teams.forEach((team) => {
    team.playerIds = team.playerIds.filter(
      (playerId) => room.players.has(playerId) && playerId !== room.hostId
    );
    if (team.guesserId && !team.playerIds.includes(team.guesserId)) {
      team.guesserId = pickRandom(team.playerIds);
    }
  });

  const assigned = new Set(room.teams.flatMap((team) => team.playerIds));
  const unassigned = getPlayablePlayerIds(room).filter((playerId) => !assigned.has(playerId));

  unassigned.forEach((playerId) => {
    const smallestTeam = [...room.teams].sort(
      (left, right) => left.playerIds.length - right.playerIds.length
    )[0];
    smallestTeam.playerIds.push(playerId);
  });
}

function placeLateJoiner(room, playerId) {
  if (!room.teams.length || playerId === room.hostId) {
    return;
  }

  const smallestTeam = [...room.teams].sort(
    (left, right) => left.playerIds.length - right.playerIds.length
  )[0];
  smallestTeam.playerIds.push(playerId);
}

function leaveCurrentRoom(socket) {
  const roomCode = socketRooms.get(socket.id);
  if (!roomCode) {
    return;
  }

  const room = rooms.get(roomCode);
  socketRooms.delete(socket.id);
  socket.leave(roomCode);

  if (!room) {
    return;
  }

  room.players.delete(socket.id);
  room.teams.forEach((team) => {
    team.playerIds = team.playerIds.filter((playerId) => playerId !== socket.id);
    if (team.guesserId === socket.id) {
      team.guesserId = pickRandom(team.playerIds);
    }
  });

  if (!room.players.size) {
    clearRoundTimer(room);
    rooms.delete(roomCode);
    return;
  }

  if (room.hostId === socket.id) {
    room.hostId = [...room.players.keys()][0];
    refreshTeamMembership(room);
  }

  if (room.round && room.round.activeExplainerId === socket.id && (room.phase === "ready" || room.phase === "round")) {
    const team = getActiveTeam(room);
    const explainers = team ? getExplainerIds(team) : [];
    room.round.activeExplainerIndex = Math.min(room.round.activeExplainerIndex, explainers.length - 1);
    room.round.activeExplainerId = explainers[room.round.activeExplainerIndex] || explainers[0] || null;

    if (!room.round.activeExplainerId) {
      enterAnswerPhase(room);
      return;
    }
  }

  emitRoomState(room);
}

function clearRoundTimer(room) {
  if (room.round && room.round.timer) {
    clearInterval(room.round.timer);
    room.round.timer = null;
    room.round.isTimerRunning = false;
  }
}

function emitRoomState(room) {
  room.players.forEach((_, playerId) => {
    io.to(playerId).emit("roomState", createRoomState(room, playerId));
  });
}

function createRoomState(room, viewerId) {
  const viewer = room.players.get(viewerId);
  const isHost = room.hostId === viewerId;
  const viewerTeam = room.teams.find((team) => team.playerIds.includes(viewerId));
  const activeTeam = getActiveTeam(room);
  const viewerRole = getPlayerRole(room, viewerId);
  const canSeeWord = canViewerSeeWord(room, viewerId);
  const socket = io.sockets.sockets.get(viewerId);
  const origin = socket ? getSocketOrigin(socket) : "";

  return {
    roomCode: room.code,
    joinUrl: origin ? `${origin}/join/${room.code}` : `/join/${room.code}`,
    qrUrl: `/qr/${room.code}`,
    phase: room.phase,
    isHost,
    hostId: room.hostId,
    maxTeams: MAX_TEAMS,
    explainerSeconds: room.settings.explainerSeconds,
    guessSeconds: room.settings.guessSeconds,
    viewer: viewer
      ? {
          id: viewer.id,
          name: viewer.name,
          teamId: viewerTeam ? viewerTeam.id : null,
          teamName: viewerTeam ? viewerTeam.name : null,
          role: viewerRole,
          canSeeWord,
          isActiveTeam: Boolean(activeTeam && viewerTeam && activeTeam.id === viewerTeam.id),
          isActiveExplainer: room.round ? room.round.activeExplainerId === viewerId : false
        }
      : null,
    settings: {
      teamCount: room.settings.teamCount,
      mode: room.settings.mode,
      explainerSeconds: room.settings.explainerSeconds,
      guessSeconds: room.settings.guessSeconds,
      words: isHost ? room.settings.words : []
    },
    players: [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.id === room.hostId,
      teamId: getPlayerTeamId(room, player.id),
      role: getPlayerRole(room, player.id),
      isActiveExplainer: room.round ? room.round.activeExplainerId === player.id : false
    })),
    teams: room.teams.map((team) => ({
      id: team.id,
      number: team.number,
      name: team.name,
      score: team.score,
      isActive: activeTeam ? activeTeam.id === team.id : false,
      guesserId: team.guesserId,
      guesserName: room.players.get(team.guesserId)?.name || "",
      players: team.playerIds
        .map((playerId) => room.players.get(playerId))
        .filter(Boolean)
        .map((player) => ({
          id: player.id,
          name: player.name,
          role: getPlayerRole(room, player.id),
          isHost: player.id === room.hostId,
          isActiveExplainer: room.round ? room.round.activeExplainerId === player.id : false
        }))
    })),
    round: room.round
      ? {
          number: room.round.number,
          turnNumber: room.round.turnNumber,
          teamIndex: room.round.teamIndex,
          activeTeamId: room.round.activeTeamId,
          activeTeamName: activeTeam ? activeTeam.name : "",
          activeTeamNumber: activeTeam ? activeTeam.number : null,
          activeExplainerId: room.round.activeExplainerId,
          activeExplainerName: room.players.get(room.round.activeExplainerId)?.name || "",
          activeExplainerIndex: room.round.activeExplainerIndex,
          explainerCount: activeTeam ? getExplainerIds(activeTeam).length : 0,
          secondsLeft: room.round.secondsLeft,
          explainerSeconds: room.round.explainerSeconds,
          guessSeconds: room.round.guessSeconds,
          timerType: room.round.timerType,
          isTimerRunning: room.round.isTimerRunning,
          mode: room.settings.mode,
          word: canSeeWord || room.phase === "reveal" ? room.round.word : null,
          submissions: room.phase === "reveal" ? Object.values(room.round.submissions) : [],
          submittedTeamIds: Object.keys(room.round.submissions),
          hasNextTeam: room.round.teamIndex + 1 < room.teams.length
        }
      : null
  };
}

function createRevealPayload(room) {
  return {
    phase: "reveal",
    correctWord: room.round.word,
    activeTeamId: room.round.activeTeamId,
    submissions: Object.values(room.round.submissions),
    scores: room.teams.map((team) => ({
      teamId: team.id,
      teamName: team.name,
      score: team.score
    }))
  };
}

function createSpeakerPayload(room) {
  return {
    activeTeamId: room.round.activeTeamId,
    activeExplainerId: room.round.activeExplainerId,
    activeExplainerName: room.players.get(room.round.activeExplainerId)?.name || "",
    secondsLeft: room.round.secondsLeft
  };
}

function getHostedRoom(socket, roomCode) {
  const code = sanitizeRoomCode(roomCode);
  const room = rooms.get(code);

  if (!room || !room.players.has(socket.id)) {
    emitError(socket, "joinFirst");
    return null;
  }

  if (room.hostId !== socket.id) {
    emitError(socket, "hostOnly");
    return null;
  }

  return room;
}

function getPlayablePlayerIds(room) {
  return [...room.players.keys()].filter((playerId) => playerId !== room.hostId);
}

function getActiveTeam(room) {
  if (!room.round) {
    return null;
  }

  return room.teams.find((team) => team.id === room.round.activeTeamId) || null;
}

function getExplainerIds(team) {
  return team.playerIds.filter((playerId) => playerId !== team.guesserId);
}

function canViewerSeeWord(room, viewerId) {
  if (!room.round) {
    return false;
  }

  if (viewerId === room.hostId || room.phase === "reveal") {
    return true;
  }

  const team = getActiveTeam(room);
  return (
    room.phase !== "lobby" &&
    Boolean(team) &&
    team.playerIds.includes(viewerId) &&
    getPlayerRole(room, viewerId) === "Explainer"
  );
}

function getPlayerRole(room, playerId) {
  if (playerId === room.hostId) {
    return "Host";
  }

  if (!room.round) {
    return null;
  }

  const team = room.teams.find((currentTeam) => currentTeam.playerIds.includes(playerId));
  if (!team) {
    return null;
  }

  if (team.id !== room.round.activeTeamId) {
    return "Waiting";
  }

  return team.guesserId === playerId ? "Guesser" : "Explainer";
}

function getPlayerTeamId(room, playerId) {
  const team = room.teams.find((currentTeam) => currentTeam.playerIds.includes(playerId));
  return team ? team.id : null;
}

function emitError(socket, message) {
  socket.emit("playerError", message);
}

function sanitizeRoomCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
}

function sanitizeName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 28);
}

function sanitizeGuess(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function sanitizeTeamCount(value) {
  const count = Number.parseInt(value, 10);
  if (!Number.isFinite(count)) {
    return MAX_TEAMS;
  }

  return Math.min(Math.max(count, 1), MAX_TEAMS);
}

function sanitizeSeconds(value, fallback) {
  const seconds = Number.parseInt(value, 10);
  if (!Number.isFinite(seconds)) {
    return fallback;
  }

  return Math.min(Math.max(seconds, 5), 180);
}

function sanitizeWords(words) {
  const input = Array.isArray(words) ? words : String(words || "").split(/\n|,/);
  const seen = new Set();

  return input
    .map((word) =>
      String(word || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 80)
    )
    .filter(Boolean)
    .filter((word) => {
      const key = normalizeAnswer(word);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 200);
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function shuffle(values) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function pickRandom(values) {
  if (!values.length) {
    return null;
  }

  return values[Math.floor(Math.random() * values.length)];
}

function getRequestOrigin(req) {
  const protocol = req.get("x-forwarded-proto") || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function getSocketOrigin(socket) {
  const headers = socket.handshake.headers;
  const protocol = headers["x-forwarded-proto"] || "http";
  const host = headers.host;
  return host ? `${protocol}://${host}` : "";
}

server.listen(PORT, () => {
  console.log(`MisComm Game running at http://localhost:${PORT}`);
});
