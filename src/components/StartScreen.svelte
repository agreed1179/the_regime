<!-- src/components/StartScreen.svelte -->
<script>
  import { onMount, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  let isVisible = true;
  let heading = '';
  let subheading = '';
  let quote = '';
  let author = '';
  let text = '';

  const dispatch = createEventDispatcher();

  // Loading progress variables
  let loadingProgress = 0;
  let isLoading = true;
  let totalAssets = 0;
  let loadedAssets = 0;

  // Fetch the start screen content
  async function fetchContent() {
    try {
      const response = await fetch('flashscreens.json');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const screenData = data['start'] || {};
      heading = screenData.heading || '<h1>Click to Start</h1>';
      subheading = screenData.subheading || '';
      quote = screenData.quote || '<p><em>"Default Start Quote" - Unknown</em></p>';
      author = screenData.author || ''; // Ensure JSON uses lowercase 'author'
      text = screenData.text || '';     // New field
    } catch (error) {
      console.error('Error fetching flashscreens.json:', error);
      heading = '<h1>Click to Start</h1>';
      subheading = '';
      quote = '<p><em>"Default Start Quote" - Unknown</em></p>';
      author = '';
      text = '';
    }
  }

  onMount(() => {
    fetchContent();
    preloadAssets();
  });

  // Function to preload assets
  async function preloadAssets() {
    await tick();
    dispatch('startLoading', {
      onProgress: updateProgress,
      onComplete: handleLoadingComplete,
      setTotalAssets: setTotalAssets,
    });
  }

  function setTotalAssets(total) {
    totalAssets = total;
  }

  function updateProgress(loaded) {
    loadedAssets = loaded;
    loadingProgress = totalAssets ? Math.round((loadedAssets / totalAssets) * 100) : 0;
  }

  function handleLoadingComplete() {
    isLoading = false;
  }

  function handleClick() {
    if (!isLoading) {
      isVisible = false;
    }
  }

  function handleOutroEnd() {
    dispatch('proceed');
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

  /* New Container for Centered Content */
  .content-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    max-width: 1200px; /* Optional: Limit the maximum width for better readability */
    width: 100%;
  }

  /* Individual Text Containers */
  .heading-container {
    font-size: 1.4em;
    margin-bottom: 5px; /* Space below heading */
  }

  .subheading-container {
    font-size: 1.2em;
    color: #fff; /* Lighter color for subheading */
  }

  .author-container {
    margin-top: 20px; /* Space below author */
    font-size: 1em;
    color: #fff; /* Slightly lighter color for author */
  }

  .quote-container {
    margin-top: 30px; /* Space above quote */
    font-style: italic;
    color: #fff; /* Lighter color for quote */
    max-width: 800px; /* Optional: Limit quote width */
  }

  .text-container {
    margin-top: 20px; /* Space above text */
    font-size: 0.95em;
    color: #fff; /* Light color for text */
    line-height: 1.5em;
    max-width: 600px; /* Optional: Limit text width for better readability */
    text-align: left; /* Align text to left for better readability */
  }

  /* Loading Section Styles */
  .loading-section {
    position: relative;
    width: 100%;
    margin: 20px; /* Space around loading section */
  }

  /* Progress Container */
  .progress-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* Progress Bar Background */
  .progress-bar {
    width: 100%;
    max-width: 800px; /* Optional: Limit progress bar width */
    height: 20px;
    background-color: #444;
    border-radius: 10px;
    overflow: hidden;
    margin-top: 30px;
  }

  /* Progress Indicator */
  .progress {
    height: 100%;
    background-color: #ffa200; /* Green color for progress */
    width: 0%;
    transition: width 0.3s ease;
  }

  /* Click to Start Message */
  .click-to-start {
    margin-top: 20px; /* Space above the message */
    font-size: 1em;
    color: #fff;
    opacity: 0.8;
  }

  .heading-container, .subheading-container, .author-container, .quote-container, .text-container, .loading-section, .click-to-start {
    opacity: 0;
    transform: translateY(20px);
    animation: fadeInUp 1s forwards;
  }

  /* Starting animations */
  
  .heading-container {
    animation-delay: 0.3s;
  }

  .subheading-container {
    animation-delay: 0.5s;
  }

  .author-container {
    animation-delay: 0.7s;
  }

  .quote-container {
    animation-delay: 0.9s;
  }

  .text-container {
    animation-delay: 1.1s;
  }

  .loading-section {
    animation-delay: 1.3s;
  }

  .click-to-start {
    animation-delay: 1.5s;
  }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

    .progress-bar {
      height: 15px;
    }

    .progress {
      height: 15px;
    }

    .click-to-start {
      font-size: 0.9em;
    }
  }
</style>

{#if isVisible}
  <div
    class="flash-screen"
    on:click={handleClick}
    transition:fade={{ duration: 800 }}
    on:outroend={handleOutroEnd}
    tabindex="0"
    role="button"
    aria-label="Start the game"
    on:keydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleClick();
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
    </div>

    <!-- Loading Progress Bar -->
    <div class="loading-section">
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress" style="width: {loadingProgress}%"></div>
        </div>
            <!-- Click to Start Message -->
          {#if !isLoading}
            <div class="click-to-start">
              Click anywhere to start The Regime...
            </div>
          {:else}
            <p>Loading {loadingProgress}%... <br> ({loadedAssets} of {totalAssets} files)</p>
        {/if}
      </div>
    </div>

  </div>
{/if}
