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