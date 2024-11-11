<script>
    import { fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { getAssetPath } from '../utils/assetHelper.js';
    import { assetPaths, playSound, playerChoices, hideReference, agreeDisagreeChoices } from '../stores.js';
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';
    import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  
    export let characterImage = '';       // Path to character image
    export let text = '';                 // The quote to display (Markdown supported)
    export let reflectionTextCorrect = '';    // Text to display if player agrees
    export let reflectionTextIncorrect = '';  // Text to display if player disagrees
    export let quoteWho = '';             // The person who made the quote
    export let background = '';           // Background image path
    export let soundEffect = '';          // (Optional) Sound effect path
    export let isMuted = false;           // Mute state
    export let updateSlide;               // Function to advance the slide
    export let agreeDisagreeId;           // Unique ID for this agree/disagree slide
  
    // Reactive variables to compute asset paths
    $: characterImagePath = getAssetPath('character', characterImage, $assetPaths);
    $: backgroundPath = getAssetPath('background', background, $assetPaths);
    $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
  
    let hasChosen = false;    // Whether the player has made a choice
    let playerChoice = null;  // 'agree' or 'disagree'
    let showReflection = false; // Whether to show reflection text
    let hasRevealed = false;  // Whether the character image and name have been revealed
  
    // Overlay class for transition animations
    let overlayClass = ''; // Class to control overlay transitions
  
    // Compute the displayed character image path
    $: displayedCharacterImagePath = hasRevealed
      ? characterImagePath
      : getAssetPath('character', 'unknown_character.png', $assetPaths);
  
    // Parsed and sanitized HTML from Markdown
    $: sanitizedText = text
      ? DOMPurify.sanitize(marked.parse(text))
      : '';
  
    // Parsed and sanitized HTML for reflectionText
    $: sanitizedReflectionText = (playerChoice === 'agree')
      ? (reflectionTextCorrect ? DOMPurify.sanitize(marked.parse(reflectionTextCorrect)) : '')
      : (reflectionTextIncorrect ? DOMPurify.sanitize(marked.parse(reflectionTextIncorrect)) : '');
  
    function handleChoice(choice) {
      if (!hasChosen) {
        hideReference.set(true); // **Hide the reference while guessing**
        hasChosen = true;
        playerChoice = choice;  // 'agree' or 'disagree'
  
        // Start Phase 1: Fade-in the overlays
        overlayClass = 'fade-in';

        // After 0.5s (overlays are fully opaque), swap the image and show the name
        setTimeout(() => {
          hasRevealed = true; // Swap to the real character image and reveal the name
          overlayClass = 'fade-out'; // Start Phase 3: Fade-out the overlays
          hideReference.set(false); // **Hide the reference while guessing**
        }, 500); // 0.5s for fade-in
  
        // Remove overlayClass after fade-out completes
        setTimeout(() => {
          overlayClass = ''; // Clean up classes if needed
          // Show reflection text
          showReflection = true;
        }, 1500); // Total of 0.5s fade-in + 1s fade-out
  
        // Record the player's choice in the store
        playerChoices.update(choices => {
          choices.push({ id: agreeDisagreeId, choice: choice });
          return choices;
        });
                // Record the player's choice in the store
                
        // Record the player's choice in the store
        agreeDisagreeChoices.update(choices => {
            // Check if the choice already exists
            const index = choices.findIndex(c => c.id === agreeDisagreeId);
            if (index !== -1) {
              // Update existing choice
              choices[index] = {
                id: agreeDisagreeId,
                choice: choice,
                characterImage: characterImage,
                quoteWho: quoteWho
              };
            } else {
              // Add new choice
              choices.push({
                id: agreeDisagreeId,
                choice: choice,
                characterImage: characterImage,
                quoteWho: quoteWho
              });
            }
            return choices;
          });
      }
    }
  
    function handleClick() {
      if (hasChosen && showReflection) {
        // Advance to the next slide
        updateSlide();
      }
    }
  
    onMount(() => {
      hideReference.set(true); // **Hide the reference while guessing**
      playSound(soundEffectPath, isMuted);
    });
  </script>
  
  <style>
    .agree-disagree-slide {
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
      padding: 20px;
    }
  
    .quote-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
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
      position: relative; /* Position relative for overlay */
      max-width: 500px;
      background: rgba(0, 0, 0, 0.6);
      padding: 20px;
      border-radius: 10px;
      color: #fff;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      line-height: 1.5;
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
  
    /* Overlay for quote who */
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
  
    /* Larger buttons suitable for video games */
    .choice-buttons {
      display: flex;
      gap: 40px; /* Increase gap between buttons */
      margin-top: 40px; /* Increase margin for better spacing */
    }
  
    .choice-buttons button {
      padding: 20px 40px; /* Increase padding for larger buttons */
      font-size: 1.5em; /* Increase font size */
      font-family: 'Fira Sans', sans-serif;
      border: none;
      border-radius: 10px; /* Increase border radius for rounded corners */
      cursor: pointer;
      transition: background-color 0.3s ease, transform 0.2s ease;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3); /* Add shadow for depth */
    }
  
    /* Adjust agree button styles */
    .agree-button {
      background-color: #28a745; /* Green */
      color: #fff;
    }
  
    .agree-button:hover {
      background-color: #218838;
      transform: scale(1.05);
    }
  
    /* Adjust disagree button styles */
    .disagree-button {
      background-color: #dc3545; /* Red */
      color: #fff;
    }
  
    .disagree-button:hover {
      background-color: #c82333;
      transform: scale(1.05);
    }
  
    /* Reflection Box Styling */
    .reflection-box {
      width: 100%;
      max-width: 800px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      margin-top: 20px;
      animation: fadeInUp 0.5s ease-out;
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
      .quote-content {
        flex-direction: column;
        align-items: center;
      }
  
      .character-image {
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
  
      .choice-buttons {
        flex-direction: column;
        gap: 20px;
      }
  
      .choice-buttons button {
        width: 100%;
        max-width: 300px;
      }
    }
  </style>
  
  <div 
    class="agree-disagree-slide" 
    in:fade={{ duration: 500 }} 
    out:fade={{ duration: 500 }}
    style="background-image: url('{backgroundPath}'); background-size: cover; background-position: center;"
  >
    <!-- Quote and Character Image -->
    <div class="quote-content">
      <div class="character-image">
        <img src="{displayedCharacterImagePath}" alt="Image of character" />
        <div class="white-overlay {overlayClass}"></div>
      </div>
      <div class="quote-container">
        <div class="quote-text">
          {@html sanitizedText}
        </div>
        {#if hasRevealed}
          <div class="quote-who-container">
            <div class="quote-who">
              - {quoteWho}
            </div>
            <div class="quote-who-overlay {overlayClass}"></div>
          </div>
        {/if}
      </div>
    </div>
  
    {#if !hasChosen}
      <!-- Agree/Disagree Buttons -->
      <div class="choice-buttons">
        <button class="agree-button" on:click={() => handleChoice('agree')}>Agree</button>
        <button class="disagree-button" on:click={() => handleChoice('disagree')}>Disagree</button>
      </div>
    {/if}
  
    {#if showReflection}
      <!-- Reflection Box -->
      <div class="reflection-box">
        {@html sanitizedReflectionText}
      </div>
    {/if}
  
    <!-- Click-to-Advance Overlay -->
    {#if hasChosen && showReflection}
      <ClickToAdvanceOverlay onAdvance={handleClick} />
    {/if}
  </div>
  