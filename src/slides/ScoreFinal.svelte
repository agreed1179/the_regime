<!-- src/slides/ScoreFinal.svelte -->
<script>
  import { onMount } from 'svelte';
  import {
    agreeDisagreeChoices,
    currentScore,
    totalQuestions,
    assetPaths,
    playSound,
  } from '../stores.js';
  import { getAssetPath } from '../utils/assetHelper.js';
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
  import { Line } from 'svelte-chartjs';
  // Import Chart.js components
  import {
    Chart,
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    ScatterController,
    Tooltip,
    Legend,
  } from 'chart.js';

  // Register the components
  Chart.register(
    LineController,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    ScatterController,
    Tooltip,
    Legend
  );

  export let updateSlide;
  export let background = '';
  export let soundEffect = '';
  export let isMuted = false;
  export let reference = ''; // Source reference

  // Paths to assets
  $: backgroundPath = getAssetPath('background', background, $assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);

  // Use the $ prefix to access store values reactively
  $: score = $currentScore;
  $: total = $totalQuestions;
  $: choices = $agreeDisagreeChoices || [];

  // Function to compute the binomial coefficient
  function combination(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    let result = 1;
    for (let i = 1; i <= k; i++) {
      result *= (n - k + i) / i;
    }
    return result;
  }

  // Function to compute the binomial PMF
  function binomialProbability(n, k, p) {
    return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  // Function to compute the binomial CDF
  function binomialCDF(n, k, p) {
    let cdf = 0;
    for (let i = 0; i <= k; i++) {
      cdf += binomialProbability(n, i, p);
    }
    return cdf;
  }

  let cdfData = [];
  let labels = [];
  const p = 0.25; // Probability of success (1 out of 4 choices)

  // Compute the binomial CDF data
  function computeCDFData() {
    cdfData = [];
    labels = [];
    for (let k = 0; k <= total; k++) {
      const cdfValue = binomialCDF(total, k, p);
      cdfData.push(cdfValue);
      labels.push(k);
    }
  }

  // Recompute CDF data whenever 'total' changes
  $: if (total > 0) {
    computeCDFData();

    // Chart configuration
    chartData = {
      labels: labels,
      datasets: [
        {
          type: 'line',
          label: 'Binomial CDF',
          data: cdfData,
          fill: false,
          borderColor: 'rgba(54, 162, 235, 1)',
          tension: 0.1,
        },
        {
          type: 'scatter',
          label: 'Your Score',
          data: [{ x: score, y: binomialCDF(total, score, p) }],
          backgroundColor: 'rgba(255, 99, 132, 1)',
          pointRadius: 8,
        },
      ],
    };

    chartOptions = {
      responsive: true,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Number of Correct Answers',
          },
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: total,
          ticks: {
            stepSize: 1,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Cumulative Probability',
          },
          beginAtZero: true,
          max: 1,
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              if (context.dataset.type === 'scatter') {
                return `Your Score: ${context.parsed.x}`;
              } else {
                return `CDF: ${(context.parsed.y * 100).toFixed(2)}%`;
              }
            },
          },
        },
      },
    };
  }

  let chartData;
  let chartOptions;

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
    overflow-y: auto;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .summary-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
  }

  .summary-container {
    max-width: 800px;
    background: rgba(255, 255, 255, 0.8);
    padding: 20px;
    border-radius: 10px;
    width: 100%;
  }

  .title {
    font-size: 2em;
    text-align: center;
    margin-bottom: 20px;
  }

  .agree-disagree-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
  }

  .summary-item {
    display: flex;
    align-items: center;
  }

  .image-container {
    position: relative;
    width: 50px;
    height: 50px;
    flex-shrink: 0;
    margin-right: 10px;
    overflow: hidden;
  }

  .image-container .character-image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    object-position: top center;
    transform: scale(1.5);
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
    margin-top: 20px;
  }

  .chart-container {
    max-width: 800px;
    margin: 20px auto;
  }

  /* Adjust for mobile */
  @media (max-width: 600px) {
    .agree-disagree-summary {
      grid-template-columns: 1fr;
    }

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
  <!-- Summary Wrapper to center content -->
  <div class="summary-wrapper">
    <div class="summary-container">
      <div class="title">...Our Journey So Far...</div>

      {#if choices.length > 0}
        <div class="agree-disagree-summary">
          {#each choices as choice}
            <div class="summary-item">
              <div class="image-container">
                <img
                  src="{getAssetPath('character', choice.characterImage, $assetPaths)}"
                  alt="{choice.quoteWho}"
                  class="character-image"
                />
                {#if choice.choice === 'agree'}
                  <img
                    src="{getAssetPath('icon', 'green_tick.png', $assetPaths)}"
                    alt="Agreed"
                    class="icon"
                  />
                {:else if choice.choice === 'disagree'}
                  <img
                    src="{getAssetPath('icon', 'red_cross.png', $assetPaths)}"
                    alt="Disagreed"
                    class="icon"
                  />
                {/if}
              </div>
              <div class="summary-text">
                You {choice.choice}d with {choice.quoteWho}.
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <div class="quiz-summary">
        You answered {score} out of {total} questions correctly.
      </div>

      <!-- Chart Container -->
      {#if chartData}
        <div class="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      {/if}
    </div>
  </div>

  <!-- Click to advance with overlay -->
  <ClickToAdvanceOverlay onAdvance={handleClick} />
</div>
