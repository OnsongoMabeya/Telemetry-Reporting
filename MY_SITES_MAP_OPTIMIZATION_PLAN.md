# Map Loading Performance Optimization Plan

**Scope:** My Sites Map + Dashboard Map  
**Date:** August 14, 2026  
**Status:** PROPOSAL - AWAITING APPROVAL  
**Priority:** HIGH  
**Impact:** Reduce map load time from current slow performance to <2 seconds

---

## Current Implementation Analysis

### Frontend Maps (2 Maps Identified)

#### 1. My Sites Map (MySitesMap.js)

- **Map Library:** React Leaflet with OpenStreetMap tiles
- **Data Fetching:** Single API call to `/api/my-sites/clients/{clientId}/map-stations`
- **Rendering:** All stations rendered as individual Marker components
- **Filtering:** Client-side filtering (status tier, online/offline)
- **Issue:** No caching, no pagination, all data loaded at once

#### 2. Dashboard Map (KenyaMap.js)

- **Map Library:** React Leaflet with OpenStreetMap tiles + Framer Motion animations
- **Data Fetching:** Single API call to `/api/basestations-map` (optional nodeName filter)
- **Rendering:** All stations rendered with staggered animations (index * 0.1s delay)
- **Auto-refresh:** Refreshes every 5 minutes
- **Issue:** Animations add overhead, no caching, all data loaded at once

### Backend (2 Endpoints)

#### 1. My Sites Map Endpoint (mySites.js - map-stations)

**Current Flow:**

1. Verify user access to client (1 query)
2. Get base station names from metric_mappings (1 query)
3. Query mapviewtable for latest coordinates and status (1 query)
4. Query node_status_table for online/offline status (1 query)
5. Process and return all stations

#### 2. Dashboard Map Endpoint (server.js - basestations-map)

**Current Flow:**

1. Get base station names from node_status_table (1 query)
2. Query mapviewtable for latest coordinates and status (1 query - NO WHERE clause, full table scan!)
3. Query node_status_table for online/offline status (1 query - NO WHERE clause, full table scan!)
4. Process and return all stations with Promise.all()

**Performance Issues (Both Endpoints):**

- Multiple sequential queries (not parallelized in My Sites)
- No indexes on critical columns
- No caching of station data
- Dashboard map queries entire mapviewtable/node_status_table (full table scans!)
- Dashboard map has animation overhead (staggered rendering)
- Processes all stations even if user only views subset
- Joins across multiple tables without optimization

---

## Performance Bottlenecks Identified

### 1. Backend Query Performance

**Problem:** Multiple sequential database queries

```javascript
// Current: 4 sequential queries
1. Check user access
2. Get base stations from metric_mappings
3. Get coordinates from mapviewtable
4. Get status times from node_status_table
```

**Impact:** Each query adds latency, especially with large datasets

### 2. Missing Database Indexes

**Problem:** No indexes on frequently queried columns

- `mapviewtable.BaseStationName`
- `node_status_table.NodeBaseStationName`
- `metric_mappings.base_station_name`

**Impact:** Full table scans on large tables

### 3. No Caching Strategy

**Problem:** Every map load triggers full database queries

- Station data rarely changes
- Status updates are infrequent
- Same data fetched repeatedly by same user

**Impact:** Unnecessary database load, slow repeated loads

### 4. Inefficient Status Determination

**Problem:** Queries entire node_status_table for status times

```javascript
// Current: Queries all stations' latest status times
SELECT NodeBaseStationName, MAX(time) as latestStatusTime
FROM node_status_table
WHERE UPPER(NodeBaseStationName) IN (${placeholders})
```

**Impact:** Slow for clients with many stations

### 5. Frontend Rendering Performance

**Problem:** All markers rendered at once

- No virtual scrolling
- No lazy loading
- All popups pre-rendered

**Impact:** DOM bloat, slower initial render

---

## Proposed Optimization Strategy

### Phase 1: Database Optimization (Quick Win)

**Effort:** 1-2 hours | **Impact:** 30-40% improvement

#### 1.1 Add Database Indexes

```sql
-- Index for mapviewtable lookups
ALTER TABLE mapviewtable ADD INDEX idx_mapviewtable_basestationname (BaseStationName);

-- Index for metric_mappings lookups
ALTER TABLE metric_mappings ADD INDEX idx_metric_mappings_basestationname (base_station_name);

-- Note: node_status_table is the main table and should not be altered
-- Status queries will use existing indexes on node_status_table
```

#### 1.2 Optimize Backend Queries

- Parallelize queries using `Promise.all()`
- Combine queries where possible
- Use batch queries for status lookups
- Add query result caching (5-10 minute TTL)

**Expected Improvement:** 30-40% faster queries

### Phase 2: Backend Caching (Medium Impact)

**Effort:** 2-3 hours | **Impact:** 60-70% improvement

#### 2.1 Implement Station Data Cache

```javascript
// Cache station data with 10-minute TTL
const cacheKey = `map-stations-${clientId}-${serviceId || 'all'}`;
const cachedData = cache.get(cacheKey);

if (cachedData) {
  return cachedData; // Return cached data
}

// Fetch from database
const stations = await fetchStationsFromDB();

// Cache for 10 minutes
cache.set(cacheKey, stations, 600);
return stations;
```

**Benefits:**

- Eliminates repeated database queries
- Instant load for repeated views
- Reduces database load by 70-80%

#### 2.2 Implement Cache Invalidation

- Invalidate cache when:
  - Station status changes
  - Metric mappings updated
  - Service assignments changed
- Use event-driven cache invalidation

**Expected Improvement:** 60-70% faster for repeated loads

### Phase 3: Frontend Optimization (Medium Impact)

**Effort:** 2-3 hours | **Impact:** 20-30% improvement

#### 3.1 Lazy Load Markers

```javascript
// Only render visible markers
const visibleMarkers = filteredStations.slice(0, 50);

// Load more as user pans/zooms
const handleMapMove = () => {
  const visibleBounds = map.getBounds();
  const newVisibleMarkers = filteredStations.filter(station => 
    visibleBounds.contains([station.lat, station.lng])
  );
  setVisibleMarkers(newVisibleMarkers);
};
```

**Benefits:**

- Reduces initial DOM nodes
- Faster initial render
- Smoother user interactions

#### 3.2 Optimize Marker Icons

- Cache icon creation
- Use CSS instead of inline styles
- Batch icon updates

#### 3.3 Optimize Dashboard Map Animations (KenyaMap.js)

- Remove staggered animation delays (index * 0.1s)
- Use CSS animations instead of Framer Motion for markers
- Disable animations on initial load (only animate on user interaction)
- Add animation toggle option in settings

**Expected Improvement:** 20-30% faster rendering

### Phase 4: API Response Optimization (Low Impact)

**Effort:** 1 hour | **Impact:** 10-15% improvement

#### 4.1 Compress Response Data

- Remove unnecessary fields
- Use shorter field names
- Compress JSON response

#### 4.2 Pagination Support

```javascript
// Add optional pagination
GET /api/my-sites/clients/{clientId}/map-stations?limit=50&offset=0
```

**Expected Improvement:** 10-15% faster transfer

---

## Implementation Roadmap

### Week 1: Phase 1 (Database Optimization)

- Add database indexes (migration 021)
- Optimize backend queries
- Parallelize query execution
- **Expected Result:** 30-40% improvement

### Week 2: Phase 2 (Backend Caching)

- Implement cache layer
- Add cache invalidation logic
- Test cache effectiveness
- **Expected Result:** 60-70% improvement for repeated loads

### Week 3: Phase 3 (Frontend Optimization)

- Implement lazy loading
- Optimize marker rendering
- Add performance monitoring
- **Expected Result:** 20-30% improvement

### Week 4: Phase 4 (API Optimization)

- Add response compression
- Implement pagination
- Performance testing
- **Expected Result:** 10-15% improvement

---

## Expected Performance Improvements

### Current Performance

- Initial load: 5-8 seconds
- Repeated load: 5-8 seconds
- Database queries: 4 sequential queries
- Rendered markers: All stations (potentially 100+)

### After Phase 1 (Database Optimization)

- Initial load: 3-5 seconds (30-40% improvement)
- Repeated load: 3-5 seconds
- Database queries: 2-3 optimized queries
- Rendered markers: All stations

### After Phase 2 (Backend Caching)

- Initial load: 3-5 seconds
- Repeated load: <500ms (90% improvement)
- Database queries: 0 (cached)
- Rendered markers: All stations

### After Phase 3 (Frontend Optimization)

- Initial load: 2-3 seconds (50-60% improvement)
- Repeated load: <200ms (95% improvement)
- Database queries: 0 (cached)
- Rendered markers: Only visible (50-100 instead of all)

### After Phase 4 (API Optimization)

- Initial load: <2 seconds (75% improvement)
- Repeated load: <100ms (98% improvement)
- Database queries: 0 (cached)
- Rendered markers: Only visible

---

## Implementation Details

### Database Migration (Migration 021)

```sql
-- Add indexes for map station queries
-- Note: node_status_table is the main table and should not be altered
ALTER TABLE mapviewtable ADD INDEX idx_mapviewtable_basestationname (BaseStationName);
ALTER TABLE metric_mappings ADD INDEX idx_metric_mappings_basestationname (base_station_name);
```

### Backend Changes

**File:** `backend/routes/mySites.js`

1. Parallelize queries using `Promise.all()`
2. Add caching layer (use existing cache manager)
3. Implement cache invalidation
4. Add performance logging

### Frontend Changes

**Files:**

- `frontend/src/components/MySitesMap.js` (My Sites Map)
- `frontend/src/components/KenyaMap.js` (Dashboard Map)

**MySitesMap.js:**

1. Implement lazy loading for markers
2. Cache marker icons
3. Add performance monitoring
4. Optimize filter operations

**KenyaMap.js:**

1. Remove staggered animation delays
2. Use CSS animations instead of Framer Motion
3. Disable animations on initial load
4. Add animation toggle option

---

## Testing Strategy

### Performance Testing

- Measure load time before/after each phase
- Test with different numbers of stations (10, 50, 100, 500)
- Monitor database query performance
- Track cache hit rates

### Functional Testing

- Verify all stations display correctly
- Test filtering functionality
- Test map interactions (pan, zoom)
- Test on different browsers

### Load Testing

- Test with 100+ concurrent users
- Monitor database load
- Verify cache effectiveness
- Check for memory leaks

---

## Rollback Plan

Each phase can be rolled back independently:

- **Phase 1:** Remove indexes (migration rollback)
- **Phase 2:** Disable cache (set TTL to 0)
- **Phase 3:** Remove lazy loading (render all markers)
- **Phase 4:** Disable compression (use standard response)

---

## Estimated Effort

| Phase                    | Effort        | Impact          | Priority |
|--------------------------|---------------|-----------------|----------|
| 1: Database Optimization | 1-2 hours     | 30-40%          | HIGH     |
| 2: Backend Caching       | 2-3 hours     | 60-70%          | HIGH     |
| 3: Frontend Optimization | 2-3 hours     | 20-30%          | MEDIUM   |
| 4: API Optimization      | 1 hour        | 10-15%          | LOW      |
| **Total**                | **6-9 hours** | **75% overall** | -        |

---

## Risk Assessment

### Low Risk

- Database indexes (no data changes)
- Backend caching (transparent to user)
- Frontend lazy loading (graceful degradation)

### Medium Risk

- Cache invalidation logic (must be tested thoroughly)
- API changes (backward compatibility needed)

### Mitigation

- Comprehensive testing before deployment
- Feature flags for gradual rollout
- Monitoring and alerting
- Easy rollback capability

---

## Success Criteria

✅ **Phase 1:** Map loads in <5 seconds (first time)  
✅ **Phase 2:** Map loads in <500ms (repeated)  
✅ **Phase 3:** Map loads in <2 seconds (first time)  
✅ **Phase 4:** Map loads in <1 second (first time)  
✅ **Overall:** 75% performance improvement  
✅ **No regressions:** All functionality preserved  
✅ **No errors:** Zero new bugs introduced  

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Approve implementation** - Get sign-off on timeline
3. **Begin Phase 1** - Start with database optimization
4. **Monitor progress** - Track performance improvements
5. **Iterate** - Adjust based on results

---

**Status:** AWAITING APPROVAL  
**Decision Required:** Proceed with optimization plan?
