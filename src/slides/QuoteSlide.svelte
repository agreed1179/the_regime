<!-- src/slides/QuoteSlide.svelte -->
<script>
  import { fade } from 'svelte/transition';
  import { onMount, onDestroy } from 'svelte';
  import { getAssetPath } from '../utils/assetHelper.js';
  import { assetPaths, playSound } from '../stores.js'; // Import the assetPaths store
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte'; // Import the overlay component

  export let characterImage = ''; // Path to character image
  export let text = '';           // The quote to display (Markdown supported)
  export let reflectionText = ''; // Self-reflection text
  export let quoteWho = '';      // The person who made the quote
  export let background = '';    // Background image path
  export let soundEffect = '';   // (Optional) Sound effect path
  export let isMuted = false;    // Mute state
  export let updateSlide;        // Function to advance the slide

  // Reactive variables to compute asset paths
  $: characterImagePath = getAssetPath('character', characterImage, $assetPaths);
  $: backgroundPath = getAssetPath('background', background, $assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);

  // Parsed and sanitized HTML from Markdown
  $: sanitizedText = text
    ? DOMPurify.sanitize(marked.parse(text))
    : '';

  // Parsed and sanitized HTML for reflectionText
  $: sanitizedReflectionText = reflectionText
    ? DOMPurify.sanitize(marked.parse(reflectionText))
    : '';

  let showReflection = false; // Local state to manage reflection box visibility

  function handleClick(event) {
    if (!showReflection) {
      if (reflectionText == ""){
        updateSlide(); // Advance to next slide if reflection text is empty
      }
      // First click: Show reflection
      showReflection = true;

    } else {
      // Second click: Advance to next slide
      updateSlide();
    }
  }
  
  onMount(() => {
    playSound(soundEffectPath, isMuted);
  });

  onDestroy(() => {
    // If you have any cleanup related to audio or other resources, handle it here
  });
</script>

<style>
.quote-slide {
  position: relative; /* Ensure overlay is positioned correctly */
  display: flex;
  flex-direction: column; /* Changed from row to column for vertical stacking */
  align-items: center;
  justify-content: center; 
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  transition: background-image 0.5s ease-in-out;
  overflow: hidden; /* Prevent content overflow */
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
  transition: transform 0.5s ease; /* Smooth transition when pushed */
}

/* When reflection box is shown, push quote-content up */
.quote-slide.show-reflection .quote-content {
  transform: translateY(-10%);
}

.character-image {
  flex: 0 0 320px;
  height: 480px;
  padding-right: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden; /* Hide any overflow */
}

.character-image img {
  object-fit: contain; /* Resize image without distortion */
  border-radius: 10px;
  border: 2px solid #000; /* Black border */
  display: block; /* Remove inline spacing */
  margin: auto; /* Center the image within the container */
}

.quote-container {
  max-width: 500px; /* Reduced max-width from 600px to 500px */
  background: rgba(0, 0, 0, 0.6); /* Semi-transparent black background */
  padding: 20px;
  border-radius: 10px;
  color: #fff; /* White text */
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  line-height: 1.5; /* Increased line spacing */
  transition: transform 0.5s ease; /* Smooth transition when pushed */
}

.quote-text {
  font-size: 1.3em; /* Increased font size */
  font-weight: 300;
}

.quote-who {
  margin-top: 15px;
  text-align: right;
  font-size: 1.2em; /* Increased font size */
  font-weight: bold;
  color: #fff; /* White color for author's name */
  /* If you want the author's name to have a different color, adjust here */
}

/* Reflection Box Styling */
.reflection-box {
  width: 100%; /* Stretch across the available width */
  height: 25vh; /* Take up 1/3rd of the vertical space */
  background: rgba(0, 0, 0, 0.8); /* Semi-transparent black */
  color: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  z-index: 100; /* Ensure it appears above other elements */
  animation: fadeInUp 0.5s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 1.2em; /* Increased font size for reflection text */
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
    width: 338px;  /* 320px * 1.056 = approx 338px for slight increase */
    height: 507px; /* 480px * 1.056 = approx 507px */
  }

  .quote-container {
    max-width: 90%;
  }

  .quote-who {
    text-align: center;
    font-size: 1.2em; /* Consistent font size on mobile */
  }

  .reflection-box {
    height: 30vh; /* Slightly adjusted for mobile */
    font-size: 1em; /* Adjusted font size for smaller screens */
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
    <img src="{characterImagePath}" alt="Image of {quoteWho}" />
  </div>
  <div class="quote-container">
    <div class="quote-text">
      {@html sanitizedText}
    </div>
    <div class="quote-who">- {quoteWho}</div>
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
