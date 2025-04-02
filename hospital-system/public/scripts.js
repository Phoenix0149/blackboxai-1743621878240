// API Base URL
const API_BASE_URL = 'http://localhost:8000';

// Common Functions
async function fetchPatients() {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching patients:', error);
    return [];
  }
}

async function savePatient(patientData, patientId = null) {
  try {
    const url = patientId ? `${API_BASE_URL}/patients/${patientId}` : `${API_BASE_URL}/patients`;
    const method = patientId ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData)
    });

    return response.ok;
  } catch (error) {
    console.error('Error saving patient:', error);
    return false;
  }
}

async function deletePatient(patientId) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting patient:', error);
    return false;
  }
}

async function fetchVitals(patientId = null) {
  try {
    const url = patientId ? `${API_BASE_URL}/vitals?patientId=${patientId}` : `${API_BASE_URL}/vitals`;
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error fetching vitals:', error);
    return [];
  }
}

async function saveVitals(vitalData) {
  try {
    const response = await fetch(`${API_BASE_URL}/vitals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vitalData)
    });
    return response.ok;
  } catch (error) {
    console.error('Error saving vitals:', error);
    return false;
  }
}

async function checkCriticalVitals() {
  try {
    const response = await fetch(`${API_BASE_URL}/vitals/critical`);
    return await response.json();
  } catch (error) {
    console.error('Error checking critical vitals:', error);
    return [];
  }
}

// Utility Functions
function formatDateTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function showAlert(message, type = 'error') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `p-4 mb-4 text-sm rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
  alertDiv.textContent = message;
  
  const container = document.getElementById('alertsContainer') || document.body;
  container.prepend(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Chart Utilities
function createChart(ctx, type, label, data, options = {}) {
  return new Chart(ctx, {
    type,
    data: {
      labels: data.labels || [],
      datasets: [{
        label,
        data: data.values || [],
        backgroundColor: data.backgroundColor || 'rgba(54, 162, 235, 0.2)',
        borderColor: data.borderColor || 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: options.beginAtZero || false
        }
      },
      ...options
    }
  });
}

// Form Handling
function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return null;
  
  const formData = new FormData(form);
  const data = {};
  
  formData.forEach((value, key) => {
    data[key] = value;
  });
  
  return data;
}

// Patient Management
function renderPatientsTable(patients, tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;
  
  table.innerHTML = '';
  
  patients.forEach(patient => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">${patient.name}</td>
      <td class="px-6 py-4 whitespace-nowrap">${patient.ward}</td>
      <td class="px-6 py-4 whitespace-nowrap">${patient.bed}</td>
      <td class="px-6 py-4 whitespace-nowrap">${patient.disease}</td>
      <td class="px-6 py-4 whitespace-nowrap">${patient.nurse}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <button class="text-blue-600 hover:text-blue-900 edit-btn" data-id="${patient.id}">Edit</button>
        <button class="ml-2 text-red-600 hover:text-red-900 delete-btn" data-id="${patient.id}">Delete</button>
      </td>
    `;
    table.appendChild(row);
  });
  
  // Add event listeners to action buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const patientId = e.target.getAttribute('data-id');
      window.location.href = `/patient-form.html?id=${patientId}`;
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const patientId = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this patient?')) {
        const success = await deletePatient(patientId);
        if (success) {
          const patients = await fetchPatients();
          renderPatientsTable(patients, tableId);
          showAlert('Patient deleted successfully', 'success');
        } else {
          showAlert('Failed to delete patient');
        }
      }
    });
  });
}

// Vitals Monitoring
function renderVitalsCharts(vitals) {
  const respirationCtx = document.getElementById('respirationChart')?.getContext('2d');
  const pulseCtx = document.getElementById('pulseChart')?.getContext('2d');
  
  if (respirationCtx && pulseCtx) {
    // Get last 10 readings
    const lastVitals = vitals.slice(-10);
    const labels = lastVitals.map((_, i) => `Reading ${i+1}`);
    
    // Respiration chart
    if (window.respirationChart) {
      window.respirationChart.data.labels = labels;
      window.respirationChart.data.datasets[0].data = lastVitals.map(v => v.respiration_rate);
      window.respirationChart.update();
    } else {
      window.respirationChart = createChart(respirationCtx, 'line', 'Respiration Rate', {
        labels,
        values: lastVitals.map(v => v.respiration_rate),
        borderColor: 'rgba(75, 192, 192, 1)'
      }, {
        scales: {
          y: {
            suggestedMin: 0,
            suggestedMax: 40
          }
        }
      });
    }
    
    // Pulse chart
    if (window.pulseChart) {
      window.pulseChart.data.labels = labels;
      window.pulseChart.data.datasets[0].data = lastVitals.map(v => v.pulse_rate);
      window.pulseChart.update();
    } else {
      window.pulseChart = createChart(pulseCtx, 'line', 'Pulse Rate', {
        labels,
        values: lastVitals.map(v => v.pulse_rate),
        borderColor: 'rgba(255, 99, 132, 1)'
      }, {
        scales: {
          y: {
            suggestedMin: 40,
            suggestedMax: 150
          }
        }
      });
    }
  }
}

function renderCriticalVitals(criticalVitals) {
  const alertsSection = document.getElementById('alertsSection');
  const alertsList = document.getElementById('alertsList');
  
  if (!alertsSection || !alertsList) return;
  
  if (criticalVitals.length > 0) {
    alertsSection.classList.remove('hidden');
    alertsList.innerHTML = '';
    
    criticalVitals.forEach(vital => {
      const alertItem = document.createElement('div');
      alertItem.className = 'p-2 mb-2 bg-red-50 border-l-4 border-red-500';
      alertItem.innerHTML = `
        <p class="text-sm font-medium text-red-800">Patient ID: ${vital.patient_id}</p>
        <p class="text-sm text-red-700">
          Respiration: ${vital.respiration_rate} (${vital.respiration_rate < 10 ? 'Low' : 'High'}), 
          Pulse: ${vital.pulse_rate} (${vital.pulse_rate < 50 ? 'Low' : 'High'})
        </p>
        <p class="text-xs text-red-600">${formatDateTime(vital.timestamp)}</p>
      `;
      alertsList.appendChild(alertItem);
    });
  } else {
    alertsSection.classList.add('hidden');
  }
}

// Initialize the application
async function initApp() {
  // Load patients if on dashboard
  if (document.getElementById('patientsTable')) {
    const patients = await fetchPatients();
    renderPatientsTable(patients, 'patientsTable');
    
    // Check for critical vitals
    const criticalVitals = await checkCriticalVitals();
    renderCriticalVitals(criticalVitals);
    
    // Load vitals for charts
    const vitals = await fetchVitals();
    renderVitalsCharts(vitals);
    
    // Set up periodic updates
    setInterval(async () => {
      const vitals = await fetchVitals();
      renderVitalsCharts(vitals);
      
      const criticalVitals = await checkCriticalVitals();
      renderCriticalVitals(criticalVitals);
    }, 5000);
  }
  
  // Handle patient form if on form page
  if (document.getElementById('patientForm')) {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('id');
    
    if (patientId) {
      document.getElementById('formTitle').textContent = 'Edit Patient';
      const patients = await fetchPatients();
      const patient = patients.find(p => p.id == patientId);
      
      if (patient) {
        document.getElementById('patientId').value = patient.id;
        document.getElementById('name').value = patient.name;
        document.getElementById('ward').value = patient.ward;
        document.getElementById('bed').value = patient.bed;
        document.getElementById('disease').value = patient.disease;
        document.getElementById('nurse').value = patient.nurse;
      }
    }
    
    document.getElementById('patientForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = getFormData('patientForm');
      if (!formData) return;
      
      const patientId = formData.patientId || null;
      delete formData.patientId;
      
      const success = await savePatient(formData, patientId);
      if (success) {
        window.location.href = '/dashboard.html';
      } else {
        showAlert('Failed to save patient');
      }
    });
  }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);