<!-- src/slides/InfoSlide.svelte -->
<script>
  import { assetPaths, playSound, soundEffectVolume } from '../stores.js'; // Import from stores.js
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';
  import { getAssetPath} from '../utils/assetHelper.js'; // Ensure getTransition is correctly imported
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  import { fadeScale, getTransition } from '../utils/transitions.js'; // Import the combined fadeScale transition
  
  // Component Props
  export let text = ''; // Markdown content from JSON
  export let reference = ''; // Source reference
  export let updateSlide; // Function to advance the slide
  export let soundEffect = ''; // Filename only
  export let background = ''; // Filename only
  export let isMuted = false; // Mute state
  
  // Compute full paths using the utility function
  $: backgroundPath = getAssetPath('background', background, $assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
  
  let sanitizedHTML = '';
  
  // Parse Markdown to HTML and sanitize it whenever 'text' changes
  $: sanitizedHTML = DOMPurify.sanitize(marked.parse(text), {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
      'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
  });
  
  // Function to handle click events
  function handleClick(event) {
    console.log('InfoSlide handleClick triggered');
    updateSlide();
    // Removed playSound() from here to prevent double playback
  }
  
  // Play sound effect on mount at full volume
  onMount(() => {
    playSound(soundEffectPath, isMuted); // Full volume on mount
  });
</script>

<style>
  /* Container for the info slide */
  .info-slide {
    position: relative; /* Establishes positioning context for overlay */
    width: 100%;
    height: 100%;
    padding: 40px; /* Maintains padding around the info box */
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    background-size: cover;
    background-position: center;
    overflow: hidden;
  }

  /* Optional: Dark overlay to enhance text readability */
  .info-slide::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4); /* Semi-transparent black */
    z-index: 1;
  }

  /* Info Box Styling */
  .info-box {
    position: relative; /* To ensure it sits above the dark overlay */
    background: rgba(255, 255, 255, 0.85); /* Semi-transparent white */
    padding: 30px 40px;
    border-radius: 15px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    max-width: 800px;
    width: 100%;
    z-index: 2; /* Above the dark overlay */
    transform-origin: top center; /* For scale transition */
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .info-box {
      padding: 25px 30px;
    }
  }

  @media (max-width: 768px) {
    .info-box {
      padding: 20px 25px;
    }
  }

  @media (max-width: 480px) {
    .info-box {
      padding: 15px 20px;
    }
  }

  /* Typography */
  .info-content {
    font-size: 1.1em;
    color: #333;
    line-height: 1.6;
    overflow-y: auto; /* Handles long content */
  }

  /* Reference Styling */
  .reference {
    margin-top: 20px;
    font-size: 0.9em;
    color: #666;
    font-style: italic;
  }

  /* Optional: Style links within the info content */
  .info-content a {
    color: #007bff;
    text-decoration: none;
  }

  .info-content a:hover {
    text-decoration: underline;
  }

  /* Style images within the info content */
  .info-content img {
    max-width: 100%;
    height: auto;
    border-radius: 5px;
    margin-bottom: 15px;
  }

  /* Style tables */
  .info-content table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }

  .info-content th,
  .info-content td {
    border: 1px solid #ddd;
    padding: 8px;
  }

  .info-content th {
    background-color: #f2f2f2;
    text-align: left;
  }

  /* Style blockquotes */
  .info-content blockquote {
    border-left: 4px solid #ccc;
    padding-left: 16px;
    color: #666;
    margin: 20px 0;
    font-style: italic;
  }

  /* Style code blocks */
  .info-content pre {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
  }

  .info-content code {
    background-color: #f5f5f5;
    padding: 2px 4px;
    border-radius: 4px;
  }

  /* Animation Keyframes */
  @keyframes fillUp {
    from {
      transform: scaleY(0);
      opacity: 0;
    }
    to {
      transform: scaleY(1);
      opacity: 1;
    }
  }
</style>

<!-- Updated Markup with Combined Transition -->
<div class="info-slide" style="background-image: url('{backgroundPath}');">
  <!-- Info Box with Combined Transition -->
  <div
    class="info-box"
    in:fadeScale={{ duration: 700 }} 
  >
    <div class="info-content">
      {@html sanitizedHTML}
    </div>
    
  </div>
  
  <!-- Click-to-Advance Overlay -->
  <ClickToAdvanceOverlay onAdvance={handleClick} />
</div>
