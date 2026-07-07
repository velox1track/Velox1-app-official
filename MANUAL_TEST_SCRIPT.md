# Velox 1 App - Manual Test Script

## 🎯 Complete Testing Guide for Host-Facing Flows

This script tests the **Race Roulette → Team Assignment → Scoreboard** workflow with all the features we've implemented.

---

## 📋 Pre-Test Setup

### Initial Setup:
1. **Open Expo app** and load Velox 1
2. **Clear all data** (if needed): Go to Settings → Reset All Data
3. **Create athletes**: Go to Team Builder → Add 12-16 athletes with different tiers
4. **Generate teams**: Go to Assign Teams → Create 4 teams
5. **Configure settings**: Go to Settings → Set totalEvents = 5, numRelays = 1

---

## 🧪 Test Suite 1: Basic Workflow

### Test 1.1: Settings Propagation
**Objective**: Verify settings reflect across all screens

**Steps**:
1. Go to **Settings**
2. Set **Total Events = 6**, **Number of Relays = 2**
3. Save settings
4. Go to **Race Roulette** → Should show 6 empty slots
5. Go to **Scoreboard** → Should show empty (no events revealed yet)

**Expected**: ✅ Settings propagate immediately to all screens

### Test 1.2: Event Sequence Generation & Reveal
**Objective**: Test reveal persistence and scoreboard sync

**Steps**:
1. Go to **Race Roulette**
2. Press **Generate New Sequence**
3. Verify sequence has 6 events with 2 relays
4. Press **Reveal Event** → Event #1 should appear
5. Go to **Scoreboard** → Event #1 should appear in sequence
6. Go back to **Race Roulette** → Event #1 should still be revealed
7. **Close and reopen app** → Event #1 should persist

**Expected**: ✅ Reveals persist across navigation and app restart

---

## 🧪 Test Suite 2: Athlete Assignment & One-and-Done

### Test 2.1: Individual Event Assignment
**Objective**: Test basic athlete assignment

**Steps**:
1. From **Race Roulette**, press **Assign Athletes** on Event #1
2. Select **Team 1** → Pick any athlete → Save
3. Select **Team 2** → Pick any athlete → Save
4. Continue for all teams
5. Press **Save** → Should succeed

**Expected**: ✅ All teams assigned, returns to Race Roulette

### Test 2.2: One-and-Done Enforcement
**Objective**: Verify used athletes are disabled

**Steps**:
1. **Reveal Event #2** from Race Roulette
2. Press **Assign Athletes** on Event #2
3. Select **Team 1** → Athletes used in Event #1 should be **grayed out/disabled**
4. Try to select a used athlete → Should be prevented
5. Select a different, unused athlete → Should work

**Expected**: ✅ Used athletes are visually disabled and unselectable

### Test 2.3: Team Not Running Toggle
**Objective**: Test "not running" functionality and persistence

**Steps**:
1. In **Assign Athletes** for Event #2
2. Select **Team 2** → Toggle **"Team Not Running"** ON
3. Verify UI shows "Team is not running this event"
4. Press **Save** → Should succeed
5. **Navigate away and back** to edit Event #2 assignments
6. Select **Team 2** → Toggle should still be ON

**Expected**: ✅ "Not running" state persists across navigation

---

## 🧪 Test Suite 3: Relay Events & Edge Cases

### Test 3.1: Relay Athlete Selection
**Objective**: Test multi-athlete selection for relays

**Steps**:
1. **Reveal next event** until you find a relay (e.g., "4x100")
2. Press **Assign Athletes** on the relay event
3. Header should show **"Select 4 athletes per team"**
4. Select **Team 1** → Select 4 different athletes
5. Verify selection count shows "4/4"
6. Press **Save** → Should succeed

**Expected**: ✅ Relay requires correct number of athletes per team

### Test 3.2: Relay One-and-Done Enforcement
**Objective**: Verify all relay athletes are marked as used

**Steps**:
1. **Reveal next event** (individual event)
2. Press **Assign Athletes**
3. Select **Team 1** → All 4 relay athletes should be **grayed out**
4. Only non-relay athletes should be selectable

**Expected**: ✅ All relay athletes marked as used

### Test 3.3: Insufficient Athletes Edge Case
**Objective**: Test team with insufficient athletes for relay

**Steps**:
1. Create a scenario where a team has < 4 available athletes
2. Try to assign that team to a 4-person relay
3. Use **"Team Not Running"** toggle for that team
4. Press **Save** → Should succeed

**Expected**: ✅ "Team not running" handles insufficient athletes gracefully

---

## 🧪 Test Suite 4: Scoreboard & Results Entry

### Test 4.1: Auto-DNS for "Not Running" Teams
**Objective**: Test automatic DNS population

**Steps**:
1. Go to **Scoreboard**
2. Press **Enter** on an event where a team was marked "not running"
3. Go to **DNS tab** → That team should be **automatically checked**
4. Other teams should be in normal placement tabs

**Expected**: ✅ "Not running" teams automatically appear in DNS

### Test 4.2: Results Entry & Scoring
**Objective**: Test results entry and score calculation

**Steps**:
1. In results form, assign places: **Team 1 = 1st**, **Team 3 = 2nd**
2. Leave **Team 2 in DNS** (should already be there)
3. Press **Submit** → Should succeed without warnings
4. Check **Team Scores** → Should show updated totals
5. **Team 1** should have highest score

**Expected**: ✅ Scores update immediately, DNS teams get last place points

### Test 4.3: Results Editing & DNS Persistence
**Objective**: Test editing saved results

**Steps**:
1. Press **Edit** on a completed event
2. **DNS teams** should appear in DNS tab (not as regular placements)
3. **Regular placements** should appear in placement tabs
4. Make a change and save
5. Verify changes persist

**Expected**: ✅ DNS state persists when editing results

---

## 🧪 Test Suite 5: Settings & Scoring

### Test 5.1: Custom Scoring
**Objective**: Test custom scoring settings

**Steps**:
1. Go to **Settings** → **Scoring**
2. Change **1st place = 25 points**, **2nd place = 15 points**
3. Save settings
4. Go to **Scoreboard** → Enter results for a new event
5. Check team scores → Should use new point values

**Expected**: ✅ Custom scoring reflects immediately

### Test 5.2: Team Count Sync
**Objective**: Test scoring places sync with team count

**Steps**:
1. Go to **Settings** → Change team count to 6
2. **Scoring section** should automatically show 6 places
3. Go to **Assign Teams** → Generate 6 teams
4. Verify all screens work with 6 teams

**Expected**: ✅ All systems adapt to new team count

---

## 🧪 Test Suite 6: Data Persistence & Navigation

### Test 6.1: Navigation Persistence
**Objective**: Test state persistence across navigation

**Steps**:
1. Set up a complex state: 3 events revealed, 2 assigned, 1 with results
2. Navigate between all screens multiple times
3. Verify all data persists correctly
4. Check: revealed events, assignments, results, team colors

**Expected**: ✅ All state persists across navigation

### Test 6.2: App Restart Persistence
**Objective**: Test persistence across app restart

**Steps**:
1. With complex state set up, **force close the app**
2. **Reopen the app**
3. Verify all data is restored:
   - Revealed events in Race Roulette
   - Assignments in Assign Athletes
   - Results in Scoreboard
   - Team colors and names

**Expected**: ✅ All data survives app restart

---

## 🧪 Test Suite 7: Team Colors & UI

### Test 7.1: Team Color Assignment
**Objective**: Test team color picker

**Steps**:
1. Go to **Assign Teams**
2. Press **EDIT** button on a team
3. Select a color from the list (e.g., "Red")
4. Save changes
5. Verify team card shows red left border
6. Go to **Scoreboard** → Team should show red elements

**Expected**: ✅ Team colors propagate across all screens

### Test 7.2: Color Uniqueness
**Objective**: Test color conflict prevention

**Steps**:
1. Set **Team 1 = Red**
2. Try to set **Team 2 = Red** → Should show "In Use"
3. Red should be disabled for Team 2
4. Select different color for Team 2

**Expected**: ✅ Color conflicts prevented

---

## 🎯 Success Criteria

### All tests should pass with:
- ✅ **No crashes or errors**
- ✅ **Data persists across navigation**
- ✅ **Data persists across app restart**
- ✅ **Settings propagate immediately**
- ✅ **One-and-done enforcement works**
- ✅ **DNS auto-population works**
- ✅ **Relay events handle multiple athletes**
- ✅ **Scoring calculations are correct**
- ✅ **Team colors display consistently**

### If any test fails:
1. **Note the specific step that failed**
2. **Check console for error messages**
3. **Report the issue with reproduction steps**

---

## 📊 Test Results Template

```
Test Suite 1: Basic Workflow          [ PASS / FAIL ]
Test Suite 2: Athlete Assignment      [ PASS / FAIL ]
Test Suite 3: Relay Events           [ PASS / FAIL ]
Test Suite 4: Scoreboard & Results   [ PASS / FAIL ]
Test Suite 5: Settings & Scoring     [ PASS / FAIL ]
Test Suite 6: Data Persistence       [ PASS / FAIL ]
Test Suite 7: Team Colors & UI       [ PASS / FAIL ]

Overall Status: [ PASS / FAIL ]
```

---

**🎉 If all tests pass, the Velox 1 app is ready for production use!**
