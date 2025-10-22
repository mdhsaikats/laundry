// API Configuration
const API_BASE_URL = 'http://localhost:8080/api';
let adminToken = localStorage.getItem('adminToken');
let allOrders = [];
let currentFilter = 'all';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (adminToken) {
        showDashboard();
        loadAllOrders();
    } else {
        showLogin();
    }
});

// Show/Hide screens
function showLogin() {
    document.getElementById('admin-login-screen').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
}

// Admin Login Form
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const submitBtn = document.getElementById('admin-login-btn');
    const btnText = document.getElementById('admin-login-text');
    const loading = document.getElementById('admin-login-loading');
    const errorDiv = document.getElementById('admin-error-message');
    
    // Disable button
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    loading.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        // Store token
        adminToken = data.token;
        localStorage.setItem('adminToken', adminToken);
        
        // Show dashboard
        showDashboard();
        loadAllOrders();
        
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        loading.classList.add('hidden');
    }
});

// Sign Out
document.getElementById('admin-signout-btn').addEventListener('click', () => {
    localStorage.removeItem('adminToken');
    adminToken = null;
    showLogin();
});

// Refresh Button
document.getElementById('refresh-btn').addEventListener('click', () => {
    loadAllOrders();
});

// Load All Orders
async function loadAllOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminToken');
                adminToken = null;
                showLogin();
                showNotification('Admin access required. Please login with admin credentials.', 'error');
                return;
            }
            throw new Error('Failed to load orders');
        }
        
        allOrders = await response.json();
        updateStats();
        displayOrders();
        loadAdminStats();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        showNotification('Failed to load orders', 'error');
    }
}

// Load Admin Statistics
async function loadAdminStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-total').textContent = stats.total_orders || 0;
            document.getElementById('stat-pending').textContent = stats.pending_orders || 0;
            document.getElementById('stat-processing').textContent = stats.processing_orders || 0;
            document.getElementById('stat-completed').textContent = stats.delivered_orders || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Search Orders
let searchTimeout;
document.getElementById('search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch();
    }, 500);
});

// Status Filter
document.getElementById('status-filter')?.addEventListener('change', () => {
    performSearch();
});

async function performSearch() {
    const searchTerm = document.getElementById('search-input')?.value || '';
    const status = document.getElementById('status-filter')?.value || 'all';
    
    if (!searchTerm && status === 'all') {
        loadAllOrders();
        return;
    }
    
    try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('q', searchTerm);
        if (status && status !== 'all') params.append('status', status);
        
        const response = await fetch(`${API_BASE_URL}/admin/orders/search?${params}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (!response.ok) throw new Error('Search failed');
        
        allOrders = await response.json();
        currentFilter = 'all'; // Reset filter when searching
        displayOrders();
        
    } catch (error) {
        console.error('Error searching orders:', error);
        showNotification('Search failed', 'error');
    }
}

// Update Statistics
function updateStats() {
    const stats = {
        total: allOrders.length,
        pending: allOrders.filter(o => o.status === 'pending').length,
        processing: allOrders.filter(o => o.status === 'processing').length,
        completed: allOrders.filter(o => o.status === 'delivered').length
    };
    
    document.getElementById('stat-total').textContent = stats.total;
    document.getElementById('stat-pending').textContent = stats.pending;
    document.getElementById('stat-processing').textContent = stats.processing;
    document.getElementById('stat-completed').textContent = stats.completed;
}

// Filter Buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active state
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update filter
        currentFilter = btn.dataset.status;
        displayOrders();
    });
});

// Display Orders
function displayOrders() {
    const tbody = document.getElementById('orders-table-body');
    const noOrders = document.getElementById('no-orders');
    
    // Filter orders
    let filteredOrders = allOrders;
    if (currentFilter !== 'all') {
        filteredOrders = allOrders.filter(order => order.status === currentFilter);
    }
    
    // Sort by date (newest first)
    filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (filteredOrders.length === 0) {
        tbody.innerHTML = '';
        noOrders.classList.remove('hidden');
        return;
    }
    
    noOrders.classList.add('hidden');
    tbody.innerHTML = filteredOrders.map(order => `
        <tr class="hover:bg-zinc-800/50 transition">
            <td class="px-6 py-4">
                <span class="text-white font-semibold">#${order.id}</span>
            </td>
            <td class="px-6 py-4">
                <div class="text-white font-medium">${order.customer_name}</div>
                <div class="text-zinc-400 text-sm">${order.customer_email}</div>
            </td>
            <td class="px-6 py-4">
                <span class="text-zinc-300">${order.items?.length || 0} items</span>
            </td>
            <td class="px-6 py-4">
                <span class="text-emerald-400 font-semibold">$${order.total_amount.toFixed(2)}</span>
            </td>
            <td class="px-6 py-4">
                ${getStatusBadge(order.status)}
            </td>
            <td class="px-6 py-4">
                <span class="text-zinc-300">${formatDate(order.created_at)}</span>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                    <button onclick="viewOrder(${order.id})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition">
                        View
                    </button>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" class="px-3 py-1 bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">Update Status</option>
                        <option value="pending" ${order.status === 'pending' ? 'disabled' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'disabled' : ''}>Processing</option>
                        <option value="ready" ${order.status === 'ready' ? 'disabled' : ''}>Ready</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'disabled' : ''}>Delivered</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'disabled' : ''}>Cancel</option>
                    </select>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get Status Badge
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="px-3 py-1 bg-yellow-600/20 text-yellow-400 text-xs font-semibold rounded-full border border-yellow-600/50">Pending</span>',
        'processing': '<span class="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-semibold rounded-full border border-blue-600/50">Processing</span>',
        'ready': '<span class="px-3 py-1 bg-purple-600/20 text-purple-400 text-xs font-semibold rounded-full border border-purple-600/50">Ready</span>',
        'delivered': '<span class="px-3 py-1 bg-green-600/20 text-green-400 text-xs font-semibold rounded-full border border-green-600/50">Delivered</span>',
        'cancelled': '<span class="px-3 py-1 bg-red-600/20 text-red-400 text-xs font-semibold rounded-full border border-red-600/50">Cancelled</span>'
    };
    return badges[status] || badges['pending'];
}

// View Order Details
async function viewOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <div class="space-y-6">
            <!-- Order Info -->
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="text-zinc-400 text-sm">Order ID</label>
                    <p class="text-white font-semibold text-lg">#${order.id}</p>
                </div>
                <div>
                    <label class="text-zinc-400 text-sm">Status</label>
                    <div class="mt-1">${getStatusBadge(order.status)}</div>
                </div>
                <div>
                    <label class="text-zinc-400 text-sm">Order Date</label>
                    <p class="text-white">${formatDate(order.created_at)}</p>
                </div>
                <div>
                    <label class="text-zinc-400 text-sm">Total Amount</label>
                    <p class="text-emerald-400 font-semibold text-xl">$${order.total_amount.toFixed(2)}</p>
                </div>
            </div>
            
            <!-- Customer Info -->
            <div class="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <h3 class="text-white font-semibold mb-3">Customer Information</h3>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-zinc-400">Name:</span>
                        <span class="text-white">${order.customer_name}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-zinc-400">Email:</span>
                        <span class="text-white">${order.customer_email}</span>
                    </div>
                    ${order.customer_phone ? `
                    <div class="flex justify-between">
                        <span class="text-zinc-400">Phone:</span>
                        <span class="text-white">${order.customer_phone}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Pickup & Delivery Addresses -->
            ${order.pickup_address || order.delivery_address ? `
            <div class="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <h3 class="text-white font-semibold mb-3">Addresses</h3>
                <div class="space-y-3">
                    ${order.pickup_address ? `
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span class="text-emerald-400 font-medium">Pickup Address:</span>
                        </div>
                        <p class="text-white ml-6">${order.pickup_address}</p>
                    </div>
                    ` : ''}
                    ${order.delivery_address ? `
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span class="text-blue-400 font-medium">Delivery Address:</span>
                        </div>
                        <p class="text-white ml-6">${order.delivery_address}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Order Items -->
            <div>
                <h3 class="text-white font-semibold mb-3">Order Items</h3>
                <div class="space-y-3">
                    ${order.items?.map(item => `
                        <div class="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <p class="text-white font-medium">${item.item_name}</p>
                                    <p class="text-zinc-400 text-sm">Quantity: ${item.quantity}</p>
                                </div>
                                <p class="text-emerald-400 font-semibold">$${item.item_total.toFixed(2)}</p>
                            </div>
                            <div class="text-zinc-400 text-sm">
                                Services: ${item.services}
                            </div>
                        </div>
                    `).join('') || '<p class="text-zinc-400">No items</p>'}
                </div>
            </div>
            
            ${order.notes ? `
            <!-- Notes -->
            <div class="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <h3 class="text-white font-semibold mb-2">Special Instructions</h3>
                <p class="text-zinc-300">${order.notes}</p>
            </div>
            ` : ''}
            
            <!-- Update Status -->
            <div class="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                <h3 class="text-white font-semibold mb-3">Update Order Status</h3>
                <select id="modal-status-select" class="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready for Pickup</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
                <button onclick="updateOrderStatusFromModal(${order.id})" class="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition">
                    Update Status
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Close Modal
document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('order-modal').classList.add('hidden');
});

// Update Order Status from Modal
async function updateOrderStatusFromModal(orderId) {
    const select = document.getElementById('modal-status-select');
    const newStatus = select.value;
    
    await updateOrderStatus(orderId, newStatus);
    document.getElementById('order-modal').classList.add('hidden');
}

// Update Order Status
async function updateOrderStatus(orderId, newStatus) {
    if (!newStatus) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update status');
        }
        
        showNotification('Order status updated successfully', 'success');
        loadAllOrders();
        
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Failed to update order status', 'error');
    }
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transition-opacity duration-300 ${
        type === 'success' ? 'bg-emerald-600' : 
        type === 'error' ? 'bg-red-600' : 
        'bg-blue-600'
    }`;
    notification.innerHTML = `<p class="text-white font-medium">${message}</p>`;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Make functions available globally
window.viewOrder = viewOrder;
window.updateOrderStatus = updateOrderStatus;
window.updateOrderStatusFromModal = updateOrderStatusFromModal;
