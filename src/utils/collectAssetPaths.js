// src/utils/collectAssetPaths.js
import { assetPaths } from '../stores';
import { get } from 'svelte/store';
import { getAssetPath } from './assetHelper';

export async function collectAssetPaths(totalChapters) {
  const assets = new Set();
  
  // Retrieve the current value of assetPaths from the store
  const paths = get(assetPaths);

  for (let i = 0; i < totalChapters; i++) {
    try {
      const response = await fetch(`chapter${i}.json`);
      if (response.ok) {
        const chapterData = await response.json();
        const slides = chapterData.slides || [];

        slides.forEach((slide) => {
          // Collect background images
          if (slide.background) {
            assets.add(getAssetPath('background', slide.background, paths));
          }

          // Collect character images
          if (slide.characters) {
            slide.characters.forEach((character) => {
              if (character.image) {
                assets.add(getAssetPath('character', character.image, paths));
              }
            });
          }

          // Collect images in choices
          if (slide.choices) {
            slide.choices.forEach((choice) => {
              if (choice.characterImage) {
                assets.add(getAssetPath('character', choice.characterImage, paths));
              }
            });
          }

          // Collect sound effects
          if (slide.soundEffect) {
            assets.add(getAssetPath('sound', slide.soundEffect, paths));
          }

          // Collect other assets as needed
          // For example, additional images, etc.
        });

        // Collect background music from chapter data
        if (chapterData.music) {
          assets.add(getAssetPath('music', chapterData.music, paths));
        }
      } else {
        console.error(`chapter${i}.json not found.`);
      }
    } catch (error) {
      console.error(`Error fetching chapter${i}.json:`, error);
    }
  }

  return Array.from(assets);
}
