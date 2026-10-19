const SUPABASE_URL = 'https://fniqtidcawppqffeeulw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_7zvo85lnXxqdQjLK6zuZwQ_wHMtyHX8';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let userRole = 'customer';
let allProducts = [];
let allPurchases = [];
let allExpenses = [];
let allSales = [];
let currentCollectionFilter = 'All';
let currentCategoryFilter = 'all';
let currentConditionFilter = 'all';
let currentDashboardTab = 'overview';

let wishlist = JSON.parse(localStorage.getItem('dabia_wishlist')) || [];
let cart = JSON.parse(localStorage.getItem('dabia_cart')) || [];

async function initApp() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        currentUser = session.user;
        determineRole(currentUser.email);
    }
    updateNavigation();
    updateBadges();
    switchView('storefront');
    setupSecretLogoClick();
}

function determineRole(email) {
    if (email === 'primezone6969@gmail.com') {
        userRole = 'owner';
    } else {
        userRole = 'customer';
    }
}

function setupSecretLogoClick() {
    const logo = document.getElementById('brand-logo');
    let clickCount = 0;
    let clickTimer = null;

    logo.addEventListener('click', () => {
        clickCount++;
        if (clickTimer) clearTimeout(clickTimer);

        if (clickCount === 3) {
            clickCount = 0;
            if (!currentUser) {
                openLoginModal();
            } else {
                switchView('dashboard');
            }
        } else {
            clickTimer = setTimeout(() => { clickCount = 0; }, 400);
        }
    });
}

function updateNavigation() {
    const navAuth = document.getElementById('nav-auth');
    const customerTools = document.getElementById('customer-nav-tools');
    if (currentUser) {
        if (userRole !== 'customer') {
            customerTools.style.display = 'none';
        } else {
            customerTools.style.display = 'flex';
        }
        navAuth.innerHTML = `
            <span class="text-xs bg-[#3A4F41] text-white px-2.5 py-1 rounded-full uppercase tracking-wider">👤 ${userRole}</span>${userRole !== 'customer' ? `<button onclick="switchView('dashboard')" class="text-sm bg-[#3A4F41] text-white px-3.5 py-1.5 rounded-lg font-medium hover:bg-[#2C3E35] transition flex items-center gap-1.5">📊 Dashboard</button>` : ''}
            <button onclick="handleLogout()" class="text-sm text-red-500 hover:text-red-700 font-medium">Logout</button>
        `;
    } else {
        customerTools.style.display = 'flex';
        navAuth.innerHTML = ``;
    }
}

function switchView(viewName) {
    if (viewName === 'storefront') renderStorefront();
    else if (viewName === 'dashboard') renderDashboard();
}

function openImageModal(url) {
    const lightbox = document.getElementById('image-lightbox');
    const img = document.getElementById('lightbox-img');
    img.src = url;
    lightbox.classList.remove('hidden');
}

function closeImageModal() {
    document.getElementById('image-lightbox').classList.add('hidden');
}

function switchCardImage(cardId, url, thumbElement) {
    const mainImg = document.getElementById(`main-img-${cardId}`);
    if (mainImg) mainImg.src = url;
    const cardContainer = document.getElementById(`card-thumb-container-${cardId}`);
    if (cardContainer) {
        cardContainer.querySelectorAll('img').forEach(t => t.classList.remove('ring-2', 'ring-[#3A4F41]'));
    }
    if (thumbElement) thumbElement.classList.add('ring-2', 'ring-[#3A4F41]');
}

function selectCardSize(cardId, size, btnElement) {
    const container = document.getElementById(`card-size-container-${cardId}`);
    if (container) {
        container.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-[#3A4F41]', 'text-white', 'border-[#3A4F41]');
            b.classList.add('bg-white', 'text-stone-700', 'border-stone-200');
        });
    }
    btnElement.classList.remove('bg-white', 'text-stone-700', 'border-stone-200');
    btnElement.classList.add('bg-[#3A4F41]', 'text-white', 'border-[#3A4F41]');
    
    const addBtn = document.getElementById(`add-btn-${cardId}`);
    const inquireBtn = document.getElementById(`inquire-btn-${cardId}`);
    if (addBtn) addBtn.dataset.selectedSize = size;
    if (inquireBtn) {
        inquireBtn.dataset.selectedSize = size;
        const siteBaseUrl = window.location.origin + window.location.pathname;
        const productName = inquireBtn.dataset.productName;
        const productPrice = inquireBtn.dataset.productPrice;
        const productLink = `${siteBaseUrl}#item-${cardId}`;
        const messageText = `Hi Dabia Dixi, I'm interested in ordering:\n*${productName}* (Size: ${size}, Price: $${productPrice})\n\nView item here:\n${productLink}`;
        inquireBtn.href = `https://wa.me/67078571996?text=${encodeURIComponent(messageText)}`;
    }
}

function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    if (index > -1) {
        wishlist.splice(index, 1);
    } else {
        wishlist.push(productId);
    }
    localStorage.setItem('dabia_wishlist', JSON.stringify(wishlist));
    updateBadges();
    applyFilters();
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const addBtn = document.getElementById(`add-btn-${productId}`);
    const selectedSize = addBtn && addBtn.dataset.selectedSize ? addBtn.dataset.selectedSize : (product.sizes && product.sizes.length > 0 ? product.sizes[0] : (product.size || 'Free Size'));

    const existingItem = cart.find(item => item.id === productId && item.size === selectedSize);
    if (existingItem) {
        if (existingItem.qty < product.stock_quantity) {
            existingItem.qty += 1;
        } else {
            alert('Cannot add more than available stock.');
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            size: selectedSize,
            image: product.image_url || '',
            qty: 1
        });
    }
    localStorage.setItem('dabia_cart', JSON.stringify(cart));
    updateBadges();
    alert(`Added to your shopping bag (Size: ${selectedSize})!`);
}

function updateCartQty(productId, size, delta) {
    const item = cart.find(i => i.id === productId && i.size === size);
    const product = allProducts.find(p => p.id === productId);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => !(i.id === productId && i.size === size));
        } else if (product && item.qty > product.stock_quantity) {
            item.qty = product.stock_quantity;
            alert('Reached maximum available stock.');
        }
        localStorage.setItem('dabia_cart', JSON.stringify(cart));
        updateBadges();
        renderCartModalContent();
    }
}

function removeFromCart(productId, size) {
    cart = cart.filter(i => !(i.id === productId && i.size === size));
    localStorage.setItem('dabia_cart', JSON.stringify(cart));
    updateBadges();
    renderCartModalContent();
}

function updateBadges() {
    const wBadge = document.getElementById('wishlist-badge');
    const cBadge = document.getElementById('cart-badge');
    
    if (wishlist.length > 0) {
        wBadge.textContent = wishlist.length;
        wBadge.classList.remove('hidden');
    } else {
        wBadge.classList.add('hidden');
    }

    const totalCartItems = cart.reduce((acc, item) => acc + item.qty, 0);
    if (totalCartItems > 0) {
        cBadge.textContent = totalCartItems;
        cBadge.classList.remove('hidden');
    } else {
        cBadge.classList.add('hidden');
    }
}

function openWishlistModal() {
    renderWishlistModalContent();
    document.getElementById('wishlist-modal').classList.remove('hidden');
}

function closeWishlistModal() {
    document.getElementById('wishlist-modal').classList.add('hidden');
}

function openCartModal() {
    renderCartModalContent();
    document.getElementById('cart-modal').classList.remove('hidden');
}

function closeCartModal() {
    document.getElementById('cart-modal').classList.add('hidden');
}

function renderWishlistModalContent() {
    const container = document.getElementById('wishlist-items-container');
    const savedProducts = allProducts.filter(p => wishlist.includes(p.id));

    if (savedProducts.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-400 text-center py-8">Your wishlist is empty. Click the heart icon on any item to save it!</p>`;
        return;
    }

    container.innerHTML = savedProducts.map(p => `
        <div class="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs">
            <div class="flex items-center gap-3">
                <img src="${p.image_url || ''}" class="w-12 h-12 object-cover rounded-lg bg-stone-200">
                <div>
                    <h4 class="font-serif font-bold text-stone-900">${p.name}</h4>
                    <p class="text-[#3A4F41] font-bold mt-0.5">$${Number(p.price).toFixed(2)}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="addToCart('${p.id}'); closeWishlistModal(); openCartModal();" class="px-3 py-1.5 bg-[#3A4F41] text-white rounded-lg text-[10px] font-medium hover:bg-[#2C3E35]">Add to Bag</button>
                <button onclick="toggleWishlist('${p.id}'); renderWishlistModalContent();" class="text-rose-500 hover:text-rose-700 px-2 py-1 text-sm">&times;</button>
            </div>
        </div>
    `).join('');
}

function renderCartModalContent() {
    const container = document.getElementById('cart-items-container');
    const grandTotalEl = document.getElementById('cart-grand-total');

    if (cart.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-400 text-center py-8">Your shopping bag is empty.</p>`;
        grandTotalEl.textContent = '$0.00';
        return;
    }

    let grandTotal = 0;
    container.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.qty;
        grandTotal += itemTotal;
        return `
            <div class="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                <div class="flex items-center gap-3">
                    <img src="${item.image}" class="w-12 h-12 object-cover rounded-lg bg-stone-200">
                    <div>
                        <h4 class="font-serif font-bold text-stone-900">${item.name}</h4>
                        <p class="text-stone-500 text-[10px]">Size: <span class="font-bold text-stone-700">${item.size}</span> | $${Number(item.price).toFixed(2)} each</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center border border-stone-300 rounded bg-white">
                        <button onclick="updateCartQty('${item.id}', '${item.size}', -1)" class="px-2 py-0.5 text-stone-600 hover:bg-stone-100">-</button>
                        <span class="px-2 font-bold text-xs">${item.qty}</span>
                        <button onclick="updateCartQty('${item.id}', '${item.size}', 1)" class="px-2 py-0.5 text-stone-600 hover:bg-stone-100">+</button>
                    </div>
                    <span class="font-bold text-[#3A4F41] min-w-[50px] text-right">$${itemTotal.toFixed(2)}</span>
                    <button onclick="removeFromCart('${item.id}', '${item.size}')" class="text-stone-400 hover:text-red-600 text-sm">&times;</button>
                </div>
            </div>
        `;
    }).join('');

    grandTotalEl.textContent = `$${grandTotal.toFixed(2)}`;
}

function sendWhatsAppCartOrder() {
    if (cart.length === 0) return;
    let messageText = `Hi Dabia Dixi, I would like to place an order for the following items:\n\n`;
    let grandTotal = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        grandTotal += itemTotal;
        messageText += `${index + 1}. *${item.name}*\n   Size: ${item.size} | Qty: ${item.qty} | Price: $${itemTotal.toFixed(2)}\n`;
    });

    messageText += `\n*Grand Total: $${grandTotal.toFixed(2)}*\n\nPlease let me know availability and payment details. Thank you!`;
    const encodedMsg = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/67078571996?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
}

function openReceiptModal(saleName, qty, price, total, date) {
    document.getElementById('receipt-date').textContent = `Date: ${date ? date.split('T')[0] : new Date().toISOString().split('T')[0]}`;
    document.getElementById('receipt-items-list').innerHTML = `
        <div class="flex justify-between">
            <span>${saleName} (x${qty})</span>
            <span>$${Number(total).toFixed(2)}</span>
        </div>
        <div class="text-[10px] text-stone-500">Unit Price: $${Number(price).toFixed(2)}</div>
    `;
    document.getElementById('receipt-total').textContent = `$${Number(total).toFixed(2)}`;
    document.getElementById('receipt-modal').classList.remove('hidden');
}

function closeReceiptModal() {
    document.getElementById('receipt-modal').classList.add('hidden');
}

async function renderStorefront() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="bg-[#3A4F41] text-white rounded-2xl p-6 md:p-12 mb-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
            <div class="max-w-xl">
                <span class="text-xs uppercase tracking-widest text-stone-300 font-semibold">✨ New Season Collection</span>
                <h2 class="text-2xl md:text-4xl font-serif font-bold mt-2 mb-3">Elevate Your Everyday Style</h2>
                <p class="text-stone-200 text-xs md:text-sm leading-relaxed">Discover timeless fashion designed to make you feel extraordinary. Sustainable preloved pieces and pristine new arrivals.</p>
            </div>
            <div class="bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20 text-center min-w-[180px]">
                <p class="text-xs uppercase tracking-wider text-stone-200 mb-1">💬 Direct Orders</p>
                <p class="text-base md:text-lg font-bold">+670 78571996</p>
                <span class="text-[10px] text-stone-300">WhatsApp Available</span>
            </div>
        </div>

        <div class="mb-6 flex flex-wrap justify-center gap-3">
            <button onclick="setCollectionFilter('All')" class="px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition collection-btn ${currentCollectionFilter === 'All' ? 'bg-[#3A4F41] text-white shadow' : 'bg-white text-stone-700 border border-stone-200'}" id="col-All">🌟 All Collections</button>
            <button onclick="setCollectionFilter('Women')" class="px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition collection-btn ${currentCollectionFilter === 'Women' ? 'bg-[#3A4F41] text-white shadow' : 'bg-white text-stone-700 border border-stone-200'}" id="col-Women">👩 Women</button>
            <button onclick="setCollectionFilter('Men')" class="px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition collection-btn ${currentCollectionFilter === 'Men' ? 'bg-[#3A4F41] text-white shadow' : 'bg-white text-stone-700 border border-stone-200'}" id="col-Men">👨 Men</button>
            <button onclick="setCollectionFilter('Unisex')" class="px-5 py-2 rounded-full text-xs font-bold tracking-wider uppercase transition collection-btn ${currentCollectionFilter === 'Unisex' ? 'bg-[#3A4F41] text-white shadow' : 'bg-white text-stone-700 border border-stone-200'}" id="col-Unisex">✨ Unisex</button>
        </div>

        <div class="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button onclick="filterByCategory('all')" class="category-pill px-4 py-2 text-xs rounded-full font-medium transition whitespace-nowrap bg-[#3A4F41] text-white" id="cat-all">📁 All Categories</button>
            <button onclick="filterByCategory('Dresses')" class="category-pill px-4 py-2 text-xs rounded-full font-medium transition whitespace-nowrap bg-white text-stone-700 border border-stone-200 hover:bg-stone-100" id="cat-Dresses">👗 Dresses</button>
            <button onclick="filterByCategory('Tops')" class="category-pill px-4 py-2 text-xs rounded-full font-medium transition whitespace-nowrap bg-white text-stone-700 border border-stone-200 hover:bg-stone-100" id="cat-Tops">👚 Tops</button>
            <button onclick="filterByCategory('Bottoms')" class="category-pill px-4 py-2 text-xs rounded-full font-medium transition whitespace-nowrap bg-white text-stone-700 border border-stone-200 hover:bg-stone-100" id="cat-Bottoms">👖 Bottoms</button>
            <button onclick="filterByCategory('Outerwear')" class="category-pill px-4 py-2 text-xs rounded-full font-medium transition whitespace-nowrap bg-white text-stone-700 border border-stone-200 hover:bg-stone-100" id="cat-Outerwear">🧥 Outerwear</button>
            <button onclick="filterByCategory('Accessories')" class="category-pill px-4 py-2 text-xs rounded-full font-medium transition whitespace-nowrap bg-white text-stone-700 border border-stone-200 hover:bg-stone-100" id="cat-Accessories">💍 Accessories</button>
            <button onclick="filterByCategory('Bags & Shoes')" class="category-pill px-4 py-2 text-xs rounded-full font-medium transition whitespace-nowrap bg-white text-stone-700 border border-stone-200 hover:bg-stone-100" id="cat-Bags & Shoes">👜 Bags & Shoes</button>
        </div>

        <div class="mb-6 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-stone-200">
            <h3 class="font-serif font-bold text-base md:text-lg text-[#3A4F41]" id="collection-title">All Collections</h3>
            <div class="flex gap-2">
                <button onclick="filterProductsByCondition('all')" class="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 rounded-lg font-medium transition cond-btn active" id="cond-all">All</button>
                <button onclick="filterProductsByCondition('brand_new')" class="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 rounded-lg font-medium transition cond-btn" id="cond-new">Brand New</button>
                <button onclick="filterProductsByCondition('preloved')" class="px-3 py-1.5 text-xs bg-stone-100 text-stone-700 rounded-lg font-medium transition cond-btn" id="cond-preloved">Preloved</button>
            </div>
        </div>

        <div id="product-grid" class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
            <div class="col-span-full text-center py-12 text-stone-400">Loading collection...</div>
        </div>
    `;
    await fetchProducts();
}

async function fetchProducts() {
    const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    if (!error) {
        allProducts = data || [];
        applyFilters();
    }
}

function displayProducts(products) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    const availableProducts = products.filter(p => Number(p.stock_quantity) > 0);

    if (availableProducts.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16 bg-white rounded-xl border border-dashed border-stone-300 text-stone-400">No items available in this collection.</div>`;
        return;
    }

    const siteBaseUrl = window.location.origin + window.location.pathname;

    grid.innerHTML = availableProducts.map(p => {
        const defaultSize = (p.sizes && p.sizes.length > 0) ? p.sizes[0] : (p.size || 'Free Size');
        const productLink = `${siteBaseUrl}#item-${p.id}`;
        const initialMessageText = `Hi Dabia Dixi, I'm interested in ordering:\n*${p.name}* (Size: ${defaultSize}, Price: $${Number(p.price).toFixed(2)})\n\nView item here:\n${productLink}`;
        const whatsappUrl = `https://wa.me/67078571996?text=${encodeURIComponent(initialMessageText)}`;

        const stockBadge = Number(p.stock_quantity) <= 2 
            ? `<span class="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Only ${p.stock_quantity} left!</span>`
            : `<span class="text-[10px] text-stone-600 font-medium bg-stone-100 px-1.5 py-0.5 rounded">Stock: ${p.stock_quantity}</span>`;

        let images = [];
        if (p.image_urls && Array.isArray(p.image_urls) && p.image_urls.length > 0) {
            images = p.image_urls;
        } else if (p.image_url) {
            images = [p.image_url];
        }

        let productSizes = [];
        if (p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0) {
            productSizes = p.sizes;
        } else if (p.size) {
            productSizes = [p.size];
        } else {
            productSizes = ['Free Size'];
        }

        const primaryImg = images.length > 0 ? images[0] : '';
        const isWishlisted = wishlist.includes(p.id);

        return `
            <div id="item-${p.id}" class="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-200 flex flex-col group hover:shadow-md transition">
                <div class="h-48 sm:h-64 bg-stone-100 relative overflow-hidden flex items-center justify-center cursor-pointer">
                    ${primaryImg ? `<img id="main-img-${p.id}" src="${primaryImg}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onclick="openImageModal(this.src)" title="Click to view full image">` : `<span class="text-stone-400 text-xs">No Image</span>`}
                    <span class="absolute top-2 left-2 md:top-3 md:left-3 px-2 py-1 text-[9px] md:text-[10px] font-semibold uppercase rounded tracking-wider shadow-sm ${p.condition === 'brand_new' ? 'bg-[#3A4F41] text-white' : 'bg-amber-100 text-amber-900'}">
                        ${p.condition === 'brand_new' ? '✨ Brand New' : '♻️ Preloved'}
                    </span>
                    <button onclick="toggleWishlist('${p.id}')" class="absolute top-2 right-2 md:top-3 md:right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-sm shadow transition hover:bg-white" title="Save to Wishlist">
                        ${isWishlisted ? '❤️' : '🤍'}
                    </button>
                </div>
                ${images.length > 1 ? `
                    <div id="card-thumb-container-${p.id}" class="flex gap-1 p-2 bg-stone-50 overflow-x-auto border-b border-stone-100">
                        ${images.map((imgUrl, idx) => `
                            <img src="${imgUrl}" class="w-9 h-9 object-cover rounded cursor-pointer hover:opacity-80 transition ${idx === 0 ? 'ring-2 ring-[#3A4F41]' : ''}" onclick="switchCardImage('${p.id}', '${imgUrl}', this)">
                        `).join('')}
                    </div>
                ` : ''}
                <div class="p-3 md:p-4 flex flex-col flex-grow">
                    <span class="text-[9px] md:text-[10px] text-stone-400 uppercase tracking-widest mb-1 font-medium">${p.category}</span>
                    <h4 class="font-serif font-bold text-stone-900 text-sm md:text-base mb-1 truncate">${p.name}</h4>
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm md:text-lg font-extrabold text-[#3A4F41]">$${Number(p.price).toFixed(2)}</span>
                        ${stockBadge}
                    </div>

                    <div class="mb-3">
                        <span class="text-[10px] text-stone-400 uppercase tracking-wide block mb-1">Select Size</span>
                        <div id="card-size-container-${p.id}" class="flex flex-wrap gap-1.5">
                            ${productSizes.map((sz, idx) => `
                                <button onclick="selectCardSize('${p.id}', '${sz}', this)" class="px-2.5 py-1 text-[10px] rounded border font-medium transition ${idx === 0 ? 'bg-[#3A4F41] text-white border-[#3A4F41]' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'}">${sz}</button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-2 mt-auto">
                        <a id="inquire-btn-${p.id}" href="${whatsappUrl}" target="_blank" data-selected-size="${defaultSize}" data-product-name="${p.name.replace(/'/g, "\\'")}" data-product-price="${p.price}" class="w-full bg-[#3A4F41] text-white text-center py-2 rounded-lg text-[11px] font-medium hover:bg-[#2C3E35] transition flex items-center justify-center">
                            💬 Inquire
                        </a>
                        <button id="add-btn-${p.id}" data-selected-size="${defaultSize}" onclick="addToCart('${p.id}')" class="w-full bg-stone-100 text-stone-800 text-center py-2 rounded-lg text-[11px] font-medium hover:bg-stone-200 transition flex items-center justify-center gap-1">
                            🛍️ Add
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function setCollectionFilter(collection) {
    currentCollectionFilter = collection;
    document.querySelectorAll('.collection-btn').forEach(b => {
        b.classList.remove('bg-[#3A4F41]', 'text-white', 'shadow');
        b.classList.add('bg-white', 'text-stone-700', 'border', 'border-stone-200');
    });
    const activeCol = document.getElementById(`col-${collection}`);
    if (activeCol) {
        activeCol.classList.remove('bg-white', 'text-stone-700', 'border', 'border-stone-200');
        activeCol.classList.add('bg-[#3A4F41]', 'text-white', 'shadow');
    }
    const titleEl = document.getElementById('collection-title');
    if (titleEl) titleEl.textContent = collection === 'All' ? 'All Collections' : `${collection} Collection`;
    applyFilters();
}

function filterByCategory(category) {
    currentCategoryFilter = category;
    document.querySelectorAll('.category-pill').forEach(b => {
        b.classList.remove('bg-[#3A4F41]', 'text-white');
        b.classList.add('bg-white', 'text-stone-700', 'border', 'border-stone-200');
    });
    const activeBtn = document.getElementById(`cat-${category}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-stone-700', 'border', 'border-stone-200');
        activeBtn.classList.add('bg-[#3A4F41]', 'text-white');
    }
    applyFilters();
}

function filterProductsByCondition(condition) {
    currentConditionFilter = condition;
    document.querySelectorAll('.cond-btn').forEach(b => {
        b.classList.remove('bg-[#3A4F41]', 'text-white');
        b.classList.add('bg-stone-100', 'text-stone-700');
    });
    const activeBtn = condition === 'all' ? document.getElementById('cond-all') : condition === 'brand_new' ? document.getElementById('cond-new') : document.getElementById('cond-preloved');
    if (activeBtn) {
        activeBtn.classList.remove('bg-stone-100', 'text-stone-700');
        activeBtn.classList.add('bg-[#3A4F41]', 'text-white');
    }
    applyFilters();
}

function applyFilters() {
    let filtered = allProducts;
    if (currentCollectionFilter !== 'All') {
        filtered = filtered.filter(p => (p.collection || 'Women') === currentCollectionFilter);
    }
    if (currentCategoryFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategoryFilter);
    }
    if (currentConditionFilter !== 'all') {
        filtered = filtered.filter(p => p.condition === currentConditionFilter);
    }
    displayProducts(filtered);
}

async function renderDashboard() {
    if (userRole === 'customer') { switchView('storefront'); return; }
    await fetchFinancialData();

    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div class="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 h-fit space-y-2">
                <div class="p-3 mb-2 border-b border-stone-100">
                    <h3 class="font-serif font-bold text-base text-[#3A4F41]">Owner Dashboard</h3>
                    <p class="text-[11px] text-stone-400">Dabia Dixi Management</p>
                </div>
                <button onclick="setDashboardTab('overview')" class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition flex items-center gap-3 db-tab ${currentDashboardTab === 'overview' ? 'bg-[#3A4F41] text-white' : 'text-stone-700 hover:bg-stone-100'}" id="tab-overview">📊 Financial Overview</button>
                <button onclick="setDashboardTab('reports')" class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition flex items-center gap-3 db-tab ${currentDashboardTab === 'reports' ? 'bg-[#3A4F41] text-white' : 'text-stone-700 hover:bg-stone-100'}" id="tab-reports">📈 Daily & Expense Reports</button>
                <button onclick="setDashboardTab('pos')" class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition flex items-center gap-3 db-tab ${currentDashboardTab === 'pos' ? 'bg-[#3A4F41] text-white' : 'text-stone-700 hover:bg-stone-100'}" id="tab-pos">🛍️ Record Sale (Visual POS)</button>
                <button onclick="setDashboardTab('products')" class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition flex items-center gap-3 db-tab ${currentDashboardTab === 'products' ? 'bg-[#3A4F41] text-white' : 'text-stone-700 hover:bg-stone-100'}" id="tab-products">👗 Inventory & Add Product</button>
                <button onclick="setDashboardTab('purchases')" class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition flex items-center gap-3 db-tab ${currentDashboardTab === 'purchases' ? 'bg-[#3A4F41] text-white' : 'text-stone-700 hover:bg-stone-100'}" id="tab-purchases">📦 Buy Items (Restock)</button>
                <button onclick="setDashboardTab('expenses')" class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition flex items-center gap-3 db-tab ${currentDashboardTab === 'expenses' ? 'bg-[#3A4F41] text-white' : 'text-stone-700 hover:bg-stone-100'}" id="tab-expenses">💸 Extra Expenses</button>
                <div class="pt-4 border-t border-stone-100">
                    <button onclick="switchView('storefront')" class="w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium text-stone-500 hover:bg-stone-100 transition">🌐 View Storefront</button>
                </div>
            </div>
            <div class="lg:col-span-3 space-y-6" id="dashboard-main-area"></div>
        </div>
    `;
    renderDashboardContent();
}

function setDashboardTab(tab) {
    currentDashboardTab = tab;
    document.querySelectorAll('.db-tab').forEach(b => {
        b.classList.remove('bg-[#3A4F41]', 'text-white');
        b.classList.add('text-stone-700', 'hover:bg-stone-100');
    });
    const active = document.getElementById(`tab-${tab}`);
    if (active) {
        active.classList.remove('text-stone-700', 'hover:bg-stone-100');
        active.classList.add('bg-[#3A4F41]', 'text-white');
    }
    renderDashboardContent();
}

async function fetchFinancialData() {
    const { data: prodData } = await supabaseClient.from('products').select('*');
    allProducts = prodData || [];
    const { data: purData } = await supabaseClient.from('purchases').select('*');
    allPurchases = purData || [];
    const { data: expData } = await supabaseClient.from('expenses').select('*');
    allExpenses = expData || [];
    const { data: saleData } = await supabaseClient.from('sales').select('*').order('created_at', { ascending: false });
    allSales = saleData || [];
}

async function renderDashboardContent() {
    const area = document.getElementById('dashboard-main-area');
    if (!area) return;

    if (currentDashboardTab === 'overview') {
        await fetchFinancialData();
        const totalSalesRevenue = allSales.reduce((acc, s) => acc + Number(s.total_revenue), 0);
        const totalPurchasesCost = allPurchases.reduce((acc, pur) => acc + (Number(pur.cost) * pur.quantity), 0);
        const totalExtraExpenses = allExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0);
        const totalSpending = totalPurchasesCost + totalExtraExpenses;
        const netProfit = totalSalesRevenue - totalSpending;
        const lowStockItems = allProducts.filter(p => Number(p.stock_quantity) <= 2);

        area.innerHTML = `
            <div class="space-y-6">
                ${lowStockItems.length > 0 ? `
                    <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">⚠️</span>
                            <div>
                                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-900">Low Stock Alert</h4>
                                <p class="text-xs text-amber-700">${lowStockItems.length} product(s) are running low on inventory (2 or fewer left).</p>
                            </div>
                        </div>
                        <button onclick="setDashboardTab('products')" class="px-3 py-1.5 bg-amber-800 text-white rounded-lg text-xs font-medium hover:bg-amber-900 transition">Review Inventory</button>
                    </div>
                ` : ''}

                <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <h3 class="text-lg font-serif font-bold text-[#3A4F41] mb-2">Financial Command Center</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                            <span class="text-xs text-stone-500 uppercase tracking-wider">Total Sales Income</span>
                            <p class="text-2xl font-serif font-bold text-emerald-700 mt-1">$${totalSalesRevenue.toFixed(2)}</p>
                        </div>
                        <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                            <span class="text-xs text-stone-500 uppercase tracking-wider">Restock Costs</span>
                            <p class="text-2xl font-serif font-bold text-amber-800 mt-1">$${totalPurchasesCost.toFixed(2)}</p>
                        </div>
                        <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                            <span class="text-xs text-stone-500 uppercase tracking-wider">Extra Expenses</span>
                            <p class="text-2xl font-serif font-bold text-red-700 mt-1">$${totalExtraExpenses.toFixed(2)}</p>
                        </div>
                        <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                            <span class="text-xs text-stone-500 uppercase tracking-wider">Net Profit</span>
                            <p class="text-2xl font-serif font-bold ${netProfit >= 0 ? 'text-[#3A4F41]' : 'text-red-600'} mt-1">$${netProfit.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 md:col-span-2">
                        <h4 class="font-serif font-bold text-stone-900 mb-3 text-sm">🛍️ Recent Sales & Receipts</h4>
                        <div class="space-y-2 max-h-60 overflow-y-auto">
                            ${allSales.length === 0 ? '<p class="text-xs text-stone-400">No sales recorded yet.</p>' : allSales.map(s => `
                                <div class="flex justify-between items-center p-2.5 bg-stone-50 rounded-lg text-xs border border-stone-100">
                                    <div>
                                        <p class="font-medium text-stone-800">${s.product_name} (x${s.quantity_sold})</p>
                                        <span class="text-[10px] text-stone-400">${s.created_at ? s.created_at.split('T')[0] : ''}</span> </div> <div class="flex items-center gap-3"> <span class="font-bold text-emerald-700">+$${Number(s.total_revenue).toFixed(2)}</span>
                                        <button onclick="openReceiptModal('${s.product_name.replace(/'/g, "\\'")}', ${s.quantity_sold},${s.selling_price || (s.total_revenue/s.quantity_sold)}, ${s.total_revenue}, '${s.created_at}')" class="px-2.5 py-1 bg-[#3A4F41] text-white rounded text-[10px] font-medium hover:bg-[#2C3E35] transition">🖨️ Receipt</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                        <h4 class="font-serif font-bold text-stone-900 mb-3 text-sm">⚠️ Low Stock Watchlist</h4>
                        <div class="space-y-2 max-h-60 overflow-y-auto">
                            ${lowStockItems.length === 0 ? '<p class="text-xs text-stone-400">All items have healthy stock levels!</p>' : lowStockItems.map(p => `
                                <div class="flex justify-between items-center p-2 bg-amber-50/50 rounded-lg text-xs border border-amber-100">
                                    <span class="font-medium text-stone-800 truncate max-w-[140px]">${p.name}</span>
                                    <span class="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">Left: ${p.stock_quantity}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (currentDashboardTab === 'reports') {
        await fetchFinancialData();
        const dailyMap = {};
        allSales.forEach(s => {
            const date = s.created_at ? s.created_at.split('T')[0] : 'Unknown';
            if (!dailyMap[date]) dailyMap[date] = { income: 0, spending: 0 };
            dailyMap[date].income += Number(s.total_revenue);
        });
        allPurchases.forEach(p => {
            const date = p.created_at ? p.created_at.split('T')[0] : 'Unknown';
            if (!dailyMap[date]) dailyMap[date] = { income: 0, spending: 0 };
            dailyMap[date].spending += Number(p.cost) * p.quantity;
        });
        allExpenses.forEach(e => {
            const date = e.created_at ? e.created_at.split('T')[0] : 'Unknown';
            if (!dailyMap[date]) dailyMap[date] = { income: 0, spending: 0 };
            dailyMap[date].spending += Number(e.amount);
        });
        const sortedDates = Object.keys(dailyMap).sort().reverse();

        area.innerHTML = `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                    <h3 class="text-lg font-serif font-bold text-[#3A4F41] mb-2">Financial Trend & Graphs</h3>
                    <div class="w-full h-72"><canvas id="financialChart"></canvas></div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                        <h4 class="font-serif font-bold text-stone-900 mb-3 text-sm">📅 Daily Financial Breakdown</h4>
                        <div class="space-y-3 max-h-80 overflow-y-auto">
                            ${sortedDates.length === 0 ? '<p class="text-xs text-stone-400">No records found.</p>' : sortedDates.map(date => `
                                <div class="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center text-xs">
                                    <div>
                                        <p class="font-bold text-stone-800">${date}</p>
                                        <span class="text-[10px] text-emerald-700">Income: $${dailyMap[date].income.toFixed(2)}</span> \vert{} <span class="text-[10px] text-red-600">Spending: $${dailyMap[date].spending.toFixed(2)}</span>
                                    </div>
                                    <span class="font-bold ${dailyMap[date].income - dailyMap[date].spending >= 0 ? 'text-[#3A4F41]' : 'text-red-600'}">Net: $${(dailyMap[date].income - dailyMap[date].spending).toFixed(2)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                        <h4 class="font-serif font-bold text-stone-900 mb-3 text-sm">💸 Expenses by Category</h4>
                        <div class="space-y-3 max-h-80 overflow-y-auto">
                            ${allExpenses.length === 0 ? '<p class="text-xs text-stone-400">No expenses logged.</p>' : allExpenses.map(e => `
                                <div class="p-3 bg-stone-50 rounded-xl border border-stone-100 flex justify-between items-center text-xs">
                                    <div>
                                        <p class="font-medium text-stone-800">${e.title}</p>
                                        <span class="text-[10px] text-stone-400 uppercase font-semibold bg-stone-200 px-1.5 py-0.5 rounded">${e.category}</span> </div> <div class="flex items-center gap-2"> <span class="font-bold text-red-700">-$${Number(e.amount).toFixed(2)}</span>${e.receipt_url ? `<button onclick="openImageModal('${e.receipt_url}')" class="px-2 py-1 bg-stone-200 text-stone-700 rounded text-[10px] hover:bg-stone-300">📄 Receipt</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        setTimeout(() => {
            const ctx = document.getElementById('financialChart');
            if (ctx && sortedDates.length > 0) {
                const chartDates = [...sortedDates].reverse();
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: chartDates,
                        datasets: [
                            { label: 'Income ($)', data: chartDates.map(d => dailyMap[d].income), backgroundColor: '#10B981', borderRadius: 6 },
                            { label: 'Spending ($)', data: chartDates.map(d => dailyMap[d].spending), backgroundColor: '#EF4444', borderRadius: 6 }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                });
            }
        }, 150);

    } else if (currentDashboardTab === 'pos') {
        const inStockItems = allProducts.filter(p => Number(p.stock_quantity) > 0);
        area.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 class="text-lg font-serif font-bold text-[#3A4F41] mb-2">Record a Sale (Visual POS)</h3>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    ${inStockItems.length === 0 ? '<p class="col-span-full text-center text-xs text-stone-400 py-8">No items in stock.</p>' : inStockItems.map(p => `
                        <div class="bg-stone-50 rounded-xl p-3 border border-stone-200 flex flex-col justify-between">
                            <div>
                                <div class="h-32 bg-stone-200 rounded-lg overflow-hidden mb-2 relative flex items-center justify-center">
                                    ${p.image_url ? `<img src="${p.image_url}" class="w-full h-full object-cover">` : '<span class="text-[10px] text-stone-400">No Image</span>'}
                                </div>
                                <h4 class="font-serif font-bold text-stone-900 text-xs truncate">${p.name}</h4> <p class="text-xs font-bold text-[#3A4F41] mt-0.5">$${Number(p.price).toFixed(2)} (Stock:${p.stock_quantity})</p>
                            </div>
                            <button onclick="openPOSModal('${p.id}', '${p.name.replace(/'/g, "\\'")}', ${p.price},${p.stock_quantity})" class="mt-3 w-full bg-[#3A4F41] text-white py-1.5 rounded-lg text-xs font-medium hover:bg-[#2C3E35] transition">Sell Item</button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div id="pos-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex justify-center items-center z-50 p-4">
                <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl relative border border-stone-100">
                    <h3 class="text-base font-serif font-bold mb-3 text-[#3A4F41]" id="pos-modal-title">Complete Sale</h3>
                    <form onsubmit="handleVisualPOSSale(event)" class="space-y-3">
                        <input type="hidden" id="pos-modal-id">
                        <input type="hidden" id="pos-modal-max-stock">
                        <input type="hidden" id="pos-modal-name">
                        <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Selling Price ($)</label><input type="number" step="0.01" id="pos-modal-price" required class="w-full border border-stone-300 rounded-lg p-2 text-sm outline-none"></div>
                        <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Quantity Sold</label><input type="number" id="pos-modal-qty" value="1" min="1" required class="w-full border border-stone-300 rounded-lg p-2 text-sm outline-none"></div>
                        <div class="flex justify-end space-x-2 pt-2">
                            <button type="button" onclick="closePOSModal()" class="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg">Cancel</button>
                            <button type="submit" id="pos-modal-btn" class="px-4 py-1.5 text-xs bg-[#3A4F41] text-white rounded-lg font-medium hover:bg-[#2C3E35]">Confirm Sale</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    } else if (currentDashboardTab === 'products') {
        area.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 class="text-lg font-serif font-bold text-[#3A4F41] mb-4">Add New Boutique Item</h3>
                <form onsubmit="handleCreateProduct(event)" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Product Name</label><input type="text" id="prod-name" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                    <div>
                        <label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Collection</label>
                        <select id="prod-collection" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none bg-white">
                            <option value="Women" selected>Women's Collection</option>
                            <option value="Men">Men's Collection</option>
                            <option value="Unisex">Unisex Collection</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Category</label>
                        <select id="prod-category" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none bg-white">
                            <option value="" disabled selected>Select category</option>
                            <option value="Dresses">Dresses</option>
                            <option value="Tops">Tops</option>
                            <option value="Bottoms">Bottoms</option>
                            <option value="Outerwear">Outerwear</option>
                            <option value="Accessories">Accessories</option>
                            <option value="Bags & Shoes">Bags & Shoes</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Condition</label>
                        <select id="prod-condition" class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none bg-white">
                            <option value="brand_new">Brand New</option>
                            <option value="preloved">Preloved</option>
                        </select>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-semibold uppercase text-stone-500 mb-2">Inventory Stock Per Size</label>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-stone-50 p-3 rounded-xl border border-stone-200">
                            <div>
                                <span class="text-[11px] font-bold text-stone-700 block mb-1">XS</span>
                                <input type="number" id="stock-xs" value="0" min="0" class="w-full border border-stone-300 rounded p-1.5 text-xs bg-white">
                            </div>
                            <div>
                                <span class="text-[11px] font-bold text-stone-700 block mb-1">S</span>
                                <input type="number" id="stock-s" value="0" min="0" class="w-full border border-stone-300 rounded p-1.5 text-xs bg-white">
                            </div>
                            <div>
                                <span class="text-[11px] font-bold text-stone-700 block mb-1">M</span>
                                <input type="number" id="stock-m" value="0" min="0" class="w-full border border-stone-300 rounded p-1.5 text-xs bg-white">
                            </div>
                            <div>
                                <span class="text-[11px] font-bold text-stone-700 block mb-1">L</span>
                                <input type="number" id="stock-l" value="0" min="0" class="w-full border border-stone-300 rounded p-1.5 text-xs bg-white">
                            </div>
                            <div>
                                <span class="text-[11px] font-bold text-stone-700 block mb-1">XL</span>
                                <input type="number" id="stock-xl" value="0" min="0" class="w-full border border-stone-300 rounded p-1.5 text-xs bg-white">
                            </div>
                            <div>
                                <span class="text-[11px] font-bold text-stone-700 block mb-1">Free Size</span>
                                <input type="number" id="stock-freesize" value="0" min="0" class="w-full border border-stone-300 rounded p-1.5 text-xs bg-white">
                            </div>
                        </div>
                        <span class="text-[10px] text-stone-400 mt-1 block">Enter stock numbers for the sizes available. Sizes with 0 stock will be hidden on the storefront.</span>
                    </div>
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Selling Price ($)</label><input type="number" step="0.01" id="prod-price" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Cost Price ($)</label><input type="number" step="0.01" id="prod-cost" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Product Photos (Select Multiple)</label>
                        <input type="file" id="prod-images" accept="image/*" multiple class="w-full border border-stone-300 rounded-lg p-2 text-sm">
                    </div>
                    <div class="md:col-span-2 flex justify-end pt-2">
                        <button type="submit" id="submit-btn" class="bg-[#3A4F41] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2C3E35] transition">Save Product to Inventory</button>
                    </div>
                </form>
            </div>
        `;
    } else if (currentDashboardTab === 'purchases') {
        area.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 class="text-lg font-serif font-bold text-[#3A4F41] mb-2">Buy Items (Restock Costs)</h3>
                <form onsubmit="handleCreatePurchase(event)" class="space-y-4">
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Item / Batch Name</label><input type="text" id="pur-name" required placeholder="e.g., Summer Dresses Wholesale" class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Total Cost ($)</label><input type="number" step="0.01" id="pur-cost" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                        <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Quantity</label><input type="number" id="pur-qty" value="1" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                    </div>
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Restock Receipt Photo (Optional)</label><input type="file" id="pur-receipt" accept="image/*" class="w-full border border-stone-300 rounded-lg p-2 text-sm"></div>
                    <div class="flex justify-end pt-2"><button type="submit" id="pur-btn" class="bg-[#3A4F41] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2C3E35]">Log Restock Purchase</button></div>
                </form>
            </div>
        `;
    } else if (currentDashboardTab === 'expenses') {
        area.innerHTML = `
            <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
                <h3 class="text-lg font-serif font-bold text-[#3A4F41] mb-2">Extra Boutique Expenses</h3>
                <form onsubmit="handleCreateExpense(event)" class="space-y-4">
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Expense Title</label><input type="text" id="exp-title" required placeholder="e.g., Bubble mailers" class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                    <div>
                        <label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Category</label>
                        <select id="exp-category" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none bg-white">
                            <option value="" disabled selected>Select category</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Shipping">Shipping</option>
                            <option value="Marketing">Marketing / Ads</option>
                            <option value="Utilities">Utilities / Rent</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Amount ($)</label><input type="number" step="0.01" id="exp-amount" required class="w-full border border-stone-300 rounded-lg p-2.5 text-sm outline-none"></div>
                    <div><label class="block text-xs font-semibold uppercase text-stone-500 mb-1">Expense Receipt Photo (Optional)</label><input type="file" id="exp-receipt" accept="image/*" class="w-full border border-stone-300 rounded-lg p-2 text-sm"></div>
                    <div class="flex justify-end pt-2"><button type="submit" id="exp-btn" class="bg-[#3A4F41] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2C3E35]">Log Expense</button></div>
                </form>
            </div>
        `;
    }
}

function openPOSModal(id, name, price, stock) {
    document.getElementById('pos-modal-id').value = id;
    document.getElementById('pos-modal-max-stock').value = stock;
    document.getElementById('pos-modal-price').value = price;
    document.getElementById('pos-modal-qty').value = 1;
    document.getElementById('pos-modal-name').value = name;
    document.getElementById('pos-modal-title').textContent = `Sell: ${name}`;
    document.getElementById('pos-modal').classList.remove('hidden');
}

function closePOSModal() {
    document.getElementById('pos-modal').classList.add('hidden');
}

async function handleVisualPOSSale(e) {
    e.preventDefault();
    const btn = document.getElementById('pos-modal-btn');
    btn.textContent = 'Processing...';
    btn.disabled = true;

    const product_id = document.getElementById('pos-modal-id').value;
    const max_stock = parseInt(document.getElementById('pos-modal-max-stock').value);
    const selling_price = parseFloat(document.getElementById('pos-modal-price').value);
    const quantity_sold = parseInt(document.getElementById('pos-modal-qty').value);
    const product_name = document.getElementById('pos-modal-name').value;

    if (quantity_sold > max_stock) {
        alert(`Error: Cannot sell ${quantity_sold} units. Only ${max_stock} left in stock.`);
        btn.textContent = 'Confirm Sale';
        btn.disabled = false;
        return;
    }

    const total_revenue = selling_price * quantity_sold;
    await supabaseClient.from('sales').insert([{ product_name, quantity_sold, selling_price, total_revenue }]);
    await supabaseClient.from('products').update({ stock_quantity: max_stock - quantity_sold }).eq('id', product_id);

    closePOSModal();
    btn.textContent = 'Confirm Sale';
    btn.disabled = false;
    openReceiptModal(product_name, quantity_sold, selling_price, total_revenue);
    setDashboardTab('overview');
}

async function handleCreatePurchase(e) {
    e.preventDefault();
    const btn = document.getElementById('pur-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const item_name = document.getElementById('pur-name').value;
    const cost = parseFloat(document.getElementById('pur-cost').value);
    const quantity = parseInt(document.getElementById('pur-qty').value);
    const receiptFile = document.getElementById('pur-receipt').files[0];

    let receiptUrl = '';
    if (receiptFile) {
        const compressedImg = await compressImageFile(receiptFile, 800, 0.8);
        const fileName = `pur_${Date.now()}.${receiptFile.name.split('.').pop()}`;
        const { error: uploadErr } = await supabaseClient.storage.from('product-images').upload(fileName, compressedImg);
        if (!uploadErr) {
            const { data: pubUrl } = supabaseClient.storage.from('product-images').getPublicUrl(fileName);
            receiptUrl = pubUrl.publicUrl;
        }
    }

    await supabaseClient.from('purchases').insert([{ item_name, cost, quantity, receipt_url: receiptUrl }]);
    alert('Restock purchase logged!');
    setDashboardTab('overview');
}

async function handleCreateExpense(e) {
    e.preventDefault();
    const btn = document.getElementById('exp-btn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    const title = document.getElementById('exp-title').value;
    const category = document.getElementById('exp-category').value;
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const receiptFile = document.getElementById('exp-receipt').files[0];

    let receiptUrl = '';
    if (receiptFile) {
        const compressedImg = await compressImageFile(receiptFile, 800, 0.8);
        const fileName = `exp_${Date.now()}.${receiptFile.name.split('.').pop()}`;
        const { error: uploadErr } = await supabaseClient.storage.from('product-images').upload(fileName, compressedImg);
        if (!uploadErr) {
            const { data: pubUrl } = supabaseClient.storage.from('product-images').getPublicUrl(fileName);
            receiptUrl = pubUrl.publicUrl;
        }
    }

    await supabaseClient.from('expenses').insert([{ title, category, amount, receipt_url: receiptUrl }]);
    alert('Expense logged!');
    setDashboardTab('overview');
}

async function compressImageFile(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', quality);
            };
        };
    });
}

async function handleCreateProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    btn.textContent = 'Uploading...';
    btn.disabled = true;

    const name = document.getElementById('prod-name').value;
    const collection = document.getElementById('prod-collection').value;
    const category = document.getElementById('prod-category').value;
    const condition = document.getElementById('prod-condition').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const cost_price = parseFloat(document.getElementById('prod-cost').value);
    const imageFiles = document.getElementById('prod-images').files;

    const sizeStock = {
        'XS': parseInt(document.getElementById('stock-xs').value) || 0,
        'S': parseInt(document.getElementById('stock-s').value) || 0,
        'M': parseInt(document.getElementById('stock-m').value) || 0,
        'L': parseInt(document.getElementById('stock-l').value) || 0,
        'XL': parseInt(document.getElementById('stock-xl').value) || 0,
        'Free Size': parseInt(document.getElementById('stock-freesize').value) || 0
    };

    const activeSizes = Object.keys(sizeStock).filter(sz => sizeStock[sz] > 0);
    const totalStock = Object.values(sizeStock).reduce((a, b) => a + b, 0);
    const primarySize = activeSizes.length > 0 ? activeSizes[0] : 'Free Size';

    let imageUrls = [];
    for (let i = 0; i < imageFiles.length; i++) {
        const compressedImage = await compressImageFile(imageFiles[i], 800, 0.8);
        const fileName = `${Date.now()}_${i}.${imageFiles[i].name.split('.').pop()}`;
        const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(fileName, compressedImage);
        if (!uploadError) {
            const { data: publicUrlData } = supabaseClient.storage.from('product-images').getPublicUrl(fileName);
            imageUrls.push(publicUrlData.publicUrl);
        }
    }

    await supabaseClient.from('products').insert([{
        name, collection, category, condition, 
        size: primarySize, 
        sizes: activeSizes, 
        size_stock: sizeStock,
        stock_quantity: totalStock, 
        price, cost_price, 
        image_url: imageUrls.length > 0 ? imageUrls[0] : '',
        image_urls: imageUrls
    }]);

    alert('Product added successfully with size-specific inventory!');
    document.querySelector('form').reset();
    btn.textContent = 'Save Product to Inventory';
    btn.disabled = false;
}

function openLoginModal() { document.getElementById('login-modal').classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('login-modal').classList.add('hidden'); }

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        alert('Login failed: ' + error.message);
    } else {
        currentUser = data.user;
        determineRole(currentUser.email);
        closeLoginModal();
        updateNavigation();
        switchView('dashboard');
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    userRole = 'customer';
    updateNavigation();
    switchView('storefront');
}

initApp();
