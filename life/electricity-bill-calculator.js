(function () {
  const form = document.getElementById("electricityCalculator");
  if (!form) return;

  const rates = {
    summer: [1.78, 2.55, 3.8, 5.14, 6.44, 8.86],
    regular: [1.78, 2.26, 3.13, 4.24, 5.27, 7.03],
  };
  const monthlyLimits = [120, 330, 500, 700, 1000, Infinity];
  const tierLabels = ["120度以下", "121–330度", "331–500度", "501–700度", "701–1,000度", "1,001度以上"];
  const currency = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 });

  const elements = {
    months: document.getElementById("billingMonths"),
    season: document.getElementById("billingSeason"),
    totalRow: document.getElementById("totalUsageRow"),
    total: document.getElementById("totalUsage"),
    meterRows: document.getElementById("meterReadingRows"),
    previous: document.getElementById("previousReading"),
    current: document.getElementById("currentReading"),
    totalOutput: document.getElementById("electricityTotal"),
    summary: document.getElementById("electricitySummary"),
    comparisonLabel: document.getElementById("comparisonLabel"),
    comparisonTotal: document.getElementById("comparisonTotal"),
    difference: document.getElementById("seasonDifference"),
    breakdown: document.getElementById("electricityBreakdown"),
    average: document.getElementById("averageRate"),
    highest: document.getElementById("highestTier"),
    copy: document.getElementById("copyElectricityCalculation"),
    copyStatus: document.getElementById("electricityCopyStatus"),
  };

  function usageMode() {
    return form.querySelector('input[name="usageMode"]:checked').value;
  }

  function getUsage() {
    if (usageMode() === "meter") {
      return Math.max(0, Number(elements.current.value || 0) - Number(elements.previous.value || 0));
    }
    return Math.max(0, Number(elements.total.value || 0));
  }

  function calculate(usage, season, months) {
    let previousLimit = 0;
    let remaining = usage;
    let total = 0;
    const rows = [];

    monthlyLimits.forEach((monthlyLimit, index) => {
      if (remaining <= 0) return;
      const limit = Number.isFinite(monthlyLimit) ? monthlyLimit * months : Infinity;
      const tierCapacity = limit - previousLimit;
      const tierUsage = Math.min(remaining, tierCapacity);
      const amount = tierUsage * rates[season][index];
      rows.push({ label: tierLabels[index], usage: tierUsage, rate: rates[season][index], amount });
      total += amount;
      remaining -= tierUsage;
      previousLimit = limit;
    });

    return { total, rows };
  }

  function render() {
    const mode = usageMode();
    const months = Number(elements.months.value);
    const season = elements.season.value;
    const comparisonSeason = season === "summer" ? "regular" : "summer";
    const usage = getUsage();
    const result = calculate(usage, season, months);
    const comparison = calculate(usage, comparisonSeason, months);
    const difference = result.total - comparison.total;
    const seasonName = season === "summer" ? "夏月" : "非夏月";
    const comparisonName = comparisonSeason === "summer" ? "夏月" : "非夏月";

    elements.totalRow.hidden = mode !== "total";
    elements.meterRows.hidden = mode !== "meter";
    elements.totalOutput.textContent = `${currency.format(Math.round(result.total))} 元`;
    elements.summary.textContent = `${months === 2 ? "兩個月" : "一個月"}共${currency.format(usage)}度，平均每月${currency.format(usage / months)}度。`;
    elements.comparisonLabel.textContent = `同度數改用${comparisonName}單價`;
    elements.comparisonTotal.textContent = `${currency.format(Math.round(comparison.total))} 元`;
    elements.difference.textContent = difference >= 0
      ? `${seasonName}約多 ${currency.format(Math.round(difference))} 元`
      : `${seasonName}約少 ${currency.format(Math.round(Math.abs(difference)))} 元`;
    elements.average.textContent = usage > 0 ? `${(result.total / usage).toFixed(2)} 元` : "0 元";
    elements.highest.textContent = result.rows.length ? result.rows[result.rows.length - 1].label : "尚未用電";
    elements.breakdown.innerHTML = result.rows.length
      ? result.rows.map((row) => `<div><dt>${row.label}<small>${currency.format(row.usage)}度 × ${row.rate.toFixed(2)}元</small></dt><dd>${currency.format(Math.round(row.amount))} 元</dd></div>`).join("")
      : "<div><dt>尚未有用電度數</dt><dd>0 元</dd></div>";
    elements.copy.dataset.text = [
      `住宅電費拆解試算（${seasonName}）`,
      `${months === 2 ? "兩個月" : "一個月"}用電：${usage}度`,
      `預估流動電費：${currency.format(Math.round(result.total))}元`,
      `同度數${comparisonName}：${currency.format(Math.round(comparison.total))}元`,
      elements.difference.textContent,
      ...result.rows.map((row) => `${row.label}：${row.usage}度 × ${row.rate.toFixed(2)}元＝${currency.format(Math.round(row.amount))}元`),
      "僅供概算，實際金額以台電帳單為準。",
    ].join("\n");
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);
  elements.copy.addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(elements.copy.dataset.text || "");
      elements.copyStatus.textContent = "已複製試算明細。";
    } catch (_) {
      elements.copyStatus.textContent = "無法自動複製，請手動選取結果。";
    }
  });
  render();
})();
