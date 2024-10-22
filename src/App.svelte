<!-- src/App.svelte -->
<script>
  import './appStyles.css';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import DialogueSlide from './slides/DialogueSlide.svelte';
  import ChoicesSlide from './slides/ChoicesSlide.svelte';
  import InfoSlide from './slides/InfoSlide.svelte';
  import FlashScreen from './components/FlashScreen.svelte'; // Import FlashScreen
  
  // Import stores
  import { 
    currentStage, 
    slides, 
    history, 
    backgroundImage, 
    currentChapter, 
    backgroundMusic, 
    backgroundVolume, 
    assetPaths 
  } from './stores.js';
  
  // Import utility function
  import { getAssetPath } from './utils/assetHelper.js';
  
  // Import logic functions
  import { loadChapter, updateSlide, goBack, loadNextChapter } from './utils/appLogic.js';
  
  import { playerChoices } from './stores.js'; // Ensure playerChoices is imported
  
  let gameStarted = false; // Variable to track game start
  let isMuted = false; // Variable to track mute state
  let backgroundAudio; // Reference to the background audio element
  
  // Progress-related variables
  let slideCounts = []; // Array to store the number of slides per chapter
  let cumulativeSlideCounts = []; // Array to store cumulative slides up to each chapter
  let totalSlides = 0; // Total number of slides across all chapters
  let totalChapters = 3; // Total number of chapters (chapter0.json to chapter7.json)
  
  // Current Slide Index (1-based)
  $: currentSlideIndex = slideCounts
    .slice(0, $currentChapter)
    .reduce((a, b) => a + b, 0) + ($currentStage || 0) + 1;
  
  // Progress Percentage
  $: progress = totalSlides ? (currentSlideIndex / totalSlides) * 100 : 0;
  
  // Progress Counter Text
  $: counterText = `Chapter ${$currentChapter + 1}/${totalChapters} - Slide ${$currentStage + 1}/${slideCounts[$currentChapter] || 1}`;
  
  // Compute Cumulative Slide Counts whenever slideCounts changes
  $: cumulativeSlideCounts = slideCounts.reduce((acc, count, index) => {
    acc.push((acc[index - 1] || 0) + count);
    return acc;
  }, []);
  
  // Function to fetch all chapters and count slides
  async function fetchAllChapters() {
    const counts = [];
    for (let i = 0; i < totalChapters; i++) {
      try {
        const response = await fetch(`/chapter${i}.json`);
        if (response.ok) {
          const chapterData = await response.json();
          const slides = chapterData.slides || [];
          counts.push(slides.length);
        } else {
          console.error(`chapter${i}.json not found.`);
          counts.push(0);
        }
      } catch (error) {
        console.error(`Error fetching chapter${i}.json:`, error);
        counts.push(0);
      }
    }
    slideCounts = counts;
    totalSlides = slideCounts.reduce((a, b) => a + b, 0);
  }
  
  onMount(() => {
    fetchAllChapters();
  });
  
  // Function to start the game
  function startGame() {
    gameStarted = true;
    currentChapter.set(0); // Start with Chapter 0
    loadChapter(0); // Load Chapter 0
  }
  
  // Function to toggle mute state
  function toggleMute() {
    isMuted = !isMuted;
    if (backgroundAudio) {
      backgroundAudio.muted = isMuted;
      if (isMuted) {
        backgroundAudio.pause();
      } else {
        if ($backgroundMusic) { // Removed backgroundAudio.paused check
          backgroundAudio.play().catch(error => {
            console.error('Background music playback failed:', error);
          });
        }
      }
    }
  }

  // Reactive statement to update audio src and play music when backgroundMusic changes
  $: if (backgroundAudio && $backgroundMusic) {
    const fullMusicPath = getAssetPath('music', $backgroundMusic, $assetPaths);
    if (backgroundAudio.src !== fullMusicPath) { // Prevent resetting src if already correct
      backgroundAudio.src = fullMusicPath;
      if (!isMuted) {
        backgroundAudio.volume = $backgroundVolume; // Set the volume
        backgroundAudio.play().catch(error => {
          console.error('Background music playback failed:', error);
        });
      }
    }
  }

  // Reactive statement to update audio volume when backgroundVolume changes
  $: if (backgroundAudio) {
    backgroundAudio.volume = $backgroundVolume;
  }
  
  // Function to advance to the next slide
  function handleDialogueEnd(nextId = null) {
    if (nextId !== null) {
      updateSlide(nextId); // Navigate to the specified nextId
    } else {
      updateSlide();
    }
  }

  // Function to restart the game
  function restartGame() {
    // Reset game state
    gameStarted = false;
    isMuted = false;
    currentChapter.set(0);
    currentStage.set(0);
    slides.set([]);
    history.set([]);
    backgroundImage.set('');
    backgroundMusic.set('');
    backgroundVolume.set(1);
    playerChoices.set([]);
    // Additional resets if necessary

    // Pause and reset background audio
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
      backgroundAudio.src = '';
    }
  }

</script>

<style>
  /* Import the global styles */
  @import './appStyles.css';

  /* Optional: Additional global styles can go here */
</style>

<!-- Application Markup -->
{#if !gameStarted}
  <!-- Starting screen using FlashScreen component -->
  <FlashScreen screenType="start" onProceed={startGame} />
{:else if currentSlideIndex > totalSlides}
  <!-- Ending screen using FlashScreen component -->
  <FlashScreen screenType="end" onProceed={restartGame} />
{:else}
  <!-- Existing game content -->
  <div class="meeting-room">
    <!-- Background Audio Element -->
    <audio
      bind:this={backgroundAudio}
      loop
      preload="auto" 
      on:loadeddata={() => {
        if (!isMuted && $backgroundMusic) {
          backgroundAudio.play().catch(error => {
            console.error('Background music playback failed:', error);
          });
        }
      }}
    ></audio>
    
    <div class="screen" style="background-image: url('{$backgroundImage}');">
      {#if $slides.length > 0}
        <!-- Slide content transition -->
        {#key $currentStage}
          <div class="slide-content" in:fade={{ duration: 500 }}>
            {#if $slides[$currentStage]?.type === 'dialogue'}
              <DialogueSlide
                characters={$slides[$currentStage].characters}
                dialogueText={$slides[$currentStage].dialogueText}
                background={$slides[$currentStage].background}
                soundEffect={$slides[$currentStage].soundEffect}
                isMuted={isMuted}
                updateSlide={handleDialogueEnd}
                assetPaths={$assetPaths}
              />
            {:else if $slides[$currentStage]?.type === 'choices'}
              <ChoicesSlide 
                choices={$slides[$currentStage].choices}
                background={$slides[$currentStage].background}
                soundEffect={$slides[$currentStage].soundEffect}
                isMuted={isMuted}
                updateSlide={handleDialogueEnd}
                assetPaths={$assetPaths}
              />
            {:else if $slides[$currentStage]?.type === 'info'}
              <InfoSlide
                text={$slides[$currentStage]?.text}
                reference={$slides[$currentStage]?.reference}
                updateSlide={handleDialogueEnd}
                soundEffect={$slides[$currentStage]?.soundEffect}
                isMuted={isMuted}
                clickToAdvance={$slides[$currentStage]?.clickToAdvance}
                background={$slides[$currentStage].background}
              />
            {/if}
          </div>
        {/key}
      {/if}

      <!-- Display the back button -->
      {#if $history.length > 0}
        <button on:click={goBack} class="back-button" aria-label="Go Back">
          Back
        </button>
      {/if}

      <!-- Progress Bar and Counter with Next Chapter Button -->
      <div class="progress-container">
        {#if $currentStage === (slideCounts[$currentChapter] || 0) - 1}
          <button on:click={loadNextChapter} class="next-chapter-button" aria-label="Proceed to the Next Chapter">
            Next Chapter
          </button>
        {/if}
        <div class="progress-bar">
          <div class="progress" style="width: {progress}%"></div>
          <!-- Chapter Markers -->
          {#each cumulativeSlideCounts as cumulativeCount, index}
            {#if index < totalChapters - 1} <!-- Exclude the last chapter's end -->
              <div
                class="marker"
                style="left: { (cumulativeCount / totalSlides) * 100 }%;"
                title={`Chapter ${index + 1}`}
              ></div>
            {/if}
          {/each}
        </div>
        <div class="progress-counter">
          {counterText}
        </div>
      </div>

      <!-- Mute/Unmute Button -->
      <button on:click={toggleMute} class="mute-button" aria-label={isMuted ? 'Unmute Music' : 'Mute Music'}>
        {#if isMuted}
          Unmute 🔊
        {:else}
          Mute 🔇
        {/if}
      </button>

      <!-- Display the academic reference at the bottom left -->
      {#if $slides[$currentStage]?.reference}
        <div class="reference">
          <span class="source-label">Source:</span>
          <span class="source-text">{$slides[$currentStage].reference}</span>
        </div>
      {/if}
    </div>
  </div>
{/if}

