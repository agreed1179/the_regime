// src/stores.js
import { writable } from 'svelte/store';

// Default asset directories
export const assetPaths = writable({
  characters: '/images/characters/',
  backgrounds: '/images/backgrounds/',
  music: '/music/',
  sounds: '/sounds/',
  styles: '/styles/' // If you have stylesheets or related assets
});

export const currentStage = writable(0);
export const slides = writable([]);
export const history = writable([]);
export const backgroundImage = writable('');
export const currentChapter = writable(0);
export const backgroundMusic = writable(''); // Initialize as empty
export const backgroundVolume = writable(0.5); // Default volume set to 50%

// Record player choices
export const playerChoices = writable([]);

// **Audio Management Stores and Functions**

// Track the currently playing audio instance
export const currentAudio = writable(null);

// Default volume for sound effects (50%)
export const soundEffectVolume = writable(0.4);

/**
 * Play a sound with specified volume.
 * @param {string} soundPath - The path to the sound file.
 * @param {boolean} isMuted - Whether the sound is muted.
 * @param {number} [volume=0.5] - Volume level (0.0 to 1.0). Defaults to 50%.
 */
export function playSound(soundPath, isMuted, volume = 0.5) {
  if (soundPath && !isMuted) {
    // Pause and reset any currently playing audio
    currentAudio.subscribe(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    })();
    
    const audio = new Audio(soundPath);
    audio.volume = volume;
    audio.play().catch(error => {
      console.error('Sound effect playback failed:', error);
    });
    
    currentAudio.set(audio);
  }
}

/**
 * Stop the currently playing sound.
 */
export function stopSound() {
  currentAudio.subscribe(audio => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  })();
  currentAudio.set(null);
}
