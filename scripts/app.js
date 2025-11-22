// Minimal DOM logic placeholder for `scripts/app.js`
// Put your interactive code here.

document.addEventListener('DOMContentLoaded', () => {
  const toggles = document.querySelectorAll('[data-toggle]');
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSel = btn.dataset.toggle;
      const target = document.querySelector(targetSel);
      if (target) target.classList.toggle('hidden');
    });
  });
});
