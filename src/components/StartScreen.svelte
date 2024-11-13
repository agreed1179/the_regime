<script>
    import { onMount, tick } from 'svelte';
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
  
    let isVisible = true;
    let heading = '';
    let subheading = '';
    let quote = '';
  
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
      } catch (error) {
        console.error('Error fetching flashscreens.json:', error);
        heading = '<h1>Click to Start</h1>';
        subheading = '';
        quote = '<p><em>"Default Start Quote" - Unknown</em></p>';
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
  </style>
  
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
          {@html subheading}
        </div>
      {/if}
  
      <!-- Loading Progress Bar -->
      <div class="loading-section">
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress" style="width: {loadingProgress}%"></div>
          </div>
          <p>Loading {loadingProgress}%... <br> ({loadedAssets} of {totalAssets} files)</p>
        </div>
      </div>
  
      <!-- Quote -->
      <div class="quote">
        {@html quote}
      </div>
  
      <!-- Click to Start Message -->
      {#if !isLoading}
        <div class="click-to-start">
          Click anywhere to begin...
        </div>
      {/if}
    </div>
  {/if}
  