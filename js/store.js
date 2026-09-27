// ========================
// Tecno Oriental - Store Engine
// ========================
// Las fotos se guardan como ARCHIVOS dentro del repositorio (carpeta img/productos/).
// products.json solo guarda la RUTA de cada foto, por eso el catalogo carga rapido
// aunque haya cientos de productos.

// Guarda texto en localStorage y avisa si se llena (ya solo guardamos texto, no fotos)
function safeSave(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    if (typeof showToast === 'function') {
      showToast('El navegador se quedó sin espacio. Exporta el catálogo ahora para no perder el trabajo.', 'error');
    }
    console.error('No se pudo guardar en localStorage:', e);
    return false;
  }
}

// ============================================================
//  Almacén de fotos pendientes (IndexedDB)
//  Aguanta cientos de MB, a diferencia de localStorage (5-10MB).
//  Aquí viven solo las fotos NUEVAS que todavía no has exportado al repositorio.
// ============================================================
const ImgDB = (() => {
  const DB_NAME = 'g9_images';
  const STORE = 'files';
  let _db = null;
  const _urls = new Map(); // nombre -> objectURL (para mostrar en pantalla)

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  function store(mode) {
    return _db.transaction(STORE, mode).objectStore(STORE);
  }

  function wrap(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return {
    async init() {
      await open();
      const names = await wrap(store('readonly').getAllKeys());
      const blobs = await wrap(store('readonly').getAll());
      names.forEach((n, i) => {
        if (!_urls.has(n)) _urls.set(n, URL.createObjectURL(blobs[i]));
      });
      return names.length;
    },
    async put(name, blob) {
      await open();
      await wrap(store('readwrite').put(blob, name));
      if (_urls.has(name)) URL.revokeObjectURL(_urls.get(name));
      _urls.set(name, URL.createObjectURL(blob));
      return _urls.get(name);
    },
    async remove(name) {
      await open();
      await wrap(store('readwrite').delete(name));
      if (_urls.has(name)) { URL.revokeObjectURL(_urls.get(name)); _urls.delete(name); }
    },
    async all() {
      await open();
      const names = await wrap(store('readonly').getAllKeys());
      const blobs = await wrap(store('readonly').getAll());
      return names.map((n, i) => ({ name: n, blob: blobs[i] }));
    },
    async clear() {
      await open();
      await wrap(store('readwrite').clear());
      _urls.forEach(u => URL.revokeObjectURL(u));
      _urls.clear();
    },
    async count() {
      await open();
      return wrap(store('readonly').count());
    },
    url(name) { return _urls.get(name) || null; },
    has(name) { return _urls.has(name); }
  };
})();

const G9Store = (() => {
  // ---- Datos en memoria ----
  let _products = [];
  let _categories = [];
  // Lista de nombres de archivo que existen en img/productos/ dentro del repositorio.
  // Se llena sincronizando la carpeta desde el panel de administración (ver imagesManifest).
  let _imagesManifest = [];

  // ---- Selección de productos (LocalStorage) ----
  const Cart = {
    get() {
      return JSON.parse(localStorage.getItem('g9_cart') || '[]');
    },
    save(cart) {
      localStorage.setItem('g9_cart', JSON.stringify(cart));
      Cart.updateBadge();
      document.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    },
    add(productId, variantId = null) {
      const cart = Cart.get();
      const product = _products.find(p => p.id === productId);
      if (!product || product.available === false) return 'unavailable';

      const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
      const key = `${productId}_${variantId || 'none'}`;

      if (cart.find(i => i.key === key)) return 'already';

      cart.push({
        key,
        product_id: productId,
        variant_id: variantId,
        name: product.name,
        price: variant ? variant.price : product.price,
        image: product.images[0] || '',
        variant_info: variant ? `${variant.name}: ${variant.value}` : null
      });
      Cart.save(cart);
      return 'added';
    },
    remove(key) {
      const cart = Cart.get().filter(i => i.key !== key);
      Cart.save(cart);
    },
    clear() {
      localStorage.removeItem('g9_cart');
      Cart.updateBadge();
    },
    total() {
      // Los productos "Precio a consultar" (price === null) no suman al total;
      // se cotizan aparte con el cliente.
      return Cart.get().reduce((s, i) => s + (i.price || 0), 0);
    },
    count() {
      return Cart.get().length;
    },
    updateBadge() {
      document.querySelectorAll('.cart-badge').forEach(el => {
        el.textContent = Cart.count();
      });
    }
  };

  // ---- Solicitudes enviadas (LocalStorage) ----
  const Orders = {
    get() {
      return JSON.parse(localStorage.getItem('g9_orders') || '[]');
    },
    save(order) {
      const orders = Orders.get();
      order.id = Date.now();
      order.created_at = new Date().toISOString();
      order.status = 'pendiente';
      orders.unshift(order);
      localStorage.setItem('g9_orders', JSON.stringify(orders));
      return order;
    }
  };

  // ---- Cargar datos desde los JSON del repositorio ----
  async function loadData() {
    const base = getBasePath();
    const localProducts = localStorage.getItem('g9_products_data');
    const localCategories = localStorage.getItem('g9_categories_data');
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${base}data/products.json`),
        fetch(`${base}data/categories.json`)
      ]);
      const fileProducts = await pRes.json();
      const fileCategories = await cRes.json();
      _products = localProducts ? JSON.parse(localProducts) : fileProducts;
      _categories = localCategories ? JSON.parse(localCategories) : fileCategories;
    } catch (e) {
      console.warn('No se pudieron leer los archivos de datos');
      if (localProducts) _products = JSON.parse(localProducts);
      if (localCategories) _categories = JSON.parse(localCategories);
    }

    // Banco de imágenes: nombres de archivo que ya están (o estarán) en img/productos/.
    // Es normal que data/images-manifest.json todavía no exista (sitios viejos), por eso
    // este bloque va aparte y no debe romper la carga de productos/categorías.
    const localManifest = localStorage.getItem('g9_images_manifest');
    try {
      let fileManifest = [];
      const mRes = await fetch(`${base}data/images-manifest.json`);
      if (mRes.ok) fileManifest = await mRes.json();
      _imagesManifest = localManifest ? JSON.parse(localManifest) : (Array.isArray(fileManifest) ? fileManifest : []);
    } catch (e) {
      _imagesManifest = localManifest ? JSON.parse(localManifest) : [];
    }
  }

  function getBasePath() {
    const scripts = document.querySelectorAll('script[src*="store.js"]');
    if (scripts.length > 0) {
      return scripts[0].src.replace('js/store.js', '');
    }
    return '/';
  }

  // ---- Resuelve la direccion de una foto para mostrarla ----
  // - Foto ya en el repositorio ("img/productos/x.jpg") -> ruta normal
  // - Foto nueva sin exportar todavia -> se muestra desde IndexedDB
  // - Link externo o base64 antiguo -> se usa tal cual
  function imgSrc(path) {
    if (!path) return 'https://via.placeholder.com/400x300?text=Sin+Imagen';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
    const fileName = path.split('/').pop();
    if (ImgDB.has(fileName)) return ImgDB.url(fileName);
    return getBasePath() + path.replace(/^\//, '');
  }

  return {
    init: loadData,
    cart: Cart,
    orders: Orders,
    images: ImgDB,
    imgSrc,
    basePath: getBasePath,

    getProducts(filters = {}) {
      let list = [..._products];
      if (filters.category_id) list = list.filter(p => p.category_id === filters.category_id);
      if (filters.featured) list = list.filter(p => p.featured);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
      }
      return list;
    },
    getProduct(id) { return _products.find(p => p.id === id) || null; },
    getCategories() { return _categories; },
    getCategory(id) { return _categories.find(c => c.id === id) || null; },
    getAllData() { return { products: _products, categories: _categories }; },

    // ---- Banco de imágenes (fotos ya subidas al repositorio) ----
    // El manifiesto solo guarda NOMBRES de archivo (ej. "caja-carton.jpg"), nunca la foto
    // en sí. Se llena sincronizando la carpeta img/productos/ desde el panel de admin.
    imagesManifest: {
      get() { return _imagesManifest; },
      set(list) {
        _imagesManifest = Array.from(new Set((list || []).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        safeSave('g9_images_manifest', _imagesManifest);
      },
      reset() { localStorage.removeItem('g9_images_manifest'); }
    },

    // Nombres de archivo (de img/productos/) que ya están asignados a algún producto o
    // categoría. excludeProductId permite ignorar las fotos del producto que se está
    // editando, para que sus propias fotos sigan apareciendo como seleccionables.
    getUsedImageNames(excludeProductId = null) {
      const used = new Set();
      const isRepoFile = (src) => src && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('blob:');
      _products.forEach(p => {
        if (p.id === excludeProductId) return;
        (p.images || []).forEach(src => { if (isRepoFile(src)) used.add(src.split('/').pop()); });
      });
      _categories.forEach(c => { if (isRepoFile(c.image)) used.add(c.image.split('/').pop()); });
      return used;
    },

    // Fotos del banco de imágenes que todavía no están ligadas a ningún producto/categoría.
    getAvailableImages(excludeProductId = null) {
      const used = this.getUsedImageNames(excludeProductId);
      return _imagesManifest.filter(name => !used.has(name));
    },

    // ---- Admin: productos ----
    saveProduct(product) {
      let nextVariantId = _products.flatMap(p => p.variants || []).reduce((m, v) => Math.max(m, v.id), 0) + 1;
      (product.variants || []).forEach(v => { if (!v.id) v.id = nextVariantId++; });

      if (product.id) {
        const i = _products.findIndex(p => p.id === product.id);
        if (i >= 0) _products[i] = product;
      } else {
        product.id = _products.length ? Math.max(..._products.map(p => p.id)) + 1 : 1;
        _products.push(product);
      }
      safeSave('g9_products_data', _products);
      return product;
    },
    deleteProduct(id) {
      _products = _products.filter(p => p.id !== id);
      safeSave('g9_products_data', _products);
    },
    resetProducts() { localStorage.removeItem('g9_products_data'); },

    // ---- Admin: categorias ----
    saveCategory(cat) {
      if (cat.id) {
        const i = _categories.findIndex(c => c.id === cat.id);
        if (i >= 0) _categories[i] = cat;
      } else {
        cat.id = _categories.length ? Math.max(..._categories.map(c => c.id)) + 1 : 1;
        _categories.push(cat);
      }
      safeSave('g9_categories_data', _categories);
      return cat;
    },
    deleteCategory(id) {
      _categories = _categories.filter(c => c.id !== id);
      safeSave('g9_categories_data', _categories);
    },
    resetCategories() { localStorage.removeItem('g9_categories_data'); },

    // ---- Reemplaza todo el catalogo (al importar un ZIP) ----
    replaceAll(products, categories) {
      if (Array.isArray(products)) { _products = products; safeSave('g9_products_data', _products); }
      if (Array.isArray(categories)) { _categories = categories; safeSave('g9_categories_data', _categories); }
    },

    downloadJSON(data, filename) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }
  };
})();

// ========================
// Utilidades de interfaz
// ========================

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `g9-toast g9-toast-${type}`;
  t.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${msg}`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3500);
}

function formatPrice(n) {
  return 'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Igual que formatPrice, pero si el producto no tiene precio (price === null/undefined)
// muestra "Precio a consultar" en vez de "L 0.00". Úsalo en cualquier lugar donde se
// muestre el precio a un cliente.
function formatPriceOrQuote(n) {
  return (n === null || n === undefined || n === '') ? 'Precio a consultar' : formatPrice(n);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function productCardHTML(product) {
  const img = G9Store.imgSrc(product.images && product.images[0]);
  const available = product.available !== false;
  const hasVariants = product.variants && product.variants.length > 0;
  const hasPrice = product.price !== null && product.price !== undefined;
  const priceLabel = hasPrice
    ? `${hasVariants ? 'Desde ' : ''}${formatPrice(product.price)}`
    : 'Precio a consultar';
  const inPagesFolder = window.location.pathname.includes('/pages/');
  const productUrl = inPagesFolder
    ? `producto.html?id=${product.id}`
    : `pages/producto.html?id=${product.id}`;
  return `
    <div class="product-card" data-id="${product.id}">
      <a href="${productUrl}" class="card-link">
        <div class="card-img-wrap">
          <img src="${img}" alt="${product.name}" loading="lazy" decoding="async">
          ${product.featured ? '<span class="badge-featured"><i class="fas fa-star"></i> Destacado</span>' : ''}
        </div>
        <div class="card-body">
          <h3 class="card-name">${product.name}</h3>
          <p class="card-price">${priceLabel}</p>
          <span class="stock-pill ${available ? 'in' : 'out'}">${available ? 'Disponible' : 'No disponible'}</span>
        </div>
      </a>
      <button class="btn-add-cart" onclick="quickAdd(${product.id})" ${!available ? 'disabled' : ''}>
        <i class="fas fa-square-check"></i> Seleccionar
      </button>
    </div>`;
}

function quickAdd(productId) {
  const result = G9Store.cart.add(productId);
  if (result === 'added') showToast('¡Producto seleccionado!');
  else if (result === 'already') showToast('Ya estaba en tu selección');
  else showToast('Error al seleccionar', 'error');
}

// Arranque en todas las paginas
document.addEventListener('DOMContentLoaded', async () => {
  // Las fotos pendientes solo hacen falta en el panel de administracion
  if (window.location.pathname.includes('/admin')) {
    try { await ImgDB.init(); } catch (e) { console.warn('IndexedDB no disponible', e); }
  }

  await G9Store.init();
  G9Store.cart.updateBadge();

  const catDrop = document.getElementById('categories-dropdown');
  if (catDrop) {
    G9Store.getCategories().forEach(c => {
      const li = document.createElement('li');
      li.innerHTML = `<a class="dropdown-item" href="productos.html?category=${c.id}">${c.name}</a>`;
      catDrop.appendChild(li);
    });
  }

  const navbar = document.querySelector('.navbar-custom');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  if (typeof pageInit === 'function') pageInit();
});
