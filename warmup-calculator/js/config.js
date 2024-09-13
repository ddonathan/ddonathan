let inventory = null;
let config = null;

async function loadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load ${url}`);
    }
    return response.json();
}

async function loadConfig() {
    try {
        config = await loadJSON('config.json');
        document.getElementById('configTextarea').value = JSON.stringify(config, null, 2);
        saveToLocalStorage();
        calculateWarmupSets();
    } catch (error) {
        displayError(`Error loading config: ${error.message}`);
    }
}

async function loadInventoryTemplate() {
    const selectedTemplate = document.getElementById('inventoryTemplateSelect').value;
    let inventoryUrl = '';
    switch (selectedTemplate) {
        case 'basic':
            inventoryUrl = 'inventory-basic.json';
            break;
        case 'intermediate':
            inventoryUrl = 'inventory-intermediate.json';
            break;
        case 'advanced':
            inventoryUrl = 'inventory-advanced.json';
            break;
        case 'dumbbell':
            inventoryUrl = 'inventory-dumbbell.json';
            break;
        case 'custom':
            const savedInventory = localStorage.getItem('inventory');
            if (savedInventory) {
                inventory = JSON.parse(savedInventory);
            } else {
                inventory = await loadJSON('inventory-basic.json');
            }
            document.getElementById('inventoryTextarea').value = JSON.stringify(inventory, null, 2);
            saveToLocalStorage();
            calculateWarmupSets();
            return;
    }

    try {
        inventory = await loadJSON(inventoryUrl);
        document.getElementById('inventoryTextarea').value = JSON.stringify(inventory, null, 2);
        saveToLocalStorage();
        calculateWarmupSets();
    } catch (error) {
        displayError(`Error loading inventory template: ${error.message}`);
    }
}

function saveToLocalStorage() {
    localStorage.setItem('config', document.getElementById('configTextarea').value);
    localStorage.setItem('inventory', document.getElementById('inventoryTextarea').value);
    localStorage.setItem('selectedConfigTemplate', document.getElementById('configTemplateSelect').value);
    localStorage.setItem('selectedInventoryTemplate', document.getElementById('inventoryTemplateSelect').value);
}

function loadFromLocalStorage() {
    const savedConfig = localStorage.getItem('config');
    const savedInventory = localStorage.getItem('inventory');

    if (savedConfig) {
        config = JSON.parse(savedConfig);
    } else {
        loadConfig();
    }

    if (savedInventory) {
        inventory = JSON.parse(savedInventory);
    } else {
        loadInventoryTemplate();
    }
}

function resetToDefaults() {
    loadConfig();
    loadInventoryTemplate();
    document.getElementById('configTemplateSelect').value = 'standard';
    document.getElementById('inventoryTemplateSelect').value = 'basic';
    saveToLocalStorage();
    calculateWarmupSets();
}

function displayError(message) {
    const errorContainer = document.getElementById('errorContainer');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}