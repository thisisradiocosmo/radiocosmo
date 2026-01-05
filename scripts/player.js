let i = 0, playing = false;
let wavesurfer;
let preloadedAudio = null;
let shuffleMode = false;
let autoScrollEnabled = true;
let isUserScrolling = false
let scrollTimeout;
let shuffleOrder = [];
let currentShuffleIndex = 0;

// Separate video mode state
let videoMode = false;
let videoIndex = 0; // Separate index for video playlist
let videoPlayer = null;
let isMobile = window.innerWidth <= 768;
let controlsHideTimeout = null;
let controlsVisible = true;

// Swipe detection
let touchStartY = 0;
let touchEndY = 0;
let touchStartX = 0;
let touchEndX = 0;

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

// Initialize video player
videoPlayer = document.getElementById('video-player');
if (videoPlayer) {
    videoPlayer.muted = false;
    videoPlayer.volume = 1.0;

    // Add error handling
    videoPlayer.addEventListener('error', (e) => {
        console.error('Video error:', e);
        console.error('Video error details:', videoPlayer.error);
    });

    videoPlayer.addEventListener('canplay', () => {
        console.log('Video can play - volume:', videoPlayer.volume);
    });
}

// Update mobile detection on resize
window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
    updateVideoButtonVisibility();
});

const playlist = document.getElementById('list');
playlist.addEventListener('scroll', () => {
    if (!autoScrollEnabled) return; // Als al uit, niks doen
    
    // User is aan het scrollen
    isUserScrolling = true;
    
    // Reset timeout
    clearTimeout(scrollTimeout);
    
    // Na 2 seconden niet scrollen, reset flag
    scrollTimeout = setTimeout(() => {
        isUserScrolling = false;
    }, 2000);
});

// Get DOM elements after page loads
const btn = document.getElementById('btn');
const title = document.getElementById('title');
const list = document.getElementById('list');

function generateShuffleOrder() {
    // Generate shuffle order for audio playlist only
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

// Video player event listeners
if (videoPlayer) {
    videoPlayer.addEventListener('timeupdate', () => {
        if (videoMode && isMobile) {
            const currentTime = videoPlayer.currentTime;
            const duration = videoPlayer.duration;
            const remaining = duration - currentTime;
            const progress = (currentTime / duration) * 100;

            document.getElementById('simple-current-time').textContent = formatTime(currentTime);
            document.getElementById('simple-duration').textContent = '-' + formatTime(remaining);
            document.getElementById('progress-fill').style.width = progress + '%';
        }
    });

    videoPlayer.addEventListener('play', () => {
        playing = true;
        btn.innerHTML = '<i class="fas fa-pause"></i>';

        // Update video play button
        const videoPlayBtn = document.getElementById('video-play-btn');
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<i class="fas fa-pause"></i>';
        }

        document.querySelectorAll('.song').forEach((el, idx) => {
            if (idx === i) {
                el.classList.add('playing');
            }
        });
    });

    videoPlayer.addEventListener('pause', () => {
        playing = false;
        btn.innerHTML = '<i class="fas fa-play"></i>';

        // Update video play button
        const videoPlayBtn = document.getElementById('video-play-btn');
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
        }

        document.querySelectorAll('.song').forEach((el) => {
            el.classList.remove('playing');
        });
    });

    videoPlayer.addEventListener('ended', async () => {
        gtag('event', 'complete_video', {
            'video_title': videos[videoIndex].title
        });

        playing = true;

        // Go to next video in video playlist
        videoIndex = (videoIndex + 1) % videos.length;
        await loadVideo(videoIndex);
    });

    videoPlayer.addEventListener('loadedmetadata', () => {
        const duration = videoPlayer.duration;
        document.getElementById('simple-duration').textContent = formatTime(duration);
        document.getElementById('track-duration').textContent = formatTime(duration);
    });

    // Add click/tap/slide functionality to simple progress bar for seeking
    const simpleProgressBar = document.querySelector('.simple-progress-bar');
    if (simpleProgressBar) {
        let isDragging = false;

        const handleSeek = (e) => {
            if (videoMode && isMobile && videoPlayer.duration) {
                const rect = simpleProgressBar.getBoundingClientRect();
                const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || (e.changedTouches && e.changedTouches[0]?.clientX);
                if (clientX) {
                    const percentage = (clientX - rect.left) / rect.width;
                    const clampedPercentage = Math.max(0, Math.min(1, percentage));
                    const newTime = clampedPercentage * videoPlayer.duration;
                    videoPlayer.currentTime = newTime;
                }
            }
        };

        const startDrag = (e) => {
            if (videoMode && isMobile) {
                isDragging = true;
                handleSeek(e);
                showControls();
            }
        };

        const drag = (e) => {
            if (isDragging && videoMode && isMobile) {
                e.preventDefault();
                handleSeek(e);
            }
        };

        const endDrag = () => {
            isDragging = false;
        };

        // Click/tap to seek
        simpleProgressBar.addEventListener('click', handleSeek);

        // Touch sliding
        simpleProgressBar.addEventListener('touchstart', startDrag, { passive: false });
        simpleProgressBar.addEventListener('touchmove', drag, { passive: false });
        simpleProgressBar.addEventListener('touchend', endDrag);
        simpleProgressBar.addEventListener('touchcancel', endDrag);

        // Mouse sliding (for desktop testing)
        simpleProgressBar.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
    }
}

function updateVideoButtonVisibility() {
    const videoBtn = document.getElementById('video-btn');
    if (videoBtn) {
        // Show video button only on mobile and only if there are videos available
        if (isMobile && videos.length > 0) {
            videoBtn.style.display = 'flex';
        } else {
            videoBtn.style.display = 'none';
            // If switching to desktop, disable video mode
            if (!isMobile && videoMode) {
                videoMode = false;
                updatePlayerMode();
            }
        }
    }
}

function exitVideoMode() {
    if (!videoMode) return;

    videoMode = false;
    const videoBtn = document.getElementById('video-btn');
    if (videoBtn) {
        videoBtn.classList.remove('active');
    }

    // Return to audio mode
    updatePlayerMode();

    gtag('event', 'video_mode_disabled', {
        'event_category': 'player_controls',
        'method': 'home_button'
    });
}

async function toggleVideo() {
    if (!isMobile || videos.length === 0) return;

    videoMode = !videoMode;
    const videoBtn = document.getElementById('video-btn');

    if (videoMode) {
        videoBtn.classList.add('active');

        // Start with first video
        videoIndex = 0;
        await loadVideo(videoIndex);

        gtag('event', 'video_mode_enabled', {
            'event_category': 'player_controls',
            'video_title': videos[videoIndex].title
        });
    } else {
        exitVideoMode();
    }
}

async function loadVideo(index) {
    videoIndex = index;
    const video = videos[videoIndex];

    console.log('Loading video:', video.videoUrl);

    // Update UI
    title.textContent = video.title;
    document.getElementById('date').textContent = video.date;

    // Set video to unmuted with full volume
    videoPlayer.muted = false;
    videoPlayer.volume = 1.0;

    console.log('Video settings before load - volume:', videoPlayer.volume);

    // Load video
    videoPlayer.src = video.videoUrl;
    videoPlayer.load();

    console.log('Video src set to:', videoPlayer.src);

    // Show video mode UI
    await updatePlayerMode();

    // Attempt to autoplay with sound
    console.log('Attempting to autoplay video with sound...');
    try {
        await videoPlayer.play();
        console.log('Video autoplaying successfully with sound');
        playing = true;
    } catch (err) {
        console.error('Video autoplay failed:', err);
        playing = false;
        btn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// Auto-hide controls in video mode (only progress bar, not bottom bar)
function showControls() {
    console.log('showControls called - videoMode:', videoMode, 'isMobile:', isMobile);
    if (!videoMode || !isMobile) return;

    const simpleProgress = document.getElementById('simple-progress');

    console.log('Showing progress bar');
    simpleProgress.classList.remove('hidden');
    controlsVisible = true;

    // Clear existing timeout
    if (controlsHideTimeout) {
        clearTimeout(controlsHideTimeout);
    }

    // Hide progress bar after 3 seconds of inactivity
    controlsHideTimeout = setTimeout(() => {
        if (videoMode && isMobile) {
            console.log('Hiding progress bar');
            simpleProgress.classList.add('hidden');
            controlsVisible = false;
        }
    }, 3000);
}

function hideControls() {
    if (!videoMode || !isMobile) return;

    const simpleProgress = document.getElementById('simple-progress');

    simpleProgress.classList.add('hidden');
    controlsVisible = false;

    if (controlsHideTimeout) {
        clearTimeout(controlsHideTimeout);
    }
}

async function updatePlayerMode() {
    const waveformContainer = document.querySelector('.waveform-container');
    const videoContainer = document.getElementById('video-container');
    const playlistContainer = document.querySelector('.playlist');
    const simpleProgress = document.getElementById('simple-progress');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const autoscrollBtn = document.getElementById('autoscroll-btn');
    const playerBar = document.querySelector('.player-bar');
    const videoBottomBar = document.getElementById('video-bottom-bar');
    const banner = document.querySelector('.banner');

    if (videoMode && isMobile) {
        // Hide waveform, show video
        waveformContainer.style.display = 'none';
        videoContainer.style.display = 'flex';
        simpleProgress.style.display = 'block';
        playlistContainer.style.display = 'none';

        // Hide regular player bar and banner, show video bottom bar
        playerBar.style.display = 'none';
        if (banner) banner.style.display = 'none';
        if (videoBottomBar) videoBottomBar.style.display = 'flex';

        // Hide shuffle and autoscroll buttons (not needed in video mode)
        if (shuffleBtn) shuffleBtn.style.display = 'none';
        if (autoscrollBtn) autoscrollBtn.style.display = 'none';

        // Start auto-hide timer for progress bar
        showControls();

        // Pause audio mode if playing
        if (wavesurfer.isPlaying()) {
            wavesurfer.pause();
        }
    } else {
        // Show waveform, hide video
        waveformContainer.style.display = 'block';
        videoContainer.style.display = 'none';
        simpleProgress.style.display = 'none';
        playlistContainer.style.display = 'block';

        // Show regular player bar and banner, hide video bottom bar
        playerBar.style.display = 'flex';
        if (banner) banner.style.display = 'block';
        if (videoBottomBar) videoBottomBar.style.display = 'none';

        // Show shuffle and autoscroll buttons (needed in audio mode)
        if (shuffleBtn) shuffleBtn.style.display = 'flex';
        if (autoscrollBtn) autoscrollBtn.style.display = 'flex';

        // Remove video mode styling from player bar
        playerBar.classList.remove('video-mode', 'hidden');
        simpleProgress.classList.remove('hidden');

        // Stop video mode if playing
        if (videoPlayer && !videoPlayer.paused) {
            videoPlayer.pause();
        }
    }
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

async function load(x) {
    i = x;
    const wasPlaying = playing;

    // Only load audio - video mode is separate
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

    // Scroll to active song if autoscroll is enabled
    if (autoScrollEnabled && !isUserScrolling) {
        const activeSong = document.querySelectorAll('.song')[i];
        if (activeSong) {
            activeSong.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }

    // Update shuffle index if in shuffle mode
    if (shuffleMode) {
        currentShuffleIndex = shuffleOrder.indexOf(i);
    }

    // Track song selection from playlist
    gtag('event', 'select_song', {
        'song_title': songs[i].title,
        'song_position': i
    });

    if (playing && !videoMode) {
        wavesurfer.once('ready', () => {
            wavesurfer.play();
        });
    }
}

async function play() {
    // Handle video mode separately
    if (videoMode && isMobile) {
        if (videoPlayer.paused) {
            videoPlayer.play().catch(err => console.log('Video playback failed:', err));
        } else {
            videoPlayer.pause();
        }
        return;
    }

    // Handle audio mode
    if (!wavesurfer.getDuration()) {
        // If no audio loaded yet, load first song
        await load(0);
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

function toggleAutoScroll() {
    autoScrollEnabled = !autoScrollEnabled;
    const autoScrollBtn = document.getElementById('autoscroll-btn');
    
    if (autoScrollEnabled) {
        autoScrollBtn.classList.add('active');
        
        gtag('event', 'autoscroll_enabled', {
            'event_category': 'player_controls'
        });
    } else {
        autoScrollBtn.classList.remove('active');
        
        gtag('event', 'autoscroll_disabled', {
            'event_category': 'player_controls'
        });
    }
}

async function previousTrack() {
    // In video mode, navigate video playlist
    if (videoMode && isMobile) {
        videoIndex = (videoIndex - 1 + videos.length) % videos.length;
        await loadVideo(videoIndex);
    } else if (shuffleMode) {
        currentShuffleIndex = (currentShuffleIndex - 1 + shuffleOrder.length) % shuffleOrder.length;
        i = shuffleOrder[currentShuffleIndex];
        await load(i);
        if (playing) {
            wavesurfer.once('ready', () => {
                wavesurfer.play();
            });
        }
    } else {
        i = (i - 1 + songs.length) % songs.length;
        await load(i);
        if (playing) {
            wavesurfer.once('ready', () => {
                wavesurfer.play();
            });
        }
    }

    // Visual feedback
    const prevBtn = document.getElementById('prev-btn');
    prevBtn.focus();
    setTimeout(() => prevBtn.blur(), 100);

    gtag('event', 'previous_track', {
        'event_category': 'player_controls'
    });
}

async function nextTrack() {
    // In video mode, navigate video playlist
    if (videoMode && isMobile) {
        videoIndex = (videoIndex + 1) % videos.length;
        await loadVideo(videoIndex);
    } else if (shuffleMode) {
        currentShuffleIndex = (currentShuffleIndex + 1) % shuffleOrder.length;
        i = shuffleOrder[currentShuffleIndex];
        await load(i);
        if (playing) {
            wavesurfer.once('ready', () => {
                wavesurfer.play();
            });
        }
    } else {
        i = (i + 1) % songs.length;
        await load(i);
        if (playing) {
            wavesurfer.once('ready', () => {
                wavesurfer.play();
            });
        }
    }

    // Visual feedback
    const nextBtn = document.getElementById('next-btn');
    nextBtn.focus();
    setTimeout(() => nextBtn.blur(), 100);

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

    switch (e.key.toLowerCase()) {
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
        case 'a':
            e.preventDefault();
            toggleAutoScroll();
            break;
    }
});

load(0);

// Set autoscroll active by default
document.getElementById('autoscroll-btn')?.classList.add('active');

// Initialize video button visibility
updateVideoButtonVisibility();

// Swipe gesture handling for video navigation
function handleSwipe() {
    const swipeThreshold = 50; // Minimum distance for a swipe
    const verticalSwipe = touchStartY - touchEndY;
    const horizontalSwipe = Math.abs(touchStartX - touchEndX);

    console.log('handleSwipe called - verticalSwipe:', verticalSwipe, 'horizontalSwipe:', horizontalSwipe);
    console.log('Threshold check:', Math.abs(verticalSwipe), '>', swipeThreshold, '&&', Math.abs(verticalSwipe), '>', horizontalSwipe);

    // Only process if it's a mostly vertical swipe
    if (Math.abs(verticalSwipe) > swipeThreshold && Math.abs(verticalSwipe) > horizontalSwipe) {
        if (verticalSwipe > 0) {
            // Swipe up - next video
            console.log('✅ Swipe up detected - going to next video');
            console.log('Current videoIndex:', videoIndex, 'Total videos:', videos.length);
            nextTrack();
        } else {
            // Swipe down - previous video
            console.log('✅ Swipe down detected - going to previous video');
            console.log('Current videoIndex:', videoIndex, 'Total videos:', videos.length);
            previousTrack();
        }
    } else {
        console.log('❌ Swipe not detected - threshold not met or too much horizontal movement');
    }
}

// Add event listeners for showing controls in video mode
const videoContainer = document.getElementById('video-container');
if (videoContainer) {
    // Show controls on touch/click anywhere on video container
    videoContainer.addEventListener('touchstart', (e) => {
        console.log('Touch start on container');
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
    }, { passive: true });

    videoContainer.addEventListener('touchmove', (e) => {
        if (videoMode && isMobile) {
            // Prevent default scrolling during swipe in video mode
            e.preventDefault();
        }
    }, { passive: false });

    videoContainer.addEventListener('touchend', (e) => {
        console.log('CONTAINER TOUCHEND');
        touchEndY = e.changedTouches[0].clientY;
        touchEndX = e.changedTouches[0].clientX;

        const verticalDistance = Math.abs(touchStartY - touchEndY);
        const horizontalDistance = Math.abs(touchStartX - touchEndX);

        if (videoMode && isMobile) {
            // Check if it's a tap vs a swipe
            if (verticalDistance < 30 && horizontalDistance < 30) {
                // It's a tap - show controls
                console.log('Tap detected, showing controls');
                showControls();
            } else {
                // It's a swipe
                handleSwipe();
            }
        }
    }, { passive: false });

    videoContainer.addEventListener('click', (e) => {
        console.log('CONTAINER CLICK');
        if (videoMode && isMobile) {
            console.log('Showing controls');
            showControls();
        }
    });
}

if (videoPlayer) {
    // Handle video player taps/clicks
    videoPlayer.addEventListener('click', () => {
        console.log('Video click');
        showControls();
    });

    videoPlayer.addEventListener('touchend', (e) => {
        // Only handle single taps, not swipes
        const verticalDistance = Math.abs(touchStartY - touchEndY);
        const horizontalDistance = Math.abs(touchStartX - touchEndX);

        // If it's a tap (not a swipe)
        if (verticalDistance < 30 && horizontalDistance < 30) {
            console.log('Video tap detected');
            showControls();
        }
    });

    // Show controls when seeking
    const simpleProgressBar = document.querySelector('.simple-progress-bar');
    if (simpleProgressBar) {
        simpleProgressBar.addEventListener('touchstart', showControls);
        simpleProgressBar.addEventListener('mousedown', showControls);
        simpleProgressBar.addEventListener('click', showControls);
    }
}

// Show controls when any player button is clicked
document.querySelector('.player-controls')?.addEventListener('click', showControls);

// Also add listener to player bar
document.querySelector('.player-bar')?.addEventListener('click', showControls);

// Add global touch/click listener as fallback
document.addEventListener('touchstart', (e) => {
    if (videoMode && isMobile && !controlsVisible) {
        console.log('Global touchstart');
        showControls();
    }
});

document.addEventListener('click', (e) => {
    if (videoMode && isMobile && !controlsVisible) {
        console.log('Global click');
        showControls();
    }
});