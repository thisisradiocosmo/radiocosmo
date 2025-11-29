let i = 0, playing = false;
let wavesurfer;
let preloadedAudio = null;
let shuffleMode = false;
let loopMode = false;
let shuffleOrder = [];
let currentShuffleIndex = 0;

// Initialize WaveSurfer
wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#ffffff',
    progressColor: '#8e8e8e',
    cursorColor: '#DAA520',
    barWidth: 2,
    barRadius: 3,
    cursorWidth: 1,
    height: 60,
    barGap: 2,
    responsive: true
});

// Get DOM elements after page loads
const btn = document.getElementById('btn');
const title = document.getElementById('title');
const list = document.getElementById('list');

function generateShuffleOrder() {
    shuffleOrder = [...Array(songs.length).keys()];
    
    // Fisher-Yates shuffle algorithm
    for (let x = shuffleOrder.length - 1; x > 0; x--) {
        const y = Math.floor(Math.random() * (x + 1));
        [shuffleOrder[x], shuffleOrder[y]] = [shuffleOrder[y], shuffleOrder[x]];
    }
    
    // Make sure current song is first in shuffle order
    const currentIndex = shuffleOrder.indexOf(i);
    if (currentIndex > 0) {
        [shuffleOrder[0], shuffleOrder[currentIndex]] = [shuffleOrder[currentIndex], shuffleOrder[0]];
    }
    
    currentShuffleIndex = 0;
}

function preloadNext() {
    let nextIndex;
    
    if (shuffleMode) {
        const nextShuffleIndex = (currentShuffleIndex + 1) % shuffleOrder.length;
        nextIndex = shuffleOrder[nextShuffleIndex];
    } else {
        nextIndex = (i + 1) % songs.length;
    }
    
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
    const duration = wavesurfer.getDuration();
    document.getElementById('duration').textContent = formatTime(duration);
    document.getElementById('track-duration').textContent = formatTime(duration);
    preloadNext();
});

wavesurfer.on('finish', () => {
    gtag('event', 'complete_song', {
        'song_title': songs[i].title
    });

    // If loop mode is on, replay the same track
    if (loopMode) {
        wavesurfer.play();
        return;
    }

    playing = true;
    
    if (shuffleMode) {
        currentShuffleIndex = (currentShuffleIndex + 1) % shuffleOrder.length;
        i = shuffleOrder[currentShuffleIndex];
    } else {
        i = (i + 1) % songs.length;
    }
    
    load(i);
});

wavesurfer.on('play', () => {
    playing = true;
    btn.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Add playing class to active song
    document.querySelectorAll('.song').forEach((el, idx) => {
        if (idx === i) {
            el.classList.add('playing');
        }
    });
});

wavesurfer.on('pause', () => {
    playing = false;
    btn.innerHTML = '<i class="fas fa-play"></i>';
    
    // Remove playing class from all songs
    document.querySelectorAll('.song').forEach((el) => {
        el.classList.remove('playing');
    });

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
    el.innerHTML = `
        <div style="display: flex; align-items: center;">
            <div class="playing-animation">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="song-title">${s.title}</span>
        </div>
        <span class="song-date">${s.date}</span>
    `;
    el.onclick = () => load(x);
    list.appendChild(el);
});

function load(x) {
    i = x;
    const wasPlaying = playing;
    wavesurfer.load(songs[i].url);
    title.textContent = songs[i].title;
    document.getElementById('date').textContent = songs[i].date;
    
    // Update active and playing classes
    document.querySelectorAll('.song').forEach((el, idx) => {
        el.classList.toggle('active', idx === i);
        if (idx === i && playing) {
            el.classList.add('playing');
        } else {
            el.classList.remove('playing');
        }
    });

    // Update shuffle index if in shuffle mode
    if (shuffleMode) {
        currentShuffleIndex = shuffleOrder.indexOf(i);
    }

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
        wavesurfer.once('ready', () => {
            wavesurfer.play().catch(err => {
                console.log('Playback failed:', err);
                playing = false;
                btn.innerHTML = '<i class="fas fa-play"></i>';
            });
        });
        return;
    }

    wavesurfer.playPause();
}

function toggleShuffle() {
    shuffleMode = !shuffleMode;
    const shuffleBtn = document.getElementById('shuffle-btn');
    
    if (shuffleMode) {
        shuffleBtn.classList.add('active');
        generateShuffleOrder();
        
        gtag('event', 'shuffle_enabled', {
            'event_category': 'player_controls'
        });
    } else {
        shuffleBtn.classList.remove('active');
        
        gtag('event', 'shuffle_disabled', {
            'event_category': 'player_controls'
        });
    }
    
    // Preload next track based on new mode
    preloadNext();
}

function toggleLoop() {
    loopMode = !loopMode;
    const loopBtn = document.getElementById('loop-btn');
    
    if (loopMode) {
        loopBtn.classList.add('active');
        
        gtag('event', 'loop_enabled', {
            'event_category': 'player_controls'
        });
    } else {
        loopBtn.classList.remove('active');
        
        gtag('event', 'loop_disabled', {
            'event_category': 'player_controls'
        });
    }
}

function previousTrack() {
    if (shuffleMode) {
        currentShuffleIndex = (currentShuffleIndex - 1 + shuffleOrder.length) % shuffleOrder.length;
        i = shuffleOrder[currentShuffleIndex];
    } else {
        i = (i - 1 + songs.length) % songs.length;
    }
    
    load(i);
    
    if (playing) {
        wavesurfer.once('ready', () => {
            wavesurfer.play();
        });
    }
    
    gtag('event', 'previous_track', {
        'event_category': 'player_controls'
    });
}

function nextTrack() {
    if (shuffleMode) {
        currentShuffleIndex = (currentShuffleIndex + 1) % shuffleOrder.length;
        i = shuffleOrder[currentShuffleIndex];
    } else {
        i = (i + 1) % songs.length;
    }
    
    load(i);
    
    if (playing) {
        wavesurfer.once('ready', () => {
            wavesurfer.play();
        });
    }
    
    gtag('event', 'next_track', {
        'event_category': 'player_controls'
    });
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ignore if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    switch(e.key.toLowerCase()) {
        case ' ':
        case 'k':
            e.preventDefault();
            play();
            break;
        case 'arrowright':
        case 'l':
            e.preventDefault();
            nextTrack();
            break;
        case 'arrowleft':
        case 'j':
            e.preventDefault();
            previousTrack();
            break;
        case 's':
            e.preventDefault();
            toggleShuffle();
            break;
        case 'r':
            e.preventDefault();
            toggleLoop();
            break;
    }
});

load(0);