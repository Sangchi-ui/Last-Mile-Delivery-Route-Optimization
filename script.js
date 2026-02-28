// --- Realistic Cost Settings (Pure JS Version) ---
const FUEL_COST_PER_KM = 9.0;
const LABOR_COST_PER_MINUTE = 2.0;
const SERVICE_TIME_PER_STOP = 5;
const FIXED_COST_PER_STOP = 15.0;

// Initialize the app
function init() {
    initLeaflet();
    setupEventListeners();
}

function initLeaflet() {
    // Center on India by default
    map = L.map('map').setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    document.getElementById('status-badge').innerText = "Map Ready (OpenStreetMap)";
}

function setupEventListeners() {
    document.getElementById('add-customer').addEventListener('click', addCustomerField);
    document.getElementById('optimize-btn').addEventListener('click', handleOptimize);
}

function addCustomerField() {
    const list = document.getElementById('customer-list');
    const div = document.createElement('div');
    div.className = 'customer-entry';
    div.innerHTML = `
        <input type="text" placeholder="Customer address" class="styled-input customer-addr">
        <span class="remove-stop" style="position:absolute; right:10px; top:10px; cursor:pointer;" onclick="this.parentElement.remove()">×</span>
    `;
    list.appendChild(div);
}

// Helper: Sleep to respect Nominatim rate limits (1 req/sec)
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function geocode(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        return null;
    } catch (e) {
        console.error("Geocoding failed for:", address, e);
        return null;
    }
}

// AI Optimization Logic (Replicated from Backend)
function solveTSP(distMatrix, durMatrix, numNodes) {
    let unvisited = Array.from({ length: numNodes - 1 }, (_, i) => i + 1);
    let currNode = 0;
    let route = [0];

    // 1. Initial Solution: Nearest Neighbor
    while (unvisited.length > 0) {
        let nearestNodeIdx = 0;
        let minCost = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
            let nextNode = unvisited[i];
            let cost = distMatrix[currNode][nextNode] + durMatrix[currNode][nextNode];
            if (cost < minCost) {
                minCost = cost;
                nearestNodeIdx = i;
            }
        }

        currNode = unvisited[nearestNodeIdx];
        route.push(currNode);
        unvisited.splice(nearestNodeIdx, 1);
    }

    route.push(0); // Return to store

    // 2. Refinement: 2-opt Swap
    function getRouteDist(r) {
        let d = 0;
        for (let i = 0; i < r.length - 1; i++) {
            d += distMatrix[r[i]][r[i + 1]];
        }
        return d;
    }

    let improved = true;
    while (improved) {
        improved = false;
        for (let i = 1; i < route.length - 2; i++) {
            for (let j = i + 1; j < route.length - 1; j++) {
                if (j - i === 1) continue;
                // Swap route[i...j]
                let newRoute = route.slice(0, i).concat(route.slice(i, j).reverse()).concat(route.slice(j));
                if (getRouteDist(newRoute) < getRouteDist(route)) {
                    route = newRoute;
                    improved = true;
                }
            }
        }
    }
    return route;
}

function calculateCost(distanceKm, timeMin, numStops) {
    const totalTime = timeMin + (numStops * SERVICE_TIME_PER_STOP);
    const fuelTotal = distanceKm * FUEL_COST_PER_KM;
    const laborTotal = totalTime * LABOR_COST_PER_MINUTE;
    const overheadTotal = numStops * FIXED_COST_PER_STOP;
    return Math.round(fuelTotal + laborTotal + overheadTotal);
}

async function handleOptimize() {
    const storeName = document.getElementById('store-address').value;
    const customerNames = Array.from(document.querySelectorAll('.customer-addr'))
        .map(input => input.value)
        .filter(v => v.trim() !== "");

    if (!storeName || customerNames.length < 1) return alert("Please enter store and at least one customer");

    document.getElementById('status-badge').innerText = "AI Optimizing (Geocoding)...";
    document.getElementById('optimize-btn').disabled = true;
    document.getElementById('optimize-btn').innerText = "AI Processing...";

    try {
        // 1. Geocode all addresses
        let allAddresses = [storeName, ...customerNames];
        let coords = [];
        let labels = [];

        for (let addr of allAddresses) {
            document.getElementById('status-badge').innerText = `Locating: ${addr.substring(0, 20)}...`;
            const loc = await geocode(addr);
            if (!loc) throw new Error(`Could not find: ${addr}`);
            coords.push([loc.lat, loc.lng]);
            labels.push(loc.display_name);
            await sleep(1100); // Nominatim 1req/sec limit
        }

        // 2. Fetch OSRM Matrix (Distance & Duration)
        document.getElementById('status-badge').innerText = "Analyzing Road Topology...";
        const coordStr = coords.map(c => `${c[1]},${c[0]}`).join(';');
        const osrmMatrixUrl = `https://router.project-osrm.org/table/v1/driving/${coordStr}?annotations=distance,duration`;

        const matrixRes = await fetch(osrmMatrixUrl);
        const matrixData = await matrixRes.json();
        if (matrixData.code !== 'Ok') throw new Error("Road topology analysis failed");

        // Convert meters to km and seconds to minutes
        const distMatrix = matrixData.distances.map(row => row.map(d => d / 1000.0));
        const durMatrix = matrixData.durations.map(row => row.map(d => d / 60.0));

        // 3. TSP Optimization
        document.getElementById('status-badge').innerText = "Seeking Best Route (AI)...";
        const initialDist = distMatrix.slice(0, coords.length - 1).reduce((acc, row, i) => acc + row[i + 1], 0) + distMatrix[coords.length - 1][0];
        const routeIndices = solveTSP(distMatrix, durMatrix, coords.length);

        // 4. Compile Results
        const orderedCoords = routeIndices.map(i => coords[i]);
        const orderedLabels = routeIndices.map(i => labels[i]);

        let totalDist = 0;
        let totalDur = 0;
        let legs = [];

        for (let i = 0; i < routeIndices.length - 1; i++) {
            const u = routeIndices[i];
            const v = routeIndices[i + 1];
            totalDist += distMatrix[u][v];
            totalDur += durMatrix[u][v];
            legs.push({
                from: labels[u],
                to: labels[v],
                distance: distMatrix[u][v].toFixed(2),
                duration: durMatrix[u][v].toFixed(2)
            });
        }

        const totalCost = calculateCost(totalDist, totalDur, customerNames.length);
        const savings = initialDist > 0 ? (((initialDist - totalDist) / initialDist) * 100).toFixed(1) : 0;

        const explanation = `Route AI Summary: Utilized a greedy heuristic with 2-opt local refinement. By analyzing the distance matrix, we eliminated inefficient overlaps, reducing travel by <b>${savings}%</b>. Total operational cost: <b>₹${totalCost}</b>.`;

        const finalData = {
            ordered_coords: orderedCoords,
            ordered_labels: orderedLabels,
            total_distance: totalDist.toFixed(2),
            total_time: totalDur.toFixed(2),
            total_time_with_service: (totalDur + (customerNames.length * 5)).toFixed(2),
            total_cost: totalCost,
            legs: legs,
            explanation: explanation
        };

        displayResults(finalData);
        drawRoute(finalData);

        document.getElementById('status-badge').innerText = "Route Optimized ✅";
    } catch (err) {
        alert("Optimization failed: " + err.message);
        document.getElementById('status-badge').innerText = "Error Occurred";
    } finally {
        document.getElementById('optimize-btn').disabled = false;
        document.getElementById('optimize-btn').innerText = "Compute Optimized Route";
    }
}

function displayResults(data) {
    document.getElementById('results-panel').classList.remove('hidden');
    document.getElementById('res-distance').innerText = data.total_distance + " km";
    document.getElementById('res-time').innerText = data.total_time_with_service + " min";
    document.getElementById('res-cost').innerText = "₹" + data.total_cost;
    document.getElementById('res-explanation').innerHTML = data.explanation;

    const itineraryList = document.getElementById('itinerary-list');
    itineraryList.innerHTML = "";
    data.legs.forEach((leg, index) => {
        // Skip the last leg (returning to the store) from the itinerary list
        if (index === data.legs.length - 1) return;

        const li = document.createElement('li');
        const shortName = leg.to.split(',')[0];
        li.innerHTML = `
            <span class="order" style="background:#6366f1; color:white; border-radius:50%; width:20px; height:20px; display:inline-flex; align-items:center; justify-content:center; margin-right:10px; font-size:12px;">${index + 1}</span>
            <div style="flex:1">
                <strong title="${leg.to}">${shortName}</strong><br>
                <small style="color:#94a3b8">${leg.distance} km | ${leg.duration} min</small>
            </div>
        `;
        itineraryList.appendChild(li);
    });
}

async function drawRoute(data) {
    // Clear old markers and lines
    markers.forEach(m => map.removeLayer(m));
    if (routeLine) map.removeLayer(routeLine);
    markers = [];

    const coords = data.ordered_coords; // Lat/Lng array
    const labels = data.ordered_labels;

    // Add markers
    coords.forEach((coord, i) => {
        if (i === coords.length - 1) return; // Don't repeat store marker

        const isStore = (i === 0);
        const name = labels[i].split(',')[0];

        const marker = L.marker([coord[0], coord[1]]).addTo(map)
            .bindPopup(isStore ? `<b>STORE:</b> ${labels[i]}` : `<b>STOP ${i}:</b> ${labels[i]}`)
            .bindTooltip(name, { permanent: false, direction: 'top' });
        markers.push(marker);
    });

    // Only draw the route from store to the last customer (exclude return trip)
    const destinationCoords = coords.slice(0, -1);
    const osrmCoords = destinationCoords.map(c => `${c[1]},${c[0]}`).join(';');
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmCoords}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(osrmUrl);
        const osrmData = await response.json();

        if (osrmData.code === 'Ok') {
            const roadCoords = osrmData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            routeLine = L.polyline(roadCoords, {
                color: '#6366f1',
                weight: 6,
                opacity: 0.8,
                lineJoin: 'round'
            }).addTo(map);
            map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        } else {
            routeLine = L.polyline(coords.map(c => [c[0], c[1]]), { color: '#6366f1', weight: 4, dashArray: '10, 10' }).addTo(map);
        }
    } catch (e) {
        console.error("OSRM Route fetch failed:", e);
        routeLine = L.polyline(coords.map(c => [c[0], c[1]]), { color: '#6366f1', weight: 4 }).addTo(map);
    }
}

// Start
init();

