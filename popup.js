import { fixedUrlMappings } from './url-mapping.js';

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let url = new URL(tab.url);

  // Check if the URL matches any fixed mappings
  const urlWithoutPath = `${url.protocol}//${url.hostname}`;
  if (fixedUrlMappings[urlWithoutPath]) {
    url = new URL(fixedUrlMappings[urlWithoutPath] + url.pathname + url.search + url.hash);
  }

  // Extract org, site, ref from subdomain
  const [ref, site, org] = url.hostname.split('.')[0].split('--');
  const path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

  if (!org || !site) {
    showNotAemMessage();
    return;
  }

  const contextInfo = `${ref} / ${site} / ${org}`;
  document.getElementById('context').textContent = contextInfo;
  document.getElementById('path').textContent = path;

  const baseUrl = `https://admin.hlx.page`;

  // Fetch and display the lastModified value
  const statusApiUrl = `${baseUrl}/status/${org}/${site}/${ref}/${path}`;
  const cacheKey = `sourceLocation_${org}_${site}_${ref}`;
  // Show publishing status section immediately with N/A values
  displayPublishingStatus('Loading...', 'Loading...', 'Loading...');
  fetchLastModifiedWithCookie(statusApiUrl, cacheKey);

  // Define your API endpoints
  const contentApis = [
    { label: '📘 Status', path: `/status/${org}/${site}/${ref}/${path}` },
    { label: '🟢 Preview', path: `/preview/${org}/${site}/${ref}/${path}` },
    { label: '🔵 Live', path: `/live/${org}/${site}/${ref}/${path}` },
    { label: '📊 Index', path: `/index/${org}/${site}/${ref}/${path}` },
  ];

  const configApis = [
    { label: '🏢 Org', path: `/config/${org}.json` },
    { label: '🗂 Site', path: `/config/${org}/sites/${site}.json` },
    { label: '🏛️ Public', path: `/config/${org}/sites/${site}/public.json` },
    { label: '🧩 Query', path: `/config/${org}/sites/${site}/content/query.yaml` },
    { label: '🤖 Robots', path: `/config/${org}/sites/${site}/robots.txt` },
    { label: '🗺 Sitemap', path: `/config/${org}/sites/${site}/content/sitemap.yaml` }
  ];

  const indexLinks = [
    { label: 'query', path: `/query-index.json` },
    { label: 'offers', path: `/offers-index.json` },
    { label: 'faq', path: `/faq-index.json` },
    { label: 'employers', path: `/employers-faq-index.json` },
    { label: 'marketplace', path: `/marketplace-query-index.json` },
    { label: 'benefits', path: `/benefits-index.json` },
    { label: 'car-brand', path: `/car-brand-index.json` },
    { label: 'resource-hub', path: `/employers-resources-hub-index.json` },
    { label: 'news', path: `/news-index.json` },
    { label: 'anouncement', path: `/announcement-index.json` }
  ];

  // Render all sections
  renderLinks(contentApis, 'content-links', baseUrl);

  // Render Config APIs and SEO APIs in separate sections
  renderLinks(configApis, 'config-links', baseUrl); // Use a container specific to config APIs

  // Render all sections
  renderNormalLinks(indexLinks, 'index-links', urlWithoutPath);
});

// Fetch the lastModified value from the Status API with the necessary cookie
async function fetchLastModifiedWithCookie(apiUrl, cacheKey) {
  try {
    // First check if we have cached sourceLocation
    const cachedData = await chrome.storage.local.get(cacheKey);
    let cachedSourceLocation = '';
    if (cachedData[cacheKey]) {
      const { sourceLocation, timestamp } = cachedData[cacheKey];
      
      // Check if cache is less than 24 hours old
      const now = Date.now();
      const cacheAge = now - timestamp;
      const cacheValidHours = 24;
      
      if (cacheAge < cacheValidHours * 60 * 60 * 1000) {
        const { sitesUrl, assetsUrl, configURL, packmgrUrl } = buildAuthorUrls(sourceLocation);
        if (sitesUrl) {
          displayAuthoringLinks(sitesUrl, assetsUrl, configURL, packmgrUrl);
        }
      }
    }

    // If no valid cache found, proceed with API call
    const apiUrlWithQuery = `${apiUrl}?edit=auto`;

    // Get the cookie for the domain
    chrome.cookies.get({ url: 'https://admin.hlx.page', name: 'auth_token' }, (cookie) => {
      if (!cookie || !cookie.value) {
        console.error('Cookie not found');
        displayPublishingStatus('N/A', 'N/A', 'N/A');
        return;
      }

      const cookieValue = cookie.value;

      // Make the fetch request with the cookie
      fetch(apiUrlWithQuery, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `auth_token=${cookieValue}`,
        }
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch status API');
          }
          return response.json();
        })
        .then((data) => {
          const previewLastModified = data.preview?.lastModified || 'N/A';
          const liveLastModified = data.live?.lastModified || 'N/A';
          const publishBy = data.profile?.email || 'N/A';

          const sourceLocation = data.live?.sourceLocation || '';
          
          // Use sourceLocation from API or cache
          const finalSourceLocation = sourceLocation || cachedSourceLocation;
          
          // Cache the sourceLocation if it exists
          if (sourceLocation) {
            chrome.storage.local.set({
              [cacheKey]: {
                sourceLocation,
                timestamp: Date.now()
              }
            });
          }
          
          const { sitesUrl, assetsUrl, configURL, packmgrUrl } = buildAuthorUrls(finalSourceLocation);

          // Always display publishing status with fresh data
          displayPublishingStatus(previewLastModified, liveLastModified, publishBy);
          
          // Display authoring links if we have valid URLs (from API or cache)
          if (sitesUrl) {
            displayAuthoringLinks(sitesUrl, assetsUrl, configURL, packmgrUrl);
          }
        })
        .catch((error) => {
          console.error('Error fetching lastModified:', error);
        });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

function buildAuthorUrls(sourceLocation) {
  if (!sourceLocation) {
    return { sitesUrl: '', assetsUrl: '' };
  }

  const match = sourceLocation.match(/markup:(https:\/\/[^/]+)/);
  if (!match || !match[1]) {
    return { sitesUrl: '', assetsUrl: '' };
  }

  const authorDomain = match[1];
  return {
    sitesUrl: `${authorDomain}/sites.html/content`,
    assetsUrl: `${authorDomain}/assets.html/content/dam`,
    packmgrUrl: `${authorDomain}/crx/packmgr/index.jsp`,
    configURL: `${authorDomain}/ui#/aem/libs/core/franklin/shell/content/configuration.html/conf`,
  };
}

function displayAuthoringLinks(sitesUrl, assetsUrl, configURL, packmgrUrl) {
  const authorLinksSection = document.querySelector('.authoring-links');
  authorLinksSection.style.display = 'block'; // Make the section visible

  // Update the Authoring Links section
  const sitesUrlElement = document.getElementById('sites-url');
  const assetsUrlElement = document.getElementById('assets-url');
  const configUrlElement = document.getElementById('config-url');
  const packmgrUrlElement = document.getElementById('packmgr-url');

  if (sitesUrlElement) {
    sitesUrlElement.innerHTML = `<a href="${sitesUrl}" target="_blank">🌐 Sites</a>`;
  }
  if (assetsUrlElement) {
    assetsUrlElement.innerHTML = `<a href="${assetsUrl}" target="_blank">🖼️ Assets</a>`;
  }
  if (configUrlElement) {
    configUrlElement.innerHTML = `<a href="${configURL}" target="_blank">⚙️ Config</a>`;
  }
  if (packmgrUrlElement) {
    packmgrUrlElement.innerHTML = `<a href="${packmgrUrl}" target="_blank">📦 PackMgr</a>`;
  }
}

function displayPublishingStatus(previewLastModified, liveLastModified, publishBy) {
  const publishingStatusSection = document.querySelector('.publishing-status');
  const publishByElement = document.querySelector('.publishing-status h2 span');
  if (publishByElement) {
    publishByElement.textContent = ` ${publishBy}`;
  }
  publishingStatusSection.style.display = 'block'; // Make the section visible

  const previewTimeElement = document.getElementById('preview-time');
  const liveTimeElement = document.getElementById('live-time');

  // Update the preview and live time elements
  if (previewTimeElement) {
    previewTimeElement.textContent = `📅 Preview: ${formatLastModified(previewLastModified)}`;
  }
  if (liveTimeElement) {
    liveTimeElement.textContent = `📅 Live: ${formatLastModified(liveLastModified)}`;
  }
}

function formatLastModified(lastModifiedString) {
  if (lastModifiedString === 'N/A' || lastModifiedString === 'Loading...') {
    return lastModifiedString;
  }

  const date = new Date(lastModifiedString);
  const now = new Date();
  const diffMs = now - date;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let timeAgo = '';

  if (seconds < 60) {
    timeAgo = 'just now';
  } else if (minutes < 60) {
    timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
  }

  // Format local date and time
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true, // for AM/PM
  };
  const localDateTime = date.toLocaleString(undefined, options);

  return `${timeAgo} (${localDateTime})`;
}

// 🔗 Helper to render links
function renderLinks(apiList, containerId, baseUrl) {
  const container = document.getElementById(containerId);
  container.innerHTML = ''; // Clear existing content
  apiList.forEach(api => {
    const fullUrl = baseUrl + api.path;

    const linkWrapper = document.createElement('div');
    linkWrapper.className = 'api-link';

    const openLink = document.createElement('a');
    openLink.href = fullUrl;
    openLink.target = '_blank';
    openLink.textContent = api.label;

    linkWrapper.appendChild(openLink);
    container.appendChild(linkWrapper);
  });
}

// 🔗 Helper to render links
function renderNormalLinks(apiList, containerId, baseUrl) {
  const container = document.getElementById(containerId);
  container.innerHTML = ''; // Clear existing content
  apiList.forEach(api => {
    const fullUrl = baseUrl + api.path;

    const openLink = document.createElement('a');
    openLink.href = fullUrl;
    openLink.target = '_blank';
    openLink.textContent = api.label;

    container.appendChild(openLink);
  });
}

// Show message if not AEM EDS
function showNotAemMessage() {
  const container = document.querySelector('.container');
  container.innerHTML = `
    <div style="padding: 20px; text-align: center; color: #7f8c8d;">
      <p style="font-size: 14px; margin: 0;">This page doesn't look like an AEM(EDS) site.</p>
    </div>
  `;
}
