<!-- src/App.svelte -->
<script>
  import './appStyles.css';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import removeMarkdown from 'remove-markdown';

  import DialogueSlide from './slides/DialogueSlide.svelte';
  import ChoicesSlide from './slides/ChoicesSlide.svelte';
  import InfoSlide from './slides/InfoSlide.svelte';
  import QuoteSlide from './slides/QuoteSlide.svelte';
  import QuoteMultiSlide from './slides/QuoteMultiSlide.svelte';
  import QuoteQuizSlide from './slides/QuoteQuizSlide.svelte';
  import DreamSlide from './slides/DreamSlide.svelte';
  import ChatSlide from './slides/ChatSlide.svelte';
  import ScoreSummary from './slides/ScoreSummary.svelte';
  import AgreeDisagreeSlide from './slides/AgreeDisagreeSlide.svelte';
  import ScoreFinal from './slides/ScoreFinal.svelte';
  import ClickToAdvanceOverlay from './components/ClickToAdvanceOverlay.svelte';
  import ChapterSelector from './components/ChapterSelector.svelte';

  import StartScreen from './components/StartScreen.svelte';
  import EndScreen from './components/EndScreen.svelte';

  // Import stores
  import { 
    currentStage, 
    slides, 
    history, 
    backgroundImage, 
    currentChapter, 
    backgroundMusic, 
    backgroundVolume, 
    hideReference,
    showBackButton,
    assetPaths 
  
  } from './stores.js';

  // Import utility functions
  import { getAssetPath } from './utils/assetHelper.js';
  import { loadChapter, updateSlide, goBack } from './utils/appLogic.js';
  import { playerChoices } from './stores.js'; // Ensure playerChoices is imported
  import { collectAssetPaths } from './utils/collectAssetPaths.js';

  let assetsToLoad = []; // List of assets to preload

  // Existing variables
  let gameStarted = false;
  let isMuted = false;
  let backgroundAudio;
  $: backgroundAudio; //Make it reactive

  // Progress-related variables
  let slideCounts = [];
  let cumulativeSlideCounts = [];
  let totalSlides = 0;
  let totalChapters = 3;
  
  // Holding chapter data for navigation
  let allChapters = [];
  let chaptersData = [];

  // State variable to indicate the game has ended
  let gameEnded = false;
  
  // State variables for the confirmation banner
  let showBanner = false;
  let copiedReference = '';
  let sanitizedCopiedReference = '';
  let showChapterSelector = false;

  // Default text color for reference and progress counters
  let textColor = 'white'; 
  // Reactive statement to update textColor based on the current slide's blackText property
  $: textColor = $slides[$currentStage]?.blackText ? 'black' : 'white'; 

  // Reactive statement to control back button visibility
  $: {
    const currentSlideType = $slides[$currentStage]?.type;
    if (currentSlideType === 'agreedisagree') {
      showBackButton.set(false);
    } else {
      showBackButton.set(true);
    }
  }

  // Current Slide Index (1-based)
  $: currentSlideIndex = slideCounts
    .slice(0, $currentChapter)
    .reduce((a, b) => a + b, 0) + ($currentStage || 0) + 1;
  
  // Progress Percentage
  $: progress = totalSlides ? (currentSlideIndex / totalSlides) * 100 : 0;
  
  // Current Slide Number within the Current Chapter
  $: currentSlideNumberInChapter = ($currentStage || 0) + 1;

  // Updated Slide Counter Text
  $: slideCounterText = `Slide ${currentSlideNumberInChapter}/${slideCounts[$currentChapter] || 1}`;

  // Chapter Counter Text
  $: chapterCounterText = `Chapter ${$currentChapter + 1}/${totalChapters}`;

  // Reactive variable to hold the background image of the current slide - for the vertical video effect.
  $: currentBackgroundImage = $slides[$currentStage]?.background
    ? getAssetPath('background', $slides[$currentStage].background, $assetPaths)
    : '';

  // Compute Cumulative Slide Counts whenever slideCounts changes
  $: cumulativeSlideCounts = slideCounts.reduce((acc, count, index) => {
    acc.push((acc[index - 1] || 0) + count);
    return acc;
  }, []);

  // Reset hideReference when currentStage changes
  $: if ($currentStage !== undefined) {
    hideReference.set(false);
  }


  // Function to fetch all chapters and count slides (and construct data for chapter navigation button)
  async function fetchAllChapters() {
    totalChapters = 0;
    slideCounts = [];
    cumulativeSlideCounts = [0];
    totalSlides = 0;
    allChapters = [];
    chaptersData = [];

    while (true) {
      try {
        const response = await fetch(`chapter${totalChapters}.json`);
        if (response.ok) {
          const chapterData = await response.json();
          allChapters.push(chapterData);

          const slideCount = chapterData.slides.length;
          slideCounts.push(slideCount);
          totalSlides += slideCount;
          cumulativeSlideCounts.push(totalSlides);

          const chapterTitle = chapterData.title || `Chapter ${totalChapters + 1}`;
          chaptersData.push({
            index: totalChapters,
            title: chapterTitle,
            slideCount: slideCount,
          });

          totalChapters++;
        } else if (response.status === 404) {
          // Expected case when there are no more chapters
          // Do not log an error; simply break out of the loop
          break;
        } else {
          // Handle other HTTP errors (e.g., 500 Internal Server Error)
          console.error(`HTTP error fetching chapter${totalChapters}.json:`, response.status);
          break;
        }
      } catch (error) {
        // Handle network errors (e.g., loss of internet connection)
        console.error(`Network error fetching chapter${totalChapters}.json:`, error);
        break;
      }
    }
  }                 

  
  onMount(() => {
    fetchAllChapters();
  });
  
    // Function to preload assets with progress tracking
    async function preloadAssets(event) {
    console.log('App: preloadAssets function called');
    const { onProgress, onComplete, setTotalAssets } = event.detail;

    // Ensure chapters are fetched to get totalChapters
    await fetchAllChapters();

    // Collect all asset paths
    assetsToLoad = await collectAssetPaths(totalChapters);

    // Set total assets
    const totalAssets = assetsToLoad.length;
    setTotalAssets(totalAssets);

    let loadedAssets = 0;

    // Function to update progress
    function updateProgress() {
      loadedAssets++;
      onProgress(loadedAssets);
    }

    const loadPromises = assetsToLoad.map((assetPath) => {
      return new Promise((resolve) => {
        const fileExtension = assetPath.split('.').pop().toLowerCase();
        let asset;

        if (['png', 'jpg', 'jpeg', 'gif'].includes(fileExtension)) {
          // Image asset
          asset = new Image();
          asset.src = assetPath;
          asset.onload = () => {
            updateProgress();
            resolve();
          };
          asset.onerror = () => {
            console.error(`Failed to load image: ${assetPath}`);
            updateProgress();
            resolve();
          };
        } else if (['mp3', 'wav', 'ogg'].includes(fileExtension)) {
          // Audio asset
          asset = new Audio();
          asset.src = assetPath;
          asset.onloadeddata = () => {
            updateProgress();
            resolve();
          };
          asset.onerror = () => {
            console.error(`Failed to load audio: ${assetPath}`);
            updateProgress();
            resolve();
          };
        } else {
          // Other asset types
          updateProgress();
          resolve();
        }
      });
    });

    await Promise.all(loadPromises);
    console.log('App: All assets loaded');
    onComplete();
  }


  // Function to start the game
  async function startGame() {
    await fetchAllChapters(); // Ensure chapters are fetched before starting
    gameStarted = true;
    currentChapter.set(0); // Start with Chapter 0
    await loadChapter(0); // Load Chapter 0
    currentStage.set(0); // Initialize currentStage
    slides.set(allChapters[$currentChapter].slides); //set initial slide of a chapter



  }

  // Function to load the next chapter
  function loadNextChapter() {
    if ($currentChapter < totalChapters - 1) {
      currentChapter.update(n => n + 1);
      currentStage.set(0);

      // Update slides and other settings
      slides.set(allChapters[$currentChapter].slides);
      backgroundMusic.set(allChapters[$currentChapter].music || '');
      backgroundVolume.set(allChapters[$currentChapter].volume || 1);

      // Reset other states if necessary
      backgroundImage.set('');
      playerChoices.set([]);
      history.set([]);
    } else {
      // Handle game end if needed
      gameEnded = true;
    }
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

  // Reactive statement to update audio volume when backgroundVolume changes
  $: if (backgroundAudio) {
    backgroundAudio.volume = $backgroundVolume;
  }

  // Allow user to navigate around by selecting chapters
  function openChapterSelector() {
    showChapterSelector = true;
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
    gameEnded = false; // Reset gameEnded
    isMuted = false;
    currentChapter.set(0);
    currentStage.set(0);
    slides.set([]);
    history.set([]);
    backgroundImage.set('');
    backgroundMusic.set('');
    backgroundVolume.set(1);
    playerChoices.set([]); // Reset playerChoices
    // Additional resets if necessary

    // Pause and reset background audio
    if (backgroundAudio) {
      backgroundAudio.pause();
      backgroundAudio.currentTime = 0;
      backgroundAudio.src = '';
    }
  }

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

  // handle user click action on chapter navigation
  function handleChapterSelection(event) {
    const { chapterIndex } = event.detail;

    // Update current chapter and stage
    currentChapter.set(chapterIndex);
    currentStage.set(0);

    // Update slides
    slides.set(allChapters[chapterIndex].slides);

    // Update background music and other settings
    backgroundMusic.set(allChapters[chapterIndex].music || '');
    backgroundVolume.set(allChapters[chapterIndex].volume || 1);

    // Reset other states if necessary
    backgroundImage.set('');
    playerChoices.set([]);
    history.set([]);

    // Close the chapter selector
    showChapterSelector = false;
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

  /* Additional styles can be added here if necessary */
</style>

<!-- Application Markup -->
{#if !gameStarted}
  <!-- Starting screen using FlashScreen component -->
  <StartScreen
    on:proceed={startGame}
    on:startLoading={preloadAssets}
  />
  {:else if gameEnded}
  <!-- Ending screen using EndScreen component -->
  <EndScreen on:proceed={restartGame} />
{:else}

  <!-- Main Content Container - override default clicking behaviour to prevent text selection-->
  <div
    class="app-container"
    on:dblclick|preventDefault
    on:mouseup|preventDefault
    on:selectstart|preventDefault
  >
    <!-- Blurred background image -->
    {#key currentBackgroundImage}
      <div
        class="blurred-background"
        style="background-image: url('{currentBackgroundImage}');"
        in:fade={{ duration: 500 }}
        out:fade={{ duration: 500 }}
        >
      </div>
    {/key}
    <!-- Semi-Transparent Overlay -->
    <div class="background-overlay"></div>

    <!-- Actual Existing game content -->
    <div class="meeting-room">
      <!-- Background Audio Element -->
      <audio
      bind:this={backgroundAudio}
      loop
      preload="auto"
      src={$backgroundMusic ? getAssetPath('music', $backgroundMusic, $assetPaths) : ''}
      on:loadeddata={() => {
        if (!isMuted && $backgroundMusic) {
          backgroundAudio.volume = $backgroundVolume; // Ensure volume is set
          backgroundAudio.play().catch(error => {
            console.error('Background music playback failed:', error);
          });
        }
      }}
    ></audio>
      
      <div class="screen" style="background-image: url('{$backgroundImage}');">
        {#if showChapterSelector}
    <ChapterSelector 
      chapters={chaptersData} 
      on:close={() => showChapterSelector = false}
      on:selectChapter={handleChapterSelection}
    />
  {/if}

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
                  guess={$slides[$currentStage].guess}
                />
              {:else if $slides[$currentStage]?.type === 'quotemulti'}
                <QuoteMultiSlide
                  characterImage={$slides[$currentStage].characterImage}
                  quoteWho={$slides[$currentStage].quoteWho}
                  quotes={$slides[$currentStage].quotes}
                  background={$slides[$currentStage].background}
                  soundEffect={$slides[$currentStage].soundEffect}
                  isMuted={isMuted}
                  updateSlide={handleDialogueEnd}
                  guess={$slides[$currentStage].guess}
                  reflectionText={$slides[$currentStage].reflectionText}
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
                  newQuiz={$slides[$currentStage].newQuiz} 
                />
              {:else if $slides[$currentStage]?.type === 'scoresummary'}
                  <ScoreSummary 
                  updateSlide={handleDialogueEnd} 
                  quizId={$slides[$currentStage].quizId}
                  background={$slides[$currentStage].background}
                  soundEffect={$slides[$currentStage].soundEffect}
                  reference={$slides[$currentStage].reference}
                />
              {:else if $slides[$currentStage]?.type === 'dream'}
                <DreamSlide
                  text={$slides[$currentStage].text}
                  soundEffect={$slides[$currentStage].soundEffect}
                  isMuted={isMuted}
                  updateSlide={handleDialogueEnd}
                  fadeInTime={$slides[$currentStage].fadeInTime}
                  fadeOutTime={$slides[$currentStage].fadeOutTime}
                />
              {:else if $slides[$currentStage]?.type === 'agreedisagree'}
                <AgreeDisagreeSlide
                  updateSlide={handleDialogueEnd}
                  characterImage={$slides[$currentStage].characterImage}
                  text={$slides[$currentStage].text}
                  quoteWho={$slides[$currentStage].quoteWho}
                  background={$slides[$currentStage].background}
                  soundEffect={$slides[$currentStage].soundEffect}
                  isMuted={isMuted}
                  reflectionTextCorrect={$slides[$currentStage].reflectionTextCorrect}
                  reflectionTextIncorrect={$slides[$currentStage].reflectionTextIncorrect}
                  agreeDisagreeId={$slides[$currentStage].agreeDisagreeId}
                />
              {:else if $slides[$currentStage]?.type === 'chat'}
                <ChatSlide
                  chats={$slides[$currentStage].chats}
                  chatName={$slides[$currentStage].chatName}
                  soundEffect={$slides[$currentStage].soundEffect}
                  isMuted={isMuted}
                  updateSlide={handleDialogueEnd}
                  background={$slides[$currentStage].background}
                  reflectionText={$slides[$currentStage].reflectionText}
                  reference={$slides[$currentStage].reference}
                  pic={$slides[$currentStage].pic}
                />
                {:else if $slides[$currentStage]?.type === 'finalscore'}
                <ScoreFinal
                  updateSlide={handleDialogueEnd}
                  background={$slides[$currentStage].background}
                  soundEffect={$slides[$currentStage].soundEffect}
                  reference={$slides[$currentStage].reference}
                  isMuted={isMuted}
                />
              {/if}
            </div>
          {/key}
        {/if}

        <!-- Back Button -->
        {#if $history.length > 0 && $showBackButton}
          <button on:click={goBack} class="back-button" aria-label="Go Back">
            Back
          </button>
        {/if}

        <!-- Progress Bar and Counters -->
        <div class="progress-container">
          <!-- Slide Counter -->
          <div class="slide-counter" style="color: {textColor};">
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
          <div class="chapter-counter" style="color: {textColor};">
            {chapterCounterText}
          </div>
        </div>

          <!-- Controls Container -->
          <div class="controls">
            <!-- Chapter Selection Button -->
            <button on:click={openChapterSelector} class="chapter-button" aria-label="Select Chapter">
              Chapters 📖
            </button>

            <!-- Mute/Unmute Button -->
            <button on:click={toggleMute} class="mute-button" aria-label={isMuted ? 'Unmute Music' : 'Mute Music'}>
              {#if isMuted}
                Unmute 🔊
              {:else}
                Mute 🔇
              {/if}
            </button>
          </div>

        <!-- Reference Section -->
        {#if $slides[$currentStage]?.reference && !$hideReference}
          <div 
            class="reference" 
            style="color: {textColor};"
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

  </div>
{/if}
