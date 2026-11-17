/* AIO Growth Desk: manual revenue scenario calculator, no user analytics collected. */
(() => {
  'use strict';
  const form = document.getElementById('growthCalculator');
  if (!form) return;
  const get = id => document.getElementById(id);
  const fmt = new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2});
  function estimate(views,rpm,other,costs) {
    if (![views,rpm,other,costs].every(v => Number.isFinite(v) && v >= 0)) return null;
    if (views > 1e10 || rpm > 1e5 || other > 1e8 || costs > 1e8) return null;
    const ads = views * rpm / 1000;
    const gross = ads + other;
    const net = gross - costs;
    const remaining = Math.max(0,costs - other);
    const breakEvenViews = remaining === 0 ? 0 : rpm > 0 ? Math.ceil(remaining * 1000 / rpm) : null;
    return {ads,gross,net,breakEvenViews};
  }
  function calculate() {
    const values = ['growthViews','growthRpm','growthOther','growthCosts'].map(id => {
      const raw = get(id).value.trim();
      return raw.length ? Number(raw) : 0;
    });
    if (!get('growthViews').value.trim() || !get('growthRpm').value.trim()) {
      get('growthResult').textContent = 'Enter a page-view count and an assumed page RPM to calculate a scenario.';
      return;
    }
    const result = estimate(...values);
    if (!result) {
      get('growthResult').textContent = 'Enter non-negative, realistic numeric amounts.';
      return;
    }
    get('growthGross').textContent = fmt.format(result.gross);
    get('growthNet').textContent = fmt.format(result.net);
    get('growthBreakEven').textContent = result.breakEvenViews === null ? 'Not possible at £0 RPM' : new Intl.NumberFormat('en-GB').format(result.breakEvenViews) + ' page views';
    get('growthResult').textContent = 'Scenario only. Estimated ad income: '+fmt.format(result.ads)+'. These are not actual AIO earnings or traffic.';
  }
  form.addEventListener('submit',event => {event.preventDefault();calculate()});
  window.aioGrowthEstimate = estimate;
})();