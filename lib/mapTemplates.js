/**
 * Map templates defining city layouts for games
 * Each template contains predefined cities with positions, populations, and colors
 */

export const MapTemplates = {

  // Default map with 5 cities
  default: {
    name: "Five Cities",
    description: "A balanced map with 5 major cities",
    cities: [
      {
        name: "Paris",
        pos: {x: 1500, y: 800},
        population: 5000,
        radius: 150,
        size: 15,
        color: "#FF6B6B"
      },
      {
        name: "Lyon",
        pos: {x: 800, y: 1400},
        population: 3000,
        radius: 130,
        size: 12,
        color: "#4ECDC4"
      },
      {
        name: "Marseille",
        pos: {x: 2200, y: 1600},
        population: 4000,
        radius: 140,
        size: 13,
        color: "#45B7D1"
      },
      {
        name: "Toulouse",
        pos: {x: 500, y: 600},
        population: 3500,
        radius: 135,
        size: 12,
        color: "#96CEB4"
      },
      {
        name: "Nice",
        pos: {x: 2500, y: 900},
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
