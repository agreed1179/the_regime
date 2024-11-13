<!-- src/slides/InfoSlide.svelte -->
<script>
  import { assetPaths, playSound } from '../stores.js';
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import { marked } from 'marked';
  import { getAssetPath } from '../utils/assetHelper.js';
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  import { fade } from 'svelte/transition';

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

  let sanitizedBlocks = []; // Array to hold sanitized HTML blocks

  /**
   * Parses the markdown text into individual blocks,
   * sanitizes each block, and stores them in sanitizedBlocks.
   */
  function parseMarkdownBlocks(markdownText) {
      if (!markdownText) {
          sanitizedBlocks = [];
          return;
      }

      // Split the markdown by double newlines to separate blocks
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

  // Function to handle click events
  function handleClick(event) {
      updateSlide();
  }

  // Play sound effect on mount at full volume
  onMount(() => {
      playSound(soundEffectPath, isMuted); // Full volume on mount
  });

  // Parse and sanitize markdown blocks whenever 'text' changes
  $: parseMarkdownBlocks(text);
</script>

<style>
  /* Container for the info slide */
  .info-slide {
      position: relative;
      width: 100%;
      height: 100%;
      padding: 40px;
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
      background: rgba(0, 0, 0, 0);   /* disabled for full transparency */
  }

  /* Info Box Styling */
  .info-box {
      position: relative;
      background: rgba(255, 255, 255, 0.85);
      padding: 30px 40px;
      border-radius: 15px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
      max-width: 800px;
      width: 100%;
      z-index: 2;
      transform-origin: top center;
  }

  /* Info Content Styling */
  .info-content {
      font-size: 1.1em;
      color: #333;
      line-height: 1.6;
      overflow-y: auto;
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

  /* Animate each block */
  .info-block {
      margin-bottom: 20px;
      opacity: 0; /* Initial state */
      transform: translateY(20px); /* Initial position */
      animation: fadeIn 0.5s forwards ease-out; /* Animation properties */
  }

  /* Apply animation delay dynamically */
  .info-block:nth-child(1) {
      animation-delay: 0ms;
  }

  .info-block:nth-child(2) {
      animation-delay: 300ms;
  }

  .info-block:nth-child(3) {
      animation-delay: 600ms;
  }

  .info-block:nth-child(4) {
      animation-delay: 900ms;
  }

  /* Add more nth-child selectors as needed for additional blocks */

  /* Define the fade-in animation */
  @keyframes fadeIn {
      to {
          opacity: 1;
          transform: translateY(0);
      }
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

  /* Additional Styling for Content */
  .info-content a {
      color: #007bff;
      text-decoration: none;
  }

  .info-content a:hover {
      text-decoration: underline;
  }

  .info-content img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
      margin-bottom: 15px;
  }

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

  .info-content blockquote {
      border-left: 4px solid #ccc;
      padding-left: 16px;
      color: #666;
      margin: 20px 0;
      font-style: italic;
  }

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
</style>

<!-- Updated Markup with CSS-Based Gradual Reveal -->
<div class="info-slide" style="background-image: url('{backgroundPath}');">
  <!-- Info Box with Combined Transition -->
  <div class="info-box">
      <!-- Animate each block individually -->
      <div class="info-content">
          {#each sanitizedBlocks as block, index (index)}
              <div
                  class="info-block"
                  style="animation-delay: {index * 300}ms;"
              >
                  {@html block}
              </div>
          {/each}
      </div>
  </div>
  
  <!-- Click-to-Advance Overlay -->
  <ClickToAdvanceOverlay onAdvance={handleClick} />
</div>
