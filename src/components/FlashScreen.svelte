<script>
    import { onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
  
    export let screenType = 'start'; // 'start' or 'end'
  
    let isVisible = true;
    let heading = '';
    let subheading = '';
    let quote = '';
    let buttonLabel = '';
    let buttonAction = ''; // Defines what action to perform on click
  
    const dispatch = createEventDispatcher();
  
    // Loading progress variables
    let loadingProgress = 0; // Progress percentage (0-100)
    let isLoading = false; // Indicates if loading is in progress
    let totalAssets = 0; // Total number of assets to load
    let loadedAssets = 0; // Number of assets loaded
  
    // Fetch the flashscreen content based on screenType
    async function fetchContent() {
      try {
        const response = await fetch('flashscreens.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const screenData = data[screenType] || {};
        heading = screenData.heading || '';
        subheading = screenData.subheading || '';
        quote = screenData.quote || '';
        if (screenData.button) {
          buttonLabel = screenData.button.label || '';
          buttonAction = screenData.button.action || '';
        }
      } catch (error) {
        console.error('Error fetching flashscreens.json:', error);
        // Set default content and button labels
        heading = screenType === 'start' ? '<h1>Click to Start</h1>' : '<h1>Thank You for Playing</h1>';
        subheading = '';
        quote = screenType === 'start' 
          ? '<p><em>"Default Start Quote" - Unknown</em></p>' 
          : '<p><em>"Default End Quote" - Unknown</em></p>';
        buttonLabel = screenType === 'start' ? '' : 'Restart Game';
        buttonAction = screenType === 'start' ? '' : 'reload';
      }
    }
  
    onMount(() => {
      fetchContent();
      if (screenType === 'start') {
        isLoading = true; // Start loading assets
        preloadAssets();
      }
    });
  
    // Function to preload assets
    async function preloadAssets() {
      await tick(); // Wait for the parent to attach event listeners
      dispatch('startLoading', { 
        onProgress: updateProgress, 
        onComplete: handleLoadingComplete, 
        setTotalAssets: setTotalAssets 
      });
    }
  
    // Function to set total assets
    function setTotalAssets(total) {
      totalAssets = total;
    }
  
    // Function to update progress
    function updateProgress(loaded) {
      loadedAssets = loaded;
      loadingProgress = totalAssets ? Math.round((loadedAssets / totalAssets) * 100) : 0;
    }
  
    // Function to handle loading completion
    function handleLoadingComplete() {
      isLoading = false;
    }
  
    // Handle click to proceed
    function handleClick() {
      if (!isLoading) {
        isVisible = false; // Start fade-out
      }
    }
  
    // Handle outro end to dispatch the proceed event
    function handleOutroEnd() {
      dispatch('proceed'); // Notify parent to proceed
    }
  
    // Handle button click for end screen
    function handleButtonClick() {
      if (buttonAction === 'reload') {
        dispatch('proceed'); // Notify parent to restart
      }
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
  
    .flash-screen h1 {
      font-size: 3em;
      margin: 0;
      font-weight: 300; /* Light weight */
      animation: fadeIn 2s ease-in-out;
    }
  
    .subheading {
      font-size: 1.5em;
      margin-top: 20px;
      font-weight: 400; /* Regular weight */
      max-width: 80%;
    }
  
    .loading-section {
      margin-top: 30px;
      width: 80%;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  
    .progress-container {
      width: 100%;
      border-radius: 5px;
      overflow: hidden;
    }
  
    .progress-bar {
      width: 100%;
      background-color: #ddd;
    }
  
    .progress {
      height: 20px;
      background-color: #28a745; /* Green */
      transition: width 0.2s ease;
    }
  
    .progress-container p {
      margin-top: 10px;
      font-size: 1em;
      color: #fff;
    }
  
    .flash-screen p {
      font-size: 1.2em;
      margin-top: 20px;
      font-style: italic;
      font-weight: 400; /* Regular weight */
      max-width: 80%;
    }
  
    .click-to-start {
      margin-top: 40px;
      font-size: 1.2em;
      color: #fff;
      position: absolute;
      bottom: 20px;
    }
  
    /* Button Styles */
    .action-button {
      margin-top: 40px;
      padding: 10px 20px;
      background-color: #28a745; /* Green for distinction */
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      transition: background-color 0.3s ease, transform 0.2s ease;
      font-family: 'Fira Sans', sans-serif;
      font-weight: 400;
    }
  
    .action-button:hover {
      background-color: #218838;
      transform: scale(1.05);
    }
  
    /* Fade-in animation */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  
    /* Responsive Design */
    @media (max-width: 768px) {
      .flash-screen h1 {
        font-size: 2.5em;
      }
  
      .subheading {
        font-size: 1.2em;
      }
  
      .flash-screen p {
        font-size: 1em;
      }
  
      .click-to-start {
        font-size: 1em;
      }
  
      .progress-container {
        width: 90%;
      }
    }
  </style>
  
  <!-- FlashScreen Markup -->
  {#if isVisible}
    <div 
      class="flash-screen" 
      on:click={handleClick} 
      transition:fade={{ duration: 1000 }} 
      on:outroend={handleOutroEnd}
    >
      <!-- Heading -->
      <div class="heading">
        {@html heading}
      </div>
      
      <!-- Subheading -->
      {#if subheading}
        <div class="subheading">
          {subheading}
        </div>
      {/if}
      
      <!-- Loading Progress Bar between subheading and quote -->
      {#if screenType === 'start'}
        <div class="loading-section">
          <!-- Loading Bar -->
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress" style="width: {loadingProgress}%"></div>
            </div>
            <p>Loading... {loadedAssets} of {totalAssets} files ({loadingProgress}%)</p>
          </div>
        </div>
      {/if}
      
      <!-- Quote -->
      <div class="quote">
        {@html quote}
      </div>
  
      <!-- Message to click when loading is complete -->
      {#if screenType === 'start' && !isLoading}
        <div class="click-to-start">
          Click anywhere to begin...
        </div>
      {/if}
  
      <!-- Button for end screen if applicable -->
      {#if screenType === 'end' && buttonLabel}
        <button 
          class="action-button" 
          on:click|stopPropagation={handleButtonClick} 
          aria-label={screenType === 'start' ? 'Start Game' : 'Restart Game'}
        >
          {buttonLabel}
        </button>
      {/if}
    </div>
  {/if}
  