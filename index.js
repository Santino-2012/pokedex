const TOTAL = 1025;
const PAGE_SIZE = 50;
let nextId = 1;

const pokedexEl = document.getElementById('pokedex');
const loadMoreBtn = document.getElementById('loadMore');
const loadAllBtn = document.getElementById('loadAll');
const searchInput = document.getElementById('search');
const statusEl = document.getElementById('status');
const megaToggle = document.getElementById('megaToggle');

let showMegas = true;

function updateStatus(loaded){
    statusEl.textContent = `${loaded} / ${TOTAL} carregados`;
}

function createCard(p){
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.name = p.name;
    card.dataset.id = p.id;

    if(p.isMega) card.classList.add('mega');

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = p.name;
    const localPath = `images/${String(p.id).padStart(3,'0')}.png`;
    img.src = localPath;
    img.onerror = () => {
        img.onerror = null;
        img.src = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    };
    img.dataset.originalSrc = img.src;

    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'img-wrap';
    imgWrapper.appendChild(img);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = p.name[0].toUpperCase() + p.name.slice(1);

    if(p.isMega){
        const badge = document.createElement('div');
        badge.className = 'badge';
        badge.textContent = 'Mega';
        title.appendChild(badge);
    }

    const idEl = document.createElement('div');
    idEl.className = 'id';
    idEl.textContent = `#${String(p.id).padStart(3,'0')}`;

    const typesEl = document.createElement('div');
    typesEl.className = 'types';
    p.types.forEach(t =>{
        const span = document.createElement('span');
        const typeName = t.type.name;
        span.className = `type type-${typeName}`;
        span.textContent = typeName[0].toUpperCase() + typeName.slice(1);
        typesEl.appendChild(span);
    });

    card.appendChild(imgWrapper);
    card.appendChild(title);
    card.appendChild(idEl);
    card.appendChild(typesEl);

    return card;
}

async function fetchPokemon(idOrName){
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`);
    if(!res.ok) throw new Error('fetch error');
    return res.json();
}

async function fetchBatch(){
    const start = nextId;
    if(start > TOTAL) return 0;
    const end = Math.min(nextId + PAGE_SIZE - 1, TOTAL);
    const ids = [];
    for(let i=start;i<=end;i++) ids.push(i);
    nextId = end + 1;

    const promises = ids.map(id => fetchPokemon(id).catch(err => null));
    const results = await Promise.all(promises);
    let added = 0;
    for(const r of results){
        if(r){
            const card = createCard(r);
            pokedexEl.appendChild(card);
            added++;

            if(showMegas){
                // buscar espécies para variedades (varieties pode incluir formas 'mega')
                try{
                    const sres = await fetch(r.species.url);
                    if(sres.ok){
                        const species = await sres.json();
                        if(species && species.varieties){
                            for(const v of species.varieties){
                                const name = v.pokemon.name;
                                if(name.includes('mega')){
                                    try{
                                        const mega = await fetchPokemon(name);
                                        mega.isMega = true;
                                        const mcard = createCard(mega);
                                        pokedexEl.appendChild(mcard);
                                    }catch(e){ /* ignore */ }
                                }
                            }
                        }
                    }
                }catch(e){ /* ignore */ }
            }
        }
    }

    updateStatus(pokedexEl.children.length);
    if(nextId > TOTAL) loadMoreBtn.disabled = true;
    return added;
}

loadMoreBtn.addEventListener('click', async ()=>{
    loadMoreBtn.disabled = true;
    await fetchBatch();
    loadMoreBtn.disabled = false;
});

loadAllBtn.addEventListener('click', async ()=>{
    loadAllBtn.disabled = true;
    loadMoreBtn.disabled = true;
    while(nextId <= TOTAL){
        await fetchBatch();
        // small pause so UI stays responsive
        await new Promise(r => setTimeout(r, 200));
    }
    loadAllBtn.disabled = false;
});

searchInput.addEventListener('input', ()=>{
    const q = searchInput.value.trim().toLowerCase();
    Array.from(pokedexEl.children).forEach(card =>{
        const name = (card.dataset.name||'').toLowerCase();
        const id = card.dataset.id;
        if(!q || name.includes(q) || id === q.replace(/^#?/,'') ){
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
});

megaToggle.addEventListener('change', ()=>{
    showMegas = megaToggle.checked;
});

// inicial
(async function init(){
    updateStatus(0);
    await fetchBatch();
})();
