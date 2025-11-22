const API_URL = 'https://gruas-hurtado-app.onrender.com/api';
let currentUser = null;
let editingClientId = null;
let editingEmployeeId = null;

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (theme === 'light') {
        body.classList.add('light-mode');
        if (themeToggle) themeToggle.textContent = '☀️ Light';
    } else {
        body.classList.remove('light-mode');
        if (themeToggle) themeToggle.textContent = '🌙 Dark';
    }
    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const body = document.body;
    const newTheme = body.classList.contains('light-mode') ? 'dark' : 'light';
    setTheme(newTheme);
}

// Initialize theme on page load
initializeTheme();

// Global error handler
window.addEventListener('error', function(event) {
    console.error('GLOBAL ERROR:', event.error, event.message);
    event.preventDefault();
    return false;
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('UNHANDLED REJECTION:', event.reason);
    event.preventDefault();
    return false;
});

async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);
        
        console.log(`[API] ${method} ${endpoint}`);
        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }
        console.log(`[API SUCCESS] ${method} ${endpoint}`);
        return result;
    } catch (error) {
        console.error(`[API ERROR] ${method} ${endpoint}:`, error.message);
        showAlert(error.message, 'danger');
        throw error;
    }
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        // Show loading state
        document.getElementById('loginStatus').style.display = 'block';
        document.getElementById('loginStatusText').textContent = 'Logging in...';
        document.querySelector('.btn-primary').disabled = true;
        
        const user = await apiCall('/auth/login', 'POST', {
            username: username,
            password: password
        });
        
        currentUser = user;
        console.log('[LOGIN] Success:', currentUser);
        
        // Show welcome message
        document.getElementById('loginStatusText').textContent = `Welcome back, ${user.username}!`;
        
        // Wait a moment before showing app so user sees the welcome message
        setTimeout(() => {
            document.getElementById('loginStatus').style.display = 'none';
            document.querySelector('.btn-primary').disabled = false;
            showApp();
        }, 1500);
        
    } catch (error) {
        console.error('[LOGIN] Failed:', error.message);
        document.getElementById('loginStatus').style.display = 'none';
        document.querySelector('.btn-primary').disabled = false;
        
        // Show specific error message
        if (error.message.includes('Invalid')) {
            showAlert('Incorrect username or password', 'danger');
        } else {
            showAlert(error.message, 'danger');
        }
    }
});

function showApp() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('appContainer').classList.add('active');
    document.getElementById('displayName').textContent = currentUser.name;
    document.getElementById('displayRole').textContent = '(' + currentUser.role.replace('_', ' ').toUpperCase() + ')';
    updateSidebarMenu();
    
    // Check if user has temporary password
    if (currentUser.is_temporary_password) {
        document.getElementById('changePasswordModal').classList.add('active');
    } else {
        loadDashboard();
    }
}

function logout() {
    console.log('[LOGOUT] Called - stack trace:');
    console.trace();
    currentUser = null;
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('appContainer').classList.remove('active');
    document.getElementById('loginForm').reset();
}

function userCan(action) {
    if (!currentUser) return false;
    const perms = {
        'create_client': ['super_admin', 'admin', 'manager', 'user'],
        'edit_any_client': ['super_admin', 'admin', 'manager'],
        'edit_own_client': ['super_admin', 'admin', 'manager', 'user'],
        'delete_client': ['super_admin', 'admin'],
        'manage_employees': ['super_admin', 'admin', 'manager'],
    };
    return perms[action] && perms[action].includes(currentUser.role);
}

function canEditServiceRequest() {
    return currentUser && ['super_admin', 'admin', 'manager'].includes(currentUser.role);
}

function updateSidebarMenu() {
    document.getElementById('createAccountCard').style.display = userCan('manage_employees') ? 'block' : 'none';
}

function showPage(pageName) {
    try {
        console.log('[SHOW PAGE]', pageName);
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageName).classList.add('active');
        
        if (pageName === 'client-profiles') {
            loadClientProfiles();
        } else if (pageName === 'employee-accounts') {
            loadEmployeeAccounts();
        } else if (pageName === 'dashboard') {
            loadDashboard();
        }
          else if (pageName === 'service-requests') {
            loadServiceRequests();
        }
    } catch (error) {
        console.error('[SHOW PAGE ERROR]', error);
    }
}

async function loadDashboard() {
    try {
        console.log('[LOAD DASHBOARD]');
        const clients = await apiCall('/clients', 'GET');
        const employees = await apiCall('/auth/users', 'GET');
        document.getElementById('dashboardWelcome').textContent = 'Welcome, ' + currentUser.name + '!';
        document.getElementById('dashboardStats').innerHTML = `
            <p>Total Client Profiles: <strong>${clients.length}</strong></p>
            <p>Total Employees: <strong>${employees.length}</strong></p>
            <p>Your Account Level: <strong>${currentUser.role.toUpperCase()}</strong></p>
        `;
        console.log('[LOAD DASHBOARD] Complete');
    } catch (error) {
        console.error('[LOAD DASHBOARD ERROR]', error);
        showAlert('Error loading dashboard', 'danger');
    }
}

async function loadClientProfiles(searchTerm = '') {
    try {
        console.log('[LOAD CLIENT PROFILES]');
        const profiles = await apiCall('/clients', 'GET');
        const container = document.getElementById('clientProfilesContainer');
        
        if (profiles.length === 0) {
            container.innerHTML = '<p class="no-data">No client profiles yet.</p>';
            return;
        }
        
        // Filter profiles based on search term
        let filteredProfiles = profiles;
        if (searchTerm.trim() !== '') {
            const searchLower = searchTerm.toLowerCase();
            filteredProfiles = profiles.filter(p => {
                const fullName = (p.CustomerFirstName + ' ' + p.CustomerLastName).toLowerCase();
                const phone = (p.CustomerPhone || '').toLowerCase();
                
                return fullName.includes(searchLower) || 
                       phone.includes(searchLower);
            });
        }
        
        if (filteredProfiles.length === 0) {
            container.innerHTML = '<p class="no-data">No profiles match your search.</p>';
            return;
        }
        
        let html = '<table class="table"><thead><tr><th>Name</th><th>Phone</th><th>Created By</th><th>Actions</th></tr></thead><tbody>';
        filteredProfiles.forEach(p => {
            const fullName = p.CustomerFirstName + ' ' + p.CustomerLastName;
            const canEdit = userCan('edit_any_client') || (userCan('edit_own_client') && p.createdBy === currentUser.username);
            html += `<tr><td>${fullName}</td><td>${p.CustomerPhone}</td><td>${p.createdByName}</td><td>
                ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openEditClientModal(${p.id})">Edit</button>` : ''}
                ${userCan('delete_client') ? `<button class="btn btn-sm btn-danger" onclick="deleteClientProfile(${p.id})">Delete</button>` : ''}
            </td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        console.log('[LOAD CLIENT PROFILES] Complete');
    } catch (error) {
        console.error('[LOAD CLIENT PROFILES ERROR]', error);
        document.getElementById('clientProfilesContainer').innerHTML = '<p style="color:red;">Error loading profiles</p>';
    }
}

function searchClientProfiles() {
    const searchTerm = document.getElementById('clientSearchInput').value;
    loadClientProfiles(searchTerm);
}

async function createClientProfile() {
    const customerFirstName = document.getElementById('newCustomerFirstName').value.trim();
    const customerLastName = document.getElementById('newCustomerLastName').value.trim();
    const customerPhone = document.getElementById('newCustomerPhone').value.trim();
    
    if (!customerFirstName || !customerLastName || !customerPhone) { 
        showAlert('Fill all required fields', 'danger'); 
        return; 
    }
    
    try {
        await apiCall('/clients', 'POST', {
            customer_first_name: customerFirstName,
            customer_last_name: customerLastName,
            customer_phone: customerPhone,
            created_by: currentUser.username,
            created_by_name: currentUser.name
        });
        
        // Clear form
        document.getElementById('newCustomerFirstName').value = '';
        document.getElementById('newCustomerLastName').value = '';
        document.getElementById('newCustomerPhone').value = '';
        
        showAlert('Profile created', 'success');
        loadClientProfiles();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function openEditClientModal(id) {
    try {
        editingClientId = id;
        const profile = await apiCall(`/clients/${id}`, 'GET');
        console.log('Profile data:', profile);
        
        document.getElementById('editCustomerFirstName').value = profile.CustomerFirstName || '';
        document.getElementById('editCustomerLastName').value = profile.CustomerLastName || '';
        document.getElementById('editCustomerPhone').value = profile.CustomerPhone || '';
        
        document.getElementById('editClientHistory').innerHTML = `Created by ${profile.createdByName}, edited by ${profile.lastEditedByName}`;
        document.getElementById('editClientModal').classList.add('active');
        
        console.log('Modal opened with data');
    } catch (error) {
        console.error('Error opening modal:', error);
        showAlert(error.message, 'danger');
    }
}

async function saveClientProfile() {
    try {
        await apiCall(`/clients/${editingClientId}`, 'PUT', {
            customer_first_name: document.getElementById('editCustomerFirstName').value,
            customer_last_name: document.getElementById('editCustomerLastName').value,
            customer_phone: document.getElementById('editCustomerPhone').value,
            last_edited_by: currentUser.username,
            last_edited_by_name: currentUser.name
        });
        closeModal('editClientModal');
        showAlert('Profile updated', 'success');
        loadClientProfiles();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function deleteClientProfile(id) {
    if (!confirm('Delete this profile?')) return;
    try {
        await apiCall(`/clients/${id}`, 'DELETE');
        showAlert('Profile deleted', 'success');
        loadClientProfiles();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function loadEmployeeAccounts() {
    try {
        console.log('[LOAD EMPLOYEES] Starting');
        if (!currentUser) {
            console.log('[LOAD EMPLOYEES] No currentUser!');
            return;
        }
        
        console.log('[LOAD EMPLOYEES] Calling API');
        const employees = await apiCall('/auth/users', 'GET');
        console.log('[LOAD EMPLOYEES] Got employees:', employees.length);
        
        const container = document.getElementById('employeeAccountsContainer');
        if (!container) {
            console.error('[LOAD EMPLOYEES] Container not found!');
            return;
        }
        
        if (employees.length === 0) {
            console.log('[LOAD EMPLOYEES] Empty list');
            container.innerHTML = '<p class="no-data">No employees.</p>';
            return;
        }
        
        console.log('[LOAD EMPLOYEES] Building HTML');
        let html = '<table class="table"><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Actions</th></tr></thead><tbody>';
        
        employees.forEach((user, index) => {
            console.log('[LOAD EMPLOYEES] Processing user', index, user.username);
            let canEdit = false;
            let canChangePassword = false;
            
            if (currentUser.role === 'super_admin') {
                canEdit = user.role !== 'super_admin';
                canChangePassword = user.role !== 'super_admin';
            } else if (currentUser.role === 'admin') {
                canEdit = user.role === 'manager' || user.role === 'user';
                canChangePassword = user.role === 'manager' || user.role === 'user';
            } else if (currentUser.role === 'manager') {
                canEdit = user.role === 'user';
                canChangePassword = user.role === 'user';
            }
            
            html += `<tr><td>${user.username}</td><td>${user.name}</td><td>${user.role}</td><td>
                ${canChangePassword ? `<button class="btn btn-sm btn-secondary" onclick="openChangePasswordModal(${user.id}, '${user.username}')">Change Password</button>` : ''}
                ${canEdit ? `<button class="btn btn-sm btn-primary" onclick="openEditEmployeeModal(${user.id})">Edit</button>` : 'N/A'}
            </td></tr>`;
        });
        html += '</tbody></table>';
        
        console.log('[LOAD EMPLOYEES] Setting innerHTML');
        container.innerHTML = html;
        console.log('[LOAD EMPLOYEES] Complete - currentUser still:', currentUser ? currentUser.username : 'NONE');
        
    } catch (error) {
        console.error('[LOAD EMPLOYEES ERROR]', error);
        const container = document.getElementById('employeeAccountsContainer');
        if (container) {
            container.innerHTML = '<p style="color:red;">Error loading employees</p>';
        }
    }
}

function generateTempPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('newPassword').value = password;
    showAlert('Password generated: ' + password, 'info');
}

async function submitPasswordChange() {
    const oldPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPasswordField').value;
    const confirmPassword = document.getElementById('confirmPasswordField').value;
    
    if (!oldPassword || !newPassword || !confirmPassword) {
        showAlert('Fill all password fields', 'danger');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'danger');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters', 'danger');
        return;
    }
    
    try {
        await apiCall('/auth/change-password', 'POST', {
            user_id: currentUser.id,
            old_password: oldPassword,
            new_password: newPassword
        });
        
        closeModal('changePasswordModal');
        currentUser.is_temporary_password = false;
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPasswordField').value = '';
        document.getElementById('confirmPasswordField').value = '';
        showAlert('Password changed successfully! Please log in again.', 'success');
        logout();
    } catch (error) {
        showAlert('Error: ' + error.message, 'danger');
    }
}

async function createEmployeeAccount() {
    console.log('[CREATE EMPLOYEE] Starting');
    const username = document.getElementById('newUsername').value.trim();
    const role = document.getElementById('newAccountType').value;
    const password = document.getElementById('newPassword').value.trim();
    const isTemporary = document.getElementById('markTemporary').checked;
    
    if (!username || !role || !password) { showAlert('Fill all fields', 'danger'); return; }
    
    try {
        console.log('[CREATE EMPLOYEE] API call');
        await apiCall('/auth/register', 'POST', {
            username,
            password,
            name: username,
            role,
            is_temporary: isTemporary
        });
        console.log('[CREATE EMPLOYEE] API success');
        document.getElementById('newUsername').value = '';
        document.getElementById('newAccountType').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('markTemporary').checked = false;
        
        const message = isTemporary ? 
            `Account created! Temp password: ${password} (User must change on next login)` :
            'Account created successfully';
        showAlert(message, 'success');
        
        console.log('[CREATE EMPLOYEE] Loading employees...');
        await loadEmployeeAccounts();
        console.log('[CREATE EMPLOYEE] Complete - currentUser:', currentUser ? currentUser.username : 'NONE');
    } catch (error) {
        console.error('[CREATE EMPLOYEE ERROR]', error);
        showAlert(error.message, 'danger');
    }
}

async function openEditEmployeeModal(id) {
    try {
        console.log('[EDIT EMPLOYEE MODAL] Opening for ID', id);
        editingEmployeeId = id;
        const employees = await apiCall('/auth/users', 'GET');
        const user = employees.find(u => u.id === id);
        if (user) {
            document.getElementById('editEmployeeUsername').value = user.username;
            document.getElementById('editEmployeeType').value = user.role;
            document.getElementById('editEmployeeModal').classList.add('active');
            console.log('[EDIT EMPLOYEE MODAL] Open');
        }
    } catch (error) {
        console.error('[EDIT EMPLOYEE MODAL ERROR]', error);
        showAlert(error.message, 'danger');
    }
}

async function saveEmployeeAccount() {
    try {
        console.log('[SAVE EMPLOYEE] Starting for ID', editingEmployeeId);
        await apiCall(`/auth/users/${editingEmployeeId}`, 'PUT', {
            role: document.getElementById('editEmployeeType').value
        });
        console.log('[SAVE EMPLOYEE] API success');
        closeModal('editEmployeeModal');
        showAlert('Account updated', 'success');
        console.log('[SAVE EMPLOYEE] Loading employees...');
        await loadEmployeeAccounts();
        console.log('[SAVE EMPLOYEE] Complete - currentUser:', currentUser ? currentUser.username : 'NONE');
    } catch (error) {
        console.error('[SAVE EMPLOYEE ERROR]', error);
        showAlert(error.message, 'danger');
    }
}

async function deleteEmployeeAccount() {
    if (!confirm('Delete this account?')) return;
    try {
        console.log('[DELETE EMPLOYEE] Starting for ID', editingEmployeeId);
        await apiCall(`/auth/users/${editingEmployeeId}`, 'DELETE');
        console.log('[DELETE EMPLOYEE] API success');
        closeModal('editEmployeeModal');
        showAlert('Account deleted', 'success');
        console.log('[DELETE EMPLOYEE] Loading employees...');
        await loadEmployeeAccounts();
        console.log('[DELETE EMPLOYEE] Complete - currentUser:', currentUser ? currentUser.username : 'NONE');
    } catch (error) {
        console.error('[DELETE EMPLOYEE ERROR]', error);
        showAlert(error.message, 'danger');
    }
}

let changingPasswordUserId = null;

async function openChangePasswordModal(userId, username) {
    try {
        changingPasswordUserId = userId;
        document.getElementById('changePasswordUsername').value = username;
        document.getElementById('changePasswordNew').value = '';
        document.getElementById('changePasswordConfirm').value = '';
        document.getElementById('changeExistingPasswordModal').classList.add('active');
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function submitChangeExistingPassword() {
    const newPassword = document.getElementById('changePasswordNew').value;
    const confirmPassword = document.getElementById('changePasswordConfirm').value;
    const tempCheckbox = document.getElementById('markPasswordTemporary');
    const isTemporary = tempCheckbox ? tempCheckbox.checked : false;
    
    if (!newPassword || !confirmPassword) {
        showAlert('Fill all password fields', 'danger');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('Passwords do not match', 'danger');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlert('Password must be at least 6 characters', 'danger');
        return;
    }
    
    try {
        await apiCall(`/auth/users/${changingPasswordUserId}/reset-password`, 'POST', {
            new_password: newPassword,
            is_temporary: isTemporary
        });
        
        closeModal('changeExistingPasswordModal');
        const message = isTemporary ? 
            'Password changed! User must change it on next login.' :
            'Password changed successfully';
        showAlert(message, 'success');
        loadEmployeeAccounts();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showAlert(msg, type) {
    const alert = document.getElementById('alert');
    alert.textContent = msg;
    alert.className = `alert alert-${type} active`;
    setTimeout(() => alert.classList.remove('active'), 3000);
}

// PHASE 1: Handle client type toggle for service requests
function handleClientTypeChange() {
    const clientType = document.querySelector('input[name="clientType"]:checked').value;
    const existingSection = document.getElementById('existingClientSection');
    const newCustomerSection = document.getElementById('newCustomerSection');
    
    if (clientType === 'existing') {
        existingSection.style.display = 'block';
        newCustomerSection.style.display = 'none';
    } else {
        existingSection.style.display = 'none';
        newCustomerSection.style.display = 'block';
    }
}

// Add event listeners for radio buttons when page loads
function setupClientTypeToggle() {
    const radios = document.querySelectorAll('input[name="clientType"]');
    radios.forEach(radio => {
        radio.addEventListener('change', handleClientTypeChange);
    });
}

// Service Requests Functions

let allServiceRequests = [];

async function loadServiceRequests() {
    try {
        console.log('[LOAD SERVICE REQUESTS]');
        allServiceRequests = await apiCall('/service-requests', 'GET');
        await populateClientDropdown();
        await populateEmployeeDropdown();
        displayServiceRequests(allServiceRequests);
        setupClientTypeToggle();  // CORRECT - in try block!
        console.log('[LOAD SERVICE REQUESTS] Complete');
    } catch (error) {
        console.error('[LOAD SERVICE REQUESTS ERROR]', error);
        document.getElementById('serviceRequestsContainer').innerHTML = '<p style="color:red;">Error loading service requests</p>';
    }
}

async function populateClientDropdown() {
    try {
        const clients = await apiCall('/clients', 'GET');
        const dropdown = document.getElementById('newServiceClientId');
        dropdown.innerHTML = '<option value="">Select a client...</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.CustomerFirstName} ${client.CustomerLastName}`;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

async function populateEmployeeDropdown() {
    try {
        const employees = await apiCall('/auth/users', 'GET');
        const dropdown = document.getElementById('newServiceAssignedTo');
        dropdown.innerHTML = '<option value="">Unassigned</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.username;
            option.textContent = `${emp.name} (${emp.role})`;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

function displayServiceRequests(requests) {
    const container = document.getElementById('serviceRequestsContainer');
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="no-data">No service requests yet.</p>';
        return;
    }
    
    let html = '<table class="table" style="font-size: 14px;"><thead><tr><th>ID</th><th>Client</th><th>Job Type</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Requested Date</th><th>Cost</th><th>Actions</th></tr></thead><tbody>';
    
    requests.forEach(req => {
        const priorityColor = req.priority === 'Emergency' ? 'red' : req.priority === 'High' ? 'orange' : 'green';
        const statusColor = req.status === 'Pending' ? '#FFA500' : req.status === 'In Progress' ? '#4169E1' : req.status === 'Completed' ? '#228B22' : '#999';
        
        // Handle old requests that might not have vehicle fields
        if (!req.vehicleYear && !req.vehicleMake) {
            html += `<tr style="opacity: 0.6;">
                <td>${req.id}</td>
                <td>${req.clientName}</td>
                <td>${req.jobType}</td>
                <td><span style="color: ${priorityColor}; font-weight: bold;">${req.priority}</span></td>
                <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 3px;">${req.status}</span></td>
                <td>${req.requestedDate}</td>
                <td>$${req.cost.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="showAlert('This is an old request. Please delete and create a new one with vehicle information.', 'info')" disabled>Old Format</button>
                </td>
            </tr>`;
        } else {
            html += `<tr>
                <td>${req.id}</td>
                <td>${req.clientName}</td>
                <td>${req.jobType}</td>
                <td><span style="color: ${priorityColor}; font-weight: bold;">${req.priority}</span></td>
                <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 3px;">${req.status}</span></td>
                <td>${req.assignedToName || 'Unassigned'}</td>
                <td>${req.requestedDate}</td>
                <td>$${req.cost.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="openViewServiceRequestModal(${req.id})">View</button>
                    ${canEditServiceRequest() ? `<button class="btn btn-sm btn-primary" onclick="openEditServiceRequestModal(${req.id})">Edit</button>` : ''}
                    ${canEditServiceRequest() ? `<button class="btn btn-sm btn-danger" onclick="deleteServiceRequest(${req.id})">Delete</button>` : ''}
                </td>
            </tr>`;
        }
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function createServiceRequest() {
    // Get client type selection
    const clientType = document.querySelector('input[name="clientType"]:checked').value;
    let clientId = null;
    let oneTimeClientId = null;
    
    // PHASE 1: Handle new customer creation
    if (clientType === 'other') {
        // Get new customer info
        const firstName = document.getElementById('newOTCFirstName').value.trim();
        const lastName = document.getElementById('newOTCLastName').value.trim();
        const phone = document.getElementById('newOTCPhone').value.trim();
        const email = document.getElementById('newOTCEmail').value.trim();
        const address = document.getElementById('newOTCAddress').value.trim();
        
        // Validate required fields
        if (!firstName || !lastName || !phone) {
            showAlert('Fill required fields: First Name, Last Name, Phone', 'danger');
            return;
        }
        
        try {
            // Create one-time client first
            const response = await apiCall('/one-time-clients', 'POST', {
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                email: email || null,
                address: address || null,
                created_by: currentUser.username,
                created_by_name: currentUser.name
            });
            
            oneTimeClientId = response.client.id;
            console.log('[CREATE SERVICE REQUEST] One-time client created:', oneTimeClientId);
        } catch (error) {
            showAlert('Error creating one-time client: ' + error.message, 'danger');
            return;
        }
    } else {
        // Use existing client
        clientId = document.getElementById('newServiceClientId').value.trim();
        
        if (!clientId) {
            showAlert('Please select a client', 'danger');
            return;
        }
    }
    
    // Get service request details
    const jobType = document.getElementById('newServiceJobType').value.trim();
    const description = document.getElementById('newServiceDescription').value.trim();
    const priority = document.getElementById('newServicePriority').value;
    const requestedDate = document.getElementById('newServiceRequestedDate').value;
    const vehicleYear = document.getElementById('newVehicleYear').value.trim();
    const vehicleMake = document.getElementById('newVehicleMake').value.trim();
    const vehicleModel = document.getElementById('newVehicleModel').value.trim();
    const vehiclePlate = document.getElementById('newVehiclePlate').value.trim();
    const vehicleColor = document.getElementById('newVehicleColor').value.trim();
    const vehicleLocation = document.getElementById('newVehicleLocation').value.trim();
    const isDangerous = document.getElementById('newLocationDangerous').checked;
    const hasHeavyTraffic = document.getElementById('newLocationHeavyTraffic').checked;
    const assignedTo = document.getElementById('newServiceAssignedTo').value || null;
    const cost = parseFloat(document.getElementById('newServiceCost').value) || 0;
    
    // Validate required fields
    if (!jobType || !description || !requestedDate) {
        showAlert('Fill all required fields', 'danger');
        return;
    }
    
    try {
        // Get assigned employee name if assigned
        let assignedToName = null;
        if (assignedTo) {
            const employees = await apiCall('/auth/users', 'GET');
            const emp = employees.find(e => e.username === assignedTo);
            assignedToName = emp ? emp.name : null;
        }
        
        // Create service request with either client_id or one_time_client_id
        await apiCall('/service-requests', 'POST', {
            client_id: clientId ? parseInt(clientId) : null,
            one_time_client_id: oneTimeClientId,
            vehicle_year: vehicleYear,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_plate: vehiclePlate,
            vehicle_color: vehicleColor,
            vehicle_location: vehicleLocation,
            is_dangerous: isDangerous,
            has_heavy_traffic: hasHeavyTraffic,
            job_type: jobType,
            description: description,
            priority: priority,
            status: 'Pending',
            assigned_to: assignedTo,
            assigned_to_name: assignedToName,
            requested_date: new Date(requestedDate).toISOString(),
            cost: cost,
            created_by: currentUser.username,
            created_by_name: currentUser.name
        });
        
        // Clear form
        document.querySelector('input[name="clientType"][value="existing"]').checked = true;
        handleClientTypeChange(); // Reset toggle
        document.getElementById('newServiceClientId').value = '';
        document.getElementById('newOTCFirstName').value = '';
        document.getElementById('newOTCLastName').value = '';
        document.getElementById('newOTCPhone').value = '';
        document.getElementById('newOTCEmail').value = '';
        document.getElementById('newOTCAddress').value = '';
        document.getElementById('newServiceJobType').value = '';
        document.getElementById('newServiceDescription').value = '';
        document.getElementById('newServicePriority').value = 'Medium';
        document.getElementById('newServiceRequestedDate').value = '';
        document.getElementById('newVehicleYear').value = '';
        document.getElementById('newVehicleMake').value = '';
        document.getElementById('newVehicleModel').value = '';
        document.getElementById('newVehiclePlate').value = '';
        document.getElementById('newVehicleColor').value = '';
        document.getElementById('newVehicleLocation').value = '';
        document.getElementById('newLocationDangerous').checked = false;
        document.getElementById('newLocationHeavyTraffic').checked = false;
        document.getElementById('newServiceAssignedTo').value = '';
        document.getElementById('newServiceCost').value = '';
        
        showAlert('Service request created', 'success');
        loadServiceRequests();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function openViewServiceRequestModal(id) {
    try {
        const req = await apiCall(`/service-requests/${id}`, 'GET');
        
        let html = `
            <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Request Details</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><strong>Client:</strong> ${req.clientName}</div>
                    <div><strong>Job Type:</strong> ${req.jobType}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Priority:</strong> ${req.priority}</div>
                    <div><strong>Status:</strong> ${req.status}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Description:</strong> ${req.description}</div>
                </div>
            </div>

            <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Vehicle Information</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div><strong>Year:</strong> ${req.vehicleYear || 'N/A'}</div>
                    <div><strong>Make:</strong> ${req.vehicleMake || 'N/A'}</div>
                    <div><strong>Model:</strong> ${req.vehicleModel || 'N/A'}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Plate:</strong> ${req.vehiclePlate || 'N/A'}</div>
                    <div><strong>Color:</strong> ${req.vehicleColor || 'N/A'}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Location:</strong> ${req.vehicleLocation || 'N/A'}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Location is Dangerous:</strong> ${req.isDangerous ? '✓ Yes' : '✗ No'}</div>
                    <div><strong>Location has Heavy Traffic:</strong> ${req.hasHeavyTraffic ? '✓ Yes' : '✗ No'}</div>
                </div>
            </div>

            <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Additional Info</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><strong>Assigned To:</strong> ${req.assignedToName || 'Unassigned'}</div>
                    <div><strong>Cost:</strong> $${req.cost.toFixed(2)}</div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Requested Date:</strong> ${req.requestedDate}</div>
                </div>
                ${req.notes ? `<div style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Notes:</strong> ${req.notes}</div>
                </div>` : ''}
            </div>

            <div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px;">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Audit Info</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div><strong>Created By:</strong> ${req.createdByName} (${req.createdBy})</div>
                    <div><strong>Created Date:</strong> ${req.createdDate}</div>
                </div>
                ${req.lastEditedBy ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    <div><strong>Last Edited By:</strong> ${req.lastEditedByName} (${req.lastEditedBy})</div>
                    <div><strong>Last Updated:</strong> ${req.lastUpdatedDate}</div>
                </div>` : ''}
            </div>
        `;
        
        document.getElementById('viewServiceRequestContent').innerHTML = html;
        document.getElementById('viewServiceRequestModal').classList.add('active');
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function openEditServiceRequestModal(id) {
    try {
        // Get the request data
        const req = await apiCall(`/service-requests/${id}`, 'GET');
        
        // Populate client dropdown
        const clients = await apiCall('/clients', 'GET');
        const clientDropdown = document.getElementById('editServiceClientId');
        clientDropdown.innerHTML = '<option value="">Select a client...</option>';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.CustomerFirstName} ${client.CustomerLastName}`;
            clientDropdown.appendChild(option);
        });
        
        // Populate employee dropdown
        const employees = await apiCall('/auth/users', 'GET');
        const empDropdown = document.getElementById('editServiceAssignedTo');
        empDropdown.innerHTML = '<option value="">Unassigned</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.username;
            option.textContent = `${emp.name} (${emp.role})`;
            empDropdown.appendChild(option);
        });
        
        // Set the form values
        document.getElementById('editServiceRequestId').value = id;
        document.getElementById('editServiceClientId').value = req.clientId;
        document.getElementById('editServiceJobType').value = req.jobType;
        document.getElementById('editServiceDescription').value = req.description;
        document.getElementById('editServicePriority').value = req.priority;
        document.getElementById('editServiceStatus').value = req.status;
        document.getElementById('editVehicleYear').value = req.vehicleYear || '';
        document.getElementById('editVehicleMake').value = req.vehicleMake || '';
        document.getElementById('editVehicleModel').value = req.vehicleModel || '';
        document.getElementById('editVehiclePlate').value = req.vehiclePlate || '';
        document.getElementById('editVehicleColor').value = req.vehicleColor || '';
        document.getElementById('editVehicleLocation').value = req.vehicleLocation || '';
        document.getElementById('editLocationDangerous').checked = req.isDangerous || false;
        document.getElementById('editLocationHeavyTraffic').checked = req.hasHeavyTraffic || false;
        
        // Only super_admin and admin can edit these checkboxes
        const canEditFlags = currentUser && ['super_admin', 'admin'].includes(currentUser.role);
        document.getElementById('editLocationDangerous').disabled = !canEditFlags;
        document.getElementById('editLocationHeavyTraffic').disabled = !canEditFlags;
        
        document.getElementById('editServiceAssignedTo').value = req.assignedTo || '';
        document.getElementById('editServiceCost').value = req.cost;
        document.getElementById('editServiceNotes').value = req.notes || '';
        
        // Show audit info
        let auditHtml = `<div style="border: 1px solid #ccc; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; margin-bottom: 15px;">Audit Info</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div><strong>Created By:</strong> ${req.createdByName} (${req.createdBy})</div>
                <div><strong>Created Date:</strong> ${req.createdDate}</div>
            </div>
            ${req.lastEditedBy ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <div><strong>Last Edited By:</strong> ${req.lastEditedByName} (${req.lastEditedBy})</div>
                <div><strong>Last Updated:</strong> ${req.lastUpdatedDate}</div>
            </div>` : ''}
        </div>`;
        document.getElementById('editServiceAuditInfo').innerHTML = auditHtml;
        
        document.getElementById('editServiceRequestModal').classList.add('active');
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function saveServiceRequest() {
    const id = document.getElementById('editServiceRequestId').value;
    const clientId = document.getElementById('editServiceClientId').value;
    const jobType = document.getElementById('editServiceJobType').value;
    const description = document.getElementById('editServiceDescription').value;
    const priority = document.getElementById('editServicePriority').value;
    const status = document.getElementById('editServiceStatus').value;
    const vehicleYear = document.getElementById('editVehicleYear').value;
    const vehicleMake = document.getElementById('editVehicleMake').value;
    const vehicleModel = document.getElementById('editVehicleModel').value;
    const vehiclePlate = document.getElementById('editVehiclePlate').value;
    const vehicleColor = document.getElementById('editVehicleColor').value;
    const vehicleLocation = document.getElementById('editVehicleLocation').value;
    const isDangerous = document.getElementById('editLocationDangerous').checked;
    const hasHeavyTraffic = document.getElementById('editLocationHeavyTraffic').checked;
    const assignedTo = document.getElementById('editServiceAssignedTo').value || null;
    const cost = parseFloat(document.getElementById('editServiceCost').value) || 0;
    const notes = document.getElementById('editServiceNotes').value;
    
    try {
        let assignedToName = null;
        if (assignedTo) {
            const employees = await apiCall('/auth/users', 'GET');
            const emp = employees.find(e => e.username === assignedTo);
            assignedToName = emp ? emp.name : null;
        }
        
        await apiCall(`/service-requests/${id}`, 'PUT', {
            client_id: parseInt(clientId),
            vehicle_year: vehicleYear,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_plate: vehiclePlate,
            vehicle_color: vehicleColor,
            vehicle_location: vehicleLocation,
            is_dangerous: isDangerous,
            has_heavy_traffic: hasHeavyTraffic,
            job_type: jobType,
            description: description,
            priority: priority,
            status: status,
            assigned_to: assignedTo,
            assigned_to_name: assignedToName,
            cost: cost,
            notes: notes,
            user_role: currentUser.role,
            last_edited_by: currentUser.username,
            last_edited_by_name: currentUser.name
        });
        
        closeModal('editServiceRequestModal');
        showAlert('Service request updated', 'success');
        loadServiceRequests();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

async function deleteServiceRequest(id) {
    if (!confirm('Delete this service request?')) return;
    try {
        await apiCall(`/service-requests/${id}`, 'DELETE');
        showAlert('Service request deleted', 'success');
        loadServiceRequests();
    } catch (error) {
        showAlert(error.message, 'danger');
    }
}

function filterServiceRequests() {
    const statusFilter = document.getElementById('serviceStatusFilter').value.toLowerCase();
    const priorityFilter = document.getElementById('servicePriorityFilter').value.toLowerCase();
    const searchTerm = document.getElementById('serviceSearchInput').value.toLowerCase();
    
    let filtered = allServiceRequests.filter(req => {
        const matchStatus = !statusFilter || req.status.toLowerCase().includes(statusFilter);
        const matchPriority = !priorityFilter || req.priority.toLowerCase().includes(priorityFilter);
        const matchSearch = !searchTerm || req.clientName.toLowerCase().includes(searchTerm);
        
        return matchStatus && matchPriority && matchSearch;
    });
    
    displayServiceRequests(filtered);
}

console.log('[INIT] App loaded');
