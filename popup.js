document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);

  // Extract org, site, ref from subdomain
  const [ref, site, org] = url.hostname.split('.')[0].split('--');
  const path = url.pathname;

  const contextInfo = `${org} / ${site} / ${ref}\nPath: ${path}`;
  document.getElementById('context').textContent = contextInfo;

  const baseUrl = `${url.protocol}//${url.hostname}`;

  // Define your API endpoints
  const contentApis = [
    { label: '📘 Status', path: `${path}.status.json` },
    { label: '🟢 Preview', path: `${path}.preview.json` },
    { label: '🔵 Live', path: `${path}.live.json` },
    { label: '🧾 Code', path: `${path}.code.json` },
    { label: '📊 Index', path: `${path}.index.json` },
    { label: '📜 Logs', path: `${path}.logs.json` }
  ];

  const configApis = [
    { label: '🗂 Site Config', path: `/conf/${site}/settings/site-config.json` },
    { label: '🧩 Query Config', path: `/conf/${site}/settings/query-config.json` },
    { label: '🌐 Sitemap Config', path: `/conf/${site}/settings/sitemap-config.json` },
    { label: '🏢 Org Config', path: `/conf/${site}/settings/org-config.json` }
  ];

  const seoApis = [
    { label: '🤖 Robots.txt', path: `/robots.txt` },
    { label: '🗺 Sitemap', path: `/sitemap.xml` }
  ];

  // Render all sections
  renderLinks(contentApis, 'content-links', baseUrl);
  renderLinks(configApis, 'config-links', baseUrl);
  renderLinks(seoApis, 'seo-links', baseUrl);
});

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

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.marginLeft = 'auto';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(fullUrl);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
    });

    linkWrapper.appendChild(openLink);
    linkWrapper.appendChild(copyBtn);
    container.appendChild(linkWrapper);
  });
}
