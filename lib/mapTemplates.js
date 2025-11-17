/**
 * Map templates defining city layouts for games
 * Each template contains predefined cities with positions, populations, and colors
 */

export const MapTemplates = {

  // Default map with 5 cities - positions based on real GPS coordinates
  // Projection: France bbox [lat: 42-50°, lon: 0-8°] -> 2500×2000px with 200px margins
  default: {
    name: "Five Cities",
    description: "A balanced map with 5 major cities (realistic French geography)",
    cities: [
      {
        name: "Paris",
        pos: {x: 820, y: 430},  // Real: 48.8534°N, 2.3488°E
        population: 5000,
        radius: 150,
        size: 15,
        color: "#FF6B6B"
      },
      {
        name: "Lyon",
        pos: {x: 1470, y: 1050},  // Real: 45.7485°N, 4.8467°E
        population: 3000,
        radius: 130,
        size: 12,
        color: "#4ECDC4"
      },
      {
        name: "Marseille",
        pos: {x: 1610, y: 1540},  // Real: 43.2833°N, 5.3667°E
        population: 4000,
        radius: 140,
        size: 13,
        color: "#45B7D1"
      },
      {
        name: "Toulouse",
        pos: {x: 580, y: 1480},  // Real: 43.6043°N, 1.4437°E
        population: 3500,
        radius: 135,
        size: 12,
        color: "#96CEB4"
      },
      {
        name: "Nice",
        pos: {x: 2110, y: 1460},  // Real: 43.7031°N, 7.2661°E
        population: 3000,
        radius: 130,
        size: 12,
        color: "#FFEAA7"
      }
    ]
  }

};

// Helper function to get default template
export function getDefaultTemplate() {
  return MapTemplates.default;
}

// Helper function to create cities from template in database
export async function createCitiesFromTemplate(game_id, template = null) {
  if (!template) template = getDefaultTemplate();

  for (const cityData of template.cities) {
    await MapObjects.insertAsync({
      type: 'city',
      game_id: game_id,
      name: cityData.name,
      pos: cityData.pos,
      population: cityData.population,
      radius: cityData.radius,
      size: cityData.size,
      color: cityData.color
    });
  }
}
