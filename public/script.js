const watchData = {
  wellnessScore: 86,
  heartRate: 78,
  steps: 8420,
  sleepHours: 7,
  sleepMinutes: 20,
  calories: 520,
  water: 1.6,
  weeklySteps: [4200, 7800, 6900, 9100, 8420, 5600, 7200],
  days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
};

let chatHistory = [];

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-btn");

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const pageId = btn.dataset.page;

    pages.forEach(page => page.classList.remove("active"));
    navButtons.forEach(button => button.classList.remove("active"));

    document.getElementById(pageId).classList.add("active");
    btn.classList.add("active");
  });
});

function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}

function renderDashboard() {
  document.getElementById("scoreText").textContent = watchData.wellnessScore;
  document.getElementById("scoreRingText").textContent = watchData.wellnessScore;
  document.querySelector(".score-ring").style.background =
    `radial-gradient(circle closest-side, #fff 72%, transparent 73%), conic-gradient(var(--green) ${watchData.wellnessScore}%, #d8dfd5 0)`;

  document.getElementById("heartRate").textContent = watchData.heartRate;
  document.getElementById("steps").textContent = formatNumber(watchData.steps);
  document.getElementById("sleep").textContent = `${watchData.sleepHours}h ${watchData.sleepMinutes}m`;
  document.getElementById("calories").textContent = watchData.calories;

  document.getElementById("sideHeart").textContent = `${watchData.heartRate} bpm`;
  document.getElementById("sideSteps").textContent = formatNumber(watchData.steps);
  document.getElementById("sideSleep").textContent = `${watchData.sleepHours}h ${watchData.sleepMinutes}m`;
  document.getElementById("sideCalories").textContent = `${watchData.calories} kcal`;

  const sleepTotal = watchData.sleepHours + watchData.sleepMinutes / 60;

  document.getElementById("heartStatus").textContent =
    watchData.heartRate > 100 ? "Higher than usual, keep it light" : "Resting range looks okay";

  document.getElementById("stepsStatus").textContent =
    watchData.steps >= 10000 ? "Daily goal reached" : "Goal almost reached";

  document.getElementById("sleepStatus").textContent =
    sleepTotal >= 7 ? "Good recovery" : "Recovery may be low";

  if (sleepTotal < 6) {
    document.getElementById("mainInsight").textContent = "Keep your workout light today.";
    document.getElementById("mainInsightText").textContent =
      "Your sleep is lower than recommended. Choose walking, stretching, or light cardio instead of intense training.";
  } else if (watchData.steps < 5000) {
    document.getElementById("mainInsight").textContent = "Add more easy movement.";
    document.getElementById("mainInsightText").textContent =
      "Your recovery looks okay, but steps are still low. A 20-minute walk could help.";
  } else {
    document.getElementById("mainInsight").textContent = "Light cardio is a good choice today.";
    document.getElementById("mainInsightText").textContent =
      "Your steps and sleep look stable. Keep the workout moderate and focus on hydration.";
  }

  renderBarChart();
}

function renderBarChart() {
  const chart = document.getElementById("barChart");
  chart.innerHTML = "";

  const max = Math.max(...watchData.weeklySteps);

  watchData.weeklySteps.forEach((value, index) => {
    const wrap = document.createElement("div");
    wrap.className = "bar-wrap";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max(18, (value / max) * 160)}px`;
    bar.title = `${formatNumber(value)} steps`;

    const label = document.createElement("span");
    label.textContent = watchData.days[index];

    wrap.appendChild(bar);
    wrap.appendChild(label);
    chart.appendChild(wrap);
  });
}

document.getElementById("refreshBtn").addEventListener("click", () => {
  watchData.heartRate = Math.floor(68 + Math.random() * 24);
  watchData.steps = Math.floor(4500 + Math.random() * 7000);
  watchData.sleepHours = Math.floor(5 + Math.random() * 4);
  watchData.sleepMinutes = [0, 10, 20, 30, 40, 50][Math.floor(Math.random() * 6)];
  watchData.calories = Math.floor(300 + Math.random() * 500);

  const sleepScore = Math.min(100, (watchData.sleepHours + watchData.sleepMinutes / 60) * 12);
  const stepScore = Math.min(100, watchData.steps / 100);
  const heartScore = watchData.heartRate > 100 ? 58 : 88;

  watchData.wellnessScore = Math.round((sleepScore + stepScore + heartScore) / 3);
  watchData.weeklySteps = watchData.weeklySteps.map(() => Math.floor(3500 + Math.random() * 8000));

  renderDashboard();
});

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatBox = document.getElementById("chatBox");

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  userInput.value = "";
  addMessage(message, "user");
  chatHistory.push({ role: "user", content: message });

  const loadingMessage = addMessage("กำลังคิดคำตอบให้...", "bot", true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        watchData,
        history: chatHistory
      })
    });

    const data = await response.json();
    loadingMessage.querySelector(".bubble").textContent = data.reply;

    chatHistory.push({ role: "assistant", content: data.reply });
  } catch (error) {
    loadingMessage.querySelector(".bubble").textContent =
      "ต่อ backend ไม่ได้ ลองเช็กว่า npm start รันอยู่ไหม หรือดู error ใน terminal";
  }

  chatBox.scrollTop = chatBox.scrollHeight;
});

function addMessage(text, type, returnNode = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}`;

  if (type === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "🌿";
    wrapper.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  wrapper.appendChild(bubble);

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;

  return returnNode ? wrapper : null;
}

document.querySelectorAll(".quick-prompts button").forEach(button => {
  button.addEventListener("click", () => {
    userInput.value = button.dataset.prompt;
    userInput.focus();
  });
});

document.getElementById("clearChat").addEventListener("click", () => {
  chatHistory = [];
  chatBox.innerHTML = `
    <div class="message bot">
      <div class="avatar">🌿</div>
      <div class="bubble">
        สวัสดี ฉันคือ Wellnest AI ถามเรื่องออกกำลังกาย สุขภาพเบื้องต้น การนอน หรือค่าสมาร์ทวอชได้เลย
      </div>
    </div>
  `;
});

renderDashboard();
