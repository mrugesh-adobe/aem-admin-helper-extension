document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = new URL(tab.url);

  // Extract org, site, ref from subdomain
  const [ref, site, org] = url.hostname.split('.')[0].split('--');
  const path = url.pathname;

  const contextInfo = `${org} / ${site} / ${ref}`;
  document.getElementById('context').textContent = contextInfo;
  document.getElementById('path').textContent = path;

  const baseUrl = `https://admin.hlx.page`;

  // Define your API endpoints
  const contentApis = [
    { label: '📘 Status', path: `/status/${org}/${site}/${ref}/${path}` },
    { label: '🟢 Preview', path: `/preview/${org}/${site}/${ref}/${path}` },
    { label: '🔵 Live', path: `/live/${org}/${site}/${ref}/${path}` },
    { label: '🧾 Code', path: `/code/${org}/${site}/${ref}/${path}` },
    { label: '📊 Index', path: `/index/${org}/${site}/${ref}/${path}` },
    { label: '📜 Logs', path: `/log/${org}/${site}/${ref}` }
  ];

  const configApis = [
    { label: '🏢 Org Config', path: `/config/${org}.json` },
    { label: '🗂 Site Config', path: `/config/${org}/sites/${site}.json` },
    { label: '🧩 Query Config', path: `/config/${org}/sites/${site}/content/query.yaml` },
  ];

  const seoApis = [
    { label: '🤖 Robots.txt', path: `/config/${org}/sites/${site}/robots.txt` },
    { label: '🗺 Sitemap', path: `/config/${org}/sites/${site}/content/sitemap.yaml` }
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
