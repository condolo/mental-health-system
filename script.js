const form = document.getElementById("dailyCheckIn");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const summary = document.getElementById("savedSummary");
const stress = document.getElementById("stressLevel");
const stressValue = document.getElementById("stressValue");

stress.addEventListener("input", () => {
  stressValue.textContent = stress.value;
});

const todayKey = new Date().toISOString().slice(0, 10);
const storageKey = `checkin-${todayKey}`;

function renderSummary(data) {
  summary.innerHTML = `
    <h2>Today’s Summary (${todayKey})</h2>
    <ul>
      <li><strong>Mood:</strong> ${data.mood || "Not set"}</li>
      <li><strong>Stress:</strong> ${data.stressLevel}/10</li>
      <li><strong>Intention:</strong> ${data.intention || "Not set"}</li>
      <li><strong>Affirmation:</strong> ${data.affirmation || "Not set"}</li>
    </ul>
    <p><em>You showed up for yourself today. Keep going 🌱</em></p>
  `;
}

saveBtn.addEventListener("click", () => {
  const data = Object.fromEntries(new FormData(form).entries());

  const selfcare = Array.from(
    form.querySelectorAll('input[name="selfcare"]:checked'),
    (el) => el.value,
  );

  data.selfcare = selfcare;

  localStorage.setItem(storageKey, JSON.stringify(data));
  renderSummary(data);
});

clearBtn.addEventListener("click", () => {
  form.reset();
  stressValue.textContent = "5";
  summary.innerHTML = "<h2>Today’s Summary</h2><p>Your saved reflection will appear here.</p>";
  localStorage.removeItem(storageKey);
});

const existing = localStorage.getItem(storageKey);
if (existing) {
  const data = JSON.parse(existing);

  Object.entries(data).forEach(([key, value]) => {
    if (key === "selfcare" && Array.isArray(value)) {
      value.forEach((item) => {
        const checkbox = form.querySelector(`input[name="selfcare"][value="${item}"]`);
        if (checkbox) checkbox.checked = true;
      });
      return;
    }

    const field = form.elements.namedItem(key);
    if (field && typeof value === "string") {
      field.value = value;
    }
  });

  if (data.stressLevel) {
    stressValue.textContent = data.stressLevel;
  }

  renderSummary(data);
}
