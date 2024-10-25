<!-- src/slides/DreamSlide.svelte -->
<script>
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { getAssetPath } from '../utils/assetHelper.js';
    import { assetPaths, playSound } from '../stores.js';
    import DOMPurify from 'dompurify';
    import { marked } from 'marked';
    import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  
    // Component Props
    export let text = '';          // Markdown content from JSON
    export let soundEffect = '';   // Filename only
    export let updateSlide;        // Function to advance the slide
    export let isMuted = false;    // Mute state
    export let fadeInTime = 0;   // Fade-in time in ms
    export let fadeOutTime = 0; // Fade-out time in ms
  
    // Compute full paths using the utility function
    $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
  
    // Parsed and sanitized HTML from Markdown
    $: sanitizedText = text
      ? DOMPurify.sanitize(marked.parse(text))
      : '';
  
    // Function to handle click events
    function handleClick(event) {
      updateSlide();
    }
  
    // Play sound effect on mount if provided
    onMount(() => {
      if (soundEffectPath) {
        playSound(soundEffectPath, isMuted, 0.5); // Volume set to 50%
      }
    });
</script>

<style>
  /* Container for the dream slide */
  .dream-slide {
    position: relative; /* Ensure overlay is positioned correctly */
    width: 100%;
    height: 100%;
    background-color: #ffffff; /* Pure white background */
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* Text Container Styling */
  .dream-text {
    max-width: 800px;
    color: #000000; /* Black text */
    font-size: 1.5em;
    text-align: center;
    line-height: 1.6;
    font-family: 'Arial', sans-serif;
  }

  /* Optional: Add more styling as needed */
</style>

<div 
  class="dream-slide" 
  in:fade={{ duration: fadeInTime }} 
  out:fade={{ duration: fadeOutTime }}
>
  <div class="dream-text">
    {@html sanitizedText}
  </div>

  <!-- Click-to-Advance Overlay -->
  <ClickToAdvanceOverlay onAdvance={handleClick} />
</div>
