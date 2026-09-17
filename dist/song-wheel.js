const TRACKS = Object.freeze([
  { id: 'stayin-alive', title: 'Stayin’ Alive', artist: 'Bee Gees', color: '#ffbd68' },
  { id: 'million-dollar-baby', title: 'MILLION DOLLAR BABY', artist: 'Tommy Richman', color: '#ef8dc5' },
  { id: 'wanna-be-startin-somethin', title: 'Wanna Be Startin’ Somethin’', artist: 'Michael Jackson', color: '#a4a0ff' },
  { id: 'its-tricky', title: 'It’s Tricky', artist: 'Run-D.M.C.', color: '#77dbdc' },
  { id: 'happy-birthday', title: 'Happy Birthday', artist: 'Stevie Wonder', color: '#bdde88' },
].map(track => Object.freeze({ ...track, src: `./assets/audio/${track.id}.mp3` })));

/** One native dialog and the caller's existing audio element; no second player. */
export function createSongWheel({ audio, onTrackChange = () => {}, onPlaybackChange = () => {} } = {}) {
  if (!audio || typeof audio.play !== 'function') throw new TypeError('createSongWheel needs the existing audio element.');
  const app = document.getElementById('app');
  if (!app) throw new Error('The song wheel needs #app.');
  const previousWheel = app.querySelector('.song-wheel');
  if (previousWheel) throw new Error('Only one song wheel may be created.');

  audio.volume = .45;
  audio.loop = true;
  audio.preload = 'none';
  let selected = TRACKS.find(track => audio.getAttribute('src')?.split('/').pop() === `${track.id}.mp3`) || TRACKS[0];
  if (!audio.getAttribute('src')) audio.src = selected.src;
  let returnFocus = null, error = '', pending = false, playToken = 0, wantsPlayback = false, lastPlaybackState = '';
  const songsOpener = document.getElementById('party-songs'), muteButton = document.getElementById('party-mute');
  const dialog = document.createElement('dialog');
  dialog.id = 'song-wheel-dialog';
  dialog.className = 'song-wheel';
  dialog.setAttribute('aria-labelledby', 'song-wheel-title');
  dialog.setAttribute('aria-describedby', 'song-wheel-description');
  dialog.innerHTML = `
    <div class="sw-panel">
      <button class="sw-close" type="button" aria-label="Close song wheel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      <div class="sw-heading">
        <span class="sw-eyebrow">DAD’S DISCO</span>
        <h2 id="song-wheel-title">Pick the next song.</h2>
        <p id="song-wheel-description">Your favorites. Your dance floor.</p>
      </div>
      <div class="sw-orbit" role="group" aria-label="Choose a song">
        <div class="sw-orbit-line" aria-hidden="true"></div>
        <button class="sw-record" type="button" aria-label="Play music">
          <span class="sw-record-disc" aria-hidden="true"></span>
          <span class="sw-record-label" aria-hidden="true"><span>DAD’S<br>MIX</span><svg class="sw-record-icon" viewBox="0 0 24 24"><path d="m9 5 11 7-11 7Z"/></svg></span>
        </button>
      </div>
      <div class="sw-footer">
        <p class="sw-now" role="status" aria-live="polite" aria-atomic="true"></p>
        <button class="sw-retry" type="button" hidden>Play music <span aria-hidden="true">▶</span></button>
      </div>
    </div>`;
  app.append(dialog);
  songsOpener?.setAttribute('aria-haspopup', 'dialog');
  songsOpener?.setAttribute('aria-controls', dialog.id);
  songsOpener?.setAttribute('aria-expanded', 'false');
  const orbit = dialog.querySelector('.sw-orbit'), record = dialog.querySelector('.sw-record');
  const icon = dialog.querySelector('.sw-record-icon'), now = dialog.querySelector('.sw-now');
  const retry = dialog.querySelector('.sw-retry'), closeButton = dialog.querySelector('.sw-close');
  const songButtons = TRACKS.map((track, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sw-song sw-song-${index}`;
    button.style.setProperty('--song-color', track.color);
    button.setAttribute('aria-label', `${track.title}, ${track.artist}`);
    const title = document.createElement('span');
    title.className = 'sw-song-title'; title.textContent = track.title;
    const artist = document.createElement('span');
    artist.className = 'sw-song-artist'; artist.textContent = track.artist;
    const mark = document.createElement('span');
    mark.className = 'sw-selected-mark'; mark.textContent = '✓'; mark.setAttribute('aria-hidden', 'true');
    button.append(title, artist, mark);
    button.addEventListener('click', () => selectTrack(track));
    orbit.append(button);
    return button;
  });

  function sync() {
    const playing = !audio.paused && !audio.ended && !error;
    dialog.classList.toggle('sw-playing', playing);
    record.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} music: ${selected.title}`);
    icon.innerHTML = playing ? '<path d="M7 5h3v14H7zm7 0h3v14h-3Z"/>' : '<path d="m8 5 11 7-11 7Z"/>';
    songButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(TRACKS[i] === selected)));
    const status = error || `${pending ? 'Starting' : playing ? (audio.muted ? 'Playing · muted' : 'Now playing') : 'Selected'} · ${selected.title}`;
    // Avoid unnecessary live-region announcements on repeated media events.
    if (now.textContent !== status) now.textContent = status;
    now.classList.toggle('sw-error', Boolean(error));
    retry.hidden = playing || pending;
    retry.textContent = error ? 'Play music again' : 'Play music';
    if (muteButton) {
      muteButton.textContent = playing ? (audio.muted ? 'Sound off' : 'Sound on') : 'Play music';
      muteButton.setAttribute('aria-label', playing ? (audio.muted ? 'Unmute music' : 'Mute music') : 'Play music');
    }
    const playbackState = JSON.stringify([playing, audio.muted, pending, error, selected.id]);
    if (playbackState !== lastPlaybackState) {
      lastPlaybackState = playbackState;
      onPlaybackChange({ playing, muted: audio.muted, pending, error, track: selected });
    }
  }

  function play() {
    const token = ++playToken;
    wantsPlayback = true; error = ''; pending = true; sync();
    // Start within the click gesture; never await another operation first.
    let result;
    try {
      if (audio.error) audio.load();
      result = audio.play();
    }
    catch (reason) { return Promise.resolve(playFailed(reason, token)); }
    return Promise.resolve(result).then(() => {
      if (token !== playToken) { if (!wantsPlayback) audio.pause(); return false; }
      pending = false; sync(); return true;
    }, reason => playFailed(reason, token));
  }

  function playFailed(reason, token) {
    if (token !== playToken) return false;
    pending = false;
    if (reason?.name !== 'AbortError') error = reason?.name === 'NotAllowedError'
      ? 'Tap Play music to start this song.'
      : 'This song couldn’t play. Try again or choose another.';
    sync(); return false;
  }

  function selectTrack(track) {
    if (selected !== track) {
      selected = track;
      // Changing src keeps the same audio element and its current mute setting.
      audio.src = track.src;
    }
    play();
    close();
    onTrackChange(selected);
  }

  function open(opener) {
    if (dialog.open) return;
    const candidate = opener?.currentTarget || opener;
    returnFocus = typeof candidate?.focus === 'function' ? candidate : (songsOpener || document.activeElement);
    sync();
    dialog.showModal();
    songsOpener?.setAttribute('aria-expanded', 'true');
    songButtons[TRACKS.indexOf(selected)].focus({ preventScroll: true });
  }

  function close() {
    if (dialog.open) dialog.close();
    songsOpener?.setAttribute('aria-expanded', 'false');
  }

  function stop() {
    ++playToken;
    wantsPlayback = false;
    pending = false; error = '';
    audio.pause();
    try { audio.currentTime = 0; } catch { /* Metadata may not have loaded yet. */ }
    close(); sync();
  }

  function reset() {
    stop();
    if (selected !== TRACKS[0]) { selected = TRACKS[0]; audio.src = selected.src; }
    sync();
  }

  function toggleMute() { audio.muted = !audio.muted; sync(); return audio.muted; }
  function togglePlayback() {
    if (audio.paused || audio.ended || error) play();
    else { ++playToken; wantsPlayback = false; pending = false; audio.pause(); sync(); }
  }

  function mediaError() {
    if (!wantsPlayback) return;
    pending = false;
    error = 'This song couldn’t load. Try again or choose another.';
    sync();
  }

  function restoreFocus() {
    if (returnFocus?.isConnected && typeof returnFocus.focus === 'function') returnFocus.focus({ preventScroll: true });
    returnFocus = null;
  }

  closeButton.addEventListener('click', close);
  retry.addEventListener('click', play);
  record.addEventListener('click', togglePlayback);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', restoreFocus);
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not([disabled])')].filter(button => !button.hidden);
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  const mediaEvents = ['play', 'playing', 'pause', 'ended', 'volumechange', 'emptied'];
  mediaEvents.forEach(event => audio.addEventListener(event, sync));
  audio.addEventListener('error', mediaError);
  sync();

  return {
    open, close, play, stop, reset, toggleMute,
    get selectedTrack() { return selected; },
    get isOpen() { return dialog.open; },
    get tracks() { return TRACKS; },
    destroy() {
      close(); restoreFocus();
      mediaEvents.forEach(event => audio.removeEventListener(event, sync));
      audio.removeEventListener('error', mediaError);
      dialog.remove();
    },
  };
}
