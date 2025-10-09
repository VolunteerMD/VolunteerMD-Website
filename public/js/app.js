const state = {
  user: null,
  opportunities: [],
  filtered: [],
  favorites: new Set(),
  favoriteDetails: new Map(),
  filters: {
    location: null,
    subject: null,
    timeCommitment: null,
    search: ''
  },
  filterOptions: {
    locations: [],
    subjects: [],
    times: []
  },
  loading: false
};

const analyticsState = {
  provider: null,
  domain: null,
  scriptHost: 'https://plausible.io',
  ready: false,
  queue: [],
  token: null
};

const dom = {
  navLinks: null,
  sections: null,
  searchInput: null,
  searchClear: null,
  opportunitiesList: null,
  savedList: null,
  savedHint: null,
  accountStatus: null,
  accountActions: null,
  accountEmail: null,
  registerForm: null,
  loginForm: null,
  logoutButton: null,
  contactForm: null,
  contactFeedback: null,
  year: null,
  savedSection: null,
  filterContainers: {
    locations: null,
    subjects: null,
    times: null
  },
  template: null
};

function enqueueAnalytics(fn) {
  analyticsState.queue.push(fn);
  flushAnalyticsQueue();
}

function flushAnalyticsQueue() {
  if (!analyticsState.ready || typeof window.plausible !== 'function') {
    return;
  }
  while (analyticsState.queue.length) {
    const fn = analyticsState.queue.shift();
    try {
      fn();
    } catch (err) {
      console.warn('Analytics dispatch failed', err);
    }
  }
}

function trackEvent(name, options) {
  if (analyticsState.provider !== 'plausible') return;
  const payload = options && Object.keys(options).length > 0 ? options : undefined;
  const send = () => {
    if (typeof window.plausible === 'function') {
      window.plausible(name, payload);
    }
  };

  if (analyticsState.ready && typeof window.plausible === 'function') {
    send();
  } else {
    enqueueAnalytics(send);
  }
}

function trackPageview(sectionId) {
  if (analyticsState.provider !== 'plausible') return;
  const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
  trackEvent('pageview', { u: url });
}

function trackOpportunityView(opportunity) {
  if (!opportunity || !opportunity.id) return;
  trackEvent('Opportunity View', {
    props: {
      id: opportunity.id,
      title: opportunity.title,
      subject: opportunity.subject || null,
      location: opportunity.location || null
    }
  });
}

function trackOpportunitySaved(opportunity, action = 'save') {
  if (!opportunity || !opportunity.id) return;
  trackEvent(action === 'remove' ? 'Opportunity Removed' : 'Opportunity Saved', {
    props: {
      id: opportunity.id,
      title: opportunity.title,
      subject: opportunity.subject || null,
      location: opportunity.location || null
    }
  });
}

function qs(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

function initDom() {
  dom.navLinks = Array.from(document.querySelectorAll('nav a'));
  dom.sections = Array.from(document.querySelectorAll('.content-section'));
  dom.searchInput = qs('#search-input');
  dom.searchClear = qs('#search-clear');
  dom.opportunitiesList = qs('#opportunities-list');
  dom.savedHint = qs('#saved-hint');
  dom.savedList = qs('#saved-list');
  dom.savedSection = qs('#saved');
  dom.accountStatus = qs('#account-status');
  dom.accountActions = qs('#account-actions');
  dom.accountEmail = qs('#account-email');
  dom.registerForm = qs('#register-form');
  dom.loginForm = qs('#login-form');
  dom.logoutButton = qs('#logout-button');
  dom.contactForm = qs('#contact-form');
  dom.contactFeedback = qs('#contact-feedback');
  dom.year = qs('#year');
  dom.filterContainers.locations = qs('#filter-locations');
  dom.filterContainers.subjects = qs('#filter-subjects');
  dom.filterContainers.times = qs('#filter-times');
  dom.template = qs('#opportunity-card-template');
}

async function configureAnalytics() {
  try {
    const response = await fetch('/api/config', { credentials: 'same-origin' });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.analytics?.provider === 'plausible' && data.analytics.domain) {
      analyticsState.provider = 'plausible';
      analyticsState.domain = data.analytics.domain;
      analyticsState.scriptHost = data.analytics.scriptHost || analyticsState.scriptHost;
      injectPlausibleScript();
      trackPageview('home');
    } else if (data?.analytics?.provider === 'cloudflare' && data.analytics.token) {
      analyticsState.provider = 'cloudflare';
      analyticsState.token = data.analytics.token;
      injectCloudflareScript();
    }
  } catch (err) {
    console.warn('Analytics configuration failed', err);
  }
}

function injectPlausibleScript() {
  if (analyticsState.provider !== 'plausible' || !analyticsState.domain) return;
  if (document.querySelector('script[data-analytics="plausible"]')) {
    analyticsState.ready = true;
    flushAnalyticsQueue();
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = analyticsState.domain;
  script.dataset.analytics = 'plausible';
  script.src = `${analyticsState.scriptHost}/js/plausible.js`;
  if (analyticsState.scriptHost !== 'https://plausible.io') {
    script.dataset.api = `${analyticsState.scriptHost}/api/event`;
  }
  script.addEventListener('load', () => {
    analyticsState.ready = true;
    flushAnalyticsQueue();
  });
  script.addEventListener('error', () => {
    console.warn('Analytics script failed to load');
  });
  document.head.appendChild(script);
}

function injectCloudflareScript() {
  if (analyticsState.provider !== 'cloudflare' || !analyticsState.token) return;
  if (document.querySelector('script[data-analytics="cloudflare"]')) {
    analyticsState.ready = true;
    return;
  }

  const script = document.createElement('script');
  script.defer = true;
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.dataset.analytics = 'cloudflare';
  script.setAttribute('data-cf-beacon', JSON.stringify({ token: analyticsState.token }));
  script.addEventListener('load', () => {
    analyticsState.ready = true;
  });
  script.addEventListener('error', () => {
    console.warn('Cloudflare analytics script failed to load');
  });
  document.head.appendChild(script);
}

function setCurrentYear() {
  dom.year.textContent = new Date().getFullYear();
}

function switchSection(id) {
  dom.sections.forEach((section) => {
    const isTarget = section.id === id;
    section.classList.toggle('visible', isTarget);
    if (isTarget) {
      section.focus({ preventScroll: false });
    }
  });
  dom.navLinks.forEach((link) => {
    const target = link.dataset.section;
    link.classList.toggle('active', target === id);
  });
  trackPageview(id);
}

function setupNavigation() {
  dom.navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const target = link.dataset.section;
      if (!target) return;
      switchSection(target);
    });
  });

  document.querySelectorAll('[data-section-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.sectionTarget;
      if (target) {
        switchSection(target);
      }
    });
  });
}

function debounce(fn, wait = 180) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

function normalize(text) {
  return (text || '').toString().toLowerCase();
}

function matchesSearch(opportunity, query) {
  if (!query) return true;
  const haystack = [
    opportunity.title,
    opportunity.description,
    opportunity.location,
    opportunity.subject,
    opportunity.timeCommitment,
    opportunity.organization,
    (opportunity.requirements || []).join(' ')
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase();
  return haystack.includes(query);
}

function applyFilters() {
  const { location, subject, timeCommitment, search } = state.filters;
  const query = normalize(search);

  state.filtered = state.opportunities.filter((opp) => {
    if (location && (!opp.location || opp.location !== location)) return false;
    if (subject && (!opp.subject || opp.subject !== subject)) return false;
    if (timeCommitment && (!opp.timeCommitment || opp.timeCommitment !== timeCommitment)) return false;
    if (query && !matchesSearch(opp, query)) return false;
    return true;
  });

  renderOpportunities();
}

function handleFilterToggle(key, value, button) {
  if (state.filters[key] === value) {
    state.filters[key] = null;
  } else {
    state.filters[key] = value;
  }

  const container = dom.filterContainers[
    key === 'location' ? 'locations' : key === 'subject' ? 'subjects' : 'times'
  ];
  if (container) {
    container.querySelectorAll('.filter-button').forEach((btn) => {
      btn.classList.toggle('active', state.filters[key] === btn.dataset.filterValue);
    });
  }

  applyFilters();
}

function buildFilterButtons() {
  const { locations, subjects, times } = state.filterOptions;

  const createButtons = (values, key, container) => {
    container.innerHTML = '';
    if (values.length === 0) {
      const span = document.createElement('span');
      span.textContent = 'No data yet';
      span.className = 'tag';
      container.appendChild(span);
      return;
    }

    values.forEach((value) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-button';
      btn.dataset.filterKey = key;
      btn.dataset.filterValue = value;
      btn.textContent = value;
      if (state.filters[key] === value) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => handleFilterToggle(key, value, btn));
      container.appendChild(btn);
    });
  };

  createButtons(locations, 'location', dom.filterContainers.locations);
  createButtons(subjects, 'subject', dom.filterContainers.subjects);
  createButtons(times, 'timeCommitment', dom.filterContainers.times);
}

function computeFilterOptions() {
  const locations = new Set();
  const subjects = new Set();
  const times = new Set();

  state.opportunities.forEach((opp) => {
    if (opp.location) locations.add(opp.location);
    if (opp.subject) subjects.add(opp.subject);
    if (opp.timeCommitment) times.add(opp.timeCommitment);
  });

  state.filterOptions.locations = Array.from(locations).sort();
  state.filterOptions.subjects = Array.from(subjects).sort();
  state.filterOptions.times = Array.from(times).sort();
}

function classForRequirement(text) {
  const normalized = normalize(text);
  if (normalized.includes('police') || normalized.includes('background')) return 'req-police';
  if (normalized.includes('vaccine') || normalized.includes('immunization')) return 'req-vaccine';
  if (normalized.includes('training')) return 'req-training';
  if (normalized.includes('age')) return 'req-age';
  if (normalized.includes('tb')) return 'req-tb';
  if (normalized.includes('consent')) return 'req-consent';
  if (normalized.includes('reference')) return 'req-reference';
  if (normalized.includes('form')) return 'req-form';
  if (normalized.includes('vulnerable')) return 'req-vulnerable';
  return 'req-other'
}

function formatRequirement(text) {
  return text ? text.trim() : '';
}

function createOpportunityCard(opportunity, options = {}) {
  const { mode = 'list' } = options;
  const clone = dom.template.content.firstElementChild.cloneNode(true);

  const titleEl = clone.querySelector('.opportunity-title');
  const descEl = clone.querySelector('.opportunity-description');
  const orgEl = clone.querySelector('.opportunity-org');
  const linkEl = clone.querySelector('.opportunity-link');
  const tagsEl = clone.querySelector('.tags');
  const buttonEl = clone.querySelector('.save-button');

  titleEl.textContent = opportunity.title;
  descEl.textContent = opportunity.description || 'No description provided yet.';

  orgEl.innerHTML = '';
  if (opportunity.orgLogo) {
    const img = document.createElement('img');
    img.src = opportunity.orgLogo;
    img.alt = opportunity.organization ? `${opportunity.organization} logo` : 'Organization logo';
    orgEl.appendChild(img);
  }
  if (opportunity.organization) {
    const span = document.createElement('span');
    span.textContent = opportunity.organization;
    orgEl.appendChild(span);
  }

  const addTag = (label, value, type = '') => {
    if (!value) return;
    const tag = document.createElement('span');
    tag.className = `tag ${type}`;
    tag.textContent = `${label}: ${value}`;
    tagsEl.appendChild(tag);
  };


  addTag('Location', opportunity.location, 'tag-location');
  addTag('Time', opportunity.timeCommitment, 'tag-time');
  addTag('Subject', opportunity.subject, 'tag-subject');


  const requirements = Array.isArray(opportunity.requirements) ? opportunity.requirements : [];
  requirements.forEach((req) => {
    const clean = formatRequirement(req);
    if (!clean) return;
    const tag = document.createElement('span');
    tag.className = `tag requirement ${classForRequirement(clean)}`;
    tag.textContent = clean;
    tagsEl.appendChild(tag);
  });

  

  linkEl.href = opportunity.link;
  linkEl.textContent = 'Application';
  linkEl.addEventListener('click', () => {
    trackOpportunityView(opportunity);
  });

  configureSaveButton(buttonEl, opportunity, mode);

  return clone;
}

function configureSaveButton(button, opportunity, mode) {
  const id = opportunity.id;
  const isSaved = state.favorites.has(id);

  if (mode === 'saved') {
    button.textContent = 'Remove';
    button.classList.add('saved');
    button.dataset.opportunityId = id;
    button.disabled = false;
    return;
  }

  if (isSaved) {
    button.textContent = 'Saved';
    button.classList.add('saved');
  } else {
    button.textContent = 'Save';
    button.classList.remove('saved');
  }

  button.disabled = false;
  button.addEventListener('click', async () => {
    if (!state.user) {
      showAuthMessage('Sign in to save opportunities.');
      switchSection('account');
      return;
    }

    button.disabled = true;
    try {
      if (state.favorites.has(id)) {
        await removeFavorite(id);
      } else {
        await addFavorite(id);
      }
    } catch (err) {
      showAuthMessage(err.message || 'Unable to update favorites.');
    } finally {
      button.disabled = false;
    }
  });
}


function renderOpportunities() {
  if (state.loading) {
    dom.opportunitiesList.textContent = 'Loading opportunities…';
    return;
  }

  if (!Array.isArray(state.opportunities) || state.opportunities.length === 0) {
    dom.opportunitiesList.textContent = 'Opportunities will appear once data is available.';
    return;
  }

  if (state.filtered.length === 0) {
    dom.opportunitiesList.textContent = 'No opportunities match your filters yet. Try adjusting filters or clearing them.';
    return;
  }

  dom.opportunitiesList.innerHTML = '';
  state.filtered.forEach((opportunity) => {
    const card = createOpportunityCard(opportunity, { mode: 'list' });
    dom.opportunitiesList.appendChild(card);
  });
}

function renderSaved() {
  if (!state.user) {
    dom.savedHint.hidden = false;
    dom.savedList.textContent = 'Sign in to sync saved opportunities.';
    return;
  }

  dom.savedHint.hidden = true;

  if (state.favorites.size === 0) {
    dom.savedList.textContent = 'You have not saved any opportunities yet.';
    return;
  }

  dom.savedList.innerHTML = '';
  state.favoriteDetails.forEach((opportunity) => {
    const card = createOpportunityCard(opportunity, { mode: 'saved' });
    const button = card.querySelector('.save-button');
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await removeFavorite(opportunity.id);
      } catch (err) {
        showAuthMessage(err.message || 'Unable to remove favorite.');
      } finally {
        button.disabled = false;
      }
    });
    dom.savedList.appendChild(card);
  });
}

function showAuthMessage(message) {
  dom.accountStatus.textContent = message;
  dom.accountStatus.hidden = false;
}

function clearAuthMessage() {
  dom.accountStatus.textContent = '';
  dom.accountStatus.hidden = true;
}

function updateAccountUi() {
  if (state.user) {
    dom.accountActions.removeAttribute('hidden');
    dom.accountActions.style.display = 'block';

    dom.accountEmail.textContent = state.user.email;

    dom.registerForm.style.display = 'none';
    dom.loginForm.style.display = 'none';
    clearAuthMessage();
  } else {
    dom.accountActions.setAttribute('hidden', 'true');
    dom.accountActions.style.display = 'none';

    dom.accountEmail.textContent = '';

    dom.registerForm.style.display = '';
    dom.loginForm.style.display = '';
  }
}



function setLoading(value) {
  state.loading = value;
  renderOpportunities();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = payload?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload;
}

async function loadOpportunities() {
  setLoading(true);
  try {
    const data = await fetchJson('/api/opportunities');
    state.opportunities = Array.isArray(data?.data) ? data.data : [];
    computeFilterOptions();
    buildFilterButtons();
    applyFilters();
  } catch (err) {
    dom.opportunitiesList.textContent = err.message || 'Failed to load opportunities.';
  } finally {
    setLoading(false);
  }
}

async function fetchCurrentUser() {
  try {
    const data = await fetchJson('/api/auth/me', { method: 'GET' });
    state.user = data?.user || null;
  } catch (err) {
    state.user = null;
  }
  updateAccountUi();
  updateSavedHint();
}

function updateSavedHint() {
  dom.savedHint.hidden = Boolean(state.user);
}

async function loadFavorites() {
  if (!state.user) {
    state.favorites.clear();
    state.favoriteDetails.clear();
    renderSaved();
    return;
  }

  try {
    const data = await fetchJson('/api/favorites');
    const ids = Array.isArray(data?.ids) ? data.ids : [];
    const details = Array.isArray(data?.data) ? data.data : [];

    state.favorites = new Set(ids);
    state.favoriteDetails = new Map(details.map((item) => [item.id, item]));
  } catch (err) {
    showAuthMessage(err.message || 'Unable to load favorites.');
    state.favorites.clear();
    state.favoriteDetails.clear();
  }

  renderOpportunities();
  renderSaved();
}

async function addFavorite(id) {
  const opportunity = state.opportunities.find((opp) => opp.id === id);
  if (!opportunity) {
    throw new Error('Unable to find opportunity.');
  }
  await fetchJson(`/api/favorites/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  state.favorites.add(id);
  state.favoriteDetails.set(id, opportunity);
  trackOpportunitySaved(opportunity, 'save');
  renderOpportunities();
  renderSaved();
}

async function removeFavorite(id) {
  await fetchJson(`/api/favorites/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  const opportunity = state.favoriteDetails.get(id) || state.opportunities.find((opp) => opp.id === id);
  if (opportunity) {
    trackOpportunitySaved(opportunity, 'remove');
  }
  state.favorites.delete(id);
  state.favoriteDetails.delete(id);
  renderOpportunities();
  renderSaved();
}

function setupSearch() {
  const debounced = debounce(() => {
    state.filters.search = dom.searchInput.value.trim();
    applyFilters();
  }, 180);

  dom.searchInput.addEventListener('input', debounced);
  dom.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') event.preventDefault();
  });

  dom.searchClear.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.filters.search = '';
    applyFilters();
  });
}

function setupFilterReset() {
  qs('#clear-filters').addEventListener('click', () => {
    state.filters.location = null;
    state.filters.subject = null;
    state.filters.timeCommitment = null;
    state.filters.search = '';
    dom.searchInput.value = '';
    buildFilterButtons();
    applyFilters();
  });
}

function serializeForm(form) {
  const formData = new FormData(form);
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = value.trim();
  }
  return data;
}

function setupAuthForms() {
  dom.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = serializeForm(dom.registerForm);

    try {
      const result = await fetchJson('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.user = result?.user || null;
      dom.registerForm.reset();
      showAuthMessage('Account created. You are now signed in.');
      updateAccountUi();
      await loadFavorites();
    } catch (err) {
      showAuthMessage(err.message || 'Unable to register.');
    }
  });

  dom.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = serializeForm(dom.loginForm);

    try {
      const result = await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      state.user = result?.user || null;
      dom.loginForm.reset();
      showAuthMessage('Signed in successfully.');
      updateAccountUi();
      await loadFavorites();
    } catch (err) {
      showAuthMessage(err.message || 'Unable to sign in.');
    }
  });

  dom.logoutButton.addEventListener('click', async () => {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch (err) {
      showAuthMessage(err.message || 'Logout failed, please try again.');
    }
    state.user = null;
    state.favorites.clear();
    state.favoriteDetails.clear();
    updateAccountUi();
    updateSavedHint();
    renderOpportunities();
    renderSaved();
  });
}

function setupContactForm() {
  dom.contactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    dom.contactFeedback.textContent = '';

    const payload = serializeForm(dom.contactForm);

    try {
      await fetchJson('/api/contact', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      dom.contactFeedback.textContent = 'Thanks! We received your message and will respond shortly.';
      dom.contactForm.reset();
    } catch (err) {
      dom.contactFeedback.textContent = err.message || 'Unable to send message right now.';
    }
  });
}

async function initialize() {
  initDom();
  dom.accountStatus.hidden = true;
  dom.contactFeedback.textContent = '';
  setCurrentYear();
  configureAnalytics();
  setupNavigation();
  setupSearch();
  setupFilterReset();
  setupAuthForms();
  setupContactForm();


  await fetchCurrentUser();
  await loadOpportunities();


  const path = window.location.pathname.replace('/', '').toLowerCase();
  const hospitalMap = {
    covenant: 'Covenant Health',
    hospicecalgary: 'Hospice Calgary',
    ach: "Alberta Children's Hospital",
    alzheimercalgary: 'Alzheimer Calgary'
  };

  if (hospitalMap[path]) {

    state.filtered = state.opportunities.filter(
      opp =>
        opp.organization &&
        opp.organization.toLowerCase().includes(hospitalMap[path].toLowerCase())
    );


    document.title = `${hospitalMap[path]} | VolunteerMD`;
    const header = document.querySelector('.page-title');
    if (header) header.textContent = `${hospitalMap[path]} Opportunities`;

    renderOpportunities();
  } else {

    applyFilters();
  }

  await loadFavorites();

}

window.addEventListener('DOMContentLoaded', () => {
  initialize().catch((err) => {
    console.error(err);
    dom.opportunitiesList.textContent = 'Initialization error. Please refresh the page.';
  });
});
