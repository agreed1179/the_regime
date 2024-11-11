<!-- src/slides/QuoteSlide.svelte -->
<script>
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { getAssetPath } from '../utils/assetHelper.js';
  import { assetPaths, playSound, hideReference } from '../stores.js';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';

  export let characterImage = '';
  export let text = '';
  export let reflectionText = '';
  export let quoteWho = '';
  export let background = '';
  export let soundEffect = '';
  export let isMuted = false;
  export let updateSlide;
  export let guess = false;

  $: characterImagePath = getAssetPath('character', characterImage, $assetPaths);
  $: backgroundPath = getAssetPath('background', background, $assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);

  let hasRevealed = !guess;

  $: displayedCharacterImagePath = (guess && !hasRevealed)
    ? getAssetPath('character', 'unknown_character.png', $assetPaths)
    : characterImagePath;

  $: sanitizedText = text
    ? DOMPurify.sanitize(marked.parse(text))
    : '';

  $: sanitizedReflectionText = reflectionText
    ? DOMPurify.sanitize(marked.parse(reflectionText))
    : '';

  $: sanitizedQuoteWho = quoteWho
    ? DOMPurify.sanitize(marked.parseInline(quoteWho))
    : '';

  let showReflection = false;

  let overlayClass = '';

  function handleClick(event) {
    if (guess && !hasRevealed) {
      hideReference.set(true); // **Hide the reference while guessing**
      overlayClass = 'fade-in';

      setTimeout(() => {
        hasRevealed = true;
        overlayClass = 'fade-out';
      }, 1000);

      setTimeout(() => {
        hideReference.set(false); // **reveal reference**
        overlayClass = '';
      }, 2000);

      return;
    } else if (!showReflection) {
      if (reflectionText === "") {
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
      hideReference.set(true); // **Hide the reference while guessing**
      const img = new Image();
      img.src = characterImagePath;
    }
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

  /* Content Wrapper */
  .content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
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
    opacity: 0;
    pointer-events: none;
  }

  .white-overlay.fade-in {
    animation: fadeIn 1s linear forwards;
  }

  .white-overlay.fade-out {
    animation: fadeOut 1s linear forwards;
  }

  .quote-container {
    max-width: 500px;
    background: rgba(0, 0, 0, 0.6);
    padding: 20px;
    border-radius: 10px;
    color: #fff;
    box-sizing: border-box;
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
    /* Removed font-weight to allow Markdown styling */
    /* font-weight: bold; */
    color: #fff;
    font-size: 1.2em;
  }

  /* Adjustments for .quote-who-overlay */
  .quote-who-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1.5em;
    background-color: white;
    opacity: 0;
    pointer-events: none;
  }

  .quote-who-overlay.fade-in {
    animation: fadeIn 1s linear forwards;
  }

  .quote-who-overlay.fade-out {
    animation: fadeOut 1s linear forwards;
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
    flex-direction: column; /* Add this line */
    align-items: center; /* Center items horizontally */
    justify-content: center; /* Center items vertically */
    text-align: center;
    font-size: 1.2em;
    transition: opacity 0.5s ease, transform 0.5s ease;
  }



  /* Banner Styling */
  .banner {
    position: relative; /* Part of normal flow */
    width: 100%; /* Stretch across the slide */
    margin-bottom: 20px; /* Space below the banner */
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 15px 25px;
    border-radius: 5px;
    font-size: 1.5em;
    /* Remove font-weight if you don't want bold text */
    text-align: center;
    z-index: 100;
    animation: fadeInDown 0.5s ease-out;
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

    .banner {
      font-size: 1.2em;
      padding: 10px 20px;
    }
  }
</style>

<div 
  class="quote-slide {showReflection ? 'show-reflection' : ''}" 
  in:fade={{ duration: 500 }} 
  out:fade={{ duration: 500 }}
  style="background-image: url('{backgroundPath}'); background-size: cover; background-position: center;"
>
  <div class="content-wrapper">
    <!-- Banner text -->
    {#if guess && !hasRevealed}
      <div class="banner">
        Who do you think said this?
      </div>
    {/if}

    <div class="quote-content">
      <div class="character-image">
        <img src="{displayedCharacterImagePath}" alt="Image of {quoteWho}" />
        {#if guess && (!hasRevealed || overlayClass !== '')}
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
              {@html sanitizedQuoteWho}
            </div>
          {/if}
          {#if guess && (!hasRevealed || overlayClass !== '')}
            <div class="quote-who-overlay {overlayClass}"></div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#if showReflection}
    <div class="reflection-box">
      {@html sanitizedReflectionText}
    </div>
  {/if}

  <ClickToAdvanceOverlay onAdvance={handleClick} />
</div>
