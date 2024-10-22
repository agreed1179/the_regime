// src/utils/appLogic.js
import { slides, currentStage, history, currentChapter, backgroundImage, backgroundMusic, backgroundVolume, assetPaths } from '../stores';
import { get } from 'svelte/store';
import { getAssetPath } from './assetHelper.js'; // Ensure this import exists

// Function to pre-load images and sound effects
export function preloadImages(slideData) {
  slideData.forEach((slide) => {
    if (slide.background) {
      const img = new Image();
      img.src = getAssetPath('background', slide.background, get(assetPaths));
    }
    // Pre-load sound effects if any
    if (slide.soundEffect) {
      const audio = new Audio();
      audio.src = getAssetPath('sound', slide.soundEffect, get(assetPaths));
    }
  });
}

// Fetch the slides from the current chapter's JSON file and preload images
/**
 * Loads a chapter by fetching its JSON file and updating relevant stores.
 */
export async function loadChapter(chapterIndex) {
  try {
    console.log(`Loading Chapter ${chapterIndex}`);
    const response = await fetch(`/chapter${chapterIndex}.json`);
    if (response.ok) {
      const chapterData = await response.json();
      
      // Update slides
      slides.set(chapterData.slides || []);
      
      // Preload images and sounds
      preloadImages(chapterData.slides || []);
      
      // Update background music if specified
      if (chapterData.music) {
        backgroundMusic.set(chapterData.music); // Only the filename
        backgroundVolume.set(chapterData.volume !== undefined ? chapterData.volume : 0.5);
      } else {
        backgroundMusic.set(''); // No music
      }
      
      // Reset current stage and history
      currentStage.set(0);
      console.log(`currentStage reset to 0 for Chapter ${chapterIndex}`);
      
      history.set([]);
      
      // Optionally, update background image if needed
      if (chapterData.backgroundImage) {
        backgroundImage.set(getAssetPath('background', chapterData.backgroundImage, get(assetPaths)));
      }
      
    } else {
      console.error(`Failed to load chapter${chapterIndex}.json`);
    }
  } catch (error) {
    console.error(`Error loading chapter${chapterIndex}.json:`, error);
  }
}

// Function to update the current slide and save history
export function updateSlide(nextId = null) {
  if (nextId !== null) {
    // Navigate directly to the specified nextId
    currentStage.set(nextId);
    // Update background
    const slidesArray = get(slides);
    if (slidesArray[nextId] && slidesArray[nextId].background) {
      backgroundImage.set(getAssetPath('background', slidesArray[nextId].background, get(assetPaths)));
    } else {
      backgroundImage.set(''); // Or set to a default background
    }
  } else {
    // Advance to the next slide sequentially
    slides.update(($slides) => {
      const newStage = get(currentStage) + 1;
      if (newStage < $slides.length) {
        // Save current stage to history
        history.update(($history) => {
          $history.push(get(currentStage));
          return $history;
        });

        // Update background for the new slide
        if ($slides[newStage].background) {
          backgroundImage.set(getAssetPath('background', $slides[newStage].background, get(assetPaths)));
        } else {
          backgroundImage.set(''); // Or set to a default background
        }

        // Update current stage
        currentStage.set(newStage);
      } else {
        console.warn('Reached the end of slides.');
        // Optional: Handle end of slides, e.g., show an end screen or loop back
      }
      return $slides;
    });
  }
}

// Function to go back to the previous slide
export function goBack() {
  history.update(($history) => {
    if ($history.length > 0) {
      const previousStage = $history.pop();
      currentStage.set(previousStage); // Go back to the previous slide in history
      
      // Update background
      const slidesArray = get(slides);
      if (slidesArray[previousStage] && slidesArray[previousStage].background) {
        backgroundImage.set(getAssetPath('background', slidesArray[previousStage].background, get(assetPaths)));
      } else {
        backgroundImage.set(''); // Or set to a default background
      }
    }
    return $history;
  });
}

// Function to load the next chapter
export function loadNextChapter() {
  currentChapter.update(($chapter) => {
    const newChapter = $chapter + 1;
    console.log(`Transitioning to Chapter ${newChapter}`);
    loadChapter(newChapter);
    return newChapter;
  });
}
