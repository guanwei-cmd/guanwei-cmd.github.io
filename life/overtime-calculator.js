(function () {
  "use strict";

  const form = document.getElementById("overtimeCalculator");
  if (!form) return;

  const wageAmount = document.getElementById("wageAmount");
  const wageLabel = document.getElementById("wageLabel");
  const wageUnit = document.getElementById("wageUnit");
  const wageHint = document.getElementById("wageHint");
  const workdayType = document.getElementById("workdayType");
  const dayTypeHint = document.getElementById("dayTypeHint");
  const workHours = document.getElementById("workHours");
  const workMinutes = document.getElementById("workMinutes");
  const hoursHint = document.getElementById("hoursHint");
  const scheduledHoursRow = document.getElementById("scheduledHoursRow");
  const scheduledHours = document.getElementById("scheduledHours");
  const paidAmount = document.getElementById("paidAmount");
  const overtimeTotal = document.getElementById("overtimeTotal");
  const resultSummary = document.getElementById("resultSummary");
  const calculationBreakdown = document.getElementById("calculationBreakdown");
  const shortfallAmount = document.getElementById("shortfallAmount");
  const copyCalculation = document.getElementById("copyCalculation");
  const copyStatus = document.getElementById("copyStatus");

  const daySettings = {
    weekday: { label: "平日延長工時", max: 4, hint: "一般情況每日延長工時最多4小時。" },
    rest: { label: "休息日出勤", max: 12, hint: "第1至2小時、3至8小時、9至12小時分段計算。" },
    holiday: { label: "國定假日出勤", max: 12, hint: "須是未經合法調移、原本排定的工作日。" },
    regular: { label: "例假日出勤", max: 8, hint: "原則禁止；僅試算天災、事變或突發事件等法定例外。" }
  };

  const money = (value) => `${Math.ceil(Math.max(0, value)).toLocaleString("zh-TW")} 元`;
  const decimalMoney = (value) => `${value.toLocaleString("zh-TW", { maximumFractionDigits: 2 })} 元`;
  const numberValue = (element, fallback = 0) => {
    const value = Number(element.value);
    return Number.isFinite(value) ? Math.max(0, value) : fallback;
  };
  const basis = () => form.querySelector('input[name="payBasis"]:checked').value;

  function segment(hours, limit, multiplier, label, rate, rows) {
    const used = Math.min(Math.max(hours, 0), limit);
    if (used <= 0) return { used: 0, amount: 0 };
    const amount = used * rate * multiplier;
    rows.push({ label: `${label}：${used.toFixed(2).replace(/\.00$/, "")}小時 × ${multiplier.toFixed(2).replace(/\.00$/, "")}倍`, amount });
    return { used, amount };
  }

  function calculate() {
    const payBasis = basis();
    const dayType = workdayType.value;
    const settings = daySettings[dayType];
    const enteredWage = Math.max(1, numberValue(wageAmount, payBasis === "monthly" ? 29500 : 196));
    const hourlyRate = payBasis === "monthly" ? enteredWage / 240 : enteredWage;
    const rawHours = numberValue(workHours) + numberValue(workMinutes) / 60;
    const totalHours = Math.min(rawHours, settings.max);
    const scheduled = Math.min(8, Math.max(1, numberValue(scheduledHours, 8)));
    const paid = numberValue(paidAmount);
    const rows = [{ label: "平日每小時工資額", amount: hourlyRate }];
    let due = 0;
    let dayTotal = null;

    if (dayType === "weekday") {
      const first = segment(totalHours, 2, 4 / 3, "第1至2小時", hourlyRate, rows);
      const second = segment(totalHours - first.used, 2, 5 / 3, "第3至4小時", hourlyRate, rows);
      due = first.amount + second.amount;
    } else if (dayType === "rest") {
      const first = segment(totalHours, 2, 4 / 3, "第1至2小時", hourlyRate, rows);
      const second = segment(totalHours - first.used, 6, 5 / 3, "第3至8小時", hourlyRate, rows);
      const third = segment(totalHours - first.used - second.used, 4, 8 / 3, "第9至12小時", hourlyRate, rows);
      due = first.amount + second.amount + third.amount;
    } else if (dayType === "holiday") {
      const holidayPay = scheduled * hourlyRate;
      rows.push({ label: `8小時內加發原約定一日工資（${scheduled}小時）`, amount: holidayPay });
      const overEight = Math.max(0, totalHours - 8);
      const first = segment(overEight, 2, 4 / 3, "第9至10小時", hourlyRate, rows);
      const second = segment(overEight - first.used, 2, 5 / 3, "第11至12小時", hourlyRate, rows);
      due = holidayPay + first.amount + second.amount;
      if (payBasis === "hourly") dayTotal = holidayPay + due;
    } else {
      const extraDayPay = scheduled * hourlyRate;
      rows.push({ label: `停止例假加發一日工資（${scheduled}小時）`, amount: extraDayPay });
      due = extraDayPay;
      if (payBasis === "hourly") dayTotal = extraDayPay * 2;
    }

    overtimeTotal.textContent = money(due);
    const basisText = payBasis === "monthly" ? `月薪${Math.round(enteredWage).toLocaleString("zh-TW")}元 ÷ 240` : `時薪${enteredWage.toLocaleString("zh-TW")}元`;
    resultSummary.textContent = `${basisText}，${settings.label}出勤${totalHours.toFixed(2).replace(/\.00$/, "")}小時。${dayTotal === null ? "" : `含原本照給工資，該日工資合計約${money(dayTotal)}。`}`;
    calculationBreakdown.innerHTML = rows.map((row) => `<div><dt>${row.label}</dt><dd>${decimalMoney(row.amount)}</dd></div>`).join("");
    const shortfall = Math.max(0, Math.ceil(due) - paid);
    shortfallAmount.textContent = shortfall > 0 ? `可能短少 ${money(shortfall)}` : "目前沒有算出短少";
    copyCalculation.dataset.text = [
      "生活剛剛好｜加班費試算",
      resultSummary.textContent,
      ...rows.map((row) => `${row.label}：${decimalMoney(row.amount)}`),
      `依法至少應加給：${money(due)}`,
      `薪資單已列：${money(paid)}`,
      shortfallAmount.textContent,
      "試算僅供一般情境核對，個案請向1955或所在地勞工主管機關確認。"
    ].join("\n");
  }

  function updateMode(resetValue) {
    const payBasis = basis();
    if (resetValue) wageAmount.value = payBasis === "monthly" ? "29500" : "196";
    wageLabel.textContent = payBasis === "monthly" ? "月薪總額（含固定工資性給付）" : "平日每小時工資額";
    wageUnit.textContent = payBasis === "monthly" ? "元／月" : "元／小時";
    wageHint.textContent = payBasis === "monthly" ? "一般月薪制以月薪總額除以240換算平日每小時工資額。" : "應把屬於工資的固定加給換算進來，不一定只看底薪。";
    calculate();
  }

  function updateDayType() {
    const settings = daySettings[workdayType.value];
    workHours.max = String(settings.max);
    if (numberValue(workHours) > settings.max) workHours.value = String(settings.max);
    dayTypeHint.textContent = settings.hint;
    hoursHint.textContent = settings.hint;
    scheduledHoursRow.hidden = !["holiday", "regular"].includes(workdayType.value);
    calculate();
  }

  form.querySelectorAll('input[name="payBasis"]').forEach((input) => input.addEventListener("change", () => updateMode(true)));
  [wageAmount, workHours, workMinutes, scheduledHours, paidAmount].forEach((input) => input.addEventListener("input", calculate));
  workdayType.addEventListener("change", updateDayType);
  copyCalculation.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(copyCalculation.dataset.text || "");
      copyStatus.textContent = "試算明細已複製。";
    } catch (_) {
      copyStatus.textContent = "無法自動複製，請直接選取上方明細。";
    }
  });

  updateDayType();
})();
