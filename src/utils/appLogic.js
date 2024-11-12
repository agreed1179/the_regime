// src/utils/appLogic.js
import { slides, currentStage, history, currentChapter, backgroundImage, backgroundMusic, backgroundVolume, assetPaths } from '../stores';
import { get } from 'svelte/store';
import { getAssetPath } from './assetHelper.js'; // Ensure this import exists

// Function to pre-load images and sound effects
export function preloadImages(slideData) {
  slideData.forEach((slide) => {
    // pre-load backgrounds
    if (slide.background) {
      const img = new Image();
      img.src = getAssetPath('background', slide.background, get(assetPaths));
    }
    // pre-load display artefacts    
    if (slide.characters.imageSrc) {
      const img = new Image();
      img.src = getAssetPath('character', slide.characters.imageSrc, get(assetPaths));
    }
    // pre-load character images
    if (slide.characterImage) {
      const img = new Image();
      img.src = getAssetPath('character', slide.characterImage, get(assetPaths));
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
    const response = await fetch(`chapter${chapterIndex}.json`);
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
  const slidesArray = get(slides);
  const currentSlideIndex = get(currentStage);
  const currentSlide = slidesArray[currentSlideIndex];

  // Determine if the current slide should not be saved to history
  let shouldSaveToHistory = true;

  // Check if the current slide is of type 'quotequiz' or has 'noHistory' set to true
  if (currentSlide.type === 'quotequiz' || currentSlide.type === 'agreedisagree' || currentSlide.noHistory === true) {
    shouldSaveToHistory = false;
  }

  // Save current stage to history if shouldSaveToHistory is true
  if (shouldSaveToHistory) {
    history.update(($history) => {
      $history.push(currentSlideIndex);
      return $history;
    });
  }

  // Determine the new stage
  let newStage = nextId !== null ? nextId : currentSlideIndex + 1;

  if (newStage < slidesArray.length) {
    // Update current stage
    currentStage.set(newStage);

    // Update background for the new slide
    const newSlide = slidesArray[newStage];
    if (newSlide && newSlide.background) {
      backgroundImage.set(getAssetPath('background', newSlide.background, get(assetPaths)));
    } else {
      backgroundImage.set(''); // Or set to a default background
    }
  } else {
    console.warn('Reached the end of slides.');
    // Optional: Handle end of slides, e.g., show an end screen or loop back
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
    } else {
      console.warn('No more history to go back to.');
      // Optionally, handle if there's no history left
    }
    return $history;
  });
}
