function score(x, y) {
    let start = 0;
    let numbreaks = 0;
    for (const c of y) {
        const ix = x.indexOf(c, start);
        if (ix == -1) {
            return -1;
        } else if (ix > start+1) {
            numbreaks += 1;
        }
        start = ix + 1;
    }
    if (start < x.length) {
        numbreaks += 1;
    }
    return numbreaks;
};

async function set_containers(div, text) {
    let containers = await browser.contextualIdentities.query({});

    div.innerHTML = '';
    div.innerText = '';

    if (text) {
        const cmp = (a, b) => a[0] != b[0] ? a[0]-b[0] : a[1]-b[1];
        containers = containers.map(c => [score(c.name.toLowerCase(), text), c.name.length, c]);
        containers = containers.filter(c => c[0] >= 0).sort(cmp);
        containers = containers.map(c => c[2]);
    }

    for (const [i, container] of containers.entries()) {
        const span = document.createElement('span');
        span.className = 'name';
        span.id = container.cookieStoreId;
        span.innerText = container.name;

        const url = container.iconUrl || "resource://usercontext-content/circle.svg";
        const color = container.colorCode || 'grey';
        const img = document.createElement('img');
        img.className = 'icon';
        img.style = `mask-image: url(${url}); background: ${color}`;

        const row = document.createElement('div');
        row.className = 'row';
        if (i == 0) {
            row.classList.add('current')
        }
        row.appendChild(img);
        row.appendChild(span);
        div.appendChild(row);
    }
}

function select_next() {
    const current = document.querySelector('.row.current');
    const next = current.nextElementSibling;
    if (current && next) {
        current.classList.remove('current');
        next.classList.add('current');
    }
}

function select_prev() {
    const current = document.querySelector('.row.current');
    const prev = current.previousElementSibling;
    if (current && prev) {
        current.classList.remove('current');
        prev.classList.add('current');
    }
}

const div = document.getElementById('containers');
div.innerHTML = '';
div.innerText = '';

const input = document.getElementById('search');
input.focus();
setTimeout(() => input.focus(), 100);
window.addEventListener('blur', event => window.close());

if (browser.contextualIdentities === undefined) {
    div.innerText = 'browser.contextualIdentities not available. Check that the privacy.userContext.enabled pref is set to true, and reload the add-on.';

} else {
    input.addEventListener("input", event => {
        set_containers(div, input.value.trim().toLowerCase());
    });

    input.addEventListener('keydown', event => {
        if (event.key == 'Enter') {
            const node = document.querySelector('.row.current .name');
            if (node) {
                (async() => {
                    const tabs = await browser.tabs.query({ currentWindow: true, active: true });
                    await browser.tabs.create({cookieStoreId: node.id, index: tabs[0].index+1, active: true});
                    window.close();
                })();
            }
        } else if (event.key == 'Tab') {
            if (event.shiftKey) {
                select_prev();
            } else {
                select_next();
            }
        } else if (event.key == 'ArrowDown') {
            select_next();
        } else if (event.key == 'ArrowUp') {
            select_prev();
        } else {
            return;
        }
        event.preventDefault();
    });

    set_containers(div);
}
