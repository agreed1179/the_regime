<!-- src/components/FlashScreen.svelte -->
<script>
    import { onMount } from 'svelte';
    import { fade } from 'svelte/transition';
    
    export let screenType = 'start'; // 'start' or 'end'
    export let onProceed = () => {};  // Callback when user interacts to proceed
    
    let content = '';
    let buttonLabel = '';
    let buttonAction = ''; // Defines what action to perform on click
    
    // Fetch the flashscreen content based on screenType
    async function fetchContent() {
      try {
        const response = await fetch('/flashscreens.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        content = data[screenType]?.content || '';
        if (data[screenType]?.button) {
          buttonLabel = data[screenType].button.label || '';
          buttonAction = data[screenType].button.action || '';
        }
      } catch (error) {
        console.error('Error fetching flashscreens.json:', error);
        content = screenType === 'start' 
          ? '<h1>Click to Start</h1><p><em>\"Default Start Quote\" - Unknown</em></p>' 
          : '<h1>Thank You for Playing</h1><p><em>\"Default End Quote\" - Unknown</em></p>';
        buttonLabel = screenType === 'start' ? 'Start Game' : 'Restart Game';
        buttonAction = screenType === 'start' ? 'start' : 'reload';
      }
    }
  
    onMount(() => {
      fetchContent();
    });
  
    // Handle button click based on action
    function handleButtonClick() {
      if (buttonAction === 'start') {
        onProceed();
      } else if (buttonAction === 'reload') {
        window.location.reload();
      } else {
        onProceed();
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
    }
  
    .flash-screen h1 {
      font-size: 3em;
      margin: 0;
      font-weight: 300; /* Light weight */
      animation: fadeIn 2s ease-in-out;
    }
  
    .flash-screen p {
      font-size: 1.2em;
      margin-top: 20px;
      font-style: italic;
      font-weight: 400; /* Regular weight */
    }
  
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
  </style>
  
  <!-- FlashScreen Markup -->
  <div class="flash-screen" on:click={handleButtonClick} transition:fade={{ duration: 1000 }}>
    {@html content}
    {#if buttonLabel}
      <button 
        class="action-button" 
        on:click|stopPropagation={handleButtonClick} 
        aria-label={screenType === 'start' ? 'Start Game' : 'Restart Game'}
      >
        {buttonLabel}
      </button>
    {/if}
  </div>
  