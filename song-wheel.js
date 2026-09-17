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
  let currentIndex = TRACKS.indexOf(selected);
  let autoTimer = null, pauseUntil = 0;

  const dialog = document.createElement('dialog');
  dialog.id = 'song-wheel-dialog';
  dialog.className = 'song-wheel';
  dialog.setAttribute('aria-labelledby', 'song-wheel-title');
  dialog.setAttribute('aria-describedby', 'song-wheel-description');
  dialog.innerHTML = `
    <div class="sw-panel">
      <button class="sw-close" type="button" aria-label="Close song selection"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      <div class="sw-heading">
        <span class="sw-eyebrow">DAD’S VINYL JUKEBOX</span>
        <h2 id="song-wheel-title">Pick the Next Record</h2>
        <p id="song-wheel-description">Rotate the carousel to choose a track for the dance floor.</p>
      </div>

      <div class="sw-carousel-stage" role="region" aria-label="Song records carousel">
        <button class="sw-carousel-arrow sw-prev" type="button" aria-label="Previous record">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div class="sw-carousel-viewport">
          <div class="sw-carousel-track"></div>
        </div>

        <button class="sw-carousel-arrow sw-next" type="button" aria-label="Next record">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
        </button>
      </div>

      <div class="sw-pagination" role="tablist" aria-label="Choose track directly"></div>

      <div class="sw-hero-card">
        <div class="sw-hero-info">
          <span class="sw-hero-badge" id="sw-hero-badge">NOW PLAYING</span>
          <h3 class="sw-hero-title" id="sw-hero-title">Stayin’ Alive</h3>
          <p class="sw-hero-artist" id="sw-hero-artist">Bee Gees</p>
        </div>
        <button class="sw-hero-play" type="button" id="sw-hero-play" aria-label="Play or pause selected track">
          <span class="sw-hero-play-icon" aria-hidden="true">▶</span>
          <span class="sw-hero-play-text">Play Record</span>
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

  const trackContainer = dialog.querySelector('.sw-carousel-track');
  const pagination = dialog.querySelector('.sw-pagination');
  const heroBadge = dialog.querySelector('#sw-hero-badge');
  const heroTitle = dialog.querySelector('#sw-hero-title');
  const heroArtist = dialog.querySelector('#sw-hero-artist');
  const heroPlayBtn = dialog.querySelector('#sw-hero-play');
  const heroPlayIcon = dialog.querySelector('.sw-hero-play-icon');
  const heroPlayText = dialog.querySelector('.sw-hero-play-text');
  const prevBtn = dialog.querySelector('.sw-prev');
  const nextBtn = dialog.querySelector('.sw-next');
  const closeButton = dialog.querySelector('.sw-close');
  const now = dialog.querySelector('.sw-now');
  const retry = dialog.querySelector('.sw-retry');

  const recordButtons = TRACKS.map((track, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `sw-record-item sw-record-${index}`;
    button.style.setProperty('--track-color', track.color);
    button.setAttribute('aria-label', `${track.title} by ${track.artist}`);
    button.dataset.index = String(index);

    button.innerHTML = `
      <div class="sw-disc-vinyl">
        <div class="sw-disc-grooves"></div>
        <div class="sw-disc-sheen"></div>
        <div class="sw-disc-rim"></div>
        <div class="sw-disc-label">
          <span class="sw-label-arc">45 RPM · STEREO</span>
          <span class="sw-label-title">${track.title}</span>
          <span class="sw-label-artist">${track.artist}</span>
          <span class="sw-label-hole"></span>
        </div>
      </div>
      <div class="sw-disc-aura"></div>
      <span class="sw-disc-badge" aria-hidden="true">✓</span>
    `;

    button.addEventListener('click', () => {
      pauseAutoRotate(7000);
      if (currentIndex !== index) {
        currentIndex = index;
        updateCarousel();
        selectTrack(track);
      } else {
        togglePlayback();
      }
    });

    trackContainer.append(button);
    return button;
  });

  const dots = TRACKS.map((track, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'sw-dot';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Track ${index + 1}: ${track.title}`);
    dot.style.setProperty('--dot-color', track.color);
    dot.addEventListener('click', () => {
      pauseAutoRotate(7000);
      currentIndex = index;
      updateCarousel();
      selectTrack(track);
    });
    pagination.append(dot);
    return dot;
  });

  function pauseAutoRotate(ms = 5000) {
    pauseUntil = Date.now() + ms;
  }

  function stepCarousel(delta) {
    currentIndex = (currentIndex + delta + TRACKS.length) % TRACKS.length;
    updateCarousel();
  }

  function updateCarousel() {
    const N = TRACKS.length;
    const currentTrack = TRACKS[currentIndex];
    const isPlaying = !audio.paused && !audio.ended && !error;

    TRACKS.forEach((track, i) => {
      let offset = (i - currentIndex) % N;
      if (offset > 2) offset -= N;
      if (offset < -2) offset += N;

      const btn = recordButtons[i];
      btn.dataset.offset = String(offset);
      btn.classList.toggle('sw-center', offset === 0);
      btn.classList.toggle('sw-active-track', track === selected);
      btn.setAttribute('aria-pressed', String(track === selected));

      dots[i].classList.toggle('sw-active', i === currentIndex);
      dots[i].setAttribute('aria-selected', String(i === currentIndex));
    });

    heroTitle.textContent = currentTrack.title;
    heroArtist.textContent = currentTrack.artist;

    if (currentTrack === selected) {
      heroBadge.textContent = isPlaying ? 'NOW PLAYING' : 'SELECTED';
      heroBadge.style.color = currentTrack.color;
      heroBadge.style.borderColor = currentTrack.color;
      heroBadge.classList.add('sw-playing-badge');
    } else {
      heroBadge.textContent = 'READY TO PLAY';
      heroBadge.style.color = '#c9c4db';
      heroBadge.style.borderColor = 'rgba(255,255,255,0.2)';
      heroBadge.classList.remove('sw-playing-badge');
    }

    if (currentTrack === selected && isPlaying) {
      heroPlayIcon.textContent = '⏸';
      heroPlayText.textContent = 'Pause Track';
    } else {
      heroPlayIcon.textContent = '▶';
      heroPlayText.textContent = currentTrack === selected ? 'Resume Playback' : 'Play Record';
    }
  }

  function sync() {
    const playing = !audio.paused && !audio.ended && !error;
    dialog.classList.toggle('sw-playing', playing);
    songsOpener?.classList.toggle('sw-playing', playing);

    updateCarousel();

    const status = error || `${pending ? 'Starting' : playing ? (audio.muted ? 'Playing · muted' : 'Now playing') : 'Selected'} · ${selected.title}`;
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
      audio.src = track.src;
    }
    currentIndex = TRACKS.indexOf(track);
    play();
    onTrackChange(selected);
  }

  function startAutoRotate() {
    stopAutoRotate();
    autoTimer = setInterval(() => {
      if (!dialog.open) return;
      if (Date.now() < pauseUntil) return;
      stepCarousel(1);
    }, 4500);
  }

  function stopAutoRotate() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  function open(opener) {
    if (dialog.open) return;
    const candidate = opener?.currentTarget || opener;
    returnFocus = typeof candidate?.focus === 'function' ? candidate : (songsOpener || document.activeElement);
    currentIndex = TRACKS.indexOf(selected);
    sync();
    dialog.showModal();
    songsOpener?.setAttribute('aria-expanded', 'true');
    recordButtons[currentIndex]?.focus({ preventScroll: true });
    startAutoRotate();
  }

  function close() {
    if (dialog.open) dialog.close();
    songsOpener?.setAttribute('aria-expanded', 'false');
    stopAutoRotate();
  }

  function stop() {
    ++playToken;
    wantsPlayback = false;
    pending = false; error = '';
    audio.pause();
    try { audio.currentTime = 0; } catch {}
    close(); sync();
  }

  function reset() {
    stop();
    if (selected !== TRACKS[0]) { selected = TRACKS[0]; audio.src = selected.src; }
    currentIndex = 0;
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

  prevBtn.addEventListener('click', () => { pauseAutoRotate(7000); stepCarousel(-1); });
  nextBtn.addEventListener('click', () => { pauseAutoRotate(7000); stepCarousel(1); });
  closeButton.addEventListener('click', close);
  retry.addEventListener('click', play);

  heroPlayBtn.addEventListener('click', () => {
    pauseAutoRotate(7000);
    const track = TRACKS[currentIndex];
    if (track !== selected) {
      selectTrack(track);
    } else {
      togglePlayback();
    }
  });

  const viewport = dialog.querySelector('.sw-carousel-viewport');
  let dragStartX = 0, dragging = false;
  viewport.addEventListener('touchstart', e => {
    pauseAutoRotate(8000);
    dragStartX = e.touches[0].clientX;
    dragging = true;
  }, { passive: true });
  viewport.addEventListener('touchend', e => {
    if (!dragging) return;
    dragging = false;
    const deltaX = e.changedTouches[0].clientX - dragStartX;
    if (Math.abs(deltaX) > 35) {
      if (deltaX < 0) stepCarousel(1);
      else stepCarousel(-1);
    }
  }, { passive: true });
  viewport.addEventListener('mousedown', e => {
    pauseAutoRotate(8000);
    dragStartX = e.clientX;
    dragging = true;
  });
  window.addEventListener('mouseup', e => {
    if (!dragging || !dialog.open) return;
    dragging = false;
    const deltaX = e.clientX - dragStartX;
    if (Math.abs(deltaX) > 35) {
      if (deltaX < 0) stepCarousel(1);
      else stepCarousel(-1);
    }
  });

  dialog.addEventListener('pointerenter', () => pauseAutoRotate(6000));
  dialog.addEventListener('pointerleave', () => pauseAutoRotate(2500));

  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', restoreFocus);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      pauseAutoRotate(7000);
      stepCarousel(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      pauseAutoRotate(7000);
      stepCarousel(1);
    } else if (event.key === ' ' || event.key === 'Enter') {
      if (document.activeElement?.classList.contains('sw-record-item')) {
        event.preventDefault();
        pauseAutoRotate(7000);
        selectTrack(TRACKS[currentIndex]);
      }
    } else if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button:not([disabled])')].filter(button => !button.hidden);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
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
      stopAutoRotate();
      mediaEvents.forEach(event => audio.removeEventListener(event, sync));
      audio.removeEventListener('error', mediaError);
      dialog.remove();
    },
  };
}
