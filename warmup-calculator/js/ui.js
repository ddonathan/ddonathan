// Add these functions at the top of the file
function setPrintDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleString();
    document.getElementById('printDateTime').textContent = dateTimeString;
}

function setFooterText(footerText) {
    const footerTextElement = document.getElementById('footerText');
    footerTextElement.textContent = footerText || '';
}

async function loadConfigFromFile() {
    try {
        const response = await fetch('config.json');
        const fileConfig = await response.json();
        setFooterText(fileConfig.footerText);
        if (fileConfig.showFooter) {
            setPrintDateTime();
        }
        // Merge file config with existing config
        config = { ...config, ...fileConfig };
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Function to get query string parameters
function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const regex = /([^&=]+)=([^&]*)/g;
    let m;
    while (m = regex.exec(queryString)) {
        params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    return params;
}

// Function to set lift and weight from query string and trigger calculation
function setLiftAndWeightFromQuery() {
    const params = getQueryParams();
    let shouldCalculate = false;

    if (params.lift1) {
        document.getElementById('liftSelect1').value = params.lift1;
        shouldCalculate = true;
    }
    if (params.weight1) {
        document.getElementById('targetWeight1').value = params.weight1;
        shouldCalculate = true;
    }
    if (params.lift2) {
        document.getElementById('liftSelect2').value = params.lift2;
        shouldCalculate = true;
    }
    if (params.weight2) {
        document.getElementById('targetWeight2').value = params.weight2;
        shouldCalculate = true;
    }

    if (shouldCalculate) {
        calculateWarmupSets();
    }
}

// Modify the DOMContentLoaded event listener
window.addEventListener('DOMContentLoaded', async () => {
    loadFromLocalStorage();
    await loadConfigFromFile(); // Add this line to load the config file

    // Populate lift options
    populateLiftOptions();

    // Populate textareas with JSON data
    document.getElementById('configTextarea').value = JSON.stringify(config, null, 2);
    document.getElementById('inventoryTextarea').value = JSON.stringify(inventory, null, 2);

    // Set selected templates
    const selectedConfigTemplate = localStorage.getItem('selectedConfigTemplate') || 'standard';
    const selectedInventoryTemplate = localStorage.getItem('selectedInventoryTemplate') || 'basic';
    document.getElementById('configTemplateSelect').value = selectedConfigTemplate;
    document.getElementById('inventoryTemplateSelect').value = selectedInventoryTemplate;

    // Load templates based on saved selection
    await loadConfig();
    await loadInventoryTemplate();

    // Set lift and weight from query string and trigger calculation
    setLiftAndWeightFromQuery();

    // Add event listeners for automatic calculation
    document.getElementById('liftSelect1').addEventListener('change', () => {
        document.getElementById('targetWeight1').focus();
        document.getElementById('liftName1').textContent = document.getElementById('liftSelect1').value;
        calculateWarmupSets();
    });
    document.getElementById('liftSelect2').addEventListener('change', () => {
        document.getElementById('targetWeight2').focus();
        document.getElementById('liftName2').textContent = document.getElementById('liftSelect2').value;
        calculateWarmupSets();
    });
    document.getElementById('targetWeight1').addEventListener('input', calculateWarmupSets);
    document.getElementById('targetWeight2').addEventListener('input', calculateWarmupSets);

    // Save to local storage when config or inventory is altered
    document.getElementById('configTextarea').addEventListener('input', () => {
        document.getElementById('configTemplateSelect').value = 'custom';
        try {
            config = JSON.parse(document.getElementById('configTextarea').value);
            saveToLocalStorage();
            calculateWarmupSets();
            clearError();
        } catch (e) {
            displayError('Invalid JSON in config textarea: ' + e.message);
        }
    });
    document.getElementById('inventoryTextarea').addEventListener('input', () => {
        document.getElementById('inventoryTemplateSelect').value = 'custom';
        try {
            inventory = JSON.parse(document.getElementById('inventoryTextarea').value);
            saveToLocalStorage();
            calculateWarmupSets();
            clearError();
        } catch (e) {
            displayError('Invalid JSON in inventory textarea: ' + e.message);
        }
    });

    // Add event listener for inventory template selection
    document.getElementById('inventoryTemplateSelect').addEventListener('change', async () => {
        await loadInventoryTemplate();
    });
});

function displayError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

function clearError() {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = '';
    errorContainer.style.display = 'none';
}

function toggleTextarea(type) {
    const container = document.getElementById(`${type}Container`);
    const button = document.querySelector(`button[onclick="toggleTextarea('${type}')"]`);
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        button.textContent = `Hide ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    } else {
        container.style.display = 'none';
        button.textContent = `Show ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    }
}

function clearTables() {
    document.getElementById('warmupTable1').innerHTML = '';
    document.getElementById('warmupTable2').innerHTML = '';
    document.getElementById('warmupHeader1').innerHTML = '<tr><th>Weight</th></tr>';
    document.getElementById('warmupHeader2').innerHTML = '<tr><th>Weight</th></tr>';
    document.getElementById('warmupFooter1').innerHTML = '';
    document.getElementById('warmupFooter2').innerHTML = '';
}

function populateLiftOptions() {
    const liftSelect1 = document.getElementById('liftSelect1');
    const liftSelect2 = document.getElementById('liftSelect2');

    config.lifts.forEach(lift => {
        const option1 = document.createElement('option');
        option1.value = lift;
        option1.textContent = lift;
        liftSelect1.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = lift;
        option2.textContent = lift;
        liftSelect2.appendChild(option2);
    });
}