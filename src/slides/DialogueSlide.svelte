<!-- src/slides/DialogueSlide.svelte -->
<script>
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';
  import { getAssetPath } from '../utils/assetHelper.js';
  import TransitionWrapper from '../components/TransitionWrapper.svelte';
  import { fade } from 'svelte/transition';
  import { playSound } from '../stores.js'; // Import from stores.js
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  
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
  
  let sanitizedHTML = '';
  
  // Parse and sanitize HTML
  $: sanitizedHTML = DOMPurify.sanitize(marked.parse(dialogueText), {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
      'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
  });
  
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
    width: 40%; /* 20% of the parent's width */
    height: auto; /* Maintains aspect ratio */
  }

  .medium {
    width: 25%; /* 15% of the parent's width */
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
    height: 33vh; /* Occupies one-third of the viewport height */
    background: rgba(0, 0, 0, 0.7); /* Semi-transparent dark background */
    color: #fff;
    padding: 20px;
    box-sizing: border-box;
    cursor: pointer;
    border-top-left-radius: 15px;
    border-top-right-radius: 15px;
    animation: fadeIn 0.5s ease-in-out;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2; /* Ensure it's above characters */
  }

  .dialogue-text {
    font-size: 1.2em;
    line-height: 1.4;
    white-space: pre-wrap;
    overflow-y: auto;
    max-height: 100%;
  }

  /* Fade In Animation for Dialogue Box */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Scrollbar Styling for Dialogue Text */
  .dialogue-text::-webkit-scrollbar {
    width: 6px;
  }

  .dialogue-text::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .dialogue-text::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
</style>

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
    <div class="dialogue-text">{@html sanitizedHTML}</div>
  </div>
  
  <!-- Click-to-Advance Overlay -->
  <ClickToAdvanceOverlay onAdvance={handleDialogueAdvance} />
</div>
