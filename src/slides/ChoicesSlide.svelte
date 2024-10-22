<!-- src/slides/ChoicesSlide.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import DOMPurify from 'dompurify';
  import { playerChoices, playSound, soundEffectVolume } from '../stores.js'; // Import from stores.js
  import { getAssetPath } from "../utils/assetHelper.js"; // Import getAssetPath from the correct file
  import TransitionWrapper from '../components/TransitionWrapper.svelte';
  import { fade } from 'svelte/transition';
  
  // Component Props
  export let choices = []; // Array containing two choice objects
  export let background = ''; // Background image filename
  export let soundEffect = ''; // Sound effect filename
  export let isMuted = false; // Mute state
  export let updateSlide = () => {}; // Function to move to the next slide
  export let assetPaths = {}; // Asset paths object
  
  let showPopup = false; // Controls popup visibility
  let selectedChoice = null; // Stores the player's selected choice
  
  // Compute full paths using the utility function
  $: backgroundPath = getAssetPath('background', background, assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, assetPaths);
  
  let sanitizedPopupMessage = '';
  
  // Parse and sanitize popup message based on selected choice
  $: if (selectedChoice) {
    sanitizedPopupMessage = selectedChoice.popupMessage 
      ? DOMPurify.sanitize(selectedChoice.popupMessage, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class']
        })
      : 'You made a choice. Click anywhere to continue.';
  }
  
  // Handle choice selection
  function selectChoice(choice) {
    console.log(`selectChoice called for: ${choice.choiceText}`); // Logging for debugging
    selectedChoice = choice;
    // Record the decision
    playerChoices.update(existingChoices => [...existingChoices, choice.choiceText]);
    // Play sound effect at 50% volume
    playSound(soundEffectPath, isMuted);
    // Show popup message
    showPopup = true;
  }
  
  // Handle click on popup to proceed
  function handlePopupClick() {
    showPopup = false;
    // Navigate to the next slide based on the selected choice
    updateSlide(selectedChoice.nextId);
  }
  
  // Handle keyboard navigation
  function handleKeydown(event) {
    if (showPopup) return; // Ignore if popup is active
    if (event.key === 'ArrowLeft' && choices[0]) {
      selectChoice(choices[0]);
    } else if (event.key === 'ArrowRight' && choices[1]) {
      selectChoice(choices[1]);
    }
  }
  
  // Play sound effect on mount at full volume
  onMount(() => {
    console.log('ChoicesSlide mounted'); // Logging for debugging
    if (soundEffectPath && !isMuted) {
      playSound(soundEffectPath, isMuted); // Full volume on mount
    }
    window.addEventListener('keydown', handleKeydown);
  });
  
  // Remove keyboard listener on destroy
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

<style>
  .choices-slide {
    position: relative;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    display: flex;
    flex-direction: column; /* Stack portraits and choices vertically */
    justify-content: space-between;
    padding: 20px 0;
    box-sizing: border-box;
  }

  /* Portraits Container */
  .portraits-container {
    flex: 1; /* Approximately one-third of the container's height */
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 250px; /* Space between portraits */
    padding: 10px 0;
    box-sizing: border-box;
    position: relative; /* To position child elements */
  }

  /* Portrait Image Containers */
  .portrait-large {
    width: 40%;
  }

  .portrait-medium {
    width: 30%;
  }

  .portrait-small {
    width: 20%;
  }

  /* Choice Boxes Section */
  .choices-container {
    flex: 2; /* Approximately two-thirds of the container's height */
    display: flex;
    justify-content: space-around;
    align-items: stretch; /* Stretch to fill vertical space */
    padding: 20px;
    box-sizing: border-box;
  }

  .choice-container {
    width: 45%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .choice-box {
    width: 100%;
    height: 100%; /* Make choice-box fill the entire height of choice-container */
    background: rgba(255, 255, 255, 0.95);
    border-radius: 15px;
    padding: 25px;
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .choice-box:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 12px rgba(0, 0, 0, 0.3);
  }

  .choice-text {
    font-size: 1.2em;
    color: #333;
    margin-bottom: 20px;
    flex-grow: 1;
    overflow-y: auto;
    padding-right: 10px; /* To prevent text from hiding behind scrollbar */
  }

  .choose-button {
    align-self: center; /* Center the button horizontally */
    padding: 20px 40px; /* Increase size: twice the current size */
    font-size: 1.2em; /* Increase font size */
    background-color: #4caf50;
    color: #fff;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background-color 0.3s ease, transform 0.2s ease;
  }

  .choose-button:hover {
    background-color: #45a049;
    transform: scale(1.05);
  }

  /* Popup Styles */
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent; /* Make overlay transparent */
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    cursor: pointer;
  }

  .popup-message {
    background: rgba(128, 128, 128, 0.85); /* Grey stripe */
    padding: 15px 30px;
    border-radius: 10px;
    max-width: 80%;
    width: 60%;
    font-size: 1.5em;
    color: #fff;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .portraits-container {
      gap: 30px;
    }

    .choices-container {
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .choice-container {
      width: 80%;
    }

    .choice-text {
      font-size: 1em;
    }

    .choose-button {
      padding: 16px 32px;
      font-size: 1em;
    }

    .popup-message {
      font-size: 1.3em;
      padding: 12px 24px;
      width: 70%;
    }
  }

  @media (max-width: 768px) {
    .portraits-container {
      flex-direction: column;
      gap: 20px;
    }

    .choices-container {
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .choice-container {
      width: 90%;
    }

    .choice-text {
      font-size: 0.95em;
    }

    .choose-button {
      padding: 14px 28px;
      font-size: 0.95em;
    }

    .popup-message {
      font-size: 1.1em;
      padding: 10px 20px;
      width: 80%;
    }
  }

  @media (max-width: 480px) {
    .portraits-container {
      gap: 15px;
    }

    .choice-box {
      padding: 20px;
    }

    .choice-text {
      font-size: 0.9em;
      margin-bottom: 15px;
    }

    .choose-button {
      padding: 12px 24px;
      font-size: 0.9em;
    }

    .popup-message {
      font-size: 1em;
      padding: 8px 16px;
      width: 90%;
    }
  }
</style>

<!-- Background Image -->
<div class="choices-slide" style="background-image: url('{backgroundPath}');">
  
  <!-- Portraits Container -->
  <div class="portraits-container">
    {#each choices as choice, index}
      {#if choice.character}
        <div class={`portrait-${choice.character.imageType}`}>
          <TransitionWrapper
            character={choice.character}
            transition={choice.character.transition}
            assetPaths={assetPaths}
            imgborder={choice.character.imgborder !== undefined ? choice.character.imgborder : false} 
            
          />
        </div>
      {/if}
    {/each}
  </div>
  
  <!-- Choices Container -->
  <div class="choices-container">
    {#each choices as choice, index}
      <div class="choice-container">
        <div class="choice-box">
          <p class="choice-text">{choice.choiceText}</p>
          <button 
            class="choose-button" 
            on:click|stopPropagation={() => selectChoice(choice)}
            aria-label={`Choose option: ${choice.choiceText}`}
          >
            Choose
          </button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Popup Message -->
  {#if showPopup}
    <div class="popup-overlay" on:click={handlePopupClick}>
      <div class="popup-message">
        <p>{@html sanitizedPopupMessage}</p>
      </div>
    </div>
  {/if}
</div>
