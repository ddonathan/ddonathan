function calculateWarmupSets() {
    const targetWeights = [
        parseFloat(document.getElementById('targetWeight1').value),
        parseFloat(document.getElementById('targetWeight2').value)
    ];
    const warmupTables = [
        document.getElementById('warmupTable1'),
        document.getElementById('warmupTable2')
    ];
    const warmupHeaders = [
        document.getElementById('warmupHeader1'),
        document.getElementById('warmupHeader2')
    ];
    const warmupFooters = [
        document.getElementById('warmupFooter1'),
        document.getElementById('warmupFooter2')
    ];
    const containers = [
        document.getElementById('lift1Container'),
        document.getElementById('lift2Container')
    ];
    clearTables();

    targetWeights.forEach((targetWeight, index) => {
        const liftSelect = document.getElementById(`liftSelect${index + 1}`);
        if (!liftSelect.value || !targetWeight || targetWeight < inventory.barbell) {
            warmupTables[index].innerHTML = '<tr><td colspan="5">Please enter a valid target weight greater than or equal to the barbell weight.</td></tr>';
            return;
        }

        containers[index].classList.remove('hidden');

        // Calculate the weights and reps for each warm-up set
        const warmupSets = config.warmupPercentages.map(pct => ({
            percentage: pct.percentage,
            weight: formatWeight(targetWeight * pct.percentage), // Format weight
            reps: pct.reps,
            plates: calculatePlates(targetWeight * pct.percentage) // Format weight
        }));

        // Create header row with percentages, weights, and reps
        warmupSets.forEach(set => {
            const headerCell = document.createElement('th');
            headerCell.innerHTML = `${Math.round(set.percentage * 100)}%<br>${set.weight} lbs<br>${set.reps} reps`;
            warmupHeaders[index].firstElementChild.appendChild(headerCell);
        });

        // Fill table with plate data
        inventory.plates.sort((a, b) => b.mass - a.mass); // Ensure plates are sorted descending

        inventory.plates.forEach(plate => {
            const row = document.createElement('tr');
            const weightCell = document.createElement('td');
            weightCell.textContent = `${plate.mass}`;
            weightCell.classList.add('first-column'); // Apply first-column class
            if (config.showColors) {
                weightCell.style.color = plate.color;
            }
            row.appendChild(weightCell);

            warmupSets.forEach(set => {
                const plateCell = document.createElement('td');
                const plateCount = set.plates.find(p => p.mass === plate.mass);
                if (plateCount) {
                    plateCell.textContent = plateCount.count > 1 ? plateCount.count : '1';
                } else {
                    plateCell.textContent = '';
                }
                row.appendChild(plateCell);
            });

            warmupTables[index].appendChild(row);
        });

        // Add total weight row
        const totalWeightRow = document.createElement('tr');
        const totalWeightCell = document.createElement('td');
        totalWeightCell.textContent = 'Total Weight';
        totalWeightCell.classList.add('first-column'); // Apply first-column class
        totalWeightRow.appendChild(totalWeightCell);

        let warning = false;
        warmupSets.forEach(set => {
            const totalWeightDataCell = document.createElement('td');
            const actualWeight = set.plates.reduce((sum, plate) => sum + plate.mass * plate.count * 2, inventory.barbell);
            totalWeightDataCell.textContent = formatWeight(actualWeight); // Format weight

            const weightDifference = Math.abs(actualWeight - set.weight);
            if (weightDifference > 5) {
                totalWeightDataCell.classList.add('warning');
                warning = true;
            } else if (weightDifference > 0) {
                totalWeightDataCell.classList.add('close-warning');
            }

            totalWeightRow.appendChild(totalWeightDataCell);
        });

        warmupFooters[index].appendChild(totalWeightRow);

        if (warning) {
            const warningRow = document.createElement('tr');
            const warningCell = document.createElement('td');
            warningCell.colSpan = warmupSets.length + 1;
            warningCell.classList.add('warning');
            warningCell.textContent = 'Warning: Unable to match the desired weight with available plates.';
            warmupFooters[index].appendChild(warningRow);
        }
    });
}

function formatWeight(weight) {
    return weight % 1 === 0 ? weight.toFixed(0) : weight.toFixed(1);
}

function calculatePlates(weight) {
    let weightNeeded = weight - inventory.barbell;
    if (weightNeeded < 0) return [];

    weightNeeded /= 2; // Plates are added on both sides
    const platesToUse = [];

    inventory.plates.sort((a, b) => b.mass - a.mass); // Sort plates descending

    for (const plate of inventory.plates) {
        let pairsNeeded = 0;
        while (weightNeeded >= plate.mass && pairsNeeded < plate.pairs) {
            weightNeeded -= plate.mass;
            pairsNeeded++;
        }
        if (pairsNeeded > 0) {
            platesToUse.push({ mass: plate.mass, count: pairsNeeded });
        }
    }

    // Check if the weight was successfully allocated
    if (weightNeeded > 0) {
        console.warn(`Cannot exactly match the weight ${weight}. Remaining weight: ${weightNeeded * 2}`);
        return platesToUse; // Return partial allocations
    } else {
        return platesToUse;
    }
}
