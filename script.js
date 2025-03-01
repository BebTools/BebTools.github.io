const grid = document.querySelector('.grid');
let page = 1;

async function loadScripts() {
    const response = await fetch(`https://api.github.com/search/repositories?q=topic:bebtools&per_page=12&page=${page}`);
    const data = await response.json();
    const repos = data.items;

    for (const repo of repos) {
        const contents = await fetch(`https://api.github.com/repos/${repo.full_name}/contents`);
        const files = await contents.json();
        const scriptFolder = files.find(f => f.type === 'dir'); // First folder (e.g., "apple")
        if (scriptFolder) {
            const folderContents = await fetch(scriptFolder.url);
            const folderFiles = await folderContents.json();
            const pyFile = folderFiles.find(f => f.name.endsWith('.py'));
            const pngFile = folderFiles.find(f => f.name.endsWith('.png'));
            if (pyFile && pngFile) {
                grid.innerHTML += `
                    <div class="grid-box">
                        <img src="${pngFile.download_url}" alt="${scriptFolder.name}">
                        <div class="name">${scriptFolder.name}</div>
                        <div class="author">${repo.owner.login}</div>
                        <div class="stars">⭐ ${repo.stargazers_count}</div>
                    </div>
                `;
            }
        }
    }
    page++;
}

document.querySelector('.load-more').addEventListener('click', loadScripts);
loadScripts(); // Initial load