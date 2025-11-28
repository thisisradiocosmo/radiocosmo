let i = 0, playing = false;
let wavesurfer;
let preloadedAudio = null;

// Initialize WaveSurfer
wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#ffffff',
    progressColor: '#8e8e8e',
    cursorColor: '#ebd525',
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    height: 80,
    barGap: 2,
    responsive: true
});

function preloadNext() {
    const nextIndex = (i + 1) % songs.length;
    preloadedAudio = new Audio(songs[nextIndex].url);
    preloadedAudio.preload = 'auto';
}

// Update time display
wavesurfer.on('audioprocess', () => {
    const currentTime = wavesurfer.getCurrentTime();
    const duration = wavesurfer.getDuration();
    const remaining = duration - currentTime;

    document.getElementById('current-time').textContent = formatTime(currentTime);
    document.getElementById('duration').textContent = '-' + formatTime(remaining);
});

wavesurfer.on('ready', () => {
    document.getElementById('duration').textContent = formatTime(wavesurfer.getDuration());
    preloadNext();
});

wavesurfer.on('finish', () => {
    gtag('event', 'complete_song', {
        'song_title': songs[i].title
    });

    playing = true;
    i = (i + 1) % songs.length;
    load(i);
});

wavesurfer.on('play', () => {
    playing = true;
    btn.innerHTML = '<i class="fas fa-pause"></i>';
});

wavesurfer.on('pause', () => {
    playing = false;
    btn.innerHTML = '<i class="fas fa-play"></i>';

    // Track which song is being played
    gtag('event', 'play_song', {
        'song_title': songs[i].title,
        'song_date': songs[i].date,
        'song_position': i
    });
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Playlist
songs.forEach((s, x) => {
    const el = document.createElement('div');
    el.className = 'song';
    el.innerHTML = `<span class="song-title">${s.title}</span><span class="song-date">${s.date}</span>`;
    el.onclick = () => load(x);
    list.appendChild(el);
});

function load(x) {
    i = x;
    const wasPlaying = playing;
    wavesurfer.load(songs[i].url);
    title.textContent = songs[i].title;
    document.getElementById('date').textContent = songs[i].date;
    document.querySelectorAll('.song').forEach((el, idx) => el.classList.toggle('active', idx === i));

    // Track song selection from playlist
    gtag('event', 'select_song', {
        'song_title': songs[i].title,
        'song_position': i
    });

    if (playing) {
        wavesurfer.once('ready', () => {
            wavesurfer.play();
        });
    }
}

function play() {
    if (!wavesurfer.getDuration()) {
        // If no audio loaded yet, load first song
        load(0);
        playing = true; // Set state before loading
        return;
    }

    wavesurfer.playPause();
}

function trackSubscribe() {
    gtag('event', 'click', {
        'event_category': 'engagement',
        'event_label': 'subscribe_button'
    });
}

// Track session duration
let sessionStart = Date.now();

window.addEventListener('beforeunload', () => {
    const duration = Math.floor((Date.now() - sessionStart) / 1000);
    gtag('event', 'session_duration', {
        'value': duration
    });
});

load(0);