(() => {
  "use strict";

  const isGitHubPages = location.hostname === "guanwei-cmd.github.io";

  const intro = document.querySelector("[data-life-intro]");
  if (intro && !document.documentElement.classList.contains("intro-seen")) {
    document.body.classList.add("intro-open");
    const closeIntro = () => {
      if (intro.classList.contains("is-closing")) return;
      intro.classList.add("is-closing");
      document.body.classList.remove("intro-open");
      try { sessionStorage.setItem("lifeIntroSeen", "1"); } catch (_) {}
      window.setTimeout(() => {
        intro.classList.add("is-closed");
        document.querySelector(".hero h1")?.focus({ preventScroll: true });
      }, 680);
    };
    intro.querySelectorAll("[data-intro-enter]").forEach((control) => control.addEventListener("click", closeIntro));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeIntro();
    }, { once: true });
  }

  document.querySelectorAll("[data-life-subscribe]").forEach((form) => {
    if (isGitHubPages) {
      const note = form.querySelector(".form-note");
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "訂閱即將開放";
      note.textContent = "這是公開閱讀站；名單訂閱與每日寄信功能正在接線中。";
      return;
    }
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const note = form.querySelector(".form-note");
      const button = form.querySelector("button[type=submit]");
      const payload = Object.fromEntries(new FormData(form).entries());
      button.disabled = true;
      note.className = "form-note";
      note.textContent = "正在加入…";
      try {
        const response = await fetch("/api/life/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, consent: true, source: location.pathname }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error(data.error || "訂閱沒有成功");
        form.reset();
        note.className = "form-note success";
        note.textContent = data.emailSent ? "加入成功，歡迎信已寄出。" : "加入成功，第一期很快就會寄到。";
      } catch (error) {
        note.className = "form-note error";
        note.textContent = error instanceof Error ? error.message : "訂閱沒有成功，請稍後再試。";
      } finally {
        button.disabled = false;
      }
    });
  });

  const salary = document.querySelector("#salary");
  const hours = document.querySelector("#hours");
  const hoursOutput = document.querySelector("#hours-output");
  const estimate = document.querySelector("#estimate");
  const dayButtons = [...document.querySelectorAll("[data-day]")];
  let dayType = "weekday";

  function calculate() {
    const monthly = Math.max(0, Number(salary.value) || 0);
    const overtime = Math.max(0, Number(hours.value) || 0);
    const hourly = monthly / 240;
    const firstTwo = Math.min(overtime, 2);
    const afterTwo = Math.min(Math.max(overtime - 2, 0), dayType === "weekday" ? 2 : 6);
    const amount = Math.round(hourly * firstTwo * (4 / 3) + hourly * afterTwo * (5 / 3));
    hoursOutput.textContent = overtime + " 小時";
    estimate.textContent = "NT$ " + amount.toLocaleString("zh-TW");
  }

  dayButtons.forEach((button) => button.addEventListener("click", () => {
    dayType = button.dataset.day;
    dayButtons.forEach((item) => item.classList.toggle("active", item === button));
    hours.max = dayType === "weekday" ? "4" : "8";
    if (Number(hours.value) > Number(hours.max)) hours.value = hours.max;
    calculate();
  }));
  salary.addEventListener("input", calculate);
  hours.addEventListener("input", calculate);
  calculate();
})();
