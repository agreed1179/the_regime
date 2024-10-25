<!-- src/slides/QuoteSlide.svelte -->
<script>
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { getAssetPath } from '../utils/assetHelper.js';
  import { assetPaths, playSound } from '../stores.js';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';

  export let characterImage = ''; // Path to character image
  export let text = '';           // The quote to display (Markdown supported)
  export let reflectionText = ''; // Self-reflection text
  export let quoteWho = '';       // The person who made the quote
  export let background = '';     // Background image path
  export let soundEffect = '';    // (Optional) Sound effect path
  export let isMuted = false;     // Mute state
  export let updateSlide;         // Function to advance the slide
  export let guess = false;       // Prop to control the guess functionality

  // Reactive variables to compute asset paths
  $: characterImagePath = getAssetPath('character', characterImage, $assetPaths);
  $: backgroundPath = getAssetPath('background', background, $assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);

  // Initialize `hasRevealed` based on `guess`
  let hasRevealed = !guess;

  // Compute the displayed character image path
  $: displayedCharacterImagePath = (guess && !hasRevealed)
    ? getAssetPath('character', 'unknown_character.png', $assetPaths)
    : characterImagePath;

  // Parsed and sanitized HTML from Markdown
  $: sanitizedText = text
    ? DOMPurify.sanitize(marked.parse(text))
    : '';

  // Parsed and sanitized HTML for reflectionText
  $: sanitizedReflectionText = reflectionText
    ? DOMPurify.sanitize(marked.parse(reflectionText))
    : '';

  let showReflection = false; // State to manage reflection box visibility

  let overlayClass = ''; // Class to control overlay transitions

  function handleClick(event) {
    if (guess && !hasRevealed) {
      // Start Phase 1: Fade-in the overlays
      overlayClass = 'fade-in';

      // After 0.5s (overlays are fully opaque), swap the image and show the name
      setTimeout(() => {
        hasRevealed = true; // Swap to the real character image and reveal the name
        overlayClass = 'fade-out'; // Start Phase 3: Fade-out the overlays
      }, 500); // 0.5s for fade-in

      // Remove overlayClass after fade-out completes
      setTimeout(() => {
        overlayClass = ''; // Clean up classes if needed
      }, 1500); // Total of 0.5s fade-in + 1s fade-out
    } else if (!showReflection) {
      if (reflectionText === "") {
        updateSlide(); // Advance to next slide if reflection text is empty
        return;
      }
      // Show the reflection text
      showReflection = true;
    } else {
      // Advance to the next slide
      updateSlide();
    }
  }

  onMount(() => {
    playSound(soundEffectPath, isMuted);
  });
</script>

<style>
  .quote-slide {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center; 
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    transition: background-image 0.5s ease-in-out;
    overflow: hidden;
  }

  .quote-slide.show-reflection {
    justify-content: flex-end;
  }

  .quote-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    transition: transform 0.5s ease;
  }

  /* Push quote-content up when reflection box is shown */
  .quote-slide.show-reflection .quote-content {
    transform: translateY(-10%);
  }

  .character-image {
    position: relative; /* Position relative for overlay */
    flex: 0 0 320px;
    height: 480px;
    padding-right: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .character-image img {
    object-fit: contain;
    border-radius: 10px;
    border: 2px solid #000;
    display: block;
    margin: auto;
  }

  /* White overlay for character image */
  .white-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: white;
    opacity: 0; /* Start fully transparent */
    pointer-events: none;
  }

  .white-overlay.fade-in {
    transition: opacity 0.5s linear; /* Fade to opaque over 0.5s */
    opacity: 1;
  }

  .white-overlay.fade-out {
    transition: opacity 1s linear; /* Fade back to transparent over 1s */
    opacity: 0;
  }

  .quote-container {
    max-width: 500px;
    background: rgba(0, 0, 0, 0.6);
    padding: 20px;
    border-radius: 10px;
    color: #fff;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    line-height: 1.5;
    transition: transform 0.5s ease;
    position: relative; /* Position relative for overlay */
  }

  .quote-text {
    font-size: 1.3em;
    font-weight: 300;
  }

  .quote-who-container {
    position: relative;
  }

  .quote-who {
    margin-top: 15px;
    text-align: right;
    font-size: 1.2em;
    font-weight: bold;
    color: #fff;
  }

  /* White overlay for quote-who */
  .quote-who-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1.5em; /* Adjust to match the height of .quote-who */
    background-color: white;
    opacity: 0; /* Start fully transparent */
    pointer-events: none;
  }

  .quote-who-overlay.fade-in {
    transition: opacity 0.5s linear; /* Fade to opaque over 0.5s */
    opacity: 1;
  }

  .quote-who-overlay.fade-out {
    transition: opacity 1s linear; /* Fade back to transparent over 1s */
    opacity: 0;
  }

  /* Reflection Box Styling */
  .reflection-box {
    width: 100%;
    height: 25vh;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    z-index: 100;
    animation: fadeInUp 0.5s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 1.2em;
    transition: opacity 0.5s ease, transform 0.5s ease;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 768px) {
    .quote-slide {
      flex-direction: column;
      padding: 10px;
    }

    .quote-content {
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .character-image {
      flex: 0 0 auto;
      padding-right: 0;
      padding-bottom: 20px;
      width: 338px;
      height: 507px;
    }

    .quote-container {
      max-width: 90%;
    }

    .quote-who {
      text-align: center;
      font-size: 1.2em;
    }

    .reflection-box {
      height: 30vh;
      font-size: 1em;
      padding: 15px;
    }
  }
</style>

<div 
  class="quote-slide {showReflection ? 'show-reflection' : ''}" 
  in:fade={{ duration: 500 }} 
  out:fade={{ duration: 500 }}
  style="background-image: url('{backgroundPath}'); background-size: cover; background-position: center;"
>
  <div class="quote-content">
    <div class="character-image">
      <img src="{displayedCharacterImagePath}" alt="Image of {quoteWho}" />
      {#if guess}
        <div class="white-overlay {overlayClass}"></div>
      {/if}
    </div>
    <div class="quote-container">
      <div class="quote-text">
        {@html sanitizedText}
      </div>
      <div class="quote-who-container">
        {#if hasRevealed || !guess}
          <div class="quote-who">
            - {quoteWho}
          </div>
        {/if}
        {#if guess}
          <div class="quote-who-overlay {overlayClass}"></div>
        {/if}
      </div>
    </div>
  </div>

  {#if showReflection}
    <!-- Reflection Box -->
    <div class="reflection-box">
      {@html sanitizedReflectionText}
    </div>
  {/if}

  <!-- Click-to-Advance Overlay -->
  <ClickToAdvanceOverlay onAdvance={handleClick} />
</div>
