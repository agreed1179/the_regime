<script>
  import './appStyles.css';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import DialogueSlide from './slides/DialogueSlide.svelte';
  import ChoicesSlide from './slides/ChoicesSlide.svelte';
  import InfoSlide from './slides/InfoSlide.svelte';
  import QuoteSlide from './slides/QuoteSlide.svelte';
  import QuoteQuizSlide from './slides/QuoteQuizSlide.svelte';
  import FlashScreen from './components/FlashScreen.svelte';
  import ClickToAdvanceOverlay from './components/ClickToAdvanceOverlay.svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import removeMarkdown from 'remove-markdown';
  
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
  
  // Import utility functions
  import { getAssetPath } from './utils/assetHelper.js';
  import { loadChapter, updateSlide, goBack, loadNextChapter } from './utils/appLogic.js';
  
  import { playerChoices } from './stores.js'; // Ensure playerChoices is imported

  // Existing variables
  let gameStarted = false;
  let isMuted = false;
  let backgroundAudio;

  // Progress-related variables
  let slideCounts = [];
  let cumulativeSlideCounts = [];
  let totalSlides = 0;
  let totalChapters = 3;
  
  // Current Slide Index (1-based)
  $: currentSlideIndex = slideCounts
    .slice(0, $currentChapter)
    .reduce((a, b) => a + b, 0) + ($currentStage || 0) + 1;
  
  // Progress Percentage
  $: progress = totalSlides ? (currentSlideIndex / totalSlides) * 100 : 0;
  
  // Define separate counter texts
  $: slideCounterText = `Slide ${currentSlideIndex}/${slideCounts[$currentChapter] || 1}`;
  $: chapterCounterText = `Chapter ${$currentChapter + 1}/${totalChapters}`;
  
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
        const response = await fetch(`chapter${i}.json`);
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
        if ($backgroundMusic) {
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

  // State variables for the confirmation banner
  let showBanner = false;
  let copiedReference = '';
  let sanitizedCopiedReference = '';

  // Reactive variable to hold the sanitized reference HTML
  $: sanitizedReference = $slides[$currentStage]?.reference
    ? DOMPurify.sanitize(marked.parse($slides[$currentStage].reference), {
        ALLOWED_TAGS: [
          'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
          'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'thead',
          'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
      })
    : '';

  // Reactive variable to hold the sanitized copied reference HTML
  $: sanitizedCopiedReference = copiedReference
    ? DOMPurify.sanitize(marked.parse(copiedReference), {
        ALLOWED_TAGS: [
          'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
          'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'thead',
          'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
      })
    : '';

  /**
   * Copies the provided reference text to the clipboard.
   * @param {string} reference - The reference text to copy.
   */
  async function copyReferenceToClipboard(reference) {
    try {
      // Convert Markdown to plain text by removing Markdown syntax
      const plainTextReference = removeMarkdown(reference);
      
      // Copy the plain text to the clipboard
      await navigator.clipboard.writeText(plainTextReference);
      
      // Set the copied reference for the confirmation banner
      copiedReference = plainTextReference;
      showBanner = true;
      
      // Sanitize the copied reference for display in the banner
      sanitizedCopiedReference = DOMPurify.sanitize(marked.parse(reference), {
        ALLOWED_TAGS: [
          'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
          'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'table', 'thead',
          'tbody', 'tr', 'th', 'td', 'blockquote', 'code', 'pre'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
      });
      
      // Hide the banner after 3 seconds
      setTimeout(() => {
        showBanner = false;
        copiedReference = '';
        sanitizedCopiedReference = '';
      }, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Optionally, handle the error (e.g., show an error message)
    }
  }

  /**
   * Handles the click event on the reference section.
   * Copies the reference to the clipboard if available.
   */
  function handleReferenceClick() {
    const reference = $slides[$currentStage]?.reference;
    if (reference) {
      copyReferenceToClipboard(reference);
    }
  }

  /**
   * Handles keydown events on the reference section for accessibility.
   * @param {KeyboardEvent} event - The keyboard event.
   */
  function handleReferenceKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleReferenceClick();
    }
  }
</script>

<style>
  /* Import the global styles */
  @import './appStyles.css';
</style>

<!-- Application Markup -->
{#if !gameStarted}
  <!-- Starting screen using FlashScreen component -->
  <FlashScreen screenType="start" on:proceed={startGame} />
{:else if currentSlideIndex > totalSlides}
  <!-- Ending screen using FlashScreen component -->
  <FlashScreen screenType="end" on:proceed={restartGame} />
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
            {:else if $slides[$currentStage]?.type === 'quote'}
              <QuoteSlide
                updateSlide={handleDialogueEnd}
                characterImage={$slides[$currentStage].characterImage}
                text={$slides[$currentStage].text}
                quoteWho={$slides[$currentStage].quoteWho}
                background={$slides[$currentStage].background}
                soundEffect={$slides[$currentStage].soundEffect}
                reflectionText={$slides[$currentStage].reflectionText}
                isMuted={isMuted}
              />
            {:else if $slides[$currentStage]?.type === 'quotequiz'}
            <QuoteQuizSlide
                updateSlide={handleDialogueEnd}
                characterImage={$slides[$currentStage].characterImage}
                text={$slides[$currentStage].text}
                quoteWho={$slides[$currentStage].quoteWho}
                background={$slides[$currentStage].background}
                soundEffect={$slides[$currentStage].soundEffect}
                isMuted={isMuted}
                choices={$slides[$currentStage].choices}
                correctAnswer={$slides[$currentStage].correctAnswer}
                reflectionTextCorrect={$slides[$currentStage].reflectionTextCorrect}
                reflectionTextIncorrect={$slides[$currentStage].reflectionTextIncorrect}
              />
            {/if}
          </div>
        {/key}
      {/if}

      <!-- Back Button -->
      {#if $history.length > 0}
        <button on:click={goBack} class="back-button" aria-label="Go Back">
          Back
        </button>
      {/if}

      <!-- Progress Bar and Counters -->
      <div class="progress-container">
        <!-- Slide Counter -->
        <div class="slide-counter">
          {slideCounterText}
        </div>
        
        <!-- Separator -->
        <span class="separator" aria-hidden="true">-</span>
        
        <!-- Progress Bar -->
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
        
        <!-- Separator -->
        <span class="separator" aria-hidden="true">-</span>
        
        <!-- Chapter Counter -->
        <div class="chapter-counter">
          {chapterCounterText}
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

      <!-- Reference Section -->
      {#if $slides[$currentStage]?.reference}
        <div 
          class="reference" 
          on:click={handleReferenceClick} 
          on:keydown={handleReferenceKeydown}
          tabindex="0" 
          role="button" 
          aria-label="Copy reference to clipboard"
        >
          <span class="source-label">Source:</span>
          {@html sanitizedReference}
        </div>
      {/if}

      <!-- Reference Copy Confirmation Banner -->
      {#if showBanner}
        <div class="copy-banner" transition:fade={{ duration: 500 }} role="alert" aria-live="assertive">
          Reference successfully copied:<br/><br/>
          {copiedReference}
        </div>
      {/if}

      <!-- Click to Advance Overlay -->
      {#if $currentStage === (slideCounts[$currentChapter] || 0) - 1}
        <ClickToAdvanceOverlay onAdvance={loadNextChapter} />
      {/if}
    </div>
  </div>
{/if}
