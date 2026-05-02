const socket = io();

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");
const connectionStatus = document.querySelector("#connectionStatus");
const languageSelect = document.querySelector("#languageSelect");
const eyebrowText = document.querySelector("#eyebrowText");

const joinCodeFromPath = window.location.pathname.match(/^\/join\/([A-Za-z0-9]+)/)?.[1] || "";
const MODES = ["Gesture only", "One word only", "Emotion only", "No rules"];

const I18N = {
  kk: {
    realTimeGame: "Нақты уақыттағы ойын",
    online: "Онлайн",
    offline: "Офлайн",
    connecting: "Қосылуда",
    createRoom: "Бөлме ашу",
    createRoomText: "Жаңа MisComm ойынын ашып, сілтемені немесе QR кодты бөлісіңіз.",
    joinRoom: "Бөлмеге кіру",
    joinRoomText: "Жүргізуші берген кодты енгізіңіз немесе сілтемені ашыңыз.",
    yourName: "Атыңыз",
    roomCode: "Бөлме коды",
    hostControls: "Жүргізуші басқаруы",
    hostControlsText: "Жүргізуші ойынға қатыспайды, тек ойынды басқарады.",
    teams: "Топтар",
    team: "Топ",
    teamCount: "Топ саны",
    teamCountHint: "Ең көбі 3 топ. Әр топта кемінде 2 ойыншы керек.",
    mode: "Режим",
    explainerSeconds: "Түсіндіруші уақыты (сек)",
    guessSeconds: "Табушы уақыты (сек)",
    timerHint: "Әр таймерді жүргізуші өзі бастайды.",
    words: "Сөздер",
    wordsPlaceholder: "Әр жолға бір сөз немесе сөз тіркесін жазыңыз",
    saveSettings: "Сақтау",
    startGame: "Ойынды бастау",
    waitingHost: "Жүргізушіні күтіп тұрмыз",
    waitingHostText: "Сіз лоббидесіз. Жүргізуші баптауларды таңдап, ойынды бастайды.",
    players: "Ойыншылар",
    host: "Жүргізуші",
    notPlaying: "Ойынға қатыспайды",
    copyLink: "Сілтемені көшіру",
    linkCopied: "Сілтеме көшірілді.",
    lobby: "Лобби",
    ready: "Дайын",
    liveTurn: "Кезек жүріп жатыр",
    answerTime: "Жауап беру",
    results: "Нәтиже",
    round: "Раунд",
    turn: "Кезек",
    activeSpeaker: "Қазір түсіндіреді",
    startTimer: "Таймерді бастау",
    startExplainerTimer: "Түсіндіруші таймерін бастау",
    startAnswerTimer: "Жауап таймерін бастау",
    timerPaused: "Таймер тоқтап тұр",
    waitHostStart: "Жүргізуші таймерді бастағанын күтіңіз",
    nextTeam: "Келесі топ",
    newRound: "Жаңа раунд",
    youExplainNow: "Қазір сіз түсіндіресіз",
    waitYourTurn: "Кезегіңізді күтіңіз",
    teamWaiting: "Сіздің топ кезегін күтіп тұр",
    hostView: "Жүргізуші көрінісі",
    secretWord: "Жасырын сөз",
    wordHidden: "Сөз жасырылған",
    youAreGuessing: "Сіз табушысыз",
    waiting: "Күтуде",
    guesser: "Табушы",
    explainer: "Түсіндіруші",
    answerNow: "Жауапқа өту",
    timeUp: "Уақыт бітті",
    submitGuesses: "Жауап енгізу",
    submitGuessesText: "Белсенді топтың табушысы жауапты жазады. Жауап таймерін жүргізуші бастайды.",
    yourAnswer: "Жауабыңыз",
    typeSecretWord: "Жасырын сөзді жазыңыз",
    submitAnswer: "Жауапты жіберу",
    answerSubmitted: "Жауап жіберілді",
    waitingReveal: "Нәтижені күтіп тұрмыз",
    guesserAnswering: "Табушы жауап беріп жатыр",
    revealNow: "Нәтижені көрсету",
    roundComplete: "Кезек аяқталды",
    correctWord: "Дұрыс сөз",
    noAnswer: "Жауап жоқ",
    correct: "Дұрыс",
    missed: "Қате",
    score: "Ұпай",
    noPlayersTeam: "Бұл топта ойыншы жоқ.",
    sec: "сек",
    secondsLeft: "секунд қалды",
    speakerChanged: "Келесі түсіндіруші",
    modes: {
      "Gesture only": "Тек қимыл",
      "One word only": "Тек бір сөз",
      "Emotion only": "Тек эмоция",
      "No rules": "Ереже жоқ"
    },
    errors: {
      createNameRequired: "Бөлме ашу үшін атыңызды енгізіңіз.",
      joinNameRequired: "Кіру үшін атыңызды енгізіңіз.",
      roomNotFound: "Бөлме табылмады. Кодты тексеріңіз.",
      settingsLocked: "Баптауларды тек кезек арасында өзгертуге болады.",
      wordsRequired: "Кемінде бір сөз қосыңыз.",
      twoPlayersPerTeam: "Жүргізушіден бөлек, әр топта кемінде 2 ойыншы болуы керек.",
      startGameFirst: "Алдымен ойынды бастаңыз.",
      joinFirst: "Алдымен бөлмеге кіріңіз.",
      guessClosed: "Жауап беру кезеңі әлі ашылған жоқ.",
      onlyGuesser: "Жауапты тек белсенді топтың табушысы жібере алады.",
      answerRequired: "Жауапты енгізіңіз.",
      hostOnly: "Мұны тек жүргізуші жасай алады."
    }
  },
  ru: {
    realTimeGame: "Игра в реальном времени",
    online: "Онлайн",
    offline: "Офлайн",
    connecting: "Подключение",
    createRoom: "Создать комнату",
    createRoomText: "Создайте игру MisComm и поделитесь ссылкой или QR-кодом.",
    joinRoom: "Войти в комнату",
    joinRoomText: "Введите код от ведущего или откройте ссылку.",
    yourName: "Ваше имя",
    roomCode: "Код комнаты",
    hostControls: "Управление ведущего",
    hostControlsText: "Ведущий не играет, а только управляет игрой.",
    teams: "Команды",
    team: "Команда",
    teamCount: "Количество команд",
    teamCountHint: "Максимум 3 команды. В каждой команде нужно минимум 2 игрока.",
    mode: "Режим",
    explainerSeconds: "Время объясняющего (сек)",
    guessSeconds: "Время угадывающего (сек)",
    timerHint: "Каждый таймер запускает ведущий.",
    words: "Слова",
    wordsPlaceholder: "Одно слово или фраза на строку",
    saveSettings: "Сохранить",
    startGame: "Начать игру",
    waitingHost: "Ждем ведущего",
    waitingHostText: "Вы в лобби. Ведущий выберет настройки и начнет игру.",
    players: "Игроки",
    host: "Ведущий",
    notPlaying: "Не участвует",
    copyLink: "Копировать ссылку",
    linkCopied: "Ссылка скопирована.",
    lobby: "Лобби",
    ready: "Готово",
    liveTurn: "Ход идет",
    answerTime: "Ответ",
    results: "Результаты",
    round: "Раунд",
    turn: "Ход",
    activeSpeaker: "Сейчас объясняет",
    startTimer: "Запустить таймер",
    startExplainerTimer: "Запустить таймер объясняющего",
    startAnswerTimer: "Запустить таймер ответа",
    timerPaused: "Таймер на паузе",
    waitHostStart: "Ждите, пока ведущий запустит таймер",
    nextTeam: "Следующая команда",
    newRound: "Новый раунд",
    youExplainNow: "Сейчас объясняете вы",
    waitYourTurn: "Ждите своей очереди",
    teamWaiting: "Ваша команда ждет очереди",
    hostView: "Экран ведущего",
    secretWord: "Секретное слово",
    wordHidden: "Слово скрыто",
    youAreGuessing: "Вы угадывающий",
    waiting: "Ожидание",
    guesser: "Угадывающий",
    explainer: "Объясняющий",
    answerNow: "Перейти к ответу",
    timeUp: "Время вышло",
    submitGuesses: "Введите ответ",
    submitGuessesText: "Угадывающий активной команды вводит ответ. Таймер ответа запускает ведущий.",
    yourAnswer: "Ваш ответ",
    typeSecretWord: "Введите секретное слово",
    submitAnswer: "Отправить ответ",
    answerSubmitted: "Ответ отправлен",
    waitingReveal: "Ждем результата",
    guesserAnswering: "Угадывающий отвечает",
    revealNow: "Показать результат",
    roundComplete: "Ход завершен",
    correctWord: "Правильное слово",
    noAnswer: "Нет ответа",
    correct: "Верно",
    missed: "Ошибка",
    score: "Очки",
    noPlayersTeam: "В этой команде нет игроков.",
    sec: "сек",
    secondsLeft: "секунд осталось",
    speakerChanged: "Следующий объясняющий",
    modes: {
      "Gesture only": "Только жесты",
      "One word only": "Только одно слово",
      "Emotion only": "Только эмоции",
      "No rules": "Без правил"
    },
    errors: {
      createNameRequired: "Введите имя, чтобы создать комнату.",
      joinNameRequired: "Введите имя, чтобы войти.",
      roomNotFound: "Комната не найдена. Проверьте код.",
      settingsLocked: "Настройки можно менять только между ходами.",
      wordsRequired: "Добавьте хотя бы одно слово.",
      twoPlayersPerTeam: "Кроме ведущего, в каждой команде нужно минимум 2 игрока.",
      startGameFirst: "Сначала начните игру.",
      joinFirst: "Сначала войдите в комнату.",
      guessClosed: "Этап ответа еще не открыт.",
      onlyGuesser: "Ответ может отправить только угадывающий активной команды.",
      answerRequired: "Введите ответ.",
      hostOnly: "Это может сделать только ведущий."
    }
  },
  en: {
    realTimeGame: "Real-time party game",
    online: "Online",
    offline: "Offline",
    connecting: "Connecting",
    createRoom: "Create a room",
    createRoomText: "Host a new MisComm session and share the link or QR code.",
    joinRoom: "Join a room",
    joinRoomText: "Enter a room code from the host, or use their shared link.",
    yourName: "Your name",
    roomCode: "Room code",
    hostControls: "Host controls",
    hostControlsText: "The host does not play; they only run the game.",
    teams: "Teams",
    team: "Team",
    teamCount: "Number of teams",
    teamCountHint: "Maximum 3 teams. Each team needs at least 2 players.",
    mode: "Mode",
    explainerSeconds: "Explainer time (sec)",
    guessSeconds: "Guesser time (sec)",
    timerHint: "The host starts every timer.",
    words: "Words",
    wordsPlaceholder: "One word or phrase per line",
    saveSettings: "Save settings",
    startGame: "Start game",
    waitingHost: "Waiting for the host",
    waitingHostText: "You are in the lobby. The host will choose settings and start the game.",
    players: "Players",
    host: "Host",
    notPlaying: "Not playing",
    copyLink: "Copy link",
    linkCopied: "Join link copied.",
    lobby: "Lobby",
    ready: "Ready",
    liveTurn: "Turn live",
    answerTime: "Answer time",
    results: "Results",
    round: "Round",
    turn: "Turn",
    activeSpeaker: "Now explaining",
    startTimer: "Start timer",
    startExplainerTimer: "Start explainer timer",
    startAnswerTimer: "Start answer timer",
    timerPaused: "Timer paused",
    waitHostStart: "Wait for the host to start the timer",
    nextTeam: "Next team",
    newRound: "New round",
    youExplainNow: "You explain now",
    waitYourTurn: "Wait for your turn",
    teamWaiting: "Your team is waiting",
    hostView: "Host view",
    secretWord: "Secret word",
    wordHidden: "Word hidden",
    youAreGuessing: "You are guessing",
    waiting: "Waiting",
    guesser: "Guesser",
    explainer: "Explainer",
    answerNow: "Go to answer",
    timeUp: "Time is up",
    submitGuesses: "Submit answer",
    submitGuessesText: "The active team's guesser enters the answer. The host starts the answer timer.",
    yourAnswer: "Your answer",
    typeSecretWord: "Type the secret word",
    submitAnswer: "Submit answer",
    answerSubmitted: "Answer submitted",
    waitingReveal: "Waiting for reveal",
    guesserAnswering: "Guesser is answering",
    revealNow: "Reveal now",
    roundComplete: "Turn complete",
    correctWord: "Correct word",
    noAnswer: "No answer",
    correct: "Correct",
    missed: "Missed",
    score: "Score",
    noPlayersTeam: "No players on this team.",
    sec: "sec",
    secondsLeft: "seconds left",
    speakerChanged: "Next explainer",
    modes: {
      "Gesture only": "Gesture only",
      "One word only": "One word only",
      "Emotion only": "Emotion only",
      "No rules": "No rules"
    },
    errors: {
      createNameRequired: "Enter your name before creating a room.",
      joinNameRequired: "Enter your name before joining.",
      roomNotFound: "Room not found. Check the code and try again.",
      settingsLocked: "Settings can only be changed between turns.",
      wordsRequired: "Add at least one word.",
      twoPlayersPerTeam: "Excluding the host, each team needs at least two players.",
      startGameFirst: "Start the game first.",
      joinFirst: "Join a room first.",
      guessClosed: "The answer phase is not open yet.",
      onlyGuesser: "Only the active team's guesser can submit an answer.",
      answerRequired: "Enter an answer before submitting.",
      hostOnly: "Only the host can do that."
    }
  }
};

let currentLang = localStorage.getItem("miscommLang") || "kk";
let state = null;
let toastTimeout = null;
let draftGuess = "";

languageSelect.value = currentLang;
languageSelect.addEventListener("change", () => {
  currentLang = languageSelect.value;
  localStorage.setItem("miscommLang", currentLang);
  updateStaticText();
  render();
});

socket.on("connect", () => {
  connectionStatus.textContent = t("online");
  connectionStatus.classList.remove("offline");
});

socket.on("disconnect", () => {
  connectionStatus.textContent = t("offline");
  connectionStatus.classList.add("offline");
});

socket.on("roomState", (nextState) => {
  if (nextState.phase !== "answer") {
    draftGuess = "";
  }
  state = nextState;
  render();
});

socket.on("timerTick", (secondsLeft) => {
  if (state?.round) {
    state.round.secondsLeft = secondsLeft;
    render();
  }
});

socket.on("speakerChanged", (payload) => {
  playRoundEndCue();
  if (payload?.activeExplainerName) {
    showToast(`${t("speakerChanged")}: ${payload.activeExplainerName}`);
  }
});

socket.on("roundEnded", (payload) => {
  const previousPhase = state?.phase;
  if (payload?.phase === "answer" || (payload?.phase === "reveal" && previousPhase === "round")) {
    playRoundEndCue();
  }

  if (payload?.phase === "answer") {
    showToast(t("timeUp"));
  }
});

socket.on("playerError", (message) => {
  showToast(errorText(message));
});

updateStaticText();
render();

function render() {
  if (!state) {
    renderEntry();
    return;
  }

  app.innerHTML = [
    renderRoomHeader(),
    state.phase === "lobby" ? renderLobby() : "",
    state.phase === "ready" || state.phase === "round" ? renderRound() : "",
    state.phase === "answer" ? renderAnswerPhase() : "",
    state.phase === "reveal" ? renderReveal() : "",
    state.phase !== "lobby" && state.teams.length ? renderTeams() : ""
  ].join("");
  bindCurrentView();
}

function renderEntry() {
  const savedName = localStorage.getItem("miscommName") || "";
  app.innerHTML = `
    <section class="grid two">
      <div class="panel stack large">
        <div>
          <h2 class="section-title">${t("createRoom")}</h2>
          <p class="muted">${t("createRoomText")}</p>
        </div>
        <label>
          ${t("yourName")}
          <input id="createName" autocomplete="name" maxlength="28" value="${escapeHtml(savedName)}" placeholder="Alex">
        </label>
        <button id="createRoom">${t("createRoom")}</button>
      </div>

      <div class="panel stack large">
        <div>
          <h2 class="section-title">${t("joinRoom")}</h2>
          <p class="muted">${t("joinRoomText")}</p>
        </div>
        <label>
          ${t("yourName")}
          <input id="joinName" autocomplete="name" maxlength="28" value="${escapeHtml(savedName)}" placeholder="Sam">
        </label>
        <label>
          ${t("roomCode")}
          <input id="joinCode" maxlength="8" value="${escapeHtml(joinCodeFromPath.toUpperCase())}" placeholder="ABCDE">
        </label>
        <button id="joinRoom" class="button-secondary">${t("joinRoom")}</button>
      </div>
    </section>
  `;

  document.querySelector("#createRoom").addEventListener("click", () => {
    const hostName = document.querySelector("#createName").value;
    rememberName(hostName);
    socket.emit("createRoom", { hostName });
  });

  document.querySelector("#joinRoom").addEventListener("click", () => {
    const name = document.querySelector("#joinName").value;
    const roomCode = document.querySelector("#joinCode").value;
    rememberName(name);
    socket.emit("joinRoom", { roomCode, name });
  });
}

function renderRoomHeader() {
  return `
    <section class="panel stack">
      <div class="row between mobile-stack">
        <div class="stack">
          <span class="pill">${escapeHtml(readablePhase(state.phase))}</span>
          <div class="row wrap">
            <span class="room-code">${escapeHtml(state.roomCode)}</span>
            <button id="copyLink" class="button-quiet">${t("copyLink")}</button>
          </div>
          <div class="copy-link muted">${escapeHtml(state.joinUrl)}</div>
        </div>
        <img class="qr" src="${escapeAttribute(state.qrUrl)}" alt="QR code ${escapeAttribute(state.roomCode)}">
      </div>
    </section>
  `;
}

function renderLobby() {
  return `
    <section class="grid two">
      ${state.isHost ? renderHostSettings() : renderWaitingPanel()}
      ${renderPlayers()}
    </section>
  `;
}

function renderHostSettings() {
  return `
    <div class="panel stack large">
      <div>
        <h2 class="section-title">${t("hostControls")}</h2>
        <p class="muted">${t("hostControlsText")}</p>
      </div>
      <div class="grid two">
        <label>
          ${t("teamCount")}
          <select id="teamCount">
            ${[1, 2, 3]
              .map(
                (count) =>
                  `<option value="${count}" ${state.settings.teamCount === count ? "selected" : ""}>${count}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          ${t("mode")}
          <select id="mode">
            ${MODES.map(
              (mode) =>
                `<option value="${escapeAttribute(mode)}" ${
                  state.settings.mode === mode ? "selected" : ""
                }>${escapeHtml(modeLabel(mode))}</option>`
            ).join("")}
          </select>
        </label>
      </div>
      <div class="grid two">
        <label>
          ${t("explainerSeconds")}
          <input id="explainerSeconds" type="number" min="5" max="180" value="${state.settings.explainerSeconds}">
        </label>
        <label>
          ${t("guessSeconds")}
          <input id="guessSeconds" type="number" min="5" max="180" value="${state.settings.guessSeconds}">
        </label>
      </div>
      <p class="muted small-text">${t("teamCountHint")} ${t("timerHint")}</p>
      <label>
        ${t("words")}
        <textarea id="words" placeholder="${escapeAttribute(t("wordsPlaceholder"))}">${escapeHtml(
          state.settings.words.join("\n")
        )}</textarea>
      </label>
      <div class="row wrap">
        <button id="saveSettings" class="button-secondary">${t("saveSettings")}</button>
        <button id="startGame">${t("startGame")}</button>
      </div>
    </div>
  `;
}

function renderWaitingPanel() {
  return `
    <div class="panel stack">
      <h2 class="section-title">${t("waitingHost")}</h2>
      <p class="muted">${t("waitingHostText")}</p>
    </div>
  `;
}

function renderRound() {
  const role = state.viewer?.role || "Waiting";
  const isGuesser = role === "Guesser";
  const isExplainer = role === "Explainer";
  const isActiveTeam = Boolean(state.viewer?.isActiveTeam);
  const isActiveExplainer = Boolean(state.viewer?.isActiveExplainer);
  const paused = !state.round.isTimerRunning;

  return `
    <section class="panel stack large">
      <div class="row between mobile-stack">
        <div class="stack">
          <span class="pill ${paused ? "warn" : ""}">${paused ? t("timerPaused") : modeLabel(state.round.mode)}</span>
          <h2 class="section-title">${t("round")} ${state.round.number} - ${teamDisplay({
            number: state.round.activeTeamNumber
          })}</h2>
          <p class="muted">
            ${t("turn")} ${state.round.turnNumber} - ${t("activeSpeaker")}: ${escapeHtml(
              state.round.activeExplainerName || t("waiting")
            )}
          </p>
        </div>
        ${renderTimer()}
      </div>
      ${renderTurnMessage({ isGuesser, isExplainer, isActiveTeam, isActiveExplainer })}
      ${paused ? `<p class="muted small-text">${t("waitHostStart")}</p>` : ""}
      ${
        state.isHost
          ? `<div class="row wrap">
              ${
                paused
                  ? `<button id="startTimer">${t("startExplainerTimer")}</button>`
                  : ""
              }
              <button id="revealNow" class="button-danger">${t("answerNow")}</button>
            </div>`
          : ""
      }
    </section>
  `;
}

function renderTurnMessage({ isGuesser, isExplainer, isActiveTeam, isActiveExplainer }) {
  if (state.isHost) {
    return `<div class="word-reveal active-turn"><p>${t("hostView")} - ${t("secretWord")}</p><strong>${escapeHtml(
      state.round.word || ""
    )}</strong></div>`;
  }

  if (!isActiveTeam) {
    return `<div class="hidden-word"><p>${t("teamWaiting")}</p><strong>${teamDisplay({
      number: state.round.activeTeamNumber
    })}</strong></div>`;
  }

  if (isGuesser) {
    return `<div class="hidden-word"><p>${t("youAreGuessing")}</p><strong>${t("wordHidden")}</strong></div>`;
  }

  if (isExplainer && isActiveExplainer) {
    return `<div class="word-reveal active-turn"><p>${t("youExplainNow")}</p><strong>${escapeHtml(
      state.round.word || ""
    )}</strong></div>`;
  }

  return `<div class="word-reveal waiting-turn"><p>${t("waitYourTurn")}: ${escapeHtml(
    state.round.activeExplainerName || t("waiting")
  )}</p><strong>${escapeHtml(state.round.word || "")}</strong></div>`;
}

function renderTimer() {
  return `
    <div class="timer" aria-label="${state.round.secondsLeft} ${t("secondsLeft")}">
      ${Math.max(0, state.round.secondsLeft)}
      <span>${t("sec")}</span>
    </div>
  `;
}

function renderAnswerPhase() {
  const submitted = state.round.submittedTeamIds.includes(state.viewer?.teamId);
  const isActiveTeam = Boolean(state.viewer?.isActiveTeam);
  const isGuesser = state.viewer?.role === "Guesser";
  const paused = !state.round.isTimerRunning;

  return `
    <section class="panel stack large">
      <div class="row between mobile-stack">
        <div>
          <span class="pill ${paused ? "warn" : ""}">${paused ? t("timerPaused") : t("answerTime")}</span>
          <h2 class="section-title">${t("submitGuesses")}</h2>
          <p class="muted">${t("submitGuessesText")}</p>
        </div>
        ${renderTimer()}
      </div>
      ${
        isActiveTeam && isGuesser
          ? submitted
            ? `<div class="hidden-word"><p>${t("answerSubmitted")}</p><strong>${t("waitingReveal")}</strong></div>`
            : `<div class="grid two">
                <label>
                  ${t("yourAnswer")}
                  <input id="guessInput" maxlength="80" autocomplete="off" value="${escapeAttribute(
                    draftGuess
                  )}" placeholder="${escapeAttribute(t("typeSecretWord"))}">
                </label>
                <button id="submitGuess">${t("submitAnswer")}</button>
              </div>`
          : `<div class="hidden-word"><p>${t("guesserAnswering")}</p><strong>${teamDisplay({
              number: state.round.activeTeamNumber
            })}</strong></div>`
      }
      ${
        state.isHost
          ? `<div class="row wrap">
              ${paused ? `<button id="startTimer">${t("startAnswerTimer")}</button>` : ""}
              <button id="revealNow" class="button-danger">${t("revealNow")}</button>
            </div>`
          : ""
      }
    </section>
  `;
}

function renderReveal() {
  const activeSubmission = state.round.submissions.find((item) => item.teamId === state.round.activeTeamId);
  const answer = activeSubmission?.answer || t("noAnswer");
  const correct = Boolean(activeSubmission?.correct);

  return `
    <section class="panel stack large">
      <div>
        <span class="pill">${t("roundComplete")}</span>
        <h2 class="section-title">${teamDisplay({ number: state.round.activeTeamNumber })}</h2>
      </div>
      <div class="word-reveal">
        <p>${t("correctWord")}</p>
        <strong>${escapeHtml(state.round.word || "")}</strong>
      </div>
      <div class="submission-item row between mobile-stack">
        <div>
          <strong>${escapeHtml(answer)}</strong>
          <div class="muted">${teamDisplay({ number: state.round.activeTeamNumber })}</div>
        </div>
        <span class="pill ${correct ? "" : "warn"}">${correct ? t("correct") : t("missed")}</span>
      </div>
      ${state.isHost ? `<button id="nextRound">${state.round.hasNextTeam ? t("nextTeam") : t("newRound")}</button>` : ""}
    </section>
  `;
}

function renderPlayers() {
  return `
    <section class="panel stack">
      <div class="row between">
        <h2 class="section-title">${t("players")}</h2>
        <span class="pill">${state.players.length}</span>
      </div>
      <div class="player-list">
        ${state.players
          .map(
            (player) => `
              <div class="player-item ${player.isActiveExplainer ? "active-speaker" : ""}">
                <span class="player-name">${escapeHtml(player.name)}${
                  player.isHost ? ` - ${t("host")} (${t("notPlaying")})` : ""
                }</span>
                ${player.role ? renderRoleBadge(player.role) : ""}
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderTeams() {
  return `
    <section class="panel stack">
      <div class="row between">
        <h2 class="section-title">${t("teams")}</h2>
        <span class="pill">${state.teams.length}</span>
      </div>
      <div class="team-list">
        ${state.teams
          .map(
            (team) => `
              <article class="team-item ${team.isActive ? "active-team" : ""}">
                <div class="row between">
                  <div>
                    <strong>${teamDisplay(team)}</strong>
                    ${
                      team.isActive
                        ? `<div class="muted">${t("activeSpeaker")}: ${escapeHtml(
                            state.round.activeExplainerName || t("waiting")
                          )}</div>`
                        : ""
                    }
                  </div>
                  <span class="score">${team.score}</span>
                </div>
                <div class="stack">
                  ${
                    team.players.length
                      ? team.players
                          .map(
                            (player) => `
                              <div class="player-item ${player.isActiveExplainer ? "active-speaker" : ""}">
                                <span class="player-name">${escapeHtml(player.name)}</span>
                                ${renderRoleBadge(player.role || "Waiting")}
                              </div>
                            `
                          )
                          .join("")
                      : `<p class="muted">${t("noPlayersTeam")}</p>`
                  }
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRoleBadge(role) {
  const className =
    role === "Explainer" ? "explainer" : role === "Waiting" ? "waiting" : role === "Host" ? "host" : "guesser";
  return `<span class="role-badge ${className}">${escapeHtml(roleLabel(role))}</span>`;
}

function bindCurrentView() {
  document.querySelector("#copyLink")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.joinUrl);
      showToast(t("linkCopied"));
    } catch {
      showToast(state.joinUrl);
    }
  });

  document.querySelector("#saveSettings")?.addEventListener("click", () => {
    socket.emit("updateSettings", {
      roomCode: state.roomCode,
      teamCount: document.querySelector("#teamCount").value,
      mode: document.querySelector("#mode").value,
      explainerSeconds: document.querySelector("#explainerSeconds").value,
      guessSeconds: document.querySelector("#guessSeconds").value,
      words: parseWords(document.querySelector("#words").value)
    });
  });

  document.querySelector("#startGame")?.addEventListener("click", () => {
    socket.emit("startGame", { roomCode: state.roomCode });
  });

  document.querySelector("#startTimer")?.addEventListener("click", () => {
    socket.emit("startTimer", { roomCode: state.roomCode });
  });

  document.querySelector("#nextRound")?.addEventListener("click", () => {
    socket.emit("startNextRound", { roomCode: state.roomCode });
  });

  document.querySelector("#revealNow")?.addEventListener("click", () => {
    socket.emit("revealNow", { roomCode: state.roomCode });
  });

  document.querySelector("#submitGuess")?.addEventListener("click", () => {
    socket.emit("submitGuess", {
      roomCode: state.roomCode,
      answer: document.querySelector("#guessInput").value
    });
    draftGuess = "";
  });

  document.querySelector("#guessInput")?.addEventListener("input", (event) => {
    draftGuess = event.target.value;
  });

  document.querySelector("#guessInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.querySelector("#submitGuess").click();
    }
  });
}

function parseWords(value) {
  return value
    .split(/\n|,/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function rememberName(name) {
  const cleanName = name.trim();
  if (cleanName) {
    localStorage.setItem("miscommName", cleanName);
  }
}

function updateStaticText() {
  eyebrowText.textContent = t("realTimeGame");
  connectionStatus.textContent = socket.connected ? t("online") : t("connecting");
}

function t(key) {
  return I18N[currentLang]?.[key] || I18N.en[key] || key;
}

function modeLabel(mode) {
  return I18N[currentLang]?.modes?.[mode] || I18N.en.modes[mode] || mode;
}

function roleLabel(role) {
  const labels = {
    Guesser: t("guesser"),
    Explainer: t("explainer"),
    Waiting: t("waiting"),
    Host: t("host")
  };
  return labels[role] || role;
}

function readablePhase(phase) {
  const labels = {
    lobby: t("lobby"),
    ready: t("ready"),
    round: t("liveTurn"),
    answer: t("answerTime"),
    reveal: t("results")
  };
  return labels[phase] || phase;
}

function teamDisplay(team) {
  const number = team?.number || team?.activeTeamNumber || "";
  return `${t("team")} ${number}`.trim();
}

function errorText(message) {
  return I18N[currentLang]?.errors?.[message] || I18N.en.errors[message] || message;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3000);
}

function playRoundEndCue() {
  document.body.classList.remove("round-flash");
  window.requestAnimationFrame(() => {
    document.body.classList.add("round-flash");
    setTimeout(() => document.body.classList.remove("round-flash"), 750);
  });

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  try {
    const audioContext = new AudioContext();
    const gain = audioContext.createGain();
    const oscillator = audioContext.createOscillator();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(330, audioContext.currentTime + 0.25);
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.36);
    oscillator.addEventListener("ended", () => audioContext.close());
  } catch {
    // Browsers may block audio until the first user gesture.
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
