// SEARCHABLE CLIENT SELECTOR FOR SERVICE REQUESTS

let allClientsForSearch = [];

async function searchClientsForServiceRequest() {
    const searchBox = document.getElementById('clientSearchBox');
    const query = searchBox.value.trim().toLowerCase();
    const resultsList = document.getElementById('searchResultsList');
    const resultsContainer = document.getElementById('clientSearchResults');
    
    if (!query) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    try {
        // Call the search endpoint
        const response = await fetch(`${API_URL}/clients/search?q=${encodeURIComponent(query)}&limit=10`);
        const clients = await response.json();
        
        if (clients.length === 0) {
            resultsList.innerHTML = '<div style="padding: 10px; text-align: center; color: #999;">No clients found</div>';
            resultsContainer.style.display = 'block';
            return;
        }
        
        // Build results HTML
        let html = '';
        clients.forEach(client => {
            html += `
                <div style="padding: 10px; border-bottom: 1px solid #e0e0e0; cursor: pointer; hover: background-color: #f0f0f0;" 
                     onclick="selectClientForServiceRequest(${client.id}, '${client.CustomerFirstName} ${client.CustomerLastName}', '${client.clientIdNumber}')">
                    <strong>${client.CustomerFirstName} ${client.CustomerLastName}</strong> (${client.clientIdNumber})
                    <div style="font-size: 12px; color: #666;">Phone: ${client.CustomerPhone}</div>
                </div>
            `;
        });
        
        resultsList.innerHTML = html;
        resultsContainer.style.display = 'block';
    } catch (error) {
        console.error('Error searching clients:', error);
        resultsList.innerHTML = '<div style="padding: 10px; text-align: center; color: #d32f2f;">Error searching clients</div>';
        resultsContainer.style.display = 'block';
    }
}

function selectClientForServiceRequest(clientId, clientName, clientIdNumber) {
    // Set hidden input with client ID
    document.getElementById('newServiceClientId').value = clientId;
    
    // Show selected display
    document.getElementById('selectedClientDisplay').style.display = 'block';
    document.getElementById('selectedClientName').textContent = clientName;
    document.getElementById('selectedClientId').textContent = clientIdNumber;
    
    // Hide results
    document.getElementById('clientSearchResults').style.display = 'none';
    
    // Clear search box
    document.getElementById('clientSearchBox').value = `${clientName} (${clientIdNumber})`;
}

function clearSelectedClient() {
    document.getElementById('newServiceClientId').value = '';
    document.getElementById('selectedClientDisplay').style.display = 'none';
    document.getElementById('clientSearchBox').value = '';
    document.getElementById('clientSearchResults').style.display = 'none';
}
