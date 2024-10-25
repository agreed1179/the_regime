<!-- src/slides/DialogueSlide.svelte -->
<script>
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';
  import { getAssetPath } from '../utils/assetHelper.js';
  import TransitionWrapper from '../components/TransitionWrapper.svelte';
  import { playSound } from '../stores.js'; // Import from stores.js
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  import { fade } from 'svelte/transition';

  // Component Props
  export let characters = []; // Array of character objects
  export let dialogueText = '';
  export let background = '';
  export let soundEffect = '';
  export let isMuted = false;
  export let updateSlide = () => {};
  export let assetPaths = {}; // Passed as a plain object

  // Compute full paths using the utility function
  $: backgroundPath = getAssetPath('background', background, assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, assetPaths);

  let sanitizedBlocks = []; // Array to hold sanitized HTML blocks

  /**
   * Parses the dialogueText into individual blocks,
   * sanitizes each block, and stores them in sanitizedBlocks.
   */
  function parseDialogueBlocks(markdownText) {
    if (!markdownText) {
      sanitizedBlocks = [];
      return;
    }

    // Split the markdown by double newlines to separate blocks (paragraphs)
    const rawBlocks = markdownText.split('\n\n');
    sanitizedBlocks = rawBlocks.map(block => {
      // Convert markdown to HTML
      const html = marked.parse(block);
      // Sanitize the HTML
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
          'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
      });
    });
  }

  // Function to handle dialogue advance
  function handleDialogueAdvance(event) {
    console.log('DialogueSlide handleDialogueAdvance triggered');
    updateSlide();
    // Removed playSound() from here to prevent double playback
  }

  // Play sound effect on mount at full volume
  onMount(() => {
    playSound(soundEffectPath, isMuted); // Full volume on mount
  });

  // Parse and sanitize dialogue blocks whenever 'dialogueText' changes
  $: parseDialogueBlocks(dialogueText);
</script>

<style>
  /* Container for the dialogue slide */
  .dialogue-slide {
    position: relative; /* Establishes a positioning context */
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column;
    justify-content: flex-end; /* Aligns children to the bottom */
    align-items: center; /* Centers children horizontally */
  }

  /* Portraits Container with Absolute Positioning */
  .portraits-container {
    position: absolute; /* Allows child elements to be positioned absolutely within this container */
    top: 0%; /* Adjust as needed to position portraits near the top */
    left: 50%;
    transform: translateX(-50%); /* Centers the container horizontally */
    width: 100%; /* Full width of the parent */
    height: 80%; /* Occupies 80% of the parent's height */
    pointer-events: none; /* Allows clicks to pass through to underlying elements if needed */
  }

  /* Character Image Wrapper */
  .character-image {
    position: absolute; /* Positions images absolutely within portraits-container */
    transition: transform 0.3s ease, box-shadow 0.3s ease; /* Smooth transitions for hover effects */
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer; /* Indicates interactivity */
  }

  /* Image Sizes with Relative Dimensions */
  .large {
    width: 40%; /* 40% of the parent's width */
    height: auto; /* Maintains aspect ratio */
  }

  .medium {
    width: 25%; /* 25% of the parent's width */
    height: auto;
  }

  .small {
    width: 10%; /* 10% of the parent's width */
    height: auto;
  }

  /* Ensure images scale proportionally without distortion */
  .large img,
  .medium img,
  .small img {
    width: 100%; /* Fills the container's width */
    height: 100%; /* Fills the container's height */
    object-fit: contain; /* Maintains aspect ratio */
  }

  /* Positioning Classes */

  /* Upper Positions */
  .upper-left {
    top: 5%;
    left: 5%;
  }

  .upper-middle {
    top: 5%;
    left: 50%;
    transform: translateX(-50%);
  }

  .upper-right {
    top: 5%;
    right: 5%;
  }

  /* Middle Positions */
  .middle-left {
    top: 25%;
    left: 5%;
  }

  .middle-middle {
    top: 25%;
    left: 50%;
    transform: translateX(-50%);
  }

  .middle-right {
    top: 25%;
    right: 5%;
  }

  /* Lower Positions */
  .lower-left {
    top: 50%;
    left: 10%;
  }

  .lower-middle {
    top: 50%;
    left: 50%;
    transform: translateX(-50%);
  }

  .lower-right {
    top: 50%;
    right: 90%;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .large {
      width: 18%; /* Adjusted percentage for smaller screens */
    }

    .medium {
      width: 13%;
    }

    .small {
      width: 9%;
    }

    /* Adjust positions if necessary */
    .upper-left,
    .upper-right,
    .lower-left,
    .lower-right {
      top: 5%;
      bottom: 5%;
    }

    .upper-middle,
    .middle-middle,
    .lower-middle {
      transform: translateX(-50%);
    }
  }

  @media (max-width: 768px) {
    .large {
      width: 16%;
    }

    .medium {
      width: 11%;
    }

    .small {
      width: 8%;
    }
  }

  @media (max-width: 480px) {
    .large {
      width: 20%;
    }

    .medium {
      width: 12%;
    }

    .small {
      width: 7%;
    }

    /* Stack images vertically if necessary */
    .portraits-container {
      top: 5%;
      height: 90%;
    }

    .upper-left,
    .upper-middle,
    .upper-right,
    .middle-left,
    .middle-middle,
    .middle-right,
    .lower-left,
    .lower-middle,
    .lower-right {
      position: relative;
      transform: none;
      top: auto;
      bottom: auto;
      left: auto;
      right: auto;
      margin-bottom: 10px;
    }
  }

  /* Dialogue Box Styling */
  .dialogue-box {
    position: relative; /* Relative to dialogue-slide */
    width: 100%; /* Span the entire width */
    height: 25vh; /* Occupies one-third of the viewport height */
    background: rgba(0, 0, 0, 0.7); /* Semi-transparent dark background */
    color: #fff;
    padding: 20px;
    box-sizing: border-box;
    cursor: pointer;
    border-top-left-radius: 15px;
    border-top-right-radius: 15px;
    animation: fadeInUp 0.5s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2; /* Ensure it's above characters */
  }

  .dialogue-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start; /* Align text to the left */
    height: 100%;
    width: 100%;
    padding: 10px; /* Optional padding */
    box-sizing: border-box;
    overflow: hidden;
  }

  /* Dialogue Block Styling */
  .dialogue-block {
    opacity: 0; /* Initial state */
    transform: translateY(20px); /* Initial position */
    animation: fadeInUp 0.5s forwards ease-out; /* Animation properties */
    margin-bottom: 10px; /* Space between blocks */
    width: 100%;
  }

  /* Fade-In Up Animation */
  @keyframes fadeInUp {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Reference Styling */
  .reference {
    margin-top: 20px;
    font-size: 0.9em;
    color: #666;
    font-style: italic;
  }

  .source-label {
    font-weight: bold;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .dialogue-box {
      padding: 20px;
    }
  }

  @media (max-width: 768px) {
    .dialogue-box {
      padding: 15px;
    }
  }

  @media (max-width: 480px) {
    .dialogue-box {
      padding: 10px;
    }
  }

  /* Additional Styling for Content */
  .dialogue-content a {
    color: #007bff;
    text-decoration: none;
  }

  .dialogue-content a:hover {
    text-decoration: underline;
  }

  .dialogue-content img {
    max-width: 100%;
    height: auto;
    border-radius: 5px;
    margin-bottom: 15px;
  }

  .dialogue-content table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }

  .dialogue-content th,
  .dialogue-content td {
    border: 1px solid #ddd;
    padding: 8px;
  }

  .dialogue-content th {
    background-color: #f2f2f2;
    text-align: left;
  }

  .dialogue-content blockquote {
    border-left: 4px solid #ccc;
    padding-left: 16px;
    color: #666;
    margin: 20px 0;
    font-style: italic;
  }

  .dialogue-content pre {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }

  .dialogue-content code {
    background-color: #f5f5f5;
    padding: 2px 4px;
    border-radius: 4px;
  }
</style>

<!-- DialogueSlide Markup with Block-by-Block Fade-In -->
<div class="dialogue-slide" style="background-image: url('{backgroundPath}');">
  
  <!-- Portraits Container -->
  <div class="portraits-container">
    {#each characters as character, index}
      {#if character}
        <div 
          class="character-image {character.position} {character.imageType}"
        >
          <TransitionWrapper
            character={character}
            transition={character.transition}
            assetPaths={assetPaths}
            imgborder={character.imgborder} 
          />
        </div>
      {/if}
    {/each}
  </div>
  
  <!-- Dialogue Box -->
  <div
    class="dialogue-box"
    in:fade={{ duration: 500 }}
    out:fade={{ duration: 500 }}
  >
    <div class="dialogue-content">
      {#each sanitizedBlocks as block, index (index)}
        <div
          class="dialogue-block"
          style="animation-delay: {index * 300}ms;"
        >
          {@html block}
        </div>
      {/each}
    </div>
  </div>
  
  <!-- Click-to-Advance Overlay -->
  <ClickToAdvanceOverlay onAdvance={handleDialogueAdvance} />
</div>
