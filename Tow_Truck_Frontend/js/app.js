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
    try {
        const user = await apiCall('/auth/login', 'POST', {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        });
        currentUser = user;
        console.log('[LOGIN] Success:', currentUser);
        showApp();
    } catch (error) {
        console.error('[LOGIN] Failed:', error.message);
        showAlert('Invalid username or password', 'danger');
    }
});

function demoLogin(username, password) {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}

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
            if (currentUser.role === 'super_admin') canEdit = user.role !== 'super_admin';
            else if (currentUser.role === 'admin') canEdit = user.role === 'manager' || user.role === 'user';
            else if (currentUser.role === 'manager') canEdit = user.role === 'user';
            
            html += `<tr><td>${user.username}</td><td>${user.name}</td><td>${user.role}</td><td>
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

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function showAlert(msg, type) {
    const alert = document.getElementById('alert');
    alert.textContent = msg;
    alert.className = `alert alert-${type} active`;
    setTimeout(() => alert.classList.remove('active'), 3000);
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
    
    let html = '<table class="table" style="font-size: 14px;"><thead><tr><th>ID</th><th>Client</th><th>Job Type</th><th>Priority</th><th>Status</th><th>Requested Date</th><th>Cost</th><th>Actions</th></tr></thead><tbody>';
    
    requests.forEach(req => {
        const priorityColor = req.priority === 'Emergency' ? 'red' : req.priority === 'High' ? 'orange' : 'green';
        const statusColor = req.status === 'Pending' ? '#FFA500' : req.status === 'In Progress' ? '#4169E1' : req.status === 'Completed' ? '#228B22' : '#999';
        
        html += `<tr>
            <td>${req.id}</td>
            <td>${req.clientName}</td>
            <td>${req.jobType}</td>
            <td><span style="color: ${priorityColor}; font-weight: bold;">${req.priority}</span></td>
            <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 3px;">${req.status}</span></td>
            <td>${req.requestedDate}</td>
            <td>$${req.cost.toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="openViewServiceRequestModal(${req.id})">View</button>
                ${canEditServiceRequest() ? `<button class="btn btn-sm btn-primary" onclick="openEditServiceRequestModal(${req.id})">Edit</button>` : ''}
                ${canEditServiceRequest() ? `<button class="btn btn-sm btn-danger" onclick="deleteServiceRequest(${req.id})">Delete</button>` : ''}
            </td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function createServiceRequest() {
    const clientId = document.getElementById('newServiceClientId').value.trim();
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
    const assignedTo = document.getElementById('newServiceAssignedTo').value || null;
    const cost = parseFloat(document.getElementById('newServiceCost').value) || 0;
    
    if (!clientId || !jobType || !description || !requestedDate) {
        showAlert('Fill all required fields', 'danger');
        return;
    }
    
    try {
        let assignedToName = null;
        if (assignedTo) {
            const employees = await apiCall('/auth/users', 'GET');
            const emp = employees.find(e => e.username === assignedTo);
            assignedToName = emp ? emp.name : null;
        }
        
        await apiCall('/service-requests', 'POST', {
            client_id: parseInt(clientId),
            vehicle_year: vehicleYear,
            vehicle_make: vehicleMake,
            vehicle_model: vehicleModel,
            vehicle_plate: vehiclePlate,
            vehicle_color: vehicleColor,
            vehicle_location: vehicleLocation,
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
        document.getElementById('newServiceClientId').value = '';
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
            job_type: jobType,
            description: description,
            priority: priority,
            status: status,
            assigned_to: assignedTo,
            assigned_to_name: assignedToName,
            cost: cost,
            notes: notes,
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
