/**
 * Catálogo de Ventas de Computación - App Logic
 */

// --- DB Module (localStorage) ---
const DB = {
    keys: {
        products: 'techstore_products',
        clients: 'techstore_clients',
        repairs: 'techstore_repairs',
        services: 'techstore_services',
        config: 'techstore_config',
        categories: 'techstore_categories',
        repairStatus: 'techstore_repairstatus'
    },
    
    _cache: {},

    _persist(key, value) {
        try {
            localStorage.setItem(this.keys[key], JSON.stringify(value));
        } catch (e) {
            console.warn(`No se pudo guardar "${key}" en localStorage (cuota excedida). Se mantiene en memoria.`);
        }
    },

    utils: {
        debounce(fn, delay) {
            let timeout;
            return (...args) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => fn(...args), delay);
            };
        }
    },
    
    async init() {
        // Forzar limpieza de localStorage si cambia versión (para migraciones)
        const APP_VERSION = 6;
        const storedVersion = parseInt(localStorage.getItem('techstore_version') || '0', 10);
        if (storedVersion < APP_VERSION) {
            Object.values(this.keys).forEach(k => localStorage.removeItem(k));
            localStorage.setItem('techstore_version', String(APP_VERSION));
        }
        try {
            // Try via API proxy first (local server mode)
            const res = await fetch('/api/web-data'); 
            if (res.ok) {
                const data = await res.json();
                Object.keys(this.keys).forEach(key => {
                    if (data[key]) {
                        this._cache[key] = data[key];
                        this._persist(key, data[key]);
                    }
                });
                return;
            }
        } catch (e) {
            console.log("API not available, trying data.json...");
        }

        // Fallback: load data.json directly (GitHub Pages / static mode)
        // Relativo al documento: en Project Pages (/repo/) el fetch absoluto
        // '/data.json' resolvería al root del dominio y daría 404.
        try {
            const res = await fetch('data.json?t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                Object.keys(this.keys).forEach(key => {
                    if (data[key]) {
                        this._cache[key] = data[key];
                        this._persist(key, data[key]);
                    }
                });
                return;
            }
        } catch (e) {
            console.log("data.json not available, using defaults.");
        }

        // Cargar defaults si no hay nada en localStorage
        Object.keys(this.keys).forEach(key => {
            if (!localStorage.getItem(this.keys[key])) {
                const defaultKey = 'default' + key.charAt(0).toUpperCase() + key.slice(1);
                if (this[defaultKey]) {
                    localStorage.setItem(this.keys[key], JSON.stringify(this[defaultKey]));
                }
            }
        });
    },

    get(key) {
        if (this._cache[key]) return this._cache[key];
        const raw = localStorage.getItem(this.keys[key]);
        const data = raw ? JSON.parse(raw) : [];
        this._cache[key] = data;
        if (key === 'categories' && Array.isArray(data)) {
            return data.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        }
        return data;
    },

    set(key, data, sync = true) {
        this._cache[key] = data;
        localStorage.setItem(this.keys[key], JSON.stringify(data));
    },

    add(key, item, sync = true) {
        const data = this.get(key);
        item.id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
        data.push(item);
        this.set(key, data, sync);
        return item;
    },

    update(key, id, updatedItem, sync = true) {
        const data = this.get(key);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updatedItem };
            this.set(key, data, sync);
        }
    },

    delete(key, id, sync = true) {
        const items = this.get(key).filter(item => item.id != id);
        this.set(key, items, sync);
    },

    getConfig() {
        if (this._cache.config) return this._cache.config;
        const raw = localStorage.getItem(this.keys.config);
        const stored = raw ? JSON.parse(raw) : null;
        const config = stored ? { ...this.defaultConfig, ...stored } : this.defaultConfig;
        this._cache.config = config;
        return config;
    },

    setConfig(config, sync = true) {
        this._cache.config = config;
        localStorage.setItem(this.keys.config, JSON.stringify(config));
    },

    exportData() {
        const data = {
            products: this.get('products'),
            clients: this.get('clients'),
            repairs: this.get('repairs'),
            services: this.get('services'),
            config: this.getConfig(),
            categories: this.get('categories')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `techstore_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.products) this.set('products', data.products);
            if (data.clients) this.set('clients', data.clients);
            if (data.repairs) this.set('repairs', data.repairs);
            if (data.services) this.set('services', data.services);
            if (data.config) this.setConfig(data.config);
            if (data.categories) this.set('categories', data.categories);
            return true;
        } catch (e) {
            console.error('Error importing data:', e);
            return false;
        }
    },

    // Sample Data
    defaultConfig: {
        currency: 'ARS',
        companyName: 'TechStore Computación',
        address: 'Av. Corrientes 1234, CABA',
        phone: '011-1234-5678',
        email: 'contacto@techstore.com',
        whatsapp: '5491100000000',
        hours: 'Lun a Vie 9:00 a 18:00 - Sáb 10:00 a 14:00',
        instagram: 'https://instagram.com/techstore',
        facebook: 'https://facebook.com/techstore',
        popupActive: false,
        popupImage: '',
        popupDuration: 10,
        popupText: '',
        popupDelay: 1,
        popupAlways: false,
        homeProductLimit: 20,
        homeRandomOrder: false,
        googleAnalyticsId: '', // ID de seguimiento (G-XXXXXXXXXX)
        gtmId: '',             // ID de Tag Manager (GTM-XXXXXXX)
        siteTitle: '',         // Título personalizado para SEO
        siteDescription: '',   // Descripción personalizada para SEO
        banners: [],            // Banners rotativos del carrousel
        repairsEnabled: true,  // Mostrar link/ruta de Reparaciones (Full lo publica en false)
        themeId: 'tecnologia'  // Tema visual por rubro (web/themes/<id>.json)
    },
    defaultCategories: [
        { id: '1', name: 'Notebooks' },
        { id: '2', name: 'PCs de Escritorio' },
        { id: '3', name: 'Periféricos' },
        { id: '4', name: 'Componentes' },
        { id: '5', name: 'Accesorios' }
    ],
    defaultProducts: [
        { id: '1', name: 'Notebook Gamer Pro 15"', category: 'Notebooks', price: 1200000, desc: 'Intel Core i7 12th Gen, RTX 3060, 16GB RAM, 512GB SSD NVMe. Ideal para gaming y diseño.', image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=500&q=60', oferta: true, oldPrice: 1400000 },
        { id: '2', name: 'PC Oficina Basic', category: 'PCs de Escritorio', price: 450000, desc: 'Intel Core i3, 8GB RAM, 240GB SSD. Incluye teclado y mouse. Perfecta para tareas de oficina.', image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?auto=format&fit=crop&w=500&q=60', oferta: false },
        { id: '3', name: 'Monitor LED 24" IPS', category: 'Periféricos', price: 180000, desc: 'Monitor Full HD 1080p, panel IPS, 75Hz, HDMI y VGA. Bordes ultra finos.', image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=500&q=60', oferta: true, oldPrice: 210000 },
        { id: '4', name: 'Teclado Mecánico RGB', category: 'Periféricos', price: 65000, desc: 'Switches Blue, retroiluminación RGB personalizable, formato TKL.', image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=500&q=60', oferta: false },
        { id: '5', name: 'Mouse Gamer 10000 DPI', category: 'Periféricos', price: 35000, desc: 'Sensor óptico de alta precisión, 6 botones programables, iluminación RGB.', image: 'https://images.unsplash.com/photo-1527814050087-379381547969?auto=format&fit=crop&w=500&q=60', oferta: false },
        { id: '6', name: 'Placa de Video RTX 4060', category: 'Componentes', price: 550000, desc: 'NVIDIA GeForce RTX 4060 8GB GDDR6. Rendimiento extremo.', image: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=500&q=60', oferta: false },
        { id: '7', name: 'Memoria RAM 16GB DDR4', category: 'Componentes', price: 48000, desc: 'Módulo de 16GB 3200MHz con disipador.', image: 'https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=500&q=60', oferta: true, oldPrice: 55000 },
        { id: '8', name: 'SSD NVMe 1TB', category: 'Componentes', price: 85000, desc: 'Disco de estado sólido M.2 NVMe PCIe Gen3. Velocidad de lectura hasta 3500MB/s.', image: 'https://images.unsplash.com/photo-1597849021876-25807dd3b3c1?auto=format&fit=crop&w=500&q=60', oferta: false },
        { id: '9', name: 'Auriculares Inalámbricos', category: 'Accesorios', price: 75000, desc: 'Conectividad Bluetooth 5.0, sonido envolvente, micrófono incorporado.', image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=500&q=60', oferta: false },
        { id: '10', name: 'Impresora Multifunción', category: 'Periféricos', price: 210000, desc: 'Imprime, escanea y copia. Conectividad WiFi.', image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=500&q=60', oferta: false }
    ],
    defaultClients: [
        { id: '1', name: 'Juan Pérez', phone: '1122334455', email: 'juan@email.com', address: 'Calle Falsa 123' },
        { id: '2', name: 'María Gómez', phone: '1199887766', email: 'maria@email.com', address: 'Avenida Siempreviva 742' }
    ],
    defaultRepairs: [],
    defaultServices: [
        { id: 'S-001', name: 'Limpieza y Mantenimiento', desc: 'Limpieza interna completa, cambio de pasta térmica y optimización básica del sistema.', price: 25000, icon: 'ph-broom' },
        { id: 'S-002', name: 'Instalación de Sistema Operativo', desc: 'Formateo, instalación de Windows, drivers esenciales y programas básicos.', price: 35000, icon: 'ph-windows-logo' },
        { id: 'S-003', name: 'Armado a Medida', desc: 'Ensamblaje profesional de PC con gestión de cables y pruebas de estrés.', price: 50000, icon: 'ph-wrench' }
    ]
};

// --- WhatsApp Integration ---
const WA = {
    formatNumber(num) {
        return num.replace(/\D/g, '');
    },
    
    openProduct(productName) {
        const config = DB.getConfig();
        if (!config.whatsapp) return;
        const msg = encodeURIComponent(`Hola, quisiera consultar sobre el producto: ${productName}`);
        window.open(`https://wa.me/${this.formatNumber(config.whatsapp)}?text=${msg}`, '_blank');
    },

    openService(serviceName) {
        const config = DB.getConfig();
        if (!config.whatsapp) return;
        const msg = encodeURIComponent(`Hola, quisiera consultar sobre el servicio: ${serviceName}`);
        window.open(`https://wa.me/${this.formatNumber(config.whatsapp)}?text=${msg}`, '_blank');
    },
    
    openGeneral() {
        const config = DB.getConfig();
        if (!config.whatsapp) return;
        const msg = encodeURIComponent(`Hola, quisiera hacer una consulta.`);
        window.open(`https://wa.me/${this.formatNumber(config.whatsapp)}?text=${msg}`, '_blank');
    },

    sendRepairDetails(clientName, clientPhone, code, equipment) {
        if (!clientPhone) return;
        const config = DB.getConfig();
        const msg = encodeURIComponent(`Hola ${clientName}! ðŸ‘‹\n\nRegistramos tu equipo *${equipment}* para reparación.\n\nPuedes seguir el estado desde nuestra web con esta clave:\n\n*${code}*\n\nGracias por confiar en *${config.companyName}*!`);
        window.open(`https://wa.me/${this.formatNumber(clientPhone)}?text=${msg}`, '_blank');
    },

    updateFloatingButton() {
        const config = DB.getConfig();
        const btn = document.getElementById('floating-wa');
        if (config.whatsapp) {
            btn.style.display = 'flex';
            btn.onclick = (e) => {
                e.preventDefault();
                this.openGeneral();
            };
        } else {
            btn.style.display = 'none';
        }
    }
};

// --- Modal System ---
const Modal = {
    overlay: document.getElementById('modal-base'),
    content: document.getElementById('modal-content'),
    
    open(html, type = '') {
        this.overlay.className = 'modal-overlay ' + type;
        this.content.className = 'modal-content glass ' + (type.includes('success') ? 'success-top' : '');
        this.content.innerHTML = html;
        this.overlay.classList.add('active');
    },
    
    close() {
        this.overlay.classList.remove('active');
        this.overlay.className = 'modal-overlay';
        this.content.className = 'modal-content glass';
    }
};

// Close modal on click outside
document.getElementById('modal-base').addEventListener('click', (e) => {
    if (e.target.id === 'modal-base') Modal.close();
});

// --- Toast System ---
const Toast = {
    container: document.getElementById('toast-container'),
    icon: document.getElementById('toast-icon'),
    message: document.getElementById('toast-message'),
    timeout: null,

    show(msg, type = 'info', duration = 4000) {
        if (this.timeout) clearTimeout(this.timeout);
        
        this.message.textContent = msg;
        this.container.className = 'toast-notification active ' + type;
        
        // Set Icon
        if (type === 'success') this.icon.className = 'ph ph-check-circle';
        else if (type === 'error') this.icon.className = 'ph ph-warning-circle';
        else if (type === 'warning') this.icon.className = 'ph ph-warning';
        else if (type === 'sync') this.icon.className = 'ph ph-spinner-gap anim-spin';
        else this.icon.className = 'ph ph-info';

        this.timeout = setTimeout(() => {
            this.container.classList.remove('active');
        }, duration);
    }
};

// --- Status Bar System ---
const StatusBar = {
    update() {
        const bar = document.getElementById('admin-status-bar');
        if (!bar) return;
        
        const products = DB.get('products');
        const lastSync = localStorage.getItem('last_github_sync') || 'Nunca';
        
        bar.innerHTML = `
            <div class="status-item">
                <span class="status-dot ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'online' : 'offline'}"></span>
                <strong>Servidor Local:</strong> ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Conectado' : 'Sin Conexión'}
            </div>
            <div class="status-item">
                <i class="ph ph-package"></i>
                <strong>Productos en disco:</strong> ${products.length}
            </div>
            <div class="status-item">
                <i class="ph ph-cloud-check"></i>
                <strong>Último Sync GitHub:</strong> ${lastSync}
            </div>
        `;
    }
};

const CURRENCIES = {
    ARS: { label: 'Peso argentino (ARS $)', locale: 'es-AR', decimals: 0 },
    USD: { label: 'Dólar estadounidense (USD $)', locale: 'en-US', decimals: 2 },
    MXN: { label: 'Peso mexicano (MXN $)', locale: 'es-MX', decimals: 2 },
    CLP: { label: 'Peso chileno (CLP $)', locale: 'es-CL', decimals: 0 },
    COP: { label: 'Peso colombiano (COP $)', locale: 'es-CO', decimals: 0 },
    PEN: { label: 'Sol peruano (PEN S/)', locale: 'es-PE', decimals: 2 },
    UYU: { label: 'Peso uruguayo (UYU $)', locale: 'es-UY', decimals: 2 },
    PYG: { label: 'Guaraní paraguayo (PYG ₲)', locale: 'es-PY', decimals: 0 },
    BOB: { label: 'Boliviano (BOB Bs.)', locale: 'es-BO', decimals: 2 },
    BRL: { label: 'Real brasileño (BRL R$)', locale: 'pt-BR', decimals: 2 }
};
const currencyOf = (config) => {
    const code = config && typeof config.currency === 'string' ? config.currency.toUpperCase() : 'ARS';
    return CURRENCIES[code] ? code : 'ARS';
};
const currencyOptions = (selected) => {
    const cur = currencyOf({ currency: selected });
    return Object.keys(CURRENCIES).map((code) =>
        `<option value="${code}"${code === cur ? ' selected' : ''}>${CURRENCIES[code].label}</option>`
    ).join('');
};
const formatMoney = (amount) => {
    const code = currencyOf(DB.getConfig());
    const c = CURRENCIES[code];
    return new Intl.NumberFormat(c.locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: c.decimals,
        maximumFractionDigits: c.decimals
    }).format(amount);
};
// Precio de oferta válido: sólo si el artículo está en oferta y el precio
// promocional es mayor a 0 y menor al precio normal.
const productOfferPrice = (p) => {
    const price = Number(p && p.price) || 0;
    const offer = Number(p && p.ofertaPrice) || 0;
    return (p && p.oferta && offer > 0 && offer < price) ? offer : 0;
};
const effectivePrice = (p) => {
    const offer = productOfferPrice(p);
    return offer > 0 ? offer : (Number(p && p.price) || 0);
};

// --- Stats Module (Visits Counter) ---
const Stats = {
    async increment() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
        try { await fetch('/api/visits/increment', { method: 'POST' }); } catch {}
    },

    async getHits() {
        try {
            const res = await fetch('/api/visits/stats');
            const data = await res.json();
            return data.total || 0;
        } catch { return '---'; }
    }
};

// --- Temas visuales por rubro (solo apariencia; la lógica no cambia) ---
const Theme = {
    id: 'tecnologia',
    data: null,
    async apply() {
        let id = 'tecnologia';
        try {
            const q = new URLSearchParams(window.location.search).get('theme');
            const cfg = DB.getConfig();
            id = (q || cfg.themeId || 'tecnologia');
        } catch { id = 'tecnologia'; }
        this.id = id;
        try { document.body.dataset.theme = id; } catch {}
        try {
            const res = await fetch('themes/' + encodeURIComponent(id) + '.json');
            if (!res.ok) return null;
            const t = await res.json();
            this.data = t;
            const root = document.documentElement;
            const vars = (t && t.vars) || {};
            for (const k of Object.keys(vars)) {
                if (/^--[a-z0-9-]+$/i.test(k)) root.style.setProperty(k, String(vars[k]));
            }
            if (t.font) {
                try {
                    root.style.setProperty('--font-main', `'${String(t.font).replace(/['"]/g, '')}', system-ui, sans-serif`);
                    const href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(String(t.font)).replace(/%20/g, '+') + ':wght@300;400;500;600;700&display=swap';
                    let link = document.getElementById('theme-font');
                    if (!link) { link = document.createElement('link'); link.id = 'theme-font'; link.rel = 'stylesheet'; document.head.appendChild(link); }
                    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
                } catch {}
            }
            const layout = (t && t.layout) || {};
            const ds = document.body.dataset;
            if (layout.sidebar) ds.sidebar = layout.sidebar;
            if (layout.carousel) ds.carousel = layout.carousel;
            if (layout.footer) ds.footer = layout.footer;
            if (layout.offers) ds.offers = layout.offers;
            try { localStorage.setItem('techstore_theme', JSON.stringify({ id, at: Date.now() })); } catch {}
            return t;
        } catch { return null; }
    },
};

// --- UI Helpers ---
const UI = {
    updateConfig() {
        const config = DB.getConfig();
        // Actualizar título de la ventana
        document.title = config.companyName || 'Catálogo de Ventas';
        // Actualizar el logo en la barra de navegación
        const brand = document.querySelector('.nav-brand');
        if (brand) {
            brand.innerHTML = `<i class="ph ph-cpu"></i> ${esc(config.companyName)}`;
        }
        // Reparaciones: ocultar link público si la edición lo deshabilita (Full)
        if (config.repairsEnabled === false) {
            document.querySelectorAll('a[data-route="/reparaciones"]').forEach(a => { a.style.display = 'none'; });
        }
        // Ofertas: ocultar link público si el tema lo deshabilita
        if (document.body.dataset.offers === 'off') {
            document.querySelectorAll('a[data-route="/ofertas"]').forEach(a => { a.style.display = 'none'; });
        }
        
        // Actualizar Footer
        const footerTitle = document.getElementById('footer-company-name-title');
        if (footerTitle) footerTitle.textContent = config.companyName;
        
        const footerAddress = document.querySelector('#footer-address span');
        if (footerAddress) footerAddress.textContent = config.address;
        
        const footerPhone = document.querySelector('#footer-phone span');
        if (footerPhone) footerPhone.textContent = config.phone;
        
        const footerEmail = document.querySelector('#footer-email span');
        if (footerEmail) footerEmail.textContent = config.email;
        
        const footerHours = document.querySelector('#footer-hours span');
        if (footerHours) footerHours.textContent = config.hours;
        
        const footerIG = document.getElementById('footer-ig');
        if (footerIG) footerIG.href = config.instagram || '#';
        
        const footerFB = document.getElementById('footer-fb');
        if (footerFB) footerFB.href = config.facebook || '#';
        
        const footerBottom = document.getElementById('footer-company-name-bottom');
        if (footerBottom) footerBottom.textContent = config.companyName;

        const footerYear = document.getElementById('footer-year');
        if (footerYear) footerYear.textContent = new Date().getFullYear();

        // --- SEO & Meta Tags ---
        if (config.siteTitle) {
            document.title = config.siteTitle;
        }
        
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        if (config.siteDescription) {
            metaDesc.setAttribute('content', config.siteDescription);
        }

        // --- Metrics (GTM & GA4) ---
        if (typeof window.initMetrics === 'function') {
            window.initMetrics(config.gtmId, config.googleAnalyticsId);
        }

        // Inject GTM Noscript if needed
        const noscriptContainer = document.getElementById('gtm-noscript-container');
        if (noscriptContainer && config.gtmId && !noscriptContainer.innerHTML) {
            noscriptContainer.innerHTML = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${config.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
        }
    }
};

// --- Pages Renderers ---
const Pages = {
    app: document.getElementById('app'),
    currentRepairsSort: 'date-desc',

    renderCatalog(filterOfertas = false, highlightId = null) {
        const allProducts = DB.get('products');
        const config = DB.getConfig();
        let products = filterOfertas ? allProducts.filter(p => p.oferta) : allProducts;
        
        // Aplicar orden aleatorio si está activo y no hay filtros/búsqueda previa
        if (config.homeRandomOrder && !filterOfertas && !highlightId) {
            products = [...products].sort(() => Math.random() - 0.5);
        }

        // Aplicar límite si está configurado y no hay highlightId
        if (config.homeProductLimit && config.homeProductLimit > 0 && !filterOfertas && !highlightId) {
            products = products.slice(0, config.homeProductLimit);
        }

        const categories = DB.get('categories');

        // Si viene un highlightId, nos aseguramos de que el producto esté en la lista (incluso si no es oferta)
        if (highlightId) {
            const highlightedProduct = allProducts.find(p => p.id === highlightId);
            if (highlightedProduct && !products.find(p => p.id === highlightId)) {
                products = [highlightedProduct, ...products];
            }
        }

        const title = filterOfertas ? 'Ofertas Destacadas' : 'Catálogo de Productos';

        let html = `
            ${filterOfertas ? `<h1>${title}</h1>` : ''}
            
            <div class="filter-bar glass">
                <div class="filter-bar-content">
                    <div class="search-container" style="flex: 1;">
                        <i class="ph ph-magnifying-glass search-icon"></i>
                        <input type="text" id="search-input" class="form-control search-input" placeholder="Buscar productos...">
                    </div>
                    <div class="sort-container">
                        <select id="sort-select" class="form-control" style="width: 200px;">
                            <option value="none">Ordenar por...</option>
                            <option value="price-asc">Menor precio</option>
                            <option value="price-desc">Mayor precio</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="catalog-layout">
                <aside class="catalog-sidebar glass">
                    <h3 class="sidebar-title">Categorías</h3>
                    <ul class="category-list">
                        ${categories.map((cat, i) => `<li class="category-item${i === 0 ? ' active' : ''}" data-category="${esc(cat.name)}">${esc(cat.name)}</li>`).join('')}
                    </ul>
                </aside>
                <div class="catalog-main">
                    <div class="product-grid" id="product-grid">
                        ${this._generateProductCards(products, highlightId)}
                    </div>
                </div>
            </div>
        `;
        this.app.innerHTML = html;

        // Si hay un ID para resaltar, scrollear hasta él
        if (highlightId) {
            setTimeout(() => {
                const element = document.querySelector(`.product-card[data-id="${(window.CSS && CSS.escape) ? CSS.escape(highlightId) : String(highlightId).replace(/"/g, '\\"')}"]`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('highlight-pulse');
                }
            }, 500);
        }

        // Mostrar Popup si está activo
        const shouldShowPopup = config.popupActive && (config.popupImage || config.popupText);
        const alreadyShown = sessionStorage.getItem('popupShown');

        if (shouldShowPopup && (config.popupAlways || !alreadyShown)) {
            setTimeout(() => {
                Modal.open(`
                    <div class="modal-header" style="justify-content: center; position: relative;">
                        <h3 style="margin: 0;">Aviso Importante</h3>
                        <button class="modal-close" onclick="Modal.close()" style="position: absolute; right: 0;"><i class="ph ph-x"></i></button>
                    </div>
                    <div style="text-align: center;">
                        ${config.popupText ? `<div style="margin-bottom: 1.5rem; font-size: 1.1rem; line-height: 1.6; color: var(--text-main);">${esc(config.popupText).replace(/\n/g, '<br>')}</div>` : ''}
                        ${config.popupImage ? `<img src="${esc(config.popupImage)}" style="max-width: 100%; border-radius: 0.5rem; box-shadow: var(--shadow-lg);">` : ''}
                    </div>
                    <div style="display: flex; justify-content: center; width: 100%;">
                        <button class="btn btn-primary mt-4" style="min-width: 200px;" onclick="Modal.close()">Entendido</button>
                    </div>
                `);
                sessionStorage.setItem('popupShown', 'true');
                
                // Auto-cerrar según la duración configurada
                if (config.popupDuration && config.popupDuration > 0) {
                    setTimeout(() => {
                        Modal.close();
                    }, config.popupDuration * 1000);
                }
            }, (config.popupDelay || 1) * 1000);
        }

        const updateGrid = () => {
            const query = document.getElementById('search-input').value.trim().toLowerCase();
            const activeCat = document.querySelector('.category-item.active').dataset.category;
            
            let filtered = filterOfertas ? allProducts.filter(p => p.oferta) : allProducts;
            
            // Only filter by category if there is no active search query
            if (!query) {
                filtered = filtered.filter(p => p.category === activeCat);
            }
            
            if (query) {
                const queryWords = query.split(/\s+/);
                filtered = filtered.filter(p => {
                    const name = (p.name || "").toLowerCase();
                    const desc = (p.desc || "").toLowerCase();
                    const combined = name + " " + desc;
                    return queryWords.every(word => combined.includes(word));
                });
            }

            const sort = document.getElementById('sort-select').value;
            if (sort === 'price-asc') {
                filtered.sort((a, b) => effectivePrice(a) - effectivePrice(b));
            } else if (sort === 'price-desc') {
                filtered.sort((a, b) => effectivePrice(b) - effectivePrice(a));
            }

            document.getElementById('product-grid').innerHTML = this._generateProductCards(filtered);
            this._attachProductEvents();
        };

        // Category filtering logic
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                // Clear the search input when a category is manually clicked
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = '';
                
                updateGrid();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        // Search and Sort logic
        const debouncedUpdate = DB.utils.debounce(() => {
            updateGrid();
        }, 200);
        document.getElementById('search-input').addEventListener('input', debouncedUpdate);
        document.getElementById('sort-select').addEventListener('change', updateGrid);

        this._attachProductEvents();
    },

    _generateProductCards(products, highlightId = null) {
        if (products.length === 0) {
            return `<div class="empty-state" style="grid-column: 1 / -1;"><i class="ph ph-package"></i><p>No se encontraron productos.</p></div>`;
        }

        return products.map(p => `
            <div class="product-card glass ${p.id === highlightId ? 'highlighted' : ''}" data-id="${esc(p.id)}">
                ${p.oferta ? '<span class="product-badge">OFERTA</span>' : ''}
                ${p.nuevo ? '<span class="product-badge new">NUEVO</span>' : ''}
                <div class="product-img-container">
                    <img src="${esc(p.image || 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=500&q=60')}" alt="${esc(p.name)}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='https://images.unsplash.com/photo-1588702547919-26089e690ecc?auto=format&fit=crop&w=500&q=60';">
                    ${!p.image ? '<div class="no-image-overlay">Sin Foto</div>' : ''}
                </div>
                <div class="product-content">
                    <h3 class="product-title">${esc(p.name)}</h3>
                    <div style="margin: 0.5rem 0; display: flex; align-items: baseline; flex-wrap: wrap;">
                        ${productOfferPrice(p) > 0 ? `<span class="product-price-old">${formatMoney(p.price)}</span>` : ''}
                        <span class="product-price ${productOfferPrice(p) > 0 ? 'oferta' : ''}">${formatMoney(effectivePrice(p))}</span>
                    </div>
                    ${(DB.getConfig().priceListsEnabled && Number(p.price_mayorista) > 0) ? `<div class="product-wholesale" style="font-size: 0.85rem; color: var(--text-muted);">Mayorista: <strong>${formatMoney(p.price_mayorista)}</strong></div>` : ''}
                    <button class="btn btn-cart w-100" data-cart-id="${esc(p.id)}">
                        <i class="ph ph-shopping-cart-simple"></i> Agregar al carrito
                    </button>
                    <button class="btn btn-whatsapp w-100" data-product="${esc(p.name)}" style="margin-top: .5rem;">
                        <i class="ph ph-whatsapp-logo"></i> Consultar
                    </button>
                </div>
            </div>
        `).join('');
    },

    _attachProductEvents() {
        document.querySelectorAll('.btn-whatsapp[data-product]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                WA.openProduct(e.target.closest('button').dataset.product);
            });
        });
        document.querySelectorAll('[data-cart-id]').forEach(btn => {
            btn.addEventListener('click', () => Cart.add(btn.dataset.cartId));
        });
    },

    renderServicesPublic() {
        const services = DB.get('services');
        this.app.innerHTML = `
            <div style="max-width: 1000px; margin: 0 auto;">
                <h1 style="text-align: center; margin-bottom: 2rem;">Nuestros Servicios Técnicos</h1>
                <div class="services-grid">
                    ${services.map(s => `
                        <div class="product-card glass" style="display: flex; flex-direction: column;">
                            <div style="font-size: 4rem; text-align: center; color: var(--accent-cyan); padding: 2rem 0 1rem 0;">
                                <i class="ph ${esc(s.icon || 'ph-wrench')}"></i>
                            </div>
                            <div class="p-4" style="flex: 1; display: flex; flex-direction: column;">
                                <h3 class="product-title" style="text-align: center;">${esc(s.name)}</h3>
                                <p class="product-desc" style="text-align: center; flex: 1;">${esc(s.desc)}</p>
                                <button class="btn btn-whatsapp w-100 mt-4" data-wa-service="${esc(s.name)}">
                                    <i class="ph ph-whatsapp-logo"></i> Consultar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.querySelectorAll('[data-wa-service]').forEach(btn => {
            btn.addEventListener('click', () => WA.openService(btn.dataset.waService));
        });
    },

    renderRepairsPublic() {
        this.app.innerHTML = `
            <div style="max-width: 520px; margin: 0 auto; text-align: center;">
                <h1>Consulta de Reparaciones</h1>
                <p style="color: var(--text-muted); margin-bottom: 2rem;">Ingres\u00e1 tu clave de 5 d\u00edgitos para verificar el estado de tu equipo.</p>
                
                <div class="glass" style="padding: 2rem; border-radius: 1rem;">
                    <div class="form-group">
                        <input type="text" id="repair-search" class="form-control" placeholder="Ej: A8K2L" maxlength="5" style="text-align: center; font-size: 2rem; letter-spacing: 0.5rem; font-weight: 700; text-transform: uppercase;">
                    </div>
                    <button class="btn btn-primary" id="btn-search-repair" style="width: 100%;"><i class="ph ph-magnifying-glass"></i> Consultar Estado</button>
                </div>

                <div id="repair-result" style="margin-top: 2rem;"></div>
            </div>
        `;

        document.getElementById('btn-search-repair').addEventListener('click', async () => {
            const query = document.getElementById('repair-search').value.trim().toUpperCase();
            const resultDiv = document.getElementById('repair-result');

            if (!query) {
                resultDiv.innerHTML = `<div class="glass" style="padding: 1.5rem; border-radius: 1rem; color: var(--warning); text-align: center;">Ingrese una clave de consulta.</div>`;
                return;
            }

            // Consulta en línea; si el servidor no responde NO se muestran datos locales viejos.
            let repair = null;
            let offline = false;
            if (Router.isLocal()) {
                try {
                    const res = await fetch('/api/repairs/lookup/' + encodeURIComponent(query));
                    if (res.ok) {
                        const data = await res.json();
                        repair = data.repair;
                    }
                } catch { offline = true; }
            } else {
                // Tienda directa sin tenant: buscar primero en el mapa público de estados (data.json)
                const pub = DB.get('repairStatus') || [];
                const hit = Array.isArray(pub) ? pub.find(r => String(r.code || '').toUpperCase() === query) : null;
                if (hit) {
                    repair = { ...hit, id: hit.code };
                    offline = false;
                } else {
                    const t = await Cart.lookupRepairRemote(query);
                    repair = t.repair;
                    offline = !t.repair && t.offline;
                    if (!repair && t.reason === 'no-config') {
                        resultDiv.innerHTML = `<div class="glass" style="padding: 1.5rem; border-radius: 1rem; color: var(--warning); text-align: center;">Consulta online en mantenimiento. Probá recargar la página.</div>`;
                        return;
                    }
                }
            }

            if (!repair) {
                resultDiv.innerHTML = offline
                    ? `<div class="glass" style="padding: 1.5rem; border-radius: 1rem; color: var(--warning); text-align: center;">Servidor no disponible. Intent\u00e1 nuevamente en unos momentos.</div>`
                    : `
                    <div class="glass" style="padding: 1.5rem; border-radius: 1rem; color: var(--danger); text-align: center;">
                        <i class="ph ph-warning" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        No se encontr\u00f3 ninguna orden con esa clave.
                    </div>
                `;
                return;
            }

            const clientName = repair.clientName || 'N/A';
            const clientPhone = repair.clientPhone || '';

            const statusClass = 'status-' + String(repair.status || '').replace(/\s+/g, '');
                resultDiv.innerHTML = `
                    <div class="glass" style="padding: 1.5rem; border-radius: 1rem; text-align: left;">
                        <div style="background: var(--accent-blue); color: white; padding: 1rem; border-radius: 0.5rem; text-align: center; margin-bottom: 1.5rem;">
                            <div style="font-size: 0.8rem; opacity: 0.85;">CLAVE DE ORDEN</div>
                            <div style="font-size: 2.5rem; font-weight: 900; letter-spacing: 0.5rem;">${esc(repair.code)}</div>
                        </div>
                        <div class="flex justify-between items-center mb-4" style="margin-bottom: 1rem;">
                            <span style="color: var(--text-muted); font-size: 0.85rem;">Orden Interna: ${esc(repair.id)}</span>
                            <span class="status-badge ${esc(statusClass)}">${esc(repair.status)}</span>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
                            <tr><td style="padding: 0.5rem 0; color: var(--text-muted); width: 40%;">Cliente</td><td style="font-weight: 600;">${esc(clientName)}</td></tr>
                            <tr><td style="padding: 0.5rem 0; color: var(--text-muted);">Equipo</td><td style="font-weight: 600;">${esc(repair.equipment)}${repair.marca ? ' (' + esc(repair.marca) + ')' : ''}${repair.modelo ? ' ' + esc(repair.modelo) : ''}</td></tr>
                            <tr><td style="padding: 0.5rem 0; color: var(--text-muted);">Problema</td><td>${esc(repair.problem)}</td></tr>
                            <tr><td style="padding: 0.5rem 0; color: var(--text-muted);">Fecha Ingreso</td><td>${esc(repair.date)}</td></tr>
                            ${repair.notes ? '<tr><td style="padding: 0.5rem 0; color: var(--text-muted);">Notas</td><td>' + esc(repair.notes) + '</td></tr>' : ''}
                            <tr><td style="padding: 0.5rem 0; color: var(--text-muted); font-weight: 600;">Costo de Reparaci\u00f3n</td><td style="font-weight: 700; color: var(--success); font-size: 1.1rem;">${repair.price && repair.price > 0 ? formatMoney(repair.price) : 'A Confirmar'}</td></tr>
                        </table>
                        <button class="btn btn-secondary" id="btn-print-repair-public" data-code="${esc(repair.code)}" style="width: 100%; margin-top: 1.5rem;">
                            <i class="ph ph-printer"></i> Imprimir / Guardar como PDF
                        </button>
                    </div>
                `;
                document.getElementById('btn-print-repair-public').addEventListener('click', () => Pages.printRepairPDFPublic(repair.code));
        });

        document.getElementById('repair-search').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btn-search-repair').click();
        });
    },

    async printRepairPDFPublic(code) {
        let repair = null;
        if (Router.isLocal()) {
            try {
                const res = await fetch('/api/repairs/lookup/' + encodeURIComponent(code));
                if (res.ok) {
                    const data = await res.json();
                    repair = data.repair;
                }
            } catch {}
        } else {
            const pub = DB.get('repairStatus') || [];
            const hit = Array.isArray(pub) ? pub.find(r => String(r.code || '').toUpperCase() === String(code || '').toUpperCase()) : null;
            repair = hit ? { ...hit, id: hit.code } : (await Cart.lookupRepairRemote(code)).repair;
        }
        if (!repair) { Toast.show('Servidor no disponible para obtener la orden.', 'error'); return; }
        const clientName = repair.clientName || 'N/A';
        const clientPhone = repair.clientPhone || '';
        const config = DB.getConfig();

        const printWin = window.open('', '_blank');
        if (!printWin) return;
        printWin.document.write('\x3C!DOCTYPE html>\x3Chtml lang="es">\x3Chead>\x3Cmeta charset="UTF-8">\x3Ctitle>Comprobante de Reparaci\u00f3n - ' + repair.code + '\x3C/title>\x3Cstyle>:root{--primary:#dc2626;--dark:#111827;--gray-50:#f9fafb;--gray-100:#f3f4f6;--gray-200:#e5e7eb;--gray-500:#6b7280;--gray-700:#374151}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,-apple-system,sans-serif;padding:0;color:var(--dark);line-height:1.5;background:white}.page{width:210mm;padding:15mm;margin:auto;background:white;position:relative}@page{size:A4;margin:0}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--primary);padding-bottom:1rem;margin-bottom:1.5rem}.company-name{font-size:1.75rem;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:-0.025em}.company-info{font-size:0.85rem;color:var(--gray-500);margin-top:0.2rem;font-weight:500}.order-header{display:flex;justify-content:space-between;background:var(--gray-50);padding:1rem;border-radius:0.75rem;margin-bottom:1.5rem;border:1px solid var(--gray-100)}.code-section{text-align:center;flex:1}.badge-label{font-size:0.7rem;color:var(--gray-500);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.4rem}.badge-code{background:var(--primary);color:white;padding:0.5rem 1.5rem;border-radius:0.75rem;font-size:4rem;font-weight:800;letter-spacing:0.4rem;display:inline-block;line-height:1}.order-meta{text-align:right;display:flex;flex-direction:column;justify-content:center;gap:0.25rem}.order-id{font-size:0.8rem;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.05em}.order-number{font-size:1.5rem;font-weight:700;color:var(--primary)}.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:1.5rem}.details-section h3{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);font-weight:700;border-bottom:2px solid var(--gray-100);padding-bottom:0.5rem;margin-bottom:0.75rem}.detail-row{display:flex;padding:0.35rem 0;border-bottom:1px solid var(--gray-100);font-size:0.85rem}.detail-label{color:var(--gray-500);font-weight:600;width:120px;flex-shrink:0}.detail-value{color:var(--dark);font-weight:500}.notes-section{margin-bottom:1rem}.notes-section h3{font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;color:var(--primary);font-weight:700;border-bottom:2px solid var(--gray-100);padding-bottom:0.5rem;margin-bottom:0.75rem}.notes-box{padding:0.75rem;border-radius:0.5rem;font-size:0.85rem;line-height:1.6;background:var(--gray-50);border-left:4px solid var(--primary)}.notes-box-secondary{border-left-color:var(--gray-500);margin-top:0.5rem}.stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-15deg);font-size:4rem;font-weight:900;color:rgba(220,38,38,0.08);text-transform:uppercase;pointer-events:none;white-space:nowrap;border:4px solid rgba(220,38,38,0.12);border-radius:2rem;padding:1rem 3rem}.footer{margin-top:2rem;padding-top:1rem;border-top:1px solid var(--gray-200);display:flex;justify-content:space-between;font-size:0.75rem;color:var(--gray-500)}\x3C/style>\x3C/head>\x3Cbody>\x3Cdiv class="page">\x3Cdiv class="header">\x3Cdiv>\x3Cdiv class="company-name">' + (config.companyName || 'Nexus POS') + '\x3C/div>\x3Cdiv class="company-info">' + (config.address ? config.address + ' &bull; ' : '') + (config.phone ? config.phone + ' &bull; ' : '') + (config.email || '') + '\x3C/div>\x3C/div>\x3Cdiv class="order-meta">\x3Cdiv class="order-id">Orden de Servicio\x3C/div>\x3Cdiv class="order-number"># ' + repair.id + '\x3C/div>\x3C/div>\x3C/div>\x3Cdiv class="order-header">\x3Cdiv class="code-section">\x3Cdiv class="badge-label">Clave para consulta web\x3C/div>\x3Cdiv class="badge-code">' + repair.code + '\x3C/div>\x3Cdiv style="margin-top:0.5rem;font-size:0.75rem;color:var(--gray-500)">Use esta clave en nuestro sitio para ver el estado\x3C/div>\x3C/div>\x3C/div>\x3Cdiv class="details-grid">\x3Cdiv class="details-section">\x3Ch3>Datos del Cliente\x3C/h3>\x3Cdiv class="detail-row">\x3Cspan class="detail-label">Nombre\x3C/span>\x3Cspan class="detail-value">' + clientName + '\x3C/span>\x3C/div>\x3Cdiv class="detail-row">\x3Cspan class="detail-label">Tel\u00e9fono\x3C/span>\x3Cspan class="detail-value">' + (clientPhone || '-') + '\x3C/span>\x3C/div>\x3C/div>\x3Cdiv class="details-section">\x3Ch3>Detalles del Equipo\x3C/h3>\x3Cdiv class="detail-row">\x3Cspan class="detail-label">Equipo\x3C/span>\x3Cspan class="detail-value">' + repair.equipment + (repair.marca ? ' (' + repair.marca + ')' : '') + (repair.modelo ? ' ' + repair.modelo : '') + '\x3C/span>\x3C/div>\x3Cdiv class="detail-row">\x3Cspan class="detail-label">Fecha Ing\x3C/span>\x3Cspan class="detail-value">' + repair.date + '\x3C/span>\x3C/div>\x3Cdiv class="detail-row">\x3Cspan class="detail-label">Estado\x3C/span>\x3Cspan class="detail-value">' + repair.status + '\x3C/span>\x3C/div>\x3Cdiv class="detail-row">\x3Cspan class="detail-label">Costo\x3C/span>\x3Cspan class="detail-value">$' + (Number(repair.price || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})) + '\x3C/span>\x3C/div>\x3C/div>\x3C/div>\x3Cdiv class="notes-section">\x3Ch3>Problema Reportado\x3C/h3>\x3Cdiv class="notes-box">' + (repair.problem || 'No especificado') + '\x3C/div>\x3C/div>' + (repair.notes ? '\x3Cdiv class="notes-section">\x3Ch3>Observaciones Adicionales\x3C/h3>\x3Cdiv class="notes-box notes-box-secondary">' + repair.notes + '\x3C/div>\x3C/div>' : '') + '\x3Cdiv class="stamp">' + repair.status.toUpperCase() + '\x3C/div>\x3Cdiv class="footer">\x3Cspan>Conserve este comprobante para retirar su equipo.\x3C/span>\x3Cspan>' + repair.date + ' &mdash; ' + (config.companyName || 'Nexus POS') + '\x3C/span>\x3C/div>\x3C/div>\x3C/body>\x3C/html>');
        printWin.document.close();
    },

    printRepairPDF(code) {
        const repairs = DB.get('repairs');
        const clients = DB.get('clients');
        const config = DB.getConfig();
        const repair = repairs.find(r => r.code === code);
        if (!repair) return;
        const client = clients.find(c => c.id === repair.clientId) || {};

        const printWin = window.open('', '_blank');
        printWin.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Comprobante de Reparación - ${repair.code}</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
                :root {
                    --primary: #dc2626;
                    --dark: #111827;
                    --gray-50: #f9fafb;
                    --gray-100: #f3f4f6;
                    --gray-200: #e5e7eb;
                    --gray-500: #6b7280;
                    --gray-700: #374151;
                }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { 
                    font-family: 'Inter', -apple-system, sans-serif; 
                    padding: 0; 
                    color: var(--dark); 
                    line-height: 1.5;
                    background: white;
                }
                .page {
                    width: 210mm;
                    padding: 15mm;
                    margin: auto;
                    background: white;
                    position: relative;
                }
                @page { size: A4; margin: 0; }
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-start; 
                    border-bottom: 2px solid var(--primary); 
                    padding-bottom: 1rem; 
                    margin-bottom: 1.5rem; 
                }
                .company-name { 
                    font-size: 1.75rem; 
                    font-weight: 800; 
                    color: var(--primary); 
                    text-transform: uppercase;
                    letter-spacing: -0.025em;
                }
                .company-info { font-size: 0.85rem; color: var(--gray-500); margin-top: 0.2rem; font-weight: 500; }
                
                .order-header {
                    display: flex;
                    justify-content: space-between;
                    background: var(--gray-50);
                    padding: 1rem;
                    border-radius: 0.75rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--gray-100);
                }
                
                .code-section {
                    text-align: center;
                    flex: 1;
                }
                .badge-label { 
                    font-size: 0.7rem; 
                    color: var(--gray-500); 
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.4rem;
                }
                .badge-code { 
                    background: var(--primary); 
                    color: white; 
                    padding: 0.5rem 1.5rem; 
                    border-radius: 0.75rem; 
                    font-size: 4rem; 
                    font-weight: 800; 
                    letter-spacing: 0.4rem; 
                    display: inline-block;
                    line-height: 1;
                }

                .order-meta {
                    text-align: right;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 0.25rem;
                }
                .meta-item { font-size: 0.85rem; color: var(--gray-500); }
                .meta-item strong { color: var(--dark); font-weight: 700; }

                section { margin-bottom: 1.25rem; }
                h2 { 
                    color: var(--dark); 
                    font-size: 1rem; 
                    font-weight: 700;
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                    margin-bottom: 0.75rem; 
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                h2::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: var(--gray-200);
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                
                table { width: 100%; border-collapse: collapse; }
                td { padding: 0.5rem 0; border-bottom: 1px solid var(--gray-100); font-size: 0.9rem; }
                td:first-child { color: var(--gray-500); width: 35%; font-weight: 500; }
                td:last-child { font-weight: 600; color: var(--gray-700); }
                
                .notes-box {
                    background: var(--gray-50);
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    border-left: 4px solid var(--primary);
                    font-size: 0.85rem;
                    margin-top: 0.25rem;
                    min-height: 50px;
                }

                .footer { 
                    margin-top: 0.75rem; 
                    text-align: center; 
                    color: var(--gray-500); 
                    font-size: 0.75rem; 
                    border-top: 1px solid var(--gray-100); 
                    padding-top: 0.5rem; 
                }
                .footer p { margin-bottom: 0.1rem; }
                
                .stamp {
                    position: absolute;
                    bottom: 100px;
                    right: 80px;
                    width: 150px;
                    height: 150px;
                    border: 4px double var(--primary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--primary);
                    font-weight: 800;
                    opacity: 0.15;
                    transform: rotate(-15deg);
                    font-size: 1.2rem;
                    text-align: center;
                    pointer-events: none;
                }

                @media print { 
                    body { background: white; }
                    .page { width: 100%; height: 100%; padding: 10mm; margin: 0; }
                    .badge-code { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="page">
                <div class="header">
                    <div>
                        <div class="company-name">${config.companyName}</div>
                        <div class="company-info">${config.address}</div>
                        <div class="company-info">${config.phone} • ${config.email}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 1.5rem; font-weight: 800; color: var(--gray-700);">ORDEN DE SERVICIO</div>
                        <div style="color: var(--primary); font-weight: 700;"># ${repair.id}</div>
                    </div>
                </div>

                <div class="order-header">
                    <div class="code-section">
                        <div class="badge-label">CLAVE PARA CONSULTA WEB</div>
                        <div class="badge-code">${repair.code}</div>
                        <div style="margin-top: 0.75rem; font-size: 0.85rem; color: var(--gray-500); font-weight: 600;">Use esta clave en nuestro sitio para ver el estado</div>
                    </div>
                </div>

                <div class="info-grid">
                    <section>
                        <h2>Datos del Cliente</h2>
                        <table>
                            <tr><td>Nombre</td><td>${client.name || 'N/A'}</td></tr>
                            <tr><td>Teléfono</td><td>${client.phone || 'N/A'}</td></tr>
                            <tr><td>Email</td><td>${client.email || 'N/A'}</td></tr>
                        </table>
                    </section>
                    <section>
                        <h2>Detalles del Equipo</h2>
                        <table>
                            <tr><td>Equipo</td><td>${repair.equipment}</td></tr>
                            <tr><td>Fecha Ingreso</td><td>${repair.date}</td></tr>
                            <tr><td>Estado Inicial</td><td>${repair.status}</td></tr>
                            <tr><td>Costo</td><td style="color: var(--primary); font-weight: 700;">${repair.price && repair.price > 0 ? formatMoney(repair.price) : 'A Confirmar'}</td></tr>
                        </table>
                    </section>
                </div>

                <section>
                    <h2>Problema Reportado</h2>
                    <div class="notes-box">${repair.problem}</div>
                </section>

                ${repair.notes ? `
                <section>
                    <h2>Observaciones Adicionales</h2>
                    <div class="notes-box" style="border-left-color: var(--gray-500);">${repair.notes}</div>
                </section>
                ` : ''}

                <div class="stamp">ORDEN<br>RECIBIDA</div>

                <div class="footer">
                    <p>Conserve este comprobante para retirar su equipo. | ${new Date().toLocaleDateString('es-AR')} — ${config.companyName}</p>
                </div>
            </div>
            <script>
                window.onload = () => { 
                    setTimeout(() => {
                        window.print();
                        // Opcional: cerrar la ventana después de imprimir
                        // window.close();
                    }, 500);
                }
            <\/script>
        </body>
        </html>
        `);
        printWin.document.close();
    },

};

// --- Carousel Module ---
const Carousel = {
    timer: null,
    currentIndex: 0,
    
    init() {
        const config = DB.getConfig();
        const container = document.getElementById('promotional-carousel');
        if (!container) return;

        // Carrusel deshabilitado por tema: no renderizar
        if (document.body.dataset.carousel === 'off') { container.classList.add('d-none'); this.stopAutoplay(); return; }

        const path = window.location.hash.slice(1) || '/';
        const isPublicRoute = (path === '/' || path === '/ofertas');
        const hasBanners = config.banners && config.banners.length > 0;

        if (isPublicRoute && hasBanners) {
            container.classList.remove('d-none');
            this.render(config.banners);
        } else {
            container.classList.add('d-none');
            this.stopAutoplay();
        }
    },

    render(banners) {
        const track = document.getElementById('carousel-track');
        const nav = document.getElementById('carousel-nav');
        const leftBtn = document.getElementById('carousel-btn-left');
        const rightBtn = document.getElementById('carousel-btn-right');
        if (!track || !nav) return;

        this.stopAutoplay();
        this.currentIndex = 0;

        // Render Slides
        track.innerHTML = banners.map((b, idx) => {
            const hasText = b.title || b.description;
            const safeLink = /^https?:\/\//i.test(String(b.link || '')) || String(b.link || '').startsWith('/') ? String(b.link) : '';
            const content = `
                <div class="carousel-slide ${idx === 0 ? 'active' : ''}" style="background-image: url('${esc(b.image)}');">
                    ${safeLink ? `<a href="${esc(safeLink)}" class="carousel-slide-link" ${safeLink.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}></a>` : ''}
                    ${hasText ? `
                        <div class="carousel-slide-content">
                            ${b.title ? `<h2 class="carousel-slide-title">${esc(b.title)}</h2>` : ''}
                            ${b.description ? `<p class="carousel-slide-desc">${esc(b.description)}</p>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            return content;
        }).join('');

        // Render Dots
        nav.innerHTML = banners.map((_, idx) => `
            <button class="carousel-indicator ${idx === 0 ? 'active' : ''}" data-slide="${idx}"></button>
        `).join('');

        // Hide navigation elements if there's only 1 slide
        if (banners.length <= 1) {
            if (leftBtn) leftBtn.style.display = 'none';
            if (rightBtn) rightBtn.style.display = 'none';
            nav.style.display = 'none';
            return;
        } else {
            if (leftBtn) leftBtn.style.display = 'flex';
            if (rightBtn) rightBtn.style.display = 'flex';
            nav.style.display = 'flex';
        }

        // Add Listeners
        const indicators = nav.querySelectorAll('.carousel-indicator');
        indicators.forEach(ind => {
            ind.addEventListener('click', (e) => {
                const targetIdx = parseInt(e.target.dataset.slide);
                this.goToSlide(targetIdx, banners.length);
            });
        });

        if (leftBtn && rightBtn) {
            // Remove existing event listeners by replacing buttons with clones
            const newLeft = leftBtn.cloneNode(true);
            const newRight = rightBtn.cloneNode(true);
            leftBtn.parentNode.replaceChild(newLeft, leftBtn);
            rightBtn.parentNode.replaceChild(newRight, rightBtn);

            newLeft.addEventListener('click', () => {
                this.prevSlide(banners.length);
            });
            newRight.addEventListener('click', () => {
                this.nextSlide(banners.length);
            });

            // Swipe táctil en mobile
            const carouselEl = document.getElementById('promotional-carousel');
            if (carouselEl && !carouselEl.dataset.swipeBound) {
                carouselEl.dataset.swipeBound = '1';
                let touchX = null;
                carouselEl.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
                carouselEl.addEventListener('touchend', (e) => {
                    if (touchX === null) return;
                    const dx = e.changedTouches[0].clientX - touchX;
                    if (Math.abs(dx) > 40) {
                        if (dx < 0) this.nextSlide(banners.length); else this.prevSlide(banners.length);
                    }
                    touchX = null;
                }, { passive: true });
            }
        }

        // Pausar autoplay mientras la pestaña está en segundo plano
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) this.stopAutoplay();
            else if (banners.length > 1 && document.getElementById('carousel-track')) this.startAutoplay(banners.length);
        });

        this.startAutoplay(banners.length);
    },

    goToSlide(index, total) {
        if (index < 0 || index >= total) return;
        
        const track = document.getElementById('carousel-track');
        if (!track) return;
        
        const slides = track.querySelectorAll('.carousel-slide');
        const indicators = document.querySelectorAll('.carousel-indicator');

        if (slides[this.currentIndex]) slides[this.currentIndex].classList.remove('active');
        if (indicators[this.currentIndex]) indicators[this.currentIndex].classList.remove('active');

        this.currentIndex = index;

        if (slides[this.currentIndex]) slides[this.currentIndex].classList.add('active');
        if (indicators[this.currentIndex]) indicators[this.currentIndex].classList.add('active');
    },

    nextSlide(total) {
        let target = this.currentIndex + 1;
        if (target >= total) target = 0;
        this.goToSlide(target, total);
    },

    prevSlide(total) {
        let target = this.currentIndex - 1;
        if (target < 0) target = total - 1;
        this.goToSlide(target, total);
    },

    startAutoplay(total) {
        if (document.hidden || total <= 1) return;
        this.stopAutoplay();
        this.timer = setInterval(() => {
            if (!document.hidden) this.nextSlide(total);
        }, 5000); // 5 seconds autoplay
    },

    stopAutoplay() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
};

// --- Router Module ---
const Router = {
    isLocal() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    },

    routes: {
        '/': () => Pages.renderCatalog(false),
        '/ofertas': () => Pages.renderCatalog(true),
        '/servicios': () => Pages.renderServicesPublic(),
        '/reparaciones': () => Pages.renderRepairsPublic(),
    },

    navigate(path) {
        window.location.hash = path;
    },

    handleRoute() {
        const path = window.location.hash.slice(1) || '/';

        // Reparaciones deshabilitadas por edición (Full): redirigir al catálogo
        if (path === '/reparaciones' && DB.getConfig().repairsEnabled === false) {
            this.navigate('/');
            return;
        }
        // Ofertas deshabilitadas por tema: redirigir al catálogo
        if (path === '/ofertas' && document.body.dataset.offers === 'off') {
            this.navigate('/');
            return;
        }

        
        // Al cambiar de ruta, siempre volver al inicio del scroll
        window.scrollTo(0, 0);

        // Update Nav UI
        this.updateNavUI(path);

        // Execute route
        const handler = this.routes[path];
        if (handler) {
            handler();
        } else {
            Pages.app.innerHTML = '<h1>404 - Página no encontrada</h1>';
        }

        // Initialize/update promotional carousel
        Carousel.init();
    },

    updateNavUI(path) {
        const publicNav = document.getElementById('public-nav');
        const footer = document.querySelector('footer.footer');
        const floatingWa = document.getElementById('floating-wa');

        publicNav.classList.remove('d-none');
        if (footer) footer.classList.remove('d-none');
        const config = DB.getConfig();
        if (floatingWa) {
            floatingWa.style.display = config.whatsapp ? 'flex' : 'none';
            floatingWa.classList.remove('d-none');
        }

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.route === path) link.classList.add('active');
        });
    }
};

// --- Initialization ---
// ===== CARRITO DE COMPRAS =====
// Escape HTML global (usado por carrito, vistas públicas y formularios admin).
function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const Cart = {
    KEY: 'nexus_cart_v1',
    PENDING_KEY: 'nexus_pending_orders',
    items: [],

    init() {
        try { this.items = JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch { this.items = []; }
        if (!Array.isArray(this.items)) this.items = [];
        this.updateBadge();
        this.retryPending();
    },

    save() {
        localStorage.setItem(this.KEY, JSON.stringify(this.items));
        this.updateBadge();
    },

    updateBadge() {
        const badge = document.getElementById('cart-badge');
        if (!badge) return;
        const count = this.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
        badge.textContent = String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
    },

    add(id) {
        const p = (DB.get('products') || []).find(x => x.id === id);
        if (!p) return;
        const price = effectivePrice(p);
        const existing = this.items.find(i => i.id === id);
        if (existing) { existing.qty += 1; existing.price = price; }
        else this.items.push({ id: p.id, name: p.name, price, category: p.category || '', image: p.image || '', qty: 1 });
        this.save();
        Toast.show(p.name + ' agregado al carrito', 'success');
        this.render();
    },

    changeQty(idx, delta) {
        if (!this.items[idx]) return;
        this.items[idx].qty += delta;
        if (this.items[idx].qty <= 0) this.items.splice(idx, 1);
        this.save();
        this.render();
    },

    remove(idx) {
        this.items.splice(idx, 1);
        this.save();
        this.render();
    },

    total() {
        return this.items.reduce((s, i) => s + i.price * i.qty, 0);
    },

    toggle() {
        const ov = document.getElementById('cart-overlay');
        if (!ov) return;
        const open = ov.classList.toggle('open');
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) { this.showMain(); this.render(); }
    },

    close() {
        const ov = document.getElementById('cart-overlay');
        if (ov) ov.classList.remove('open');
        document.body.style.overflow = '';
        this.showMain();
    },

    render() {
        const listEl = document.getElementById('cart-items');
        if (!listEl) return;
        if (this.items.length === 0) {
            listEl.innerHTML = '<div class="cart-empty"><i class="ph ph-shopping-cart-simple"></i><p>El carrito est\u00e1 vac\u00edo</p><p style="font-size:.85rem;">Agreg\u00e1 productos desde el cat\u00e1logo</p></div>';
        } else {
            listEl.innerHTML = this.items.map((i, idx) => `
                <div class="cart-item">
                    <img class="cart-item-img" src="${esc(i.image || '')}" alt="" onerror="this.style.visibility='hidden'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${esc(i.name)}</div>
                        <div class="cart-item-cat">${esc(i.category || '')}</div>
                        <div class="cart-item-price">${formatMoney(i.price)}</div>
                        <div class="cart-item-actions">
                            <button class="cart-qty-btn" onclick="Cart.changeQty(${idx},-1)" aria-label="Menos">&minus;</button>
                            <span class="cart-qty">${i.qty}</span>
                            <button class="cart-qty-btn" onclick="Cart.changeQty(${idx},1)" aria-label="Más">+</button>
                            <span class="cart-item-subtotal">${formatMoney(i.price * i.qty)}</span>
                            <button class="cart-item-remove" onclick="Cart.remove(${idx})" title="Eliminar">&times;</button>
                        </div>
                    </div>
                </div>`).join('');
        }
        const t = document.getElementById('cart-total');
        if (t) t.textContent = formatMoney(this.total());
        const btn = document.getElementById('cart-view-checkout');
        if (btn) btn.disabled = this.items.length === 0;
    },

    async lookupRepairRemote(code) {
        // Tenant eliminado: tienda directa, sin Worker remoto.
        return { repair: null, offline: true, reason: 'no-config' };
    },

    _idemKey() {
        try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch {}
        return Date.now().toString(36) + Math.random().toString(36).slice(2,10);
    },
    async submitOrderRemote(payload) {
        // Tenant eliminado: tienda directa, sin Worker remoto. El checkout online usa WhatsApp.
        return null;
    },

    showCheckout() {
        if (this.items.length === 0) return;
        document.getElementById('cart-main').style.display = 'none';
        const s = document.getElementById('cart-success'); if (s) s.style.display = 'none';
        document.getElementById('cart-checkout').style.display = '';
        const t = document.getElementById('co-total');
        if (t) t.textContent = formatMoney(this.total());
        const remote = !Router.isLocal();
        const btn = document.getElementById('co-submit');
        if (btn) btn.textContent = 'Enviar pedido';
        const hint = document.getElementById('co-remote-hint');
        if (hint) hint.style.display = remote ? '' : 'none';
    },

    buildWaMessage(payload, storeName, orderId) {
        const lines = [`Hola ${storeName}! Quiero hacer un pedido${orderId ? ' (' + orderId + ')' : ''}:`, ''];
        for (const it of payload.items) {
            lines.push(`• ${it.quantity} x ${it.name} - ${formatMoney(it.price * it.quantity)}`);
        }
        lines.push('', `Total: ${formatMoney(payload.total)}`, `Nombre: ${payload.clientName}`, `Tel: ${payload.clientPhone}`);
        const deliveryTxt = payload.deliveryType === 'envio' ? 'Envío a domicilio' : 'Retiro en local';
        lines.push(`Entrega: ${deliveryTxt}`);
        if (payload.notes) lines.push(`Notas: ${payload.notes}`);
        return lines.join('\n');
    },

    showMain() {
        const c = document.getElementById('cart-checkout'); if (c) c.style.display = 'none';
        const s = document.getElementById('cart-success'); if (s) s.style.display = 'none';
        const m = document.getElementById('cart-main'); if (m) m.style.display = '';
    },

    checkoutPayload() {
        const name = document.getElementById('co-name').value.trim();
        const phone = document.getElementById('co-phone').value.trim();
        const delivery = document.getElementById('co-delivery').value;
        const address = document.getElementById('co-address').value.trim();
        const notes = document.getElementById('co-notes').value.trim();
        if (!name || !phone) { Toast.show('Completá tu nombre y teléfono', 'error'); return null; }
        if (delivery === 'envio' && !address) { Toast.show('Ingresá la dirección de envío', 'error'); return null; }
        return {
            items: this.items.map(i => ({ productId: i.id, name: i.name, quantity: i.qty, price: i.price })),
            total: this.total(),
            clientName: name,
            clientPhone: phone,
            notes: [notes, address ? 'Dirección: ' + address : '', delivery === 'envio' ? 'Envío a domicilio' : 'Retiro en local'].filter(Boolean).join(' | '),
            deliveryType: delivery,
            idempotencyKey: this._idemKey()
        };
    },

    setCheckoutBusy(busy) {
        const b1 = document.getElementById('co-submit');
        if (b1) {
            b1.disabled = busy;
            b1.textContent = busy ? 'Enviando...' : 'Enviar pedido';
        }
    },

    clearCheckoutForm() {
        ['co-name', 'co-phone', 'co-address', 'co-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    },

    showCheckoutSuccess(msg) {
        this.clearCheckoutForm();
        document.getElementById('cart-checkout').style.display = 'none';
        document.getElementById('cart-success-msg').textContent = msg;
        document.getElementById('cart-success').style.display = '';
    },

    async submit() {
        const payload = this.checkoutPayload();
        if (!payload) return;
        if (Router.isLocal()) { await this.submitLocal(payload); return; }
        await this.submitOnline(payload);
    },

    async submitOnline(payload) {
        this.setCheckoutBusy(true);
        const sent = await this.submitOrderRemote(payload);
        const config = DB.getConfig();
        if (!config.whatsapp && !sent) {
            Toast.show('Pedidos online no disponibles en este momento', 'error');
            this.setCheckoutBusy(false);
            return;
        }
        if (sent) {
            const msg = encodeURIComponent(this.buildWaMessage(payload, config.companyName || 'la tienda', sent.id));
            window.open(`https://wa.me/${WA.formatNumber(config.whatsapp)}?text=${msg}`, '_blank');
            this.items = [];
            this.save();
            this.showCheckoutSuccess('Pedido ' + sent.id + ' registrado. Se abrió WhatsApp: enviá el mensaje para confirmarlo.');
            Toast.show('¡Pedido enviado!', 'success');
        } else {
            const msg = encodeURIComponent(this.buildWaMessage(payload, config.companyName || 'la tienda', ''));
            window.open(`https://wa.me/${WA.formatNumber(config.whatsapp)}?text=${msg}`, '_blank');
            this.items = [];
            this.save();
            this.showCheckoutSuccess('Se abrió WhatsApp con tu pedido. Enviá el mensaje para confirmarlo (online no disponible).');
            Toast.show('Pedido enviado por WhatsApp.', 'success');
        }
        this.setCheckoutBusy(false);
    },

    async submitLocal(payload) {
        if (this._submitting) return;
        this._submitting = true;
        this.setCheckoutBusy(true);
        let order = null;
        let retriable = false;
        try {
            const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': payload.idempotencyKey || '' }, body: JSON.stringify(payload) });
            if (r.ok) {
                order = await r.json();
            } else if (r.status >= 500 || r.status === 0) {
                retriable = true;
            } else {
                let msg = 'El servidor rechazó el pedido (código ' + r.status + ').';
                try { const eb = await r.json(); if (eb && eb.error) msg = eb.error; } catch {}
                Toast.show(msg, 'error');
                this._submitting = false;
                this.setCheckoutBusy(false);
                return;
            }
        } catch { retriable = true; }

        if (order && order.id) {
            if (order.duplicate) Toast.show('Pedido ya registrado (' + order.id + ')', 'success');
            this.items = [];
            this.save();
            this.showCheckoutSuccess('Pedido ' + order.id + ' recibido. Te contactaremos a la brevedad.');
            Toast.show('¡Pedido enviado!', 'success');
        } else if (retriable) {
            this.savePending(payload);
            this.items = [];
            this.save();
            this.showCheckoutSuccess('Tu pedido quedó registrado y se enviará automáticamente cuando el servidor esté disponible.');
            Toast.show('¡Pedido enviado!', 'success');
        }
        this._submitting = false;
        this.setCheckoutBusy(false);
    },

    savePending(payload) {
        if (!payload.idempotencyKey) payload.idempotencyKey = this._idemKey();
        let pending = [];
        try { pending = JSON.parse(localStorage.getItem(this.PENDING_KEY) || '[]'); } catch {}
        if (pending.some(p => p.payload && p.payload.idempotencyKey === payload.idempotencyKey)) return;
        pending.push({ payload, date: new Date().toISOString() });
        localStorage.setItem(this.PENDING_KEY, JSON.stringify(pending));
    },

    async retryPending() {
        let pending = [];
        try { pending = JSON.parse(localStorage.getItem(this.PENDING_KEY) || '[]'); } catch {}
        if (!Array.isArray(pending) || pending.length === 0) return;
        const kept = [];
        for (const p of pending) {
            try {
                if (!p.payload.idempotencyKey) p.payload.idempotencyKey = this._idemKey();
                const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': p.payload.idempotencyKey }, body: JSON.stringify(p.payload) });
                if (!r.ok) throw new Error('HTTP ' + r.status);
            } catch { kept.push(p); }
        }
        localStorage.setItem(this.PENDING_KEY, JSON.stringify(kept));
    }
};
window.Cart = Cart;

document.addEventListener('DOMContentLoaded', async () => {
    await DB.init();
    await Theme.apply();
    WA.updateFloatingButton();
    UI.updateConfig();
    Stats.increment();
    Cart.init();
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => Router.handleRoute());
    
    // Initial route
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (productId) {
        Pages.renderCatalog(false, productId);
    } else {
        Router.handleRoute();
    }


});
