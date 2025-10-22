// LaundryPro Application - Pure JavaScript
const API_URL = 'http://localhost:8080/api';

// State Management
let state = {
    user: null,
    token: null,
    isLogin: true,
    items: [],
    services: [],
    cart: [],
    selectedItem: null,
    quantity: 1,
    selectedServices: [],
    orders: []
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        state.token = token;
        state.user = JSON.parse(user);
        showApp();
        loadAppData();
    } else {
        showAuth();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth form
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    document.getElementById('toggle-auth-mode').addEventListener('click', toggleAuthMode);
    
    // App navigation
    document.getElementById('new-order-tab').addEventListener('click', () => switchTab('new'));
    document.getElementById('history-tab').addEventListener('click', () => switchTab('history'));
    document.getElementById('signout-btn').addEventListener('click', signOut);
    
    // Quantity controls
    document.getElementById('qty-minus').addEventListener('click', () => updateQuantity(-1));
    document.getElementById('qty-plus').addEventListener('click', () => updateQuantity(1));
    
    // Cart actions
    document.getElementById('add-to-cart-btn').addEventListener('click', addToCart);
    document.getElementById('place-order-btn').addEventListener('click', placeOrder);
    
    // Same as pickup address
    document.getElementById('same-as-pickup-btn').addEventListener('click', () => {
        const pickupAddress = document.getElementById('pickup-address').value;
        document.getElementById('delivery-address').value = pickupAddress;
    });
}

// Authentication
async function handleAuth(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    
    setLoading(true, 'auth');
    hideError();
    
    try {
        const endpoint = state.isLogin ? '/auth/login' : '/auth/register';
        const body = state.isLogin 
            ? { email, password }
            : { email, password, full_name: fullName, phone: phone, address: address };
        
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
        }
        
        state.token = data.token;
        state.user = data.user;
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        showApp();
        loadAppData();
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false, 'auth');
    }
}

function toggleAuthMode() {
    state.isLogin = !state.isLogin;
    const fullnameField = document.getElementById('fullname-field');
    const phoneField = document.getElementById('phone-field');
    const addressField = document.getElementById('address-field');
    const authBtnText = document.getElementById('auth-btn-text');
    const toggleBtn = document.getElementById('toggle-auth-mode');
    
    if (state.isLogin) {
        fullnameField.classList.add('hidden');
        phoneField.classList.add('hidden');
        addressField.classList.add('hidden');
        authBtnText.textContent = 'Sign In';
        toggleBtn.textContent = "Don't have an account? Sign up";
    } else {
        fullnameField.classList.remove('hidden');
        phoneField.classList.remove('hidden');
        addressField.classList.remove('hidden');
        authBtnText.textContent = 'Sign Up';
        toggleBtn.textContent = 'Already have an account? Sign in';
    }
    
    hideError();
}

function signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    state.user = null;
    state.token = null;
    state.cart = [];
    showAuth();
}

// Load app data
async function loadAppData() {
    try {
        const [itemsRes, servicesRes] = await Promise.all([
            fetch(API_URL + '/items', {
                headers: { 'Authorization': `Bearer ${state.token}` }
            }),
            fetch(API_URL + '/services', {
                headers: { 'Authorization': `Bearer ${state.token}` }
            })
        ]);
        
        state.items = await itemsRes.json();
        state.services = await servicesRes.json();
        
        renderItems();
        renderServices();
        
        // Populate default addresses after data loads
        populateDefaultAddresses();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Render items
function renderItems() {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = state.items.map(item => `
        <button onclick="selectItem(${item.id})" 
            class="p-4 rounded-lg border-2 transition-all duration-200 ${
                state.selectedItem?.id === item.id 
                    ? 'border-emerald-500 bg-emerald-950/30' 
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
            }">
            <div class="flex flex-col items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400">
                    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path>
                </svg>
                <span class="text-white font-medium text-sm">${item.name}</span>
                <span class="text-zinc-400 text-xs">$${parseFloat(item.base_price).toFixed(2)}</span>
            </div>
        </button>
    `).join('');
}

// Render services
function renderServices() {
    const list = document.getElementById('services-list');
    list.innerHTML = state.services.map(service => `
        <button onclick="toggleService(${service.id})"
            class="w-full p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                state.selectedServices.find(s => s.id === service.id)
                    ? 'border-emerald-500 bg-emerald-950/30'
                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
            }">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="text-white font-semibold">${service.name}</h3>
                    <p class="text-zinc-400 text-sm">${service.description}</p>
                </div>
                <div class="text-right">
                    <span class="text-emerald-400 font-semibold">${service.price_multiplier}x</span>
                </div>
            </div>
        </button>
    `).join('');
}

// Item selection
function selectItem(itemId) {
    state.selectedItem = state.items.find(item => item.id === itemId);
    state.quantity = 1;
    state.selectedServices = [];
    
    renderItems();
    
    document.getElementById('quantity-section').classList.remove('hidden');
    document.getElementById('services-section').classList.remove('hidden');
    document.getElementById('add-to-cart-section').classList.remove('hidden');
    
    updateQuantityDisplay();
    renderServices();
    updateItemTotal();
}

// Quantity management
function updateQuantity(delta) {
    state.quantity = Math.max(1, state.quantity + delta);
    updateQuantityDisplay();
    updateItemTotal();
}

function updateQuantityDisplay() {
    document.getElementById('quantity-display').textContent = state.quantity;
}

// Service selection
function toggleService(serviceId) {
    const service = state.services.find(s => s.id === serviceId);
    const index = state.selectedServices.findIndex(s => s.id === serviceId);
    
    if (index >= 0) {
        state.selectedServices.splice(index, 1);
    } else {
        state.selectedServices.push(service);
    }
    
    renderServices();
    updateItemTotal();
}

// Calculate and update item total
function updateItemTotal() {
    if (!state.selectedItem) return;
    
    const serviceMultiplier = state.selectedServices.reduce(
        (sum, service) => sum + parseFloat(service.price_multiplier), 0
    );
    
    const total = parseFloat(state.selectedItem.base_price) * state.quantity * serviceMultiplier;
    
    document.getElementById('item-total').textContent = `$${total.toFixed(2)}`;
    
    const addBtn = document.getElementById('add-to-cart-btn');
    if (state.selectedServices.length > 0) {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Order';
    } else {
        addBtn.disabled = true;
        addBtn.textContent = 'Select at least one service';
    }
}

// Add to cart
function addToCart() {
    if (!state.selectedItem || state.selectedServices.length === 0) return;
    
    const existingIndex = state.cart.findIndex(
        item => item.item.id === state.selectedItem.id
    );
    
    const cartItem = {
        item: state.selectedItem,
        quantity: state.quantity,
        selectedServices: [...state.selectedServices]
    };
    
    if (existingIndex >= 0) {
        state.cart[existingIndex] = cartItem;
    } else {
        state.cart.push(cartItem);
    }
    
    // Reset selection
    state.selectedItem = null;
    state.quantity = 1;
    state.selectedServices = [];
    
    document.getElementById('quantity-section').classList.add('hidden');
    document.getElementById('services-section').classList.add('hidden');
    document.getElementById('add-to-cart-section').classList.add('hidden');
    
    renderItems();
    renderCart();
}

// Render cart
function renderCart() {
    const cartEmpty = document.getElementById('cart-empty');
    const cartItems = document.getElementById('cart-items');
    const cartList = document.getElementById('cart-list');
    
    if (state.cart.length === 0) {
        cartEmpty.classList.remove('hidden');
        cartItems.classList.add('hidden');
        return;
    }
    
    cartEmpty.classList.add('hidden');
    cartItems.classList.remove('hidden');
    
    cartList.innerHTML = state.cart.map((cartItem, index) => {
        const serviceMultiplier = cartItem.selectedServices.reduce(
            (sum, service) => sum + parseFloat(service.price_multiplier), 0
        );
        const itemTotal = parseFloat(cartItem.item.base_price) * cartItem.quantity * serviceMultiplier;
        
        return `
            <div class="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                        <h3 class="text-white font-semibold">${cartItem.item.name}</h3>
                        <p class="text-zinc-400 text-sm">Quantity: ${cartItem.quantity}</p>
                    </div>
                    <button onclick="removeFromCart(${index})" class="text-red-400 hover:text-red-300 transition p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-1 mb-2">
                    ${cartItem.selectedServices.map(service => `
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-zinc-500">${service.name}</span>
                            <span class="text-emerald-400">${service.price_multiplier}x</span>
                        </div>
                    `).join('')}
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-zinc-700">
                    <span class="text-zinc-400 text-sm">Subtotal</span>
                    <span class="text-white font-semibold">$${itemTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');
    
    updateCartTotal();
}

// Remove from cart
function removeFromCart(index) {
    state.cart.splice(index, 1);
    renderCart();
}

// Update cart total
function updateCartTotal() {
    const total = state.cart.reduce((sum, cartItem) => {
        const serviceMultiplier = cartItem.selectedServices.reduce(
            (s, service) => s + parseFloat(service.price_multiplier), 0
        );
        return sum + parseFloat(cartItem.item.base_price) * cartItem.quantity * serviceMultiplier;
    }, 0);
    
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

// Place order
async function placeOrder() {
    if (state.cart.length === 0) return;
    
    const pickupAddress = document.getElementById('pickup-address').value.trim();
    const deliveryAddress = document.getElementById('delivery-address').value.trim();
    const notes = document.getElementById('order-notes').value.trim();
    
    // Validate addresses
    if (!pickupAddress) {
        alert('Please enter a pickup address');
        document.getElementById('pickup-address').focus();
        return;
    }
    
    if (!deliveryAddress) {
        alert('Please enter a delivery address');
        document.getElementById('delivery-address').focus();
        return;
    }
    
    setLoading(true, 'place-order');
    
    try {
        const totalAmount = state.cart.reduce((sum, item) => sum + item.itemTotal, 0);
        
        const orderData = {
            total_amount: totalAmount,
            pickup_address: pickupAddress,
            delivery_address: deliveryAddress,
            notes: notes,
            items: state.cart.map(item => ({
                laundry_item_id: item.item.id,
                quantity: item.quantity,
                services: item.selectedServices.map(s => s.id),
                item_total: item.itemTotal
            }))
        };
        
        const response = await fetch(API_URL + '/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to place order');
        }
        
        // Clear cart and form
        state.cart = [];
        document.getElementById('order-notes').value = '';
        renderCart();
        
        // Reset addresses to default
        populateDefaultAddresses();
        
        // Show success message
        alert('Order placed successfully! Order ID: #' + data.id);
        
        // Switch to history tab
        switchTab('history');
        
    } catch (error) {
        alert('Error placing order: ' + error.message);
    } finally {
        setLoading(false, 'place-order');
    }
}

// Load order history
async function loadOrders() {
    try {
        const response = await fetch(API_URL + '/orders', {
            headers: { 'Authorization': `Bearer ${state.token}` }
        });
        
        state.orders = await response.json();
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Render orders
function renderOrders() {
    const ordersList = document.getElementById('orders-list');
    const ordersEmpty = document.getElementById('orders-empty');
    
    if (state.orders.length === 0) {
        ordersEmpty.classList.remove('hidden');
        ordersList.innerHTML = '';
        return;
    }
    
    ordersEmpty.classList.add('hidden');
    
    ordersList.innerHTML = state.orders.map(order => {
        const statusColors = {
            pending: 'text-yellow-400 bg-yellow-950/30 border-yellow-900/50',
            processing: 'text-blue-400 bg-blue-950/30 border-blue-900/50',
            ready: 'text-purple-400 bg-purple-950/30 border-purple-900/50',
            delivered: 'text-green-400 bg-green-950/30 border-green-900/50',
            cancelled: 'text-red-400 bg-red-950/30 border-red-900/50'
        };
        
        const statusIcons = {
            pending: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
            processing: '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>',
            ready: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
            delivered: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
            cancelled: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
        };
        
        const date = new Date(order.created_at);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-6">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${(statusColors[order.status] || statusColors.pending).split(' ')[0]}">
                            ${statusIcons[order.status] || statusIcons.pending}
                        </svg>
                        <div>
                            <h3 class="text-white font-semibold">Order #${order.id}</h3>
                            <p class="text-zinc-400 text-sm">${formattedDate}</p>
                        </div>
                    </div>
                    <span class="inline-block px-3 py-1 rounded-full text-sm font-medium border capitalize ${statusColors[order.status] || statusColors.pending}">
                        ${order.status}
                    </span>
                </div>
                
                <div class="space-y-2 mb-4">
                    ${order.items ? order.items.map(item => `
                        <div class="flex items-center justify-between py-2 border-b border-zinc-800">
                            <div>
                                <span class="text-white">${item.item_name}</span>
                                <span class="text-zinc-500 text-sm ml-2">x${item.quantity}</span>
                            </div>
                            <span class="text-zinc-300">$${parseFloat(item.item_total).toFixed(2)}</span>
                        </div>
                    `).join('') : ''}
                </div>
                
                ${order.notes ? `
                    <div class="mb-4 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                        <p class="text-sm text-zinc-400">
                            <span class="font-medium text-zinc-300">Notes:</span> ${order.notes}
                        </p>
                    </div>
                ` : ''}
                
                ${order.pickup_address ? `
                    <div class="mb-4 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
                        <p class="text-sm text-zinc-400 mb-2">
                            <span class="font-medium text-emerald-400">📍 Pickup:</span> ${order.pickup_address}
                        </p>
                        <p class="text-sm text-zinc-400">
                            <span class="font-medium text-blue-400">📍 Delivery:</span> ${order.delivery_address || 'Same as pickup'}
                        </p>
                    </div>
                ` : ''}
                
                <div class="flex items-center justify-between pt-4 border-t border-zinc-700">
                    <span class="text-zinc-400 font-medium">Total</span>
                    <span class="text-2xl font-bold text-emerald-400">$${parseFloat(order.total_amount).toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Tab switching
function switchTab(tab) {
    const newOrderTab = document.getElementById('new-order-tab');
    const historyTab = document.getElementById('history-tab');
    const newOrderContent = document.getElementById('new-order-content');
    const historyContent = document.getElementById('history-content');
    
    if (tab === 'new') {
        newOrderTab.classList.add('active');
        historyTab.classList.remove('active');
        newOrderContent.classList.remove('hidden');
        historyContent.classList.add('hidden');
        populateDefaultAddresses();
    } else {
        newOrderTab.classList.remove('active');
        historyTab.classList.add('active');
        newOrderContent.classList.add('hidden');
        historyContent.classList.remove('hidden');
        loadOrders();
    }
}

// Populate default addresses from user profile
function populateDefaultAddresses() {
    console.log('Populating addresses, user:', state.user);
    if (state.user && state.user.address) {
        const pickupAddress = document.getElementById('pickup-address');
        const deliveryAddress = document.getElementById('delivery-address');
        
        if (pickupAddress && deliveryAddress) {
            // Always set to default address (user can change if needed)
            pickupAddress.value = state.user.address;
            deliveryAddress.value = state.user.address;
            console.log('Addresses populated with:', state.user.address);
        } else {
            console.log('Address elements not found');
        }
    } else {
        console.log('No user address available');
    }
}

// UI helpers
function showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
}

function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    populateDefaultAddresses();
}

function setLoading(loading, context) {
    if (context === 'auth') {
        const btn = document.getElementById('auth-submit-btn');
        const text = document.getElementById('auth-btn-text');
        const loader = document.getElementById('auth-loading');
        
        btn.disabled = loading;
        if (loading) {
            text.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            text.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    } else if (context === 'order') {
        const btn = document.getElementById('place-order-btn');
        const text = document.getElementById('place-order-text');
        const loader = document.getElementById('place-order-loading');
        
        btn.disabled = loading;
        if (loading) {
            text.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            text.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}
