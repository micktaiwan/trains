# Trains - Gameplay Design Document

## Overview

**Trains** is a cooperative multiplayer railway management simulation where teams build and maintain railway networks to transport passengers between cities. Players must strategically place stations near cities, connect them with rails, and deploy trains to handle growing passenger demand efficiently.

---

## 🎯 Core Concept: Cities as Foundation

### The Fundamental Problem Solved

**Previous Issue**: Without fixed points of interest, station placement was arbitrary and passenger destinations were ambiguous.

**Solution**: **Cities are fixed spawn/destination points** that give structure and purpose to the railway network.

```
CITIES (fixed on map)
  ↓ spawn passengers near
PASSENGERS (walk to nearest station, want to reach destination city)
  ↓ board at
STATIONS (placed by players near cities)
  ↓ transported by
TRAINS (follow rail network)
  ↓ disembark at
STATIONS (near destination city)
  ↓ walk to
CITIES (destination reached, revenue generated)
```

### Why Cities Matter

1. **Strategic Station Placement**: Stations must be within 300m of a city to be useful
2. **Clear Passenger Flow**: Passengers spawn near origin city, travel to destination city
3. **Network Design Decisions**: Connect high-traffic cities vs. serve remote locations
4. **Replayability**: Different city layouts create different optimal strategies

---

## Core Game Loop

```
Select Map → Build Stations Near Cities → Connect Rails → Passengers Spawn →
Trains Transport → Earn Revenue → Expand Network
                        ↓
            Team Treasury Growth
```

### Game Flow

1. **Map Selection**: Choose a map with predefined cities (3-30 cities depending on size)
2. **Initialization**: Team starts with $12,000 capital
3. **Build Infrastructure**: Place stations near cities (max 300m distance), connect with rails
4. **Deploy Trains**: Purchase trains with different capacities and speeds
5. **Transport Passengers**: Trains pick up passengers at origin cities, deliver to destination cities
6. **Generate Revenue**: Each passenger transported adds money to team treasury
7. **Scale Up**: Use profits to build more stations, rails, and trains
8. **Handle Growth**: As passenger spawn rate increases, optimize network to avoid bottlenecks

---

## 🏙️ City System

### City Properties

Cities are **fixed, non-modifiable** points on the map defined when a game is created.

```javascript
{
  type: 'city',
  name: 'Paris',
  pos: {x: 1000, y: 500},
  population: 5000,      // Affects passenger spawn rate
  radius: 150,           // Visual size and spawn area
  color: '#FF6B6B',      // Distinctive color per city
  fixed: true            // Cannot be moved/deleted by players
}
```

### Map Templates

Games use predefined map templates with different city configurations:

#### Starter Map: "Triangle Region" (3 cities)
```
     Paris (pop: 5000)
       /           \
      /             \
Lyon (3000)    Marseille (4000)
```
- **Ideal for**: Learning mechanics
- **Challenge**: Simple hub-and-spoke or ring network

#### Medium Map: "Central Europe" (8-10 cities)
- Mix of large hubs (pop: 5000-7000) and small towns (pop: 1500-3000)
- **Challenge**: Prioritize high-traffic routes vs. comprehensive coverage

#### Large Map: "Continental" (20-30 cities)
- Complex network with multiple regional clusters
- **Challenge**: Multi-hub architecture, express vs. local train strategies

### Passenger Spawn Logic

```javascript
// When spawning a passenger:
function spawnPassenger(game_id) {
  const cities = Cities.find({game_id}).fetch();

  // 1. Pick origin city (weighted by population)
  const originCity = weightedRandom(cities, city => city.population);

  // 2. Pick destination city (prefer distant cities)
  const destinationCity = pickDestination(originCity, cities);

  // 3. Spawn passenger near origin city (within radius)
  const spawnPos = randomPositionNear(originCity.pos, radius: 150);

  return new Person({
    game_id,
    cityOrigin_id: originCity._id,
    cityDestination_id: destinationCity._id,
    pos: spawnPos,
    state: 'walking_to_station'
  });
}

function pickDestination(origin, allCities) {
  const candidates = allCities.filter(c => c._id !== origin._id);

  // Weight by distance (favor longer trips for gameplay challenge)
  const weights = candidates.map(city => {
    const dist = distance(origin.pos, city.pos);
    return {
      city,
      weight: Math.pow(dist / 1000, 0.5) // Square root to balance
    };
  });

  return weightedRandom(weights);
}
```

### Station Placement Validation

**Rule**: Stations must be within 300m of a city to serve passengers.

```javascript
// When player attempts to place station:
function canPlaceStation(pos, team_id, game_id) {
  const nearestCity = findNearestCity(pos, game_id);
  const distance = getDistance(pos, nearestCity.pos);

  if (distance > 300) {
    return {
      success: false,
      error: "Station must be within 300m of a city"
    };
  }

  // Players can place multiple stations per city (for capacity)
  return {success: true};
}
```

**UI Feedback**:
- When in "Place Station" mode, show 300m radius circles around each city
- Highlight nearest city when hovering placement position
- Display "Too far from any city" error on invalid placement

---

## Economy System

### Team Treasury
- **Shared Resource**: All team members draw from and contribute to a common fund
- **Starting Capital**: Teams begin with **$12,000** (increased from original to allow for mistakes)
- **Transparency**: All team members can see current balance in real-time

### Construction Costs

| Item | Base Cost | Notes |
|------|-----------|-------|
| **Station** | $500 | One-time placement cost, must be within 300m of a city |
| **Rail Connection** | $2 per meter | Cost scales with distance between stations |
| **Basic Train** | $1,000 | Balanced option (10 passengers, 60 km/h) |
| **Express Train** | $1,800 | Speed specialist (8 passengers, 120 km/h) |
| **Freight Train** | $1,500 | Capacity specialist (20 passengers, 40 km/h) |
| **Wagon** | $300 | Adds +5 passenger capacity to any train |

**Balance Changes from Original**:
- Express Train reduced from $2,500 → $1,800 (better value)
- Express capacity increased from 6 → 8 passengers (more viable)
- Starting capital increased from $10,000 → $12,000 (more forgiving)

### Revenue Model

**Base Revenue**: $10 per passenger successfully transported to their destination city

**Bonuses**:
- **Efficiency Bonus**: +$5 if train is at >80% capacity (encourages full trains)

**Removed**: Distance bonus (encouraged inefficient routing)

**Example Revenue Calculation:**
```
Passenger transported from Paris to Lyon on a full train (10/10):
Base: $10
Efficiency: $5 (train at 100% capacity)
Total: $15 per passenger × 10 = $150
```

### Demolition & Recovery

**Critical Feature**: Players can demolish infrastructure for partial refund.

| Item | Refund |
|------|--------|
| Station | $250 (50%) |
| Rail | $1 per meter (50%) |
| Train | Cannot demolish (operational asset) |

**Purpose**: Allows teams to recover from poor early decisions without bankruptcy.

### Player Expense Tracking

Each player's spending is tracked individually for statistics:
- **Stations Built**: Count and total cost
- **Rails Laid**: Total meters and cost
- **Trains Purchased**: Count by type and total cost
- **Wagons Added**: Count and total cost

This creates visibility into contributions without creating competition (economy is still shared).

---

## Passenger System

### Passenger Lifecycle

1. **Spawn**: Appear within 150m radius of origin city
2. **Walk to Station**: Move toward nearest station (within 300m of origin city)
3. **Wait**: Stand at station until train with capacity arrives
4. **Board**: Enter train when it stops at station
5. **Travel**: Remain on train (invisible, stored as train property)
6. **Disembark**: Exit at station closest to destination city
7. **Walk to City**: Move from station to destination city center
8. **Despawn**: Disappear upon reaching destination (revenue generated)

### Passenger Properties

```javascript
{
  type: 'person',
  game_id: String,
  pos: {x: Number, y: Number},
  cityOrigin_id: String,           // NEW: City where spawned
  cityDestination_id: String,      // NEW: City they want to reach
  state: String,                   // 'walking_to_station' | 'waiting' | 'traveling' | 'walking_to_destination' | 'arrived'
  waitingAt: String | null,        // Station _id if waiting
  boardedTrain: String | null,     // Train _id if traveling
  spawnTime: Date,                 // For timeout mechanics
}
```

### Passenger Behavior States

#### State 1: Walking to Station
```javascript
// Find nearest station to origin city (not just nearest station)
const originCity = Cities.findOne(this.cityOrigin_id);
const stationsNearOrigin = Stations.find({
  game_id: this.game_id,
  // Within service range of origin city
}).fetch().filter(station =>
  distance(station.pos, originCity.pos) <= 300
);

const nearestStation = findNearest(this.pos, stationsNearOrigin);
this.walkTowards(nearestStation.pos);
```

#### State 2: Waiting at Station
```javascript
// Remain at station, visible to trains
// Timeout after 5 minutes → despawn with penalty
if (Date.now() - this.spawnTime > 5 * 60 * 1000) {
  this.despawn();
  team.treasury -= 5; // Opportunity cost penalty
}
```

#### State 3: Traveling on Train
```javascript
// Passenger is stored in train's passengers array
// Not rendered on map (hidden inside train)
```

#### State 4: Walking to Destination
```javascript
// After disembarking at station near destination city
const destCity = Cities.findOne(this.cityDestination_id);
this.walkTowards(destCity.pos);

if (distance(this.pos, destCity.pos) < 50) {
  this.state = 'arrived';
  this.generateRevenue();
  this.despawn();
}
```

### Spawn Rate Progression

| Time Elapsed | Passengers/Minute | Max Active Passengers |
|--------------|-------------------|----------------------|
| 0-5 min | 1 | 10 |
| 5-10 min | 3 | 25 |
| 10-20 min | 6 | 50 |
| 20-30 min | 10 | 100 |
| 30+ min | 15 | 150 |

**Key Design Principles:**
- **Gradual Introduction**: Start with 1 passenger to teach mechanics
- **Accelerated Mid-Game**: Faster ramp-up (3/min instead of 2/min)
- **Capacity Cap**: Prevent performance issues with passenger limits

---

## Train System

### Train Types

#### 1. Basic Train (Starter Train)
- **Cost**: $1,000
- **Speed**: 60 km/h (default)
- **Base Capacity**: 10 passengers
- **Use Case**: Balanced option for early game and medium routes

#### 2. Express Train (Speed Specialist)
- **Cost**: $1,800 (reduced from $2,500)
- **Speed**: 120 km/h (2× default)
- **Base Capacity**: 8 passengers (increased from 6)
- **Use Case**: Long-distance routes between distant cities

#### 3. Freight Train (Capacity Specialist)
- **Cost**: $1,500
- **Speed**: 40 km/h (0.66× default)
- **Base Capacity**: 20 passengers
- **Use Case**: High-traffic short routes, commuter lines between nearby cities

### Wagon System

- **Cost**: $300 per wagon
- **Capacity Bonus**: +5 passengers
- **Max Wagons**: 5 per train
- **Speed Penalty**: -3% speed per wagon (reduced from -5% to avoid trap)

**Example Train Configurations:**
```
Basic Train + 2 Wagons
- Total Capacity: 20 passengers (10 + 2×5)
- Effective Speed: 56.4 km/h (60 × 0.94)
- Total Cost: $1,600 ($1,000 + 2×$300)

Freight Train + 4 Wagons
- Total Capacity: 40 passengers (20 + 4×5)
- Effective Speed: 35.2 km/h (40 × 0.88)
- Total Cost: $2,700 ($1,500 + 4×$300)
```

### Train Mechanics

Trains board passengers automatically within 50m radius at stations. Passengers are delivered to the nearest station to their destination city. Intelligent routing prioritizes delivering current passengers over picking up new ones.

---

## Difficulty Progression

### Early Game (0-5 minutes)
- **Passenger Rate**: 1 per minute
- **Challenge**: Learn mechanics with forgiving pace
- **Strategy**: Connect 3-4 major cities in a simple network

### Mid Game (5-20 minutes)
- **Passenger Rate**: 3-10 per minute
- **Challenge**: Capacity becomes a bottleneck
- **Strategy**: Add more trains, consider train types for different routes

### Late Game (20+ minutes)
- **Passenger Rate**: 15+ per minute
- **Challenge**: Network optimization and capacity management
- **Strategy**: Specialized trains, wagon investments, hub-and-spoke networks

### Bottleneck Design
As passenger spawn rate increases faster than initial infrastructure can handle:
- Waiting passengers accumulate at stations
- Players must decide: Build more stations near cities? Buy more trains? Add wagons?
- Economic pressure: Revenue must outpace expansion costs

### Passenger Timeout Penalty
- Passengers waiting >5 minutes despawn
- Team loses $5 per timed-out passenger (opportunity cost)
- Creates urgency to improve service

---

## Statistics & UI

### Team Statistics (Shared Screen)
Display in a team dashboard accessible by all members:

```
┌─────────────────────────────────────┐
│ Team Treasury: $12,450              │
├─────────────────────────────────────┤
│ Total Passengers Transported: 243   │
│ Total Revenue: $3,645               │
│ Stations: 12                        │
│ Total Rail Length: 5,240m           │
│ Active Trains: 8                    │
│                                     │
│ Passengers Waiting: 15              │
│ Passengers Timed Out: 3 ⚠️          │
│ Current Spawn Rate: 6/min           │
└─────────────────────────────────────┘
```

### City Statistics Panel (NEW)
Show real-time city service levels:

```
┌─────────────────────────────────────┐
│ City Overview                       │
├─────────────────────────────────────┤
│ 🔴 Paris (pop: 5000)                │
│   👤 Waiting: 12                    │
│   🚉 Stations: 3                    │
│   🚂 Trains serving: 5              │
│                                     │
│ 🔵 Lyon (pop: 3000)                 │
│   👤 Waiting: 5                     │
│   🚉 Stations: 1  ⚠️ Underserved   │
│   🚂 Trains serving: 2              │
│                                     │
│ 🟢 Marseille (pop: 4000)            │
│   👤 Waiting: 3                     │
│   🚉 Stations: 2                    │
│   🚂 Trains serving: 4              │
│                                     │
│ Popular Routes:                     │
│   Paris → Lyon (45 trips)           │
│   Marseille → Paris (32 trips)      │
└─────────────────────────────────────┘
```

### Individual Player Statistics
Show each player's contributions (non-competitive):

```
Player: JohnDoe
┌─────────────────────────────────────┐
│ Your Contributions                  │
├─────────────────────────────────────┤
│ Stations Built: 5 ($2,500)          │
│ Rails Laid: 2,100m ($4,200)         │
│ Trains Purchased: 3 ($3,500)        │
│   - Basic: 2                        │
│   - Express: 1                      │
│ Wagons Added: 4 ($1,200)            │
│                                     │
│ Total Spent: $11,400                │
│ Passengers Your Trains Carried: 89  │
└─────────────────────────────────────┘
```

### In-Game HUD
Minimal overlay while playing:

```
Top Bar:
[Team Treasury: $12,450] [Waiting Passengers: 15] [Trains: 8]

Construction Mode Tooltip:
"Station - $500 (must be near a city)" | "Rail - $2/meter (est: $340)"

City Hover Info:
"Paris
Population: 5,000
Passengers waiting: 12
Nearby stations: 3"

Train Hover Info:
"Express Train #3
Type: Express
Capacity: 8/14 (base 8 + 2 wagons)
Speed: 113 km/h
Current Route: Paris → Lyon"
```

---

## Win Conditions & Milestones

### Cooperative Goals (No "Winner")
Since the game is cooperative, replace competitive wins with **team milestones**:

#### Bronze Achievement
- Transport 100 passengers
- Serve 5+ cities
- Treasury never goes below -$500

#### Silver Achievement
- Transport 500 passengers
- Serve all cities on the map
- Average train capacity utilization >60%

#### Gold Achievement
- Transport 1,000 passengers
- Network spans >10km of rails
- Maintain <10 timed-out passengers
- Survive 30 minutes of operation

### Failure Condition
- **Bankruptcy**: Team treasury falls below -$2,000 (increased buffer for recovery)
- **Abandonment**: All players disconnect for >5 minutes

### Pride Metrics (Display at End)
Show team accomplishments to create satisfaction:
```
┌────────────────────────────────────────┐
│ Game Summary - Well Done!              │
├────────────────────────────────────────┤
│ Map: Central Europe                    │
│ Duration: 42 minutes                   │
│ Passengers Transported: 1,247          │
│ Passengers Timed Out: 23 (1.8%)       │
│ Peak Capacity Efficiency: 87%          │
│ Busiest Route: Paris → Berlin (142)   │
│ Longest Rail: Hamburg → Rome (2,340m) │
│ Average Revenue/Passenger: $14.20      │
│                                        │
│ Your Network Served 1,247 People!     │
│ Achievement: Gold Tier 🏆              │
└────────────────────────────────────────┘
```

---

## Multiplayer Mechanics

### Team Coordination

#### Shared Resources
- **Treasury**: All construction draws from common fund
- **Trains**: Any team member can purchase/control trains
- **Infrastructure**: Stations and rails are team-owned

#### Communication Features
- **Existing Chat**: Already implemented in the codebase
- **Visual Indicators**: Show which player is currently building (cursor labeling)
- **Transaction Log**: Recent purchases appear in sidebar:
  ```
  JohnDoe built Station #12 near Paris (-$500)
  JaneSmith purchased Express Train (-$1,800)
  JohnDoe added Wagon to Train #3 (-$300)
  ```

#### Conflict Prevention
- **No Resource Stealing**: Can't delete other players' constructions without permission
- **Instant Sync**: Meteor's DDP ensures real-time updates (already implemented)
- **Permission System**: Already exists (canModifyMap checks team membership)

### Solo Play
The game is already designed for solo mode:
- Game creator automatically joins a team
- All mechanics work identically
- Individual statistics still tracked
- Can invite others to join their team mid-game

---

## Implementation Status

### ✅ Implemented Systems

**City System**: Fixed cities on map serve as spawn/destination points for passengers. Station placement validated within 300m of cities. Visual placement zones fade in/out on mouse movement. Implemented in `classes/city.js` and `classes/mapGui.js`.

**Passenger Transport**: Trains autonomously pick up passengers near stations and deliver them to destination cities. Passengers spawn near origin cities, board trains, and disembark at destination cities. Revenue generated on successful delivery. Implemented in `train.js:getPassengers()` and `leavePassengers()`.

**Core Economy**: Team treasury system with construction costs (stations: $500, rails: $2/m, trains: $1000). Insufficient funds validation prevents overspending. Treasury displayed in UI. Implemented in `lib/methods/methodsGame.js`.

**Intelligent Train Routing**: Trains prioritize delivering passengers on board before picking up new ones. Uses 3-tier destination system: (1) deliver passengers to their cities, (2) pick up waiting passengers, (3) random fallback. Implemented in `train.js:findDestination()` and `findBestDestinationForPassengers()`.

### 🚧 Remaining Features

**Train Variety** (Partially done): Trains have capacity and maxSpeed properties, but no distinct types (basic/express/freight) or visual differentiation yet.

**Wagon System** (Not started): Add wagons to trains for increased capacity with speed penalty.

**Progression & Difficulty** (Not started): Passenger spawn rate escalation over time, max passenger cap system.

**Statistics & Polish** (Not started): Comprehensive tracking of player/team performance metrics.

---

## Technical Considerations

### Database Schema Changes

#### Cities Collection (NEW)
```javascript
Cities = new Mongo.Collection('cities');

{
  _id: String,
  game_id: String,
  name: String,
  pos: {x: Number, y: Number},
  population: Number,           // Affects spawn rate weighting
  radius: Number,               // Visual size (default 150)
  color: String,                // Display color

  // Real-time stats (calculated, not stored)
  currentWaitingPassengers: Number,  // Computed on-the-fly
  nearbyStations: [String],          // Station _ids within 300m
  totalPassengersSpawned: Number,    // Historical
  totalPassengersArrived: Number,    // Historical
}
```

#### Teams Collection
```javascript
{
  _id: String,
  game_id: String,
  name: String,
  members: [{_id: String, name: String}],
  treasury: Number,              // NEW: Shared team money
  totalPassengersTransported: Number, // NEW: Team milestone tracking
  totalRevenue: Number,          // NEW: Historical earnings
  totalPassengersTimedOut: Number,    // NEW: Penalty tracking
}
```

#### MapObjects Collection (Trains)
```javascript
{
  _id: String,
  type: 'train',
  game_id: String,
  team_id: String,               // Existing: Owner team
  trainType: String,             // NEW: 'basic' | 'express' | 'freight'
  wagons: Number,                // NEW: Number of wagons attached
  passengers: [String],          // NEW: Array of passenger _ids onboard
  capacity: Number,              // NEW: Calculated capacity (base + wagons)
  speed: Number,                 // NEW: Calculated speed (type - wagon penalty)
  // ... existing fields (pos, fromStation, destStation, etc.)
}
```

#### MapObjects Collection (Passengers)
```javascript
{
  _id: String,
  type: 'person',
  game_id: String,
  pos: {x: Number, y: Number},
  cityOrigin_id: String,         // NEW: City where spawned (replaces random spawn)
  cityDestination_id: String,    // NEW: City they want to reach (replaces {x,y} destination)
  boardedTrain: String | null,   // NEW: Train _id if traveling
  state: String,                 // NEW: 'walking_to_station' | 'waiting' | 'traveling' | 'walking_to_destination' | 'arrived'
  waitingAt: String | null,      // NEW: Station _id if waiting
  spawnTime: Date,               // NEW: For timeout mechanics
  // ... existing fields (birthAt, birthDate, etc.)
}
```

#### PlayerStatistics Collection (NEW)
```javascript
{
  _id: String,
  game_id: String,
  team_id: String,
  user_id: String,
  stationsBuilt: Number,
  stationsCost: Number,
  railsLaidMeters: Number,
  railsCost: Number,
  trainsPurchased: {
    basic: Number,
    express: Number,
    freight: Number,
    totalCost: Number
  },
  wagonsPurchased: Number,
  wagonsCost: Number,
  totalSpent: Number,
  passengersTransported: Number, // Passengers carried by their trains
}
```

### Performance Optimizations

#### Server Loop Adjustments
Current loop processes all objects every tick (~5000ms). With capacity mechanics:
- **Limit Passenger Processing**: Only update passengers near stations or on trains
- **Batch Database Updates**: Use MongoDB bulk operations for passenger state changes
- **Cache Calculations**: Store train capacity/speed calculations instead of recalculating
- **City Query Optimization**: Index city positions for fast nearest-city lookups

#### Client Rendering
Current canvas draws all objects. With cities and more passengers:
- **Culling**: Only draw objects within viewport
- **LOD (Level of Detail)**: Simplify passenger rendering at low zoom levels
- **City Rendering**: Pre-render city circles to bitmap for faster drawing
- **Throttle Redraws**: Already implemented at 60 FPS, but ensure efficient draw calls

---

## Balance Guidelines

### Starting Values
- **Starting Capital**: $12,000 (increased from $10k, allows 4-5 stations + 2-3 trains)
- **First Passenger**: Spawns at 30 seconds (gives time to build initial network)
- **Safe Zone**: First 5 minutes are forgiving (low spawn rate)

### Economic Balance Goals
- **Early Game**: Profitable with minimal infrastructure (encourage experimentation)
- **Mid Game**: Tight balance requiring smart expansion decisions
- **Late Game**: High-risk/high-reward (big investments needed, but revenue scales)

### Target Metrics
- **Break-even Time**: Players should profit within first 2-3 minutes
- **Capacity Crisis**: Should hit capacity bottleneck around 10 minutes
- **Bankruptcy Risk**: Rare but possible with extremely poor planning (demolition provides recovery)
- **Average Game Duration**: 30-45 minutes to reach Gold achievement

### Balanced Train Types
After rebalancing, train values are more equitable:

| Train | Cost | $/Capacity | $/Speed | Best For |
|-------|------|------------|---------|----------|
| Basic | $1,000 | $100/pax | $16.67/kph | General purpose |
| Freight | $1,500 | $75/pax | $37.50/kph | High-traffic short routes |
| Express | $1,800 | $225/pax | $15/kph | Long-distance express |

All three types now have valid use cases.

---

## Network Strategy Patterns

With cities as fixed points, different network patterns emerge:

### Hub-and-Spoke (Star Pattern)
```
    Small City
         |
    Large City (hub) ←→ Small City
         |
    Small City
```
- **When**: One dominant high-population city
- **Strategy**: Central station at hub, express trains radiating outward

### Linear (Chain)
```
City A ←→ City B ←→ City C ←→ City D
```
- **When**: Cities aligned geographically
- **Strategy**: Simple rail line, basic trains with good coverage

### Ring (Circuit)
```
     A
    / \
   D   B
    \ /
     C
```
- **When**: Cities form natural loop
- **Strategy**: Trains circulate continuously, balanced capacity

### Multi-Hub (Regional)
```
Region 1: A ←→ B ←→ C
             |
Region 2: D ←→ E ←→ F
```
- **When**: Large maps with city clusters
- **Strategy**: Regional networks with occasional inter-regional express trains

---

## Future Expansion Ideas (Out of Scope for Initial Implementation)

### Maintenance Costs
- Periodic costs for infrastructure upkeep
- Older stations/rails cost more to maintain
- Adds strategic depth: quality vs quantity

### Advanced City Features
- Rush hour mechanics (time-based demand spikes at cities)
- City growth (population increases based on service quality)
- Special events ("Concert in Paris" = temporary spike)

### Weather & Events
- Snow delays (trains move 50% slower)
- Track maintenance (sections temporarily unavailable)
- VIP passengers (pay 3× but require fast service)

### Advanced Train Features
- Fuel costs (variable operational expenses)
- Train age and depreciation
- Upgradeable trains (speed/capacity improvements)

### Competitive Modes
- Team vs Team races to milestones
- Separate economies per team with territorial control
- City bidding wars (exclusive service contracts)

### Map Editor
- Players create custom city layouts
- Share maps with community
- Leaderboards per map template

### Procedural Map Generation
- Algorithm generates random city distributions
- Poisson Disk Sampling for minimum spacing
- Infinite replayability

---

## Conclusion

This gameplay design transforms **Trains** from a visual sandbox into a **cooperative strategy game with spatial logic** through:

✅ **Clear spatial structure**: Cities define where and why players build
✅ **Meaningful decisions**: Station placement, train types, route prioritization
✅ **Economic tension**: Balance costs vs revenue with recovery mechanisms
✅ **Strategic depth**: Different maps favor different network patterns
✅ **Progression curve**: Escalating difficulty requires adaptation
✅ **Team cooperation**: Shared resources with individual contributions tracked
✅ **Replayability**: Different city layouts create different optimal strategies
✅ **Pride in achievement**: Milestones and statistics celebrate collective success

The design respects existing architecture (Meteor reactivity, DDP sync, A* pathfinding, team system) while adding the **foundational city system** that resolves gameplay ambiguity. All features are implementable with the current tech stack.

**Critical Path**: Phase 0 (cities) must be implemented first, as it establishes the spatial logic that all other systems depend on.
