<!-- src/slides/QuoteQuizSlide.svelte -->
<script>
    import { fade } from 'svelte/transition';
    import { onMount, onDestroy } from 'svelte';
    import { getAssetPath } from '../utils/assetHelper.js';
    import { assetPaths, currentScore, currentChoice, playSound } from '../stores.js';
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';
    import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';

    export let characterImage = ''; // Initially 'unknown_character.png'
    export let text = '';           // The quote to display (Markdown supported)
    export let quoteWho = '';       // Initially empty
    export let background = '';     // Background image path
    export let soundEffect = '';    // (Optional) Sound effect path
    export let isMuted = false;     // Mute state
    export let updateSlide;         // Function to advance the slide
    export let choices = [];        // Array of choices
    export let correctAnswer = '';  // Name of the correct answer
    export let reflectionTextCorrect = '';    // Reflection text for correct answer
    export let reflectionTextIncorrect = '';  // Reflection text for incorrect answer


    // Reactive variables to compute asset paths
    $: characterImagePath = getAssetPath('character', characterImage, $assetPaths);
    $: backgroundPath = getAssetPath('background', background, $assetPaths);
    $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);

    // Define reactive variables for correct and incorrect sound paths
    $: correctSoundPath = getAssetPath('sound', 'correct.wav', $assetPaths);
    $: incorrectSoundPath = getAssetPath('sound', 'incorrect.wav', $assetPaths);

    // Parsed and sanitized HTML from Markdown
    $: sanitizedText = text
      ? DOMPurify.sanitize(marked.parse(text))
      : '';

    let hasAnswered = false;
    let selectedChoice = null;
    let isCorrect = false; // Tracks if the selected answer is correct
    let bannerTextDisplayed = "";

    function handleClick(event) {
      console.log('InfoSlide handleClick triggered');
      updateSlide();
    }
    // Function to handle user selection
    function handleChoiceClick(choice) {
      if (hasAnswered) return; // Prevent multiple selections
      hasAnswered = true;
      selectedChoice = choice;
      currentChoice.set(choice.name);

      // Determine if the selected choice is correct
      isCorrect = choice.name === correctAnswer;

      if (isCorrect) {
        currentScore.update(n => n + 1);
      }

      // Update the character image and quoteWho
      characterImage = getCharacterImage(correctAnswer);
      quoteWho = correctAnswer;

      // Play the appropriate sound
      if (isCorrect) {
        // Play correct sound
        playSound(correctSoundPath, isMuted, 0.5); // Volume set to 50%
        // update banner text
        bannerTextDisplayed = reflectionTextCorrect;
      } else {
        // Play incorrect sound
        playSound(incorrectSoundPath, isMuted, 0.5); // Volume set to 50%
        // update banner text, and if no incorrect text play the correct text instead
        bannerTextDisplayed = reflectionTextIncorrect
        if (reflectionTextIncorrect == "") { 
          bannerTextDisplayed = reflectionTextCorrect;
        } 
      }
    }


    // Function to get character image path by name
    function getCharacterImage(name) {
      const choice = choices.find(c => c.name === name);
      return choice ? choice.characterImage : 'unknown_character.png';
    }

    onMount(() => {
      playSound(soundEffectPath, isMuted); // Full volume on mount
  });

</script>

<style>
  .quote-slide {
    position: relative; /* Ensure overlay is positioned correctly */
    display: flex;
    flex-direction: column; /* Stack content vertically */
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
    transition: background-image 0.5s ease-in-out;
  }

  .quote-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }

  .character-image {
  width: 320px;       /* Fixed width */
  height: 480px;      /* Fixed height */
  padding-right: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
    }


    .character-image img {
    object-fit: contain;/* Resize image without distortion */
    border-radius: 10px;
    border: 2px solid #000; /* Black border */
    display: block;     /* Remove inline spacing */
    margin: auto;       /* Center the image within the container */
    }


  .quote-container {
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

  .quote-who {
    margin-top: 15px;
    text-align: right;
    font-size: 1em;
    color: #fff;
  }

  /* Choices Container */
  .choices-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 20px;
  }

  .choice {
    width: 250px;
    margin: 10px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.7); /* Semi-transparent dark background */
    border-radius: 10px;
    text-align: center;
    color: #fff;
    cursor: pointer;
    transition: background-color 0.3s;
    border: 2px solid transparent;
    overflow: hidden; /* Hide overflow */
  }

  .choice.correct {
    background-color: #28a745; /* Green for correct */
    color: #000000;
  }

  .choice.incorrect {
    background-color: #ff9800; /* Orange for incorrect */
    color: #000000;
  }

  .choice img {
    width: 200px;      /* Fixed width */
    height: 200px;     /* Fixed height */
    object-fit: contain; /* Resize image without distortion */
    border-radius: 5px;
    margin: 0 auto;
  }

  .choice-name {
    margin-top: 10px;
    font-size: 1em;
  }

  /* Disable pointer events after selection */
  .choices-container.disabled .choice {
    pointer-events: none;
    opacity: 0.6;
  }
  
  /* Reflection Banner Styling */
  .reflection-banner {
      position: absolute; /* Position relative to the nearest positioned ancestor */
      top: 50%;           /* Center vertically within the slide */
      left: 50%;          /* Center horizontally within the slide */
      transform: translate(-50%, -50%); /* Adjust to truly center */
      width: 80%;         /* Adjust as needed to fit within the slide */
      background: rgba(0, 0, 0, 0.85); /* Semi-transparent dark background */
      color: #fff;
      padding: 30px 20px;
      border-radius: 10px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      z-index: 300; /* Ensure it's above other elements within the slide */
      text-align: center;
      font-size: 1.2em;
      animation: fadeIn 0.5s ease-out;
    }

    .reflection-banner.correct {
    /* border: 2px solid #28a745;  Green border for correct */
    }

    .reflection-banner.incorrect {
    /* border: 2px solid #ff9800;  Orange border for incorrect */
    }

    /* Optional: Add transition for banner appearance */
    .reflection-banner {
      animation: fadeIn 0.5s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -55%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  @media (max-width: 768px) {
    .quote-content {
      flex-direction: column;
    }

    .character-image {
      padding-right: 0;
      padding-bottom: 20px;
    }

    .quote-container {
      max-width: 90%;
    }

    .quote-who {
      text-align: center;
    }

    .choice {
      width: 120px;
    }

    .choice img {
      width: 80px;
      height: 80px;
    }
    .reflection-banner {
      width: 90%;
      padding: 20px 15px;
      font-size: 1em;
    }
  }
</style>

<div 
  class="quote-slide" 
  in:fade={{ duration: 500 }} 
  out:fade={{ duration: 500 }}
  style="background-image: url('{backgroundPath}'); background-size: cover; background-position: center;"
>
  <div class="quote-content">
    <div class="character-image">
      <img src="{getAssetPath('character', characterImage, $assetPaths)}" alt="Image of {quoteWho}" />
    </div>
    <div class="quote-container">
      <div class="quote-text">
        {@html sanitizedText}
      </div>
      {#if quoteWho}
        <div class="quote-who">- {quoteWho}</div>
      {/if}
    </div>
  </div>

  <!-- Choices -->
  <div class="choices-container {hasAnswered ? 'disabled' : ''}">
    {#each choices as choice}
      <div
        class="choice {hasAnswered ? (choice.name === correctAnswer ? 'correct' : (choice === selectedChoice ? 'incorrect' : '')) : ''}"
        on:click={() => handleChoiceClick(choice)}
      >
        <img src="{getAssetPath('character', choice.characterImage, $assetPaths)}" alt="{choice.name}" />
        <div class="choice-name">{choice.name}</div>
      </div>
    {/each}
  </div>

  {#if hasAnswered}
    {#if (reflectionTextCorrect == "") && (reflectionTextIncorrect == "")}
      <!-- If no text is provided, proceed straight to Click-to-Advance Overlay -->
      <ClickToAdvanceOverlay onAdvance={handleClick} />
    {:else} 
      <!-- If some text is provided, proceed with a Reflection Banner first -->
      <div class="reflection-banner {isCorrect ? 'correct' : 'incorrect'}">
        {@html bannerTextDisplayed}
      </div>
      <!-- Click-to-Advance Overlay -->
      <ClickToAdvanceOverlay onAdvance={handleClick} />
    {/if}
  {/if}
</div>
