const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Create a choropleth layer
let choroplethLayer;
let selectedCountry; 

// Function to calculate similarities between countries
function calculateSimilarities(data) {
    // Group artists by country
    const artistsByCountry = d3.group(data, d => d.Country);
    
    // Calculate percentage of shared artists between countries
    const similarities = {};
    artistsByCountry.forEach((artists1, country1) => {
        similarities[country1] = {};
        const artists1List = artists1.map(d => d.Artist);
        
        artistsByCountry.forEach((artists2, country2) => {
            if (country1 !== country2) {
                const artists2List = artists2.map(d => d.Artist);
                // Find the shared artists
                const sharedArtistsList = artists1List.filter(artist => 
                    artists2List.includes(artist)
                );
                
                // Calculate the percentage of shared artists
                const minArtists = Math.min(artists1List.length, artists2List.length);
                similarities[country1][country2] = {
                    score: sharedArtistsList.length / minArtists,
                    sharedArtists: sharedArtistsList,
                    totalArtists: {
                        country1: artists1List,
                        country2: artists2List
                    }
                };
            }
        });
    });
    return similarities;
}

// Load the country data and artist data
Promise.all([
    d3.json('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'),
    d3.csv('https://raw.githubusercontent.com/manuelanzali/Project-3/refs/heads/main/Resources/top_artists_by_country.csv')
]).then(([worldData, artistData]) => {
    // Process the artist data to calculate similarities
    const countries = [...new Set(artistData.map(d => d.Country))].sort();

    // Populate the dropdown with converted country names
    const select = document.getElementById('countrySelect');
    countries.forEach(countryCode => {
        const option = document.createElement('option');
        option.value = countryCode;
        option.textContent = convertCountryCode(countryCode);
        select.appendChild(option);
    });

    const similarities = calculateSimilarities(artistData);

    // Update the map when a country is selected
    select.addEventListener('change', (event) => {
        const selectedCountry = event.target.value;
        updateChoropleth(worldData, similarities[selectedCountry]);
    });

    // Trigger initial selection
    if (countries.length > 0) {
        select.value = countries[0];
        select.dispatchEvent(new Event('change'));
    }
});

function updateChoropleth(worldData, similarityScores) {
    if (choroplethLayer) {
        map.removeLayer(choroplethLayer);
    }

    choroplethLayer = L.geoJSON(worldData, {
        style: feature => {
            // Check if this is the selected country
            const isSelected = feature.properties.ISO_A2 === selectedCountry;
            
            return {
                fillColor: isSelected ? '#2ECC71' : // Highlight color for selected country
                          getColor((similarityScores[feature.properties.ISO_A2]?.score || 0)),
                weight: isSelected ? 3 : 1, // Thicker border for selected country
                opacity: 1,
                color: isSelected ? '#27AE60' : 'white', // Different border color for selected
                fillOpacity: isSelected ? 0.8 : 0.7,
                dashArray: isSelected ? '3' : null // Optional: adds dashed border to selected
            };
        },
        onEachFeature: (feature, layer) => {
            const countryData = similarityScores[feature.properties.ISO_A2];
            
            if (countryData) {
                const percentage = (countryData.score * 100).toFixed(0);
                const countryName = convertCountryCode(feature.properties.ISO_A2);
                
                // Create a formatted list of shared artists
                const sharedArtistsList = countryData.sharedArtists
                    .map(artist => `• ${artist}`)
                    .join('<br>');
                
                // Create the popup content
                const popupContent = `
                    <div style="min-width: 200px">
                        <h3 style="margin: 0 0 8px 0">${countryName}</h3>
                        <p style="margin: 0 0 8px 0"><strong>${percentage}% similar</strong> 
                        (${countryData.sharedArtists.length}/5 artists shared)</p>
                        ${countryData.sharedArtists.length > 0 ? `
                            <p style="margin: 0 0 4px 0"><strong>Shared Artists:</strong></p>
                            <div style="margin-left: 8px">
                                ${sharedArtistsList}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                layer.bindPopup(popupContent);
            } else {
                const countryName = convertCountryCode(feature.properties.ISO_A2);
                layer.bindPopup(`${countryName}: No data available`);
            }
        }
    }).addTo(map);
}

// Update the event listener in the Promise.all section
Promise.all([
    d3.json('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'),
    d3.csv('https://raw.githubusercontent.com/manuelanzali/Project-3/refs/heads/main/Resources/top_artists_by_country.csv')
]).then(([worldData, artistData]) => {
    // Process the artist data to calculate similarities
    const countries = [...new Set(artistData.map(d => d.Country))].sort();

    // Populate the dropdown with converted country names
    const select = document.getElementById('countrySelect');
    countries.forEach(countryCode => {
        const option = document.createElement('option');
        option.value = countryCode;
        option.textContent = convertCountryCode(countryCode);
        select.appendChild(option);
    });

    const similarities = calculateSimilarities(artistData);

    // Update the map when a country is selected
    select.addEventListener('change', (event) => {
        selectedCountry = event.target.value; // Update the selected country
        updateChoropleth(worldData, similarities[selectedCountry]);
    });

    // Trigger initial selection
    if (countries.length > 0) {
        selectedCountry = countries[0]; // Set initial selected country
        select.value = selectedCountry;
        select.dispatchEvent(new Event('change'));
    }
});

function getColor(similarity) {
    const percentage = similarity * 100;
    
    return percentage >= 100 ? '#800026' : // 5/5 artists shared
           percentage >= 80  ? '#BD0026' : // 4/5 artists shared
           percentage >= 60  ? '#E31A1C' : // 3/5 artists shared
           percentage >= 40  ? '#FC4E2A' : // 2/5 artists shared
           percentage >= 20  ? '#FD8D3C' : // 1/5 artists shared
                             '#FFEDA0';   // No shared artists
}