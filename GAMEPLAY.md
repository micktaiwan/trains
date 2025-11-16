# Trains - Gameplay Design Document

## Overview

**Trains** is a cooperative multiplayer railway management simulation where teams build and maintain railway networks to transport passengers efficiently. Players start with limited resources and must strategically expand their infrastructure to handle growing passenger demand.

---

## Core Game Loop

```
Build Stations → Connect Rails → Passengers Spawn → Trains Transport → Earn Revenue → Expand Network
                                                          ↓
                                              Team Treasury Growth
```

### Game Flow

1. **Initialization**: Team starts with initial capital
2. **Build Infrastructure**: Players spend money to place stations and rails
3. **Deploy Trains**: Purchase trains with different capacities and speeds
4. **Transport Passengers**: Trains pick up and drop off passengers
5. **Generate Revenue**: Each passenger transported adds money to team treasury
6. **Scale Up**: Use profits to build more stations, rails, and trains
7. **Handle Growth**: As passenger spawn rate increases, players must optimize their network

---

## Economy System

### Team Treasury
- **Shared Resource**: All team members draw from and contribute to a common fund
- **Starting Capital**: Teams begin with **$10,000** (configurable)
- **Transparency**: All team members can see current balance in real-time

### Construction Costs

| Item | Base Cost | Notes |
|------|-----------|-------|
| **Station** | $500 | One-time placement cost |
| **Rail Connection** | $2 per meter | Cost scales with distance between stations |
| **Basic Train** | $1,000 | Low capacity (10 passengers), normal speed (60 km/h) |
| **Express Train** | $2,500 | Medium capacity (6 passengers), high speed (120 km/h) |
| **Freight Train** | $1,500 | High capacity (20 passengers), slow speed (40 km/h) |
| **Wagon** | $300 | Adds +5 passenger capacity to any train |

### Revenue Model

- **Base Fare**: $10 per passenger transported
- **Distance Bonus**: +$0.50 per 100 meters traveled (encourages long-distance routes)
- **Efficiency Bonus**: +$5 if train is at >80% capacity (encourages full trains)

**Example Revenue Calculation:**
```
Passenger transported 500m on a full train (10/10 passengers):
Base: $10
Distance: $2.50 (500m = 5 × $0.50)
Efficiency: $5
Total: $17.50 per passenger × 10 = $175
```

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

1. **Spawn**: Passengers appear at random positions near cities/stations
2. **Wait**: NPCs walk toward nearest station (existing behavior)
3. **Board**: When train arrives and has capacity, passengers embark
4. **Travel**: Train transports passengers toward their destination
5. **Disembark**: Passengers exit at closest station to their goal
6. **Despawn**: Passengers disappear after disembarking (revenue generated)

### Passenger Properties

```javascript
{
  destination: {x: number, y: number}, // Target location
  boardedTrain: trainId | null,        // Currently on train
  state: 'waiting' | 'boarding' | 'traveling' | 'disembarking'
}
```

### Spawn Rate Progression

| Time Elapsed | Passengers/Minute | Max Active Passengers |
|--------------|-------------------|----------------------|
| 0-5 min | 1 | 10 |
| 5-10 min | 2 | 25 |
| 10-20 min | 4 | 50 |
| 20-30 min | 8 | 100 |
| 30+ min | 12 | 150 |

**Key Design Principles:**
- **Gradual Introduction**: Start with 1 passenger to teach mechanics
- **Manageable Growth**: Give players time to build infrastructure before overwhelming them
- **Capacity Cap**: Prevent performance issues with passenger limits

---

## Train System

### Train Types

#### 1. Basic Train (Starter Train)
- **Cost**: $1,000
- **Speed**: 60 km/h (current default)
- **Base Capacity**: 10 passengers
- **Use Case**: Balanced option for early game

#### 2. Express Train (Speed Specialist)
- **Cost**: $2,500
- **Speed**: 120 km/h (2× default)
- **Base Capacity**: 6 passengers
- **Use Case**: Long-distance routes, time-sensitive passengers

#### 3. Freight Train (Capacity Specialist)
- **Cost**: $1,500
- **Speed**: 40 km/h (0.66× default)
- **Base Capacity**: 20 passengers
- **Use Case**: High-traffic short routes, commuter lines

### Wagon System

- **Cost**: $300 per wagon
- **Capacity Bonus**: +5 passengers
- **Max Wagons**: 5 per train
- **Speed Penalty**: -5% speed per wagon added (realistic weight simulation)

**Example Train Configurations:**
```
Basic Train + 2 Wagons
- Total Capacity: 20 passengers (10 + 2×5)
- Effective Speed: 54 km/h (60 × 0.9)
- Total Cost: $1,600 ($1,000 + 2×$300)

Freight Train + 4 Wagons
- Total Capacity: 40 passengers (20 + 4×5)
- Effective Speed: 32 km/h (40 × 0.8)
- Total Cost: $2,700 ($1,500 + 4×$300)
```

### Train Mechanics

#### Boarding Process
```javascript
// At each station stop:
1. Check train current capacity (passengers + available slots)
2. Find waiting passengers within getPassengersRadius
3. Board passengers up to available capacity (first-come-first-served)
4. Update passenger state to 'traveling'
5. Recalculate train route if destination stations are different
```

#### Disembarking Process
```javascript
// At each station stop:
1. Check passengers onboard
2. For each passenger, calculate distance to their destination
3. If current station is closest to destination:
   - Remove passenger from train
   - Generate revenue
   - Despawn passenger
4. Continue to next station with remaining passengers
```

### Pathfinding Enhancement

Current A* implementation chooses destination based on most waiting passengers. With capacity constraints:

```javascript
findDestination() {
  // Consider:
  // 1. Stations with waiting passengers
  // 2. Current train capacity (don't go to station if already full)
  // 3. Destinations of already-boarded passengers
  // Priority: Deliver current passengers first, then find new pickup point
}
```

---

## Difficulty Progression

### Early Game (0-5 minutes)
- **Passenger Rate**: 1 per minute
- **Challenge**: Learn mechanics with forgiving pace
- **Strategy**: Build a basic loop with 3-4 stations

### Mid Game (5-20 minutes)
- **Passenger Rate**: 2-8 per minute
- **Challenge**: Capacity becomes a bottleneck
- **Strategy**: Add more trains, optimize routes, consider train types

### Late Game (20+ minutes)
- **Passenger Rate**: 12+ per minute
- **Challenge**: Network optimization and capacity management
- **Strategy**: Specialized trains for different routes, wagon investments, complex rail networks

### Bottleneck Design
As passenger spawn rate increases faster than initial infrastructure can handle:
- Waiting passengers accumulate at stations
- Players must decide: Build more stations? Buy more trains? Add wagons?
- Economic pressure: Revenue must outpace expansion costs

---

## Statistics & UI

### Team Statistics (Shared Screen)
Display in a team dashboard accessible by all members:

```
┌─────────────────────────────────────┐
│ Team Treasury: $12,450              │
├─────────────────────────────────────┤
│ Total Passengers Transported: 243   │
│ Total Revenue: $4,860               │
│ Stations: 12                        │
│ Total Rail Length: 5,240m           │
│ Active Trains: 8                    │
│                                     │
│ Passengers Waiting: 15              │
│ Current Spawn Rate: 4/min           │
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
"Station - $500" | "Rail - $2/meter (est: $340)"

Train Hover Info:
"Express Train #3
Capacity: 6/11 (base 6 + 1 wagon)
Speed: 114 km/h
Current Route: Station A → Station D"
```

---

## Win Conditions & Milestones

### Cooperative Goals (No "Winner")
Since the game is cooperative, replace competitive wins with **team milestones**:

#### Bronze Achievement
- Transport 100 passengers
- Maintain 10+ stations
- Treasury never goes below $0

#### Silver Achievement
- Transport 500 passengers
- Maintain 20+ stations
- Average train capacity utilization >60%

#### Gold Achievement
- Transport 1,000 passengers
- Maintain 30+ stations
- Network spans >10km of rails
- Survive 30 minutes of operation

### Failure Condition
- **Bankruptcy**: Team treasury falls below -$1,000 (small buffer for recovery)
- **Abandonment**: All players disconnect for >5 minutes

### Pride Metrics (Display at End)
Show team accomplishments to create satisfaction:
```
┌────────────────────────────────────────┐
│ Game Summary - Well Done!              │
├────────────────────────────────────────┤
│ Duration: 42 minutes                   │
│ Passengers Transported: 1,247          │
│ Peak Capacity Efficiency: 87%          │
│ Longest Rail: Station A → Station M   │
│   (1,240m)                             │
│ Revenue Per Passenger: $14.50 avg     │
│                                        │
│ Your Network Served 1,247 People!     │
│ Achievement: Gold Tier                 │
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
  JohnDoe built Station #12 (-$500)
  JaneSmith purchased Express Train (-$2,500)
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

## Implementation Phases

### Phase 1: Core Economy (Minimum Viable Gameplay)
1. Add `treasury` field to Teams collection
2. Implement construction costs for stations and rails
3. Add "insufficient funds" validation to map building methods
4. Display treasury in UI

### Phase 2: Passenger Transport
1. Add `destination`, `boardedTrain`, `state` to Person class
2. Implement boarding logic in Train.getPassengers()
3. Implement disembarking logic at stations
4. Generate revenue on successful transport

### Phase 3: Train Variety
1. Create train type enum (`basic`, `express`, `freight`)
2. Add train selection UI when purchasing
3. Implement speed/capacity variations in Train class
4. Update rendering to show different train types

### Phase 4: Wagon System
1. Add `wagons` array to Train class
2. Create "Add Wagon" UI button on train hover
3. Implement capacity increase and speed penalty
4. Track wagon purchases in player statistics

### Phase 5: Progression & Difficulty
1. Implement passenger spawn rate escalation
2. Add timer-based difficulty phases
3. Create max passenger cap system
4. Balance starting capital and costs through playtesting

### Phase 6: Statistics & Polish
1. Create statistics tracking collections
2. Build team dashboard UI
3. Build individual player statistics panel
4. Create end-game summary screen
5. Add achievement milestone checks

---

## Technical Considerations

### Database Schema Changes

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
  destination: {x: Number, y: Number}, // NEW: Where they want to go
  boardedTrain: String | null,         // NEW: Train _id if traveling
  state: String,                       // NEW: 'waiting' | 'traveling' | 'disembarking'
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
Current loop processes all objects every tick (500ms). With capacity mechanics:
- **Limit Passenger Processing**: Only update passengers near stations or on trains
- **Batch Database Updates**: Use MongoDB bulk operations for passenger state changes
- **Cache Calculations**: Store train capacity/speed calculations instead of recalculating

#### Client Rendering
Current canvas draws all objects. With more passengers:
- **Culling**: Only draw objects within viewport
- **LOD (Level of Detail)**: Simplify passenger rendering at low zoom levels
- **Throttle Redraws**: Already implemented at 60 FPS, but ensure passenger draw calls are efficient

---

## Balance Guidelines

### Starting Values
- **Starting Capital**: $10,000 (allows ~4 stations, 6 basic trains, or mix)
- **First Passenger**: Spawns at 30 seconds (gives time to build)
- **Safe Zone**: First 5 minutes are forgiving (low spawn rate)

### Economic Balance Goals
- **Early Game**: Profitable with minimal infrastructure (encourage experimentation)
- **Mid Game**: Tight balance requiring smart expansion decisions
- **Late Game**: High-risk/high-reward (big investments needed, but revenue scales)

### Target Metrics
- **Break-even Time**: Players should profit within first 2-3 minutes
- **Capacity Crisis**: Should hit capacity bottleneck around 10 minutes
- **Bankruptcy Risk**: Rare but possible with extremely poor planning
- **Average Game Duration**: 30-45 minutes to reach Gold achievement

---

## Future Expansion Ideas (Out of Scope for Initial Implementation)

### Maintenance Costs
- Periodic costs for infrastructure upkeep
- Older stations/rails cost more to maintain
- Adds strategic depth: quality vs quantity

### Cities & Demand Modeling
- Cities as passenger spawn points with demand levels
- Rush hour mechanics (time-based demand spikes)
- Reputation system (reliable service = more passengers)

### Advanced Train Features
- Fuel costs (variable operational expenses)
- Train age and depreciation
- Upgradeable trains (speed/capacity improvements)

### Competitive Modes
- Team vs Team races to milestones
- Separate economies per team with territorial control
- Passenger bidding wars

### Map Persistence
- Save/load game states
- Persistent worlds that run even when players offline
- Leaderboards for longest-running networks

---

## Conclusion

This gameplay design transforms **Trains** from a visual sandbox into a **cooperative strategy game** with:

✅ **Clear objectives**: Transport passengers efficiently
✅ **Economic tension**: Balance costs vs revenue
✅ **Strategic depth**: Train types, wagon tradeoffs, route optimization
✅ **Progression curve**: Escalating difficulty requires adaptation
✅ **Team cooperation**: Shared resources with individual contributions tracked
✅ **Pride in achievement**: Milestones and statistics celebrate collective success

The design respects existing architecture (Meteor reactivity, DDP sync, A* pathfinding, team system) while adding core gameplay systems. All features are implementable with the current tech stack.
