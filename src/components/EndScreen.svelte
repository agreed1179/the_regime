<!-- src/components/EndScreen.svelte -->
<script>
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  let isVisible = false; // Initialize to false to hide initially
  let heading = '';
  let subheading = '';
  let quote = '';
  let author = '';
  let text = '';
  let buttonLabel = '';
  let buttonAction = '';

  const dispatch = createEventDispatcher();

  // Fetch the end screen content
  async function fetchContent() {
    try {
      const response = await fetch('flashscreens.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const screenData = data['end'] || {};
      heading = screenData.heading || '<h1>Thank You for Playing</h1>';
      subheading = screenData.subheading || '';
      quote = screenData.quote || '<p><em>"Default End Quote" - Unknown</em></p>';
      author = screenData.author || ''; // Ensure JSON uses lowercase 'author'
      text = screenData.text || '';     // New field
      buttonLabel = screenData.button?.label || 'Restart Game';
      buttonAction = screenData.button?.action || 'reload';
    } catch (error) {
      console.error('Error fetching flashscreens.json:', error);
      heading = '<h1>Thank You for Playing</h1>';
      subheading = '';
      quote = '<p><em>"Default End Quote" - Unknown</em></p>';
      author = '';
      text = '';
      buttonLabel = 'Restart Game';
      buttonAction = 'reload';
    }
  }

  onMount(() => {
    fetchContent();
    // Trigger the fade-in transition after fetching content
    isVisible = true;
  });

  function handleButtonClick() {
    if (buttonAction === 'reload') {
      isVisible = false; // Trigger fade-out transition
    }
    // Add more actions if needed
  }

  function handleOutroEnd() {
    dispatch('proceed'); // Dispatch event after fade-out completes
  }
</script>

<style>
  .flash-screen {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100vw;
    background-color: #000; /* Black background */
    color: #fff; /* White text */
    cursor: pointer;
    text-align: center;
    font-family: 'Fira Sans', sans-serif;
    position: relative;
    padding: 20px;
    box-sizing: border-box;
  }

  /* Container for Centered Content */
  .content-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 800px; /* Limit maximum width for readability */
    width: 100%;
  }

  /* Individual Text Containers */
  .heading-container {
    margin-bottom: 20px; /* Space below heading */
  }

  .subheading-container {
    margin-bottom: 20px; /* Space below subheading */
    font-size: 1.2em;
    color: #ccc; /* Lighter color for subheading */
  }

  .author-container {
    margin-bottom: 20px; /* Space below author */
    font-size: 1em;
    color: #bbb; /* Slightly lighter color for author */
  }

  .quote-container {
    margin-top: 20px; /* Space above quote */
    font-style: italic;
    color: #fff; /* Lighter color for quote */
    max-width: 600px; /* Limit quote width */
  }

  .text-container {
    margin-top: 20px; /* Space above text */
    font-size: 0.95em;
    color: #ddd; /* Light color for text */
    line-height: 1.5em;
    max-width: 600px; /* Limit text width for readability */
    text-align: left; /* Align text to left */
  }

  /* Action Button Styles */
  .action-button {
    margin-top: 20px;
    padding: 10px 20px;
    font-size: 1em;
    background-color: #4caf50; /* Green background */
    color: #fff; /* White text */
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  .action-button:hover {
    background-color: #45a049; /* Darker green on hover */
  }

  /* Responsive Adjustments */
  @media (max-width: 600px) {
    .flash-screen {
      padding: 10px;
    }

    .subheading-container {
      font-size: 1em;
      margin-bottom: 20px;
    }

    .author-container {
      font-size: 0.9em;
      margin-bottom: 15px;
    }

    .text-container {
      font-size: 0.85em;
      margin-top: 15px;
    }

    .quote-container {
      margin-top: 20px;
      font-size: 1em;
    }

    .action-button {
      padding: 8px 16px;
      font-size: 0.9em;
    }
  }
</style>

{#if isVisible}
  <div
    class="flash-screen"
    in:fade={{ duration: 2000 }}   
    out:fade={{ duration: 200 }}  
    on:outroend={handleOutroEnd}
    tabindex="0"
    role="button"
    aria-label="End of the game"
    on:keydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleButtonClick();
      }
    }}
  >
    <div class="content-wrapper">
      <!-- Heading Container -->
      <div class="heading-container">
        {@html heading}
      </div>

      <!-- Subheading Container -->
      {#if subheading}
        <div class="subheading-container">
          {@html subheading}
        </div>
      {/if}

      <!-- Author Container -->
      {#if author}
        <div class="author-container">
          {@html author}
        </div>
      {/if}

      <!-- Quote Container -->
      {#if quote}
        <div class="quote-container">
          {@html quote}
        </div>
      {/if}

      <!-- Text Container -->
      {#if text}
        <div class="text-container">
          {@html text}
        </div>
      {/if}

      <!-- Action Button -->
      {#if buttonLabel}
        <button
          class="action-button"
          on:click={handleButtonClick}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </button>
      {/if}
    </div>
  </div>
{/if}
