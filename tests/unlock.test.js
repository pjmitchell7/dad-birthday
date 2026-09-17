import { test } from 'node:test';
import assert from 'node:assert/strict';

function createUnlockTracker(initialActivities = []) {
  const visited = new Set();
  for (const a of initialActivities) {
    if (['movie', 'gym', 'drive'].includes(a)) visited.add(a);
  }

  let unlockedAt = -100;
  let pendingToast = false;

  function syncUnlock(elementState = {}) {
    const unlocked = visited.size === 3;
    elementState.hidden = !unlocked;
    elementState.locked = !unlocked;
    elementState.unlocked = unlocked;
    elementState.disabled = !unlocked;
    elementState.progressText = '';
    return elementState;
  }

  function recordCompletion(mode, currentPhase = 'ending', globalTime = 10) {
    if (!['movie', 'gym', 'drive'].includes(mode)) return;
    const prev = visited.size;
    visited.add(mode);
    if (prev < 3 && visited.size === 3) {
      if (['idle', 'intro', 'selected'].includes(currentPhase)) unlockedAt = globalTime;
      else pendingToast = true;
    }
  }

  function returnHome(globalTime = 20) {
    if (pendingToast || (visited.size === 3 && unlockedAt < 0)) {
      unlockedAt = globalTime;
      pendingToast = false;
    }
  }

  return {
    visited,
    syncUnlock,
    recordCompletion,
    returnHome,
    get unlockedAt() { return unlockedAt; },
    get pendingToast() { return pendingToast; }
  };
}

test('Celebrate button remains strictly hidden and locked until all 3 activities finish', () => {
  const tracker = createUnlockTracker();
  const el = {};

  // Initially empty
  tracker.syncUnlock(el);
  assert.equal(el.hidden, true);
  assert.equal(el.locked, true);
  assert.equal(el.unlocked, false);
  assert.equal(el.disabled, true);
  assert.equal(el.progressText, '');

  // 1 activity finished (movie)
  tracker.recordCompletion('movie');
  tracker.syncUnlock(el);
  assert.equal(el.hidden, true);
  assert.equal(el.locked, true);
  assert.equal(el.unlocked, false);
  assert.equal(tracker.pendingToast, false);

  // 2 activities finished (gym)
  tracker.recordCompletion('gym');
  tracker.syncUnlock(el);
  assert.equal(el.hidden, true);
  assert.equal(el.locked, true);
  assert.equal(tracker.pendingToast, false);

  // 3rd activity finished (drive) while on ending screen
  tracker.recordCompletion('drive', 'ending', 45);
  assert.equal(tracker.pendingToast, true);
  tracker.syncUnlock(el);
  assert.equal(el.hidden, false);
  assert.equal(el.unlocked, true);
  assert.equal(el.disabled, false);

  // Returning home triggers the unlock toast timer at globalTime
  tracker.returnHome(50);
  assert.equal(tracker.pendingToast, false);
  assert.equal(tracker.unlockedAt, 50);
});

test('Duplicate completions do not falsely increment or re-trigger unlock', () => {
  const tracker = createUnlockTracker(['movie', 'movie']);
  assert.equal(tracker.visited.size, 1);
  tracker.recordCompletion('movie');
  assert.equal(tracker.visited.size, 1);
});

test('Entering activity and immediately clicking back to house counts as completion without full play-through', () => {
  const tracker = createUnlockTracker();
  const el = {};

  // 1. Enter movie and immediately return home
  tracker.recordCompletion('movie', 'enter', 5);
  tracker.returnHome(6);
  tracker.syncUnlock(el);
  assert.equal(tracker.visited.has('movie'), true);
  assert.equal(tracker.visited.size, 1);
  assert.equal(el.hidden, true); // Still locked

  // 2. Enter gym and immediately return home
  tracker.recordCompletion('gym', 'walk', 12);
  tracker.returnHome(13);
  tracker.syncUnlock(el);
  assert.equal(tracker.visited.has('gym'), true);
  assert.equal(tracker.visited.size, 2);
  assert.equal(el.hidden, true); // Still locked

  // 3. Enter drive and immediately return home
  tracker.recordCompletion('drive', 'driving', 20);
  assert.equal(tracker.pendingToast, true);
  tracker.returnHome(21);
  tracker.syncUnlock(el);
  assert.equal(tracker.visited.has('drive'), true);
  assert.equal(tracker.visited.size, 3);
  assert.equal(el.hidden, false); // UNLOCKED!
  assert.equal(el.unlocked, true);
  assert.equal(tracker.pendingToast, false);
  assert.equal(tracker.unlockedAt, 21);
});
