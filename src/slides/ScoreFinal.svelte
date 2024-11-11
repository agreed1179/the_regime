<!-- src/slides/ScoreFinal.svelte -->
<script>
    import { onMount } from 'svelte';
    import { agreeDisagreeChoices, currentScore, totalQuestions, assetPaths, playSound } from '../stores.js';
    import { getAssetPath } from '../utils/assetHelper.js';
    import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';

    export let updateSlide;
    export let background = '';
    export let soundEffect = '';
    export let isMuted = false;
  
    // Paths to assets
    $: backgroundPath = getAssetPath('background', background, $assetPaths);
    $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
  
    // Subscribe to the stores
    let choices = [];
    agreeDisagreeChoices.subscribe(value => {
      choices = value;
    });
  
    let score = 0;
    currentScore.subscribe(value => {
      score = value;
    });
  
    let total = 0;
    totalQuestions.subscribe(value => {
      total = value;
    });
  
    onMount(() => {
      playSound(soundEffectPath, isMuted);
    });
  
    function handleClick() {
      updateSlide();
    }
  </script>
  
  <style>
    .score-final {
      position: relative;
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      padding: 20px;
      box-sizing: border-box;
      overflow-y: auto;
    }
  
    .summary-container {
      max-width: 800px;
      margin: 0 auto;
      background: rgba(255,255,255,0.8);
      padding: 20px;
      border-radius: 10px;
    }
  
    .title {
      font-size: 2em;
      text-align: center;
      margin-bottom: 20px;
    }
  
    .agree-disagree-summary {
      margin-bottom: 20px;
    }
  
    .summary-item {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
    }
  
    .image-container {
      position: relative;
      width: 50px;
      height: 50px;
      flex-shrink: 0;
      margin-right: 10px;
      overflow: hidden; /* Hide overflow to allow zooming */
    }
  
    .image-container .character-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      object-position: top center;
      transform: scale(1.5); /* Zoom in on the face */
    }
  
    .image-container .icon {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 24px;
      height: 24px;
    }
  
    .summary-text {
      font-size: 1.2em;
    }
  
    .quiz-summary {
      font-size: 1.5em;
      text-align: center;
    }
  
    /* Adjust for mobile */
    @media (max-width: 600px) {
      .summary-item {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
  
      .image-container {
        margin-right: 0;
        margin-bottom: 10px;
      }
  
      .summary-text {
        font-size: 1em;
      }
    }
  </style>
  
  <div class="score-final" style="background-image: url('{backgroundPath}');">
    <div class="summary-container">
      <div class="title">Your Journey So Far...</div>
  
      {#if choices.length > 0}
        <div class="agree-disagree-summary">
          {#each choices as choice}
            <div class="summary-item">
              <div class="image-container">
                <img src="{getAssetPath('character', choice.characterImage, $assetPaths)}" alt="{choice.quoteWho}" class="character-image" />
                {#if choice.choice === 'agree'}
                  <img src="{getAssetPath('icon', 'green_tick.png', $assetPaths)}" alt="Agreed" class="icon" />
                {:else if choice.choice === 'disagree'}
                  <img src="{getAssetPath('icon', 'red_cross.png', $assetPaths)}" alt="Disagreed" class="icon" />
                {/if}
              </div>
              <div class="summary-text">You {choice.choice}d with {choice.quoteWho}.</div>
            </div>
          {/each}
        </div>
      {/if}
  
      <div class="quiz-summary">
        You answered {score} out of {total} questions correctly.
      </div>
    </div>
  
    <!-- Click to advance with overlay -->
    <ClickToAdvanceOverlay onAdvance={handleClick} />
  </div>
  