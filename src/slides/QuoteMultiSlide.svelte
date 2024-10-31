<!-- src/slides/QuoteMultiSlide.svelte -->
<script>
    import { onMount } from 'svelte';
    import { getAssetPath } from '../utils/assetHelper.js';
    import { assetPaths, playSound, hideReference } from '../stores.js';
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';
    import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  
    export let characterImage = '';
    export let quoteWho = '';
    export let quotes = []; // Array of quote objects with "text"
    export let background = '';
    export let soundEffect = '';
    export let isMuted = false;
    export let updateSlide;
    export let guess = false;
    export let reflectionText = ''; // If you have reflection text
  
    // Configure marked to handle line breaks and GitHub Flavored Markdown
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  
    // Get paths to assets
    $: characterImagePath = getAssetPath('character', characterImage, $assetPaths);
    $: backgroundPath = getAssetPath('background', background, $assetPaths);
    $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
  
    let hasRevealed = !guess;
  
    // Displayed character image path
    $: displayedCharacterImagePath = (guess && !hasRevealed)
      ? getAssetPath('character', 'unknown_character.png', $assetPaths)
      : characterImagePath;
  
    // Sanitize quoteWho
    $: sanitizedQuoteWho = quoteWho
      ? DOMPurify.sanitize(marked.parseInline(quoteWho))
      : '';
  
    // Sanitize reflectionText
    $: sanitizedReflectionText = reflectionText
      ? DOMPurify.sanitize(marked.parse(reflectionText))
      : '';
  
    // Prepare sanitized quotes
    $: sanitizedQuotes = quotes.map(q => ({
      text: DOMPurify.sanitize(marked.parseInline(q.text))
    }));
  
    let overlayClass = '';
  
    let showReflection = false;

    let quotePositions = [];

    // Generate random positions for quotes
    $: if (sanitizedQuotes.length > 0) {
      quotePositions = generateRandomPositions();
    }
  
    function generateRandomPositions() {
      const positions = [];
      const usedPositions = [];
  
      sanitizedQuotes.forEach(() => {
        let attempts = 0;
        let top, left;
        while (attempts < 100) {
          top = Math.random() * 80 + 10;
          left = Math.random() * 80 + 10;
          attempts++;
  
          // Exclude central area
          if ((top >= 30 && top <= 65) && (left >= 30 && left <= 60)) {
            continue;
          }
  
          // Check for minimum distance
          const tooClose = usedPositions.some(pos => {
            const distance = Math.hypot(pos.left - left, pos.top - top);
            return distance < 15;
          });
  
          if (!tooClose) {
            break;
          }
        }
  
        usedPositions.push({ top, left });
        positions.push({ top, left });
      });
  
      return positions;
    }
  
    // Adjusted quote positions based on showReflection
    $: adjustedQuotePositions = quotePositions.map(pos => {
      let topValue = pos.top;
      if (showReflection && topValue >= 70) {
        let newTop = topValue - 30;
        if (newTop < 0) newTop = 0;
        return { ...pos, top: newTop };
      } else {
        return pos;
      }
    });
  
    // Initialize arrays
    $: animationCompleted = sanitizedQuotes.map(() => false);
  
    // Prepare class names for quotes
    $: quoteClassNames = sanitizedQuotes.map((_, index) => {
      return animationCompleted[index] ? 'quote-text' : 'quote-text animating';
    });
  
    // Prepare style strings for each quote
    $: quoteStyles = sanitizedQuotes.map((_, index) => {
      let pos = adjustedQuotePositions[index];
      let style = '';
  
      if (animationCompleted[index]) {
        // After animation, set top and left directly
        style = `
          top: ${pos.top}%;
          left: ${pos.left}%;
        `;
      } else {
        // During animation, set CSS variables for animation
        style = `
          --final-top: ${pos.top}%;
          --final-left: ${pos.left}%;
        `;
      }
  
      return style;
    });
  
    function handleAnimationEnd(index) {
      // Mark the animation as completed for this quote
      animationCompleted[index] = true;
  
      // Update the style to set the top and left properties
      // This allows the CSS transition to take effect when 'top' changes
      quoteStyles[index] += `
        top: ${adjustedQuotePositions[index].top}%;
        left: ${adjustedQuotePositions[index].left}%;
      `;
    }
  
    function handleClick(event) {
      if (guess && !hasRevealed) {
        hideReference.set(true);
  
        overlayClass = 'fade-in';
  
        setTimeout(() => {
          hasRevealed = true;
          overlayClass = 'fade-out';
          hideReference.set(false);
        }, 1000);
  
        setTimeout(() => {
          overlayClass = '';
        }, 2000);
  
        return;
      } else if (!showReflection) {
        if (reflectionText === '') {
          updateSlide();
          return;
        }
        showReflection = true;
      } else {
        updateSlide();
      }
    }
  
    onMount(() => {
      playSound(soundEffectPath, isMuted);
  
      if (guess) {
        hideReference.set(true);
        const img = new Image();
        img.src = characterImagePath;
      }
    });
  </script>
  
  
  <style>
    .quote-multi-slide {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-size: cover;
      background-position: center;
    }
  
    .character-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  
    .character-image {
      max-width: 300px;
      max-height: 420px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 10px;
      border: 2px solid #000;
    }
  
    .quote-who {
      margin-top: 10px;
      display: inline-block;
      font-size: 1em;
      font-style: italic;
      color: #fff;
      background: rgba(0, 0, 0, 0.7);
      padding: 5px 10px;
      border-radius: 5px;
    }
  
    .white-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: white;
      opacity: 0;
      pointer-events: none;
    }
  
    .white-overlay.fade-in {
      animation: fadeIn 1s linear forwards;
    }
  
    .white-overlay.fade-out {
      animation: fadeOut 1s linear forwards;
    }
  
    .quote-text {
      position: absolute;
      width: 220px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      border-radius: 5px;
      font-size: 1.1em;
      text-align: center;
      opacity: 1;
      transition: top 0.5s ease;
      transform: translate(-50%, -50%);
    }
  
    .quote-text.animating {
      opacity: 0;
      animation: flyOut 1s forwards;
    }
  
    /* Animation for quotes flying out from the center */
    @keyframes flyOut {
      from {
        top: 50%;
        left: 50%;
        opacity: 0;
      }
      to {
        top: var(--final-top);
        left: var(--final-left);
        opacity: 1;
      }
    }
  
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
  
    /* Reflection Box Styling */
    .reflection-box {
      position: absolute;
      bottom: 0;
      width: 100%;
      height: 25vh; /* Adjusted height */
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 20px;
      text-align: center;
      font-size: 1.2em;
      animation: fadeInUp 0.5s ease-out;
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
  
    /* Banner Styling */
    .banner {
      position: absolute;
      top: 10px;
      width: 100%;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 15px;
      font-size: 1.5em;
      text-align: center;
      z-index: 100;
      animation: fadeInDown 0.5s ease-out;
    }
  
    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  
    /* Responsive Styles */
    @media (max-width: 768px) {
      .character-image {
        max-width: 150px;
        max-height: 225px;
      }
  
      .quote-text {
        width: 180px;
        font-size: 1em;
      }
  
      .banner {
        font-size: 1.2em;
        padding: 10px;
      }
  
      .reflection-box {
        font-size: 1em;
        padding: 15px;
      }
    }
  </style>
  
  <div
    class="quote-multi-slide"
    style="background-image: url('{backgroundPath}');"
  >
    <!-- Banner text -->
    {#if guess && !hasRevealed}
      <div class="banner">
        Who do you think said these quotes?
      </div>
    {/if}
  
    <!-- Character Image and Name -->
    <div class="character-container">
      <img
        src="{displayedCharacterImagePath}"
        alt="Image of {quoteWho}"
        class="character-image"
      />
      {#if hasRevealed || !guess}
        <div class="quote-who">
          {@html sanitizedQuoteWho}
        </div>
      {/if}
      {#if guess && (!hasRevealed || overlayClass !== '')}
        <div class="white-overlay {overlayClass}"></div>
      {/if}
    </div>
  
    <!-- Quotes -->
    {#each sanitizedQuotes as quote, index}
      <div
        class="{quoteClassNames[index]}"
        style={quoteStyles[index]}
        on:animationend={() => handleAnimationEnd(index)}
      >
        {@html quote.text}
      </div>
    {/each}
  
    {#if showReflection}
      <div class="reflection-box">
        {@html sanitizedReflectionText}
      </div>
    {/if}
  
    <!-- Click-to-Advance Overlay -->
    <ClickToAdvanceOverlay onAdvance={handleClick} />
  </div>
  