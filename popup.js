document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);

  // Extract org, site, ref from subdomain
  const [ref, site, org] = url.hostname.split('.')[0].split('--');
  const path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

  if (!org || !site) {
    showNotAemMessage();
    return;
  }

  const contextInfo = `${org} / ${site} / ${ref}`;
  document.getElementById('context').textContent = contextInfo;
  document.getElementById('path').textContent = path;

  const baseUrl = `https://admin.hlx.page`;

  // Fetch and display the lastModified value
  const statusApiUrl = `${baseUrl}/status/${org}/${site}/${ref}/${path}`;
  fetchLastModifiedWithCookie(statusApiUrl);

  // Define your API endpoints
  const contentApis = [
    { label: '📘 Status', path: `/status/${org}/${site}/${ref}/${path}` },
    { label: '📊 Index', path: `/index/${org}/${site}/${ref}/${path}` },
    { label: '🟢 Preview', path: `/preview/${org}/${site}/${ref}/${path}` },
    { label: '🧾 Code', path: `/code/${org}/${site}/${ref}/${path}` },
    { label: '🔵 Live', path: `/live/${org}/${site}/${ref}/${path}` },
    { label: '📜 Logs', path: `/log/${org}/${site}/${ref}` }
  ];

  const configApis = [
    { label: '🏢 Org', path: `/config/${org}.json` },
    { label: '🧩 Query', path: `/config/${org}/sites/${site}/content/query.yaml` },
    { label: '🗂 Site', path: `/config/${org}/sites/${site}.json` },
    { label: '🏛️ Public', path: `/config/${org}/sites/${site}/public.json` },
    { label: '🤖 Robots.txt', path: `/config/${org}/sites/${site}/robots.txt` },
    { label: '🗺 Sitemap', path: `/config/${org}/sites/${site}/content/sitemap.yaml` }
  ];

  // Render all sections
  renderLinks(contentApis, 'content-links', baseUrl);

  // Render Config APIs and SEO APIs in separate sections
  renderLinks(configApis, 'config-links', baseUrl); // Use a container specific to config APIs
});

// Fetch the lastModified value from the Status API with the necessary cookie
async function fetchLastModifiedWithCookie(apiUrl) {
  try {
    // Append the required query parameter
    const apiUrlWithQuery = `${apiUrl}?edit=auto`;

    // Get the cookie for the domain
    chrome.cookies.get({ url: 'https://admin.hlx.page', name: 'auth_token' }, (cookie) => {
      if (!cookie || !cookie.value) {
        console.error('Cookie not found');
        return; // Do not display the Publishing Status section
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
          const publishBy = data.profile?.email.split('@')[0] || 'N/A';

          const sourceLocation = data.live?.sourceLocation || '';
          const { sitesUrl, assetsUrl } = buildAuthorUrls(sourceLocation);

          console.log('Sites URL:', sitesUrl);
          console.log('Assets URL:', assetsUrl);

          // Only display the Publishing Status section if data is valid
          if (previewLastModified !== 'N/A' || liveLastModified !== 'N/A' || publishBy !== 'N/A') {
            displayPublishingStatus(previewLastModified, liveLastModified, publishBy, sitesUrl, assetsUrl);
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
    assetsUrl: `${authorDomain}/assets.html/content/dam`
  };
}

function displayPublishingStatus(previewLastModified, liveLastModified, publishBy, sitesUrl, assetsUrl) {
  const publishingStatusSection = document.querySelector('.publishing-status');
  const publishByElement = document.querySelector('.publishing-status h2 span');
  if (publishByElement) {
    publishByElement.textContent = ` : ${publishBy}`;
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

  // Update the Authoring Links section
  const sitesUrlElement = document.getElementById('sites-url');
  const assetsUrlElement = document.getElementById('assets-url');

  if (sitesUrlElement) {
    sitesUrlElement.innerHTML = `<a href="${sitesUrl}" target="_blank">🌐 Sites</a>`;
  }
  if (assetsUrlElement) {
    assetsUrlElement.innerHTML = `<a href="${assetsUrl}" target="_blank">🖼️ Assets</a>`;
  }
}

function formatLastModified(lastModifiedString) {
  if (lastModifiedString === 'N/A') {
    return 'N/A';
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

// Show message if not AEM EDS
function showNotAemMessage() {
  const container = document.querySelector('.container');
  container.innerHTML = `
    <div style="padding: 20px; text-align: center; color: #7f8c8d;">
      <p style="font-size: 14px; margin: 0;">This page doesn't look like an AEM(EDS) site.</p>
    </div>
  `;
}