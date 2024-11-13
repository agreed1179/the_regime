<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
  
    let isVisible = true;
    let heading = '';
    let subheading = '';
    let quote = '';
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
        buttonLabel = screenData.button?.label || 'Restart Game';
        buttonAction = screenData.button?.action || 'reload';
      } catch (error) {
        console.error('Error fetching flashscreens.json:', error);
        heading = '<h1>Thank You for Playing</h1>';
        subheading = '';
        quote = '<p><em>"Default End Quote" - Unknown</em></p>';
        buttonLabel = 'Restart Game';
        buttonAction = 'reload';
      }
    }
  
    onMount(() => {
      fetchContent();
    });
  
    function handleButtonClick() {
      if (buttonAction === 'reload') {
        dispatch('proceed');
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
  </style>
  
  {#if isVisible}
    <div
      class="flash-screen"
      transition:fade={{ duration: 1000 }}
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
  
      <!-- Quote -->
      <div class="quote">
        {@html quote}
      </div>
  
      <!-- Action Button -->
      {#if buttonLabel}
        <button
          class="action-button"
          on:click={handleButtonClick}
          aria-label="Restart Game"
        >
          {buttonLabel}
        </button>
      {/if}
    </div>
  {/if}
  