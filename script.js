console.log('script.js loaded');

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = window.Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginBtn = document.getElementById('login-btn');
const grid = document.querySelector('.grid');
const loadMoreBtn = document.querySelector('.load-more');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const popup = document.querySelector('.popup');
const code = popup.querySelector('.language-python code');
const popupText = popup.querySelector('.popup-text');
const scriptName = popup.querySelector('.script-name');
const author = popup.querySelector('.author');
const stars = popup.querySelector('.stars');
const closeBtn = popup.querySelector('.close-btn');
let page = 1;

async function checkSession() {
    auth.checkSession((user) => auth.updateLoginDisplay(user, loginBtn));
}

loginBtn.addEventListener('click', async () => {
    const error = await auth.loginWithGitHub();
    if (error) console.error('Login error:', error);
});

async function fetchRepos(query = '') {
    try {
        grid.innerHTML = ''; // Clear current grid
        page = 1; // Reset page for new search
        const headers = auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {};
        let url = `https://api.github.com/search/repositories?q=topic:bebtools&sort=stars&order=desc&page=${page}&per_page=12`;
        if (query) {
            url = `https://api.github.com/search/repositories?q=topic:bebtools+${encodeURIComponent(query)}&sort=stars&order=desc&page=${page}&per_page=12`;
        }
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Failed to fetch repos');
        const data = await response.json();
        const filteredRepos = await filterReposByFolder(data.items, query);
        renderRepos(filteredRepos);
        loadMoreBtn.style.display = filteredRepos.length < 12 ? 'none' : 'block';
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

async function filterReposByFolder(repos, folderQuery) {
    if (!folderQuery) return repos; // No filter if query is empty
    const filtered = [];
    for (const repo of repos) {
        const contentsResponse = await fetch(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents`, {
            headers: auth.getToken() ? { 'Authorization': `token ${auth.getToken()}` } : {}
        });
        if (contentsResponse.ok) {
            const contents = await contentsResponse.json();
            if (contents.some(item => item.type === 'dir' && item.name.toLowerCase().includes(folderQuery.toLowerCase()))) {
                filtered.push(repo);
            }
        }
    }
    return filtered;
}

function renderRepos(repos) {
    repos.forEach(repo => {
        const folder = repo.name;
        const owner = repo.owner.login;
        const starsCount = repo.stargazers_count;
        const box = document.createElement('div');
        box.className = 'grid-box';
        box.innerHTML = `
            <img src="https://raw.githubusercontent.com/${owner}/${folder}/main/${folder}/${folder}.png" alt="${folder}">
            <div class="name">${folder}</div>
            <div class="author">${owner}</div>
            <div class="stars">⭐ ${starsCount}</div>
        `;
        box.addEventListener('click', () => showPopup(owner, folder, starsCount));
        grid.appendChild(box);
    });
}

async function showPopup(owner, folder, starsCount) {
    popup.style.display = 'flex';
    scriptName.textContent = folder;
    author.textContent = owner;
    stars.textContent = `⭐ ${starsCount}`;

    try {
        const pyResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${folder}/main/${folder}/${folder}.py`);
        code.textContent = await pyResponse.text();
        Prism.highlightElement(code);

        const txtResponse = await fetch(`https://raw.githubusercontent.com/${owner}/${folder}/main/${folder}/${folder}.txt`);
        popupText.textContent = await txtResponse.text();
    } catch (error) {
        console.error('Popup fetch error:', error);
    }
}

closeBtn.addEventListener('click', () => {
    popup.style.display = 'none';
    code.textContent = '';
    popupText.textContent = '';
});

loadMoreBtn.addEventListener('click', () => {
    page++;
    fetchRepos(searchInput.value.trim());
});

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    fetchRepos(query);
});

fetchRepos();
checkSession();