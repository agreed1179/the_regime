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

        // Collect background music from chapter data
        if (chapterData.music) {
          assets.add(getAssetPath('music', chapterData.music, paths));
        }

        slides.forEach((slide) => {
          // Collect background images
          if (slide.background) {
            assets.add(getAssetPath('background', slide.background, paths));
          }

          // Collect sound effects
          if (slide.soundEffect) {
            assets.add(getAssetPath('sound', slide.soundEffect, paths));
          }

          // Handle different slide types
          switch (slide.type) {
            case 'dialogue':
              // Collect character images
              if (slide.characters && Array.isArray(slide.characters)) {
                slide.characters.forEach((character) => {
                  if (character.imageSrc) {
                    assets.add(getAssetPath('character', character.imageSrc, paths));
                  }
                  if (character.image) {
                    assets.add(getAssetPath('character', character.image, paths));
                  }
                });
              }
              break;

            case 'choices':
              // Collect images in choices
              if (slide.choices) {
                slide.choices.forEach((choice) => {
                  if (choice.characterImage) {
                    assets.add(getAssetPath('character', choice.characterImage, paths));
                  }
                  if (choice.image) {
                    assets.add(getAssetPath('character', choice.image, paths));
                  }
                });
              }
              break;

            case 'quote':
            case 'quotemulti':
            case 'quotequiz':
              // Collect characterImage
              if (slide.characterImage) {
                assets.add(getAssetPath('character', slide.characterImage, paths));
              }
              break;

            case 'agreedisagree':
              // Collect characterImage
              if (slide.characterImage) {
                assets.add(getAssetPath('character', slide.characterImage, paths));
              }
              break;

            case 'chat':
              // Collect 'pic' image
              if (slide.pic) {
                assets.add(getAssetPath('character', slide.pic, paths));
              }
              // Collect images in chat messages
              if (slide.chats && Array.isArray(slide.chats)) {
                slide.chats.forEach((chat) => {
                  if (chat['who-img']) {
                    assets.add(getAssetPath('character', chat['who-img'], paths));
                  }
                  if (chat['chat-image']) {
                    assets.add(getAssetPath('character', chat['chat-image'], paths));
                  }
                });
              }
              break;

            case 'dream':
              // If there are any assets specific to 'dream' slides, handle them here
              break;

            case 'info':
              // Handle any specific assets in 'info' slides if necessary
              break;

            // Add cases for other slide types if needed
            default:
              // Handle any other slide types and their assets
              break;
          }

          // Collect any other assets as needed
          // For example, if there are images in references or texts
        });
      } else {
        console.error(`chapter${i}.json not found.`);
      }
    } catch (error) {
      console.error(`Error fetching chapter${i}.json:`, error);
    }
  }

  return Array.from(assets);
}
