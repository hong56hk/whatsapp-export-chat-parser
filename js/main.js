let sideMap = {};
let swapped = false;
let fileIndex = {};
let parsedMessages = [];
let timezoneOffsetHours = 0;

/* ---------- util functions ---------- */
function formatTime(sec) {
  sec = Math.floor(sec || 0);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function toDateTime(msg) {
  // msg.date = dd/mm/yyyy
  // msg.time = hh:mm (WhatsApp export format)
  const [day, month, year] = msg.date.split("/").map(Number);
  const [hour, minute] = msg.time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute);
}

function formatTo24Hour(timeStr) {
  const str = timeStr.trim();

  // Match 12-hour format: H:MM(:SS)? AM/PM
  const twelveHourMatch = str.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM)$/i,
  );

  if (twelveHourMatch) {
    let [, h, m, s = "00", period] = twelveHourMatch;

    h = parseInt(h, 10);

    if (period.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period.toUpperCase() === "AM" && h === 12) h = 0;

    return `${String(h).padStart(2, "0")}:${m}:${s}`;
  }

  // Match 24-hour format: HH:MM(:SS)?
  const twentyFourHourMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (twentyFourHourMatch) {
    let [, h, m, s = "00"] = twentyFourHourMatch;

    return `${String(h).padStart(2, "0")}:${m}:${s}`;
  }

  throw new Error(`Invalid time format: ${timeStr}`);
}

function cleanText(text) {
  let clean = text.replaceAll("\u200E", "");
  clean = clean.replace(/\u202F/g, " ");
  return clean;
}

function parseDocName(text) {
  const match = text.match(/^(.+?)\s•\s\d+/);
  return match ? match[1] : null;
}

function linkify(text) {
  return text.replace(
    /\bhttps?:\/\/[^\s<>"']+/gi,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
  );
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function scrollToDate(dateStr) {
  const el = document.querySelector(`.message[data-date="${dateStr}"]`);
  if (!el) return;

  el.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/* ---------- Lazy media observer ---------- */
const observer = new IntersectionObserver(
  async (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      observer.unobserve(el);
      const handle = fileIndex[el.dataset.filename];
      if (!handle) return;
      const file = await handle.getFile();
      const url = URL.createObjectURL(file);
      if (el.tagName === "IMG" || el.tagName === "VIDEO") el.src = url;
      if (el.tagName === "AUDIO") {
        el.querySelector("source").src = url;
        el.load();
      }
    }
  },
  { rootMargin: "300px" },
);

/* ---------- UI actions ---------- */
document.getElementById("pick").onclick = async () => {
  const dir = await window.showDirectoryPicker();
  const loading = document.getElementById("loading");
  const pickButton = document.getElementById("pick");
  loading.hidden = false;
  pickButton.disabled = true;

  try {
    // Let the browser paint the loading indicator before processing the export.
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    fileIndex = {};
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === "file") fileIndex[name] = handle;
      else
        for await (const [subName, subHandle] of handle.entries())
          fileIndex[subName] = subHandle;
    }

    const chatText = await (await fileIndex["_chat.txt"].getFile()).text();
    const cleanedText = cleanText(chatText);
    parsedMessages = parseChat(cleanedText);
    renderStatsAndChat();
  } finally {
    loading.hidden = true;
    pickButton.disabled = false;
  }
};

/* ---------- Group function ---------- */
function buildMessageGroups(messages) {
  if (!messages.length) return [];

  const groups = [];
  let currentGroup = {
    startTime: toDateTime(messages[0]),
    initiator: messages[0].sender,
    date: messages[0].date,
    messages: [messages[0]],
  };

  for (let i = 1; i < messages.length; i++) {
    const prevTime = toDateTime(messages[i - 1]);
    const currTime = toDateTime(messages[i]);
    const diffMinutes = (currTime - prevTime) / 60000;

    if (diffMinutes <= 30) {
      currentGroup.messages.push(messages[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = {
        startTime: currTime,
        initiator: messages[i].sender,
        date: messages[i].date,
        messages: [messages[i]],
      };
    }
  }

  groups.push(currentGroup);
  return groups;
}

/* ---------- Chat parsing ---------- */
function parseChat(text) {
  const lines = text.split(/\r?\n/);
  const regex = /^\[(\d{1,2}\/\d{1,2}\/\d{4})(?:,\s*)? (.*?)\] (.*?): (.*)$/;
  const messages = [];
  let current = null;
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      if (current) {
        messages.push(current);
      }

      const timeStr = formatTo24Hour(match[2]);

      const [day, month, year] = match[1].split("/").map(Number);
      const [hour, minute, second] = timeStr.split(":").map(Number);
      const d = new Date(year, month - 1, day, hour, minute, second);

      // Apply the configured timezone offset.
      d.setHours(d.getHours() + timezoneOffsetHours);

      current = {
        date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
        sender: match[3],
        content: match[4],
      };
    } else if (current) {
      current.content += "\n" + line;
    }
  }
  if (current) {
    messages.push(current);
  }
  return messages;
}

/* ---------- Content parsing ---------- */
function parseContent(text) {
  const container = document.createElement("div");
  const attach = text.match(/<attached: (.*?)>/);

  if (!attach) {
    container.innerHTML = linkify(text);
    return container;
  }

  const filename = attach[1];
  const ext = filename.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) {
    const img = document.createElement("img");
    img.className = "media";
    img.dataset.filename = filename;

    if (ext !== "webp") {
      // Open full-size previews for images other than WebP stickers.
      img.onclick = () => openModal(img.src);
    }
    observer.observe(img);
    container.appendChild(img);
  } else if (ext === "mp4") {
    const video = document.createElement("video");
    video.controls = true;
    video.dataset.filename = filename;
    observer.observe(video);
    container.appendChild(video);
  } else if (ext === "opus") {
    const wrapper = document.createElement("div");
    const bubble = document.createElement("div");
    bubble.className = "audio-bubble";
    const btn = document.createElement("button");
    btn.className = "audio-btn";
    btn.textContent = "▶";
    const wave = document.createElement("div");
    wave.className = "audio-wave";
    const bars = [];
    for (let i = 0; i < 40; i++) {
      const bar = document.createElement("div");
      bar.className = "audio-bar";
      bar.style.height = `${6 + Math.random() * 20}px`;
      wave.appendChild(bar);
      bars.push(bar);
    }
    const audio = document.createElement("audio");
    audio.preload = "none";
    audio.dataset.filename = filename;
    audio.style.display = "none";

    const source = document.createElement("source");
    source.type = "audio/ogg; codecs=opus";
    audio.appendChild(source);
    bubble.appendChild(btn);
    bubble.appendChild(wave);
    wrapper.appendChild(bubble);
    wrapper.appendChild(audio);

    const time = document.createElement("div");
    time.className = "audio-time";
    time.textContent = "0:00";
    wrapper.appendChild(time);
    observer.observe(audio);

    btn.onclick = async () => {
      if (!audio.src && !source.src) {
        const file = await fileIndex[filename].getFile();
        source.src = URL.createObjectURL(file);
        audio.load();
      }
      if (audio.paused) {
        await audio.play();
        btn.textContent = "⏸";
      } else {
        audio.pause();
        btn.textContent = "▶";
      }
    };
    audio.onloadedmetadata = () => {
      time.textContent = formatTime(audio.duration);
    };
    audio.ontimeupdate = () => {
      const progress = audio.currentTime / audio.duration || 0;
      const activeBars = Math.floor(progress * bars.length);
      bars.forEach((b, i) => b.classList.toggle("active", i <= activeBars));
      time.textContent = `${formatTime(audio.currentTime)}/${formatTime(audio.duration)}`;
    };
    audio.onended = () => {
      btn.textContent = "▶";
    };
    wave.onclick = (e) => {
      if (!audio.duration) return;
      const rect = wave.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      audio.currentTime = ratio * audio.duration;
    };

    container.appendChild(wrapper);
  } else if (ext === "vcf") {
    const a = document.createElement("a");
    a.textContent = "Download contact";
    a.onclick = async () => {
      const file = await fileIndex[filename].getFile();
      a.href = URL.createObjectURL(file);
      a.download = filename;
    };
    container.appendChild(a);
  } else if (
    ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)
  ) {
    const link = document.createElement("a");
    link.textContent = parseDocName(text) || filename;
    link.style.cursor = "pointer";
    link.style.color = "#0b8043";
    link.style.textDecoration = "underline";
    link.onclick = async () => {
      const file = await fileIndex[filename].getFile();
      const url = URL.createObjectURL(file);
      window.open(url, "_blank", "noopener");
    };
    container.appendChild(link);
  }
  return container;
}

function openModal(url) {
  const modal = document.getElementById("modal");
  modal.querySelector("img").src = url;
  modal.style.display = "flex";
}
function closeModal() {
  modal.style.display = "none";
}

/* ---------- Statistics + chat rendering ---------- */
function renderStatsAndChat() {
  if (!parsedMessages || parsedMessages.length === 0) return;

  const chat = document.getElementById("chat");
  const totalMessagesEl = document.getElementById("totalMessages");
  const perSenderEl = document.getElementById("perSender");
  const initiatorsE1 = document.getElementById("initiators");
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");

  const toDate = (d) => {
    const [year, month, day] = d.split("/").map(Number);
    return new Date(year, month - 1, day);
  };
  const toNumber = (d) => {
    const [year, month, day] = d.split("/");
    return parseInt(
      `${year.padStart(4, "0")}${month.padStart(2, "0")}${day.padStart(2, "0")}`,
      10,
    );
  };

  const dates = parsedMessages.map((m) => m.date);
  const minDate = `${Math.min(...dates.map(toNumber))}`;
  const maxDate = `${Math.max(...dates.map(toNumber))}`;

  if (!startInput.value)
    startInput.value = `${minDate.substring(0, 4)}-${minDate.substring(4, 6)}-${minDate.substring(6, 8)}`;
  if (!endInput.value)
    endInput.value = `${maxDate.substring(0, 4)}-${maxDate.substring(4, 6)}-${maxDate.substring(6, 8)}`;

  function update() {
    // now startInput.value is in yyyy-mm-dd format
    const start = parseInt(
      `${startInput.value.substring(0, 4)}${startInput.value.substring(5, 7)}${startInput.value.substring(8, 10)}`,
      10,
    );
    const end = parseInt(
      `${endInput.value.substring(0, 4)}${endInput.value.substring(5, 7)}${endInput.value.substring(8, 10)}`,
      10,
    );

    const filteredMessages = parsedMessages.filter((m) => {
      const msgDate = toNumber(m.date);
      return msgDate >= start && msgDate <= end;
    });

    // Group
    const groups = buildMessageGroups(filteredMessages);

    // Summary
    totalMessagesEl.textContent = `Total messages: ${filteredMessages.length} | Groups: ${groups.length}`;
    const senderCounts = {};
    filteredMessages.forEach(
      (m) => (senderCounts[m.sender] = (senderCounts[m.sender] || 0) + 1),
    );
    perSenderEl.textContent = Object.entries(senderCounts)
      .map(([s, c]) => `${s}: ${c}`)
      .join(" | ");

    // Chart
    const countsByDate = {};
    const statsByDate = {};
    filteredMessages.forEach((m) => {
      if (!statsByDate[m.date]) {
        statsByDate[m.date] = {
          messages: 0,
          groups: 0,
          initiators: {},
        };
      }
      statsByDate[m.date].messages++;
    });
    groups.forEach((g) => {
      statsByDate[g.date].groups++;
      statsByDate[g.date].initiators[g.initiator] =
        (statsByDate[g.date].initiators[g.initiator] || 0) + 1;
    });

    // Count conversation initiators.
    const totalInitiators = {};
    groups.forEach((g) => {
      totalInitiators[g.initiator] = (totalInitiators[g.initiator] || 0) + 1;
    });
    const initiatorSummary = Object.entries(totalInitiators)
      .map(([s, c]) => `${s}: ${c}`)
      .join(" | ");

    initiatorsE1.textContent = `Initiators: ${initiatorSummary}`;

    // render filter
    const labels = Object.keys(statsByDate).sort(
      (a, b) => toDate(a) - toDate(b),
    );
    const messageData = labels.map((d) => statsByDate[d].messages);
    const groupData = labels.map((d) => statsByDate[d].groups);
    const data = labels.map((d) => countsByDate[d]);

    // render chart
    const ctx = document.getElementById("chart").getContext("2d");
    if (window.msgChart) window.msgChart.destroy();
    window.msgChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Messages per day",
            data: messageData,
            backgroundColor: "#25d366",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const index = elements[0].index;
          const dateClicked = labels[index];
          scrollToDate(dateClicked);
        },
        scales: {
          x: { title: { display: true, text: "Date" } },
          y: { title: { display: true, text: "Messages" }, beginAtZero: true },
        },
      },
    });

    // Render Group chart
    const ctx2 = document.getElementById("groupChart").getContext("2d");
    if (window.grpChart) window.grpChart.destroy();
    window.grpChart = new Chart(ctx2, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Message groups per day",
            data: groupData,
            backgroundColor: "#075e54",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const index = elements[0].index;
          const dateClicked = labels[index];
          scrollToDate(dateClicked);
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });

    // Chat rendering
    chat.innerHTML = "";
    if (!sideMap[filteredMessages[0]?.sender]) {
      sideMap[filteredMessages[0].sender] = "left";
      const other = filteredMessages.find(
        (m) => m.sender !== filteredMessages[0].sender,
      )?.sender;
      if (other) {
        sideMap[other] = "right";
      }
    }
    filteredMessages.forEach((m) => {
      const div = document.createElement("div");
      div.dataset.date = m.date;

      let side = sideMap[m.sender];
      if (swapped) {
        side = side === "left" ? "right" : "left";
      }
      div.className = `message ${side}`;
      const sender = document.createElement("div");
      sender.className = "sender";
      sender.textContent = `${m.sender} • ${m.date} ${m.time}`;
      div.appendChild(sender);
      div.appendChild(parseContent(m.content));
      chat.appendChild(div);
    });
  }

  // Apply button listener
  document.getElementById("swap").onclick = () => {
    swapped = !swapped;
    update();
  };
  document.getElementById("applyRange").onclick = update;
  document.getElementById("showEarliest").onclick = () => {
    startInput.value = `${minDate.substring(0, 4)}-${minDate.substring(4, 6)}-${minDate.substring(6, 8)}`;
  };

  update();
}
