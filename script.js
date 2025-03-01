const grid = document.querySelector('.grid');
const popup = document.querySelector('.popup');
const code = document.querySelector('.language-python');
const scriptName = document.querySelector('.script-name');
const author = document.querySelector('.author');
const stars = document.querySelector('.stars');
const popupText = document.querySelector('.popup-text');
let page = 1;

async function loadScripts() {
    console.log(`Loading page ${page}...`);
    try {
        const response = await fetch(`https://api.github.com/search/repositories?q=topic:bebtools&per_page=12&page=${page}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log(`Found ${data.items.length} repos on page ${page}`);
        const repos = data.items;

        if (repos.length === 0) {
            console.log('No more scripts to load.');
            document.querySelector('.load-more').style.display = 'none';
            return;
        }

        for (const repo of repos) {
            console.log(`Checking repo: ${repo.full_name}`);
            const contents = await fetch(`https://api.github.com/repos/${repo.full_name}/contents`);
            const files = await contents.json();
            console.log(`Root files/folders: ${files.map(f => f.name).join(', ')}`);
            const scriptFolder = files.find(f => f.type === 'dir');
            if (scriptFolder) {
                console.log(`Found folder: ${scriptFolder.name}`);
                const folderContents = await fetch(scriptFolder.url);
                const folderFiles = await folderContents.json();
                console.log(`Folder contents: ${folderFiles.map(f => f.name).join(', ')}`);
                const pyFile = folderFiles.find(f => f.name.endsWith('.py'));
                const txtFile = folderFiles.find(f => f.name.endsWith('.txt'));
                const pngFile = folderFiles.find(f => f.name.endsWith('.png'));
                if (pyFile && pngFile) {
                    console.log(`Rendering box for ${scriptFolder.name}`);
                    const box = document.createElement('div');
                    box.className = 'grid-box';
                    box.innerHTML = `
                        <img src="${pngFile.download_url}" alt="${scriptFolder.name}">
                        <div class="name">${scriptFolder.name}</div>
                        <div class="author">${repo.owner.login}</div>
                        <div class="stars">⭐ ${repo.stargazers_count}</div>
                    `;
                    box.dataset.pyUrl = pyFile.download_url;
                    box.dataset.txtUrl = txtFile ? txtFile.download_url : '';
                    box.dataset.name = scriptFolder.name;
                    box.dataset.author = repo.owner.login;
                    box.dataset.stars = repo.stargazers_count;
                    box.addEventListener('click', showPopup);
                    grid.appendChild(box);
                } else {
                    console.log(`No .py or .png in ${scriptFolder.name}`);
                }
            } else {
                console.log(`No folders found in ${repo.full_name}`);
            }
        }
        page++;
    } catch (error) {
        console.error('Error loading scripts:', error);
    }
}

async function showPopup(event) {
    const box = event.currentTarget;
    popup.style.display = 'flex';
    scriptName.textContent = box.dataset.name;
    author.textContent = box.dataset.author;
    stars.textContent = `⭐ ${box.dataset.stars}`;

    const pyText = await (await fetch(box.dataset.pyUrl)).text();
    code.innerHTML = pyText;
    Prism.highlightElement(code);
    const txtText = box.dataset.txtUrl ? await (await fetch(box.dataset.txtUrl)).text() : 'No description available.';
    popupText.textContent = txtText;

    document.querySelector('.download-btn').onclick = () => downloadZip(pyText, txtText, box.dataset.name);
    document.querySelector('.copy-btn').onclick = () => copyZip(pyText, txtText, box.dataset.name);
}

async function downloadZip(pyText, txtText, name) {
    const zip = new JSZip();
    zip.file(`${name}.py`, pyText);
    zip.file(`${name}.txt`, txtText);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}-script.zip`;
    a.click();
    URL.revokeObjectURL(url);
}

async function copyZip(pyText, txtText, name) {
    const zip = new JSZip();
    zip.file(`${name}.py`, pyText);
    zip.file(`${name}.txt`, txtText);
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    navigator.clipboard.writeText(url).then(() => alert('Copied to clipboard! Paste into Beb Tools.'));
}

document.querySelector('.close-btn').addEventListener('click', () => popup.style.display = 'none');
document.querySelector('.load-more').addEventListener('click', loadScripts);
loadScripts();