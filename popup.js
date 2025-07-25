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

        const icon = document.createElement('div');
        icon.className = 'icon';

        const url = container.iconUrl || "resource://usercontext-content/circle.svg";
        const color = container.colorCode || 'grey';
        const img = document.createElement('img');
        img.style = `mask-image: url(${url}); background: ${color}`;
        icon.appendChild(img);

        const delete_icon = document.createElement('span');
        delete_icon.className = 'delete-icon';
        delete_icon.innerText = '❌';
        icon.appendChild(delete_icon);

        const row = document.createElement('div');
        row.className = 'row';
        if (i == 0) {
            row.classList.add('current')
        }
        row.appendChild(icon);
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

async function open_new_tab(cookieStoreId) {
    const tabs = await browser.tabs.query({ currentWindow: true, active: true });
    await browser.tabs.create({cookieStoreId, index: tabs[0].index+1, active: true});
    window.close();
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

    let delete_mode = false;

    input.addEventListener('keyup', event => {
        if (event.key == 'Shift' || event.key == 'Control') {
            div.classList.remove('delete-mode');
        }
    });

    input.addEventListener('keydown', event => {
        if ((event.key == 'Shift' && event.ctrlKey) || (event.key == 'Control' && event.shiftKey)) {
            div.classList.add('delete-mode');
        }

        if (event.key == 'Enter') {
            if (event.shiftKey) {
                // make a new container
                (async() => {
                    let container = (await browser.contextualIdentities.query({name: input.value}))?.cookieStoreId;

                    if (!container) {
                        const icons = [ "fingerprint", "briefcase", "dollar", "cart", "circle", "gift", "vacation", "food", "fruit", "pet", "tree", "chill", "fence" ];
                        const colors = [ "blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple", "toolbar" ];
                        const icon = icons[Math.floor(Math.random() * icons.length)];
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        container = (await browser.contextualIdentities.create({icon, color, name: input.value})).cookieStoreId;
                    }
                    await open_new_tab(container);
                })();
            } else {
                const node = document.querySelector('.row.current .name');
                if (node) {
                    open_new_tab(node.id);
                }
            }

        } else if (event.key == 'Backspace' && event.shiftKey && event.ctrlKey) {
            const node = document.querySelector('.row.current .name');
            if (node) {
                // delete
                (async() => {
                    await browser.contextualIdentities.remove(node.id);
                    // refresh
                    await set_containers(div, input.value.trim().toLowerCase());
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
