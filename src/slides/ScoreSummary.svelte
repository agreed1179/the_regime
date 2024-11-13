<!-- src/slides/ScoreSummary.svelte -->
<script>
  import { fade } from 'svelte/transition';
  import { onMount, tick } from 'svelte';
  import { get } from 'svelte/store';
  import { currentScore, totalQuestions, quizScores, assetPaths, playSound } from '../stores.js';
  import { getAssetPath } from '../utils/assetHelper.js';
  import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';

  export let updateSlide; // Function to advance the slide
  export let quizId;      // The ID of the current quiz
  export let background = ''; // Optional background image
  export let reference = '';  // Optional reference text
  export let soundEffect = '';    // (Optional) Sound effect path
  export let isMuted = false;     // Mute state

  // Reactive variables to compute asset paths
  $: backgroundPath = getAssetPath('background', background, $assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);

  // Functions to calculate binomial probability
  function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  function combination(n, k) {
    return factorial(n) / (factorial(k) * factorial(n - k));
  }

  function binomialProbability(n, k, p) {
    return combination(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  function cumulativeBinomialProbability(n, k, p) {
    let cumulativeProbability = 0;
    for (let i = k; i <= n; i++) {
      cumulativeProbability += binomialProbability(n, i, p);
    }
    return cumulativeProbability;
  }

  let score = 0;
  let total = 0;
  let probability = 0;
  let percentage = 0;
  let message = '';

  onMount(async () => {
    await tick(); // Wait for any pending state updates to finish

    // Get the current score and total questions
    const currentScoreValue = get(currentScore);
    const totalQuestionsValue = get(totalQuestions);

    // Retrieve any stored scores for this quizId
    const storedQuizData = get(quizScores)[quizId];

    if (totalQuestionsValue > 0) {
      // If there are answered questions, store them under the quizId in quizScores
      quizScores.update(quizScoresValue => {
        quizScoresValue[quizId] = {
          score: currentScoreValue,
          total: totalQuestionsValue
        };
        return quizScoresValue;
      });

      // Assign score and total directly
      score = currentScoreValue;
      total = totalQuestionsValue;


    } else if (storedQuizData) {
      // No current questions answered, but have stored data
      score = storedQuizData.score;
      total = storedQuizData.total;
    } else {
      // No data, both current and stored
      score = 0;
      total = 0;
    }

    // Perform calculations
    const p = 0.25; // Probability of guessing correctly (1 out of 4 choices)
    probability = cumulativeBinomialProbability(total, score, p);
    percentage = total > 0 ? ((score / total) * 100).toFixed(2) : 0;

    // Determine the message based on performance
    if (percentage == 100) {
      message = "A perfect score! How many times did you hit the back button?";
    } else if (percentage >= 75) {
      message = "Great job! Such a nerd aren't you? (Don't worry I'm the same...)";
    } else if (percentage >= 50) {
      message = 'Good job! You did really well.';
    } else if (percentage >= 25) {
      message = 'Not bad! There were some tough ones.';
    } else if (percentage > 0) {
      message = "Don't worry, these questions were designed to be tricky...";
    } else {
      message = "We all gotta start from somewhere don't we...";
    }

    playSound(soundEffectPath, isMuted); // Play sound on mount
  });

  function handleClick() {
    // Proceed to the next slide or action
    updateSlide();
  }
</script>

<style>
  .score-summary {
    position: relative; /* Ensure positioning context for overlays */
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
    transition: background-image 0.5s ease-in-out;
    background-size: cover;
    background-position: center;
  }

  .content {
    background: rgba(0, 0, 0, 0.7); /* Semi-transparent dark background */
    padding: 30px 20px;
    border-radius: 10px;
    color: #fff;
    max-width: 800px;
    margin: 0 20px;
  }

  .content h1 {
    font-size: 2.5em;
    margin-bottom: 20px;
  }

  .content p {
    font-size: 1.2em;
    margin-bottom: 15px;
  }

  .content .message {
    font-size: 1.5em;
    font-weight: bold;
    margin-top: 20px;
  }

  /* Sequential Fade-in Animation */
  .content p {
    opacity: 0;
    animation: fadeInUp 0.8s ease forwards;
  }

  .content p:nth-child(1) {
    animation-delay: 0.5s;
  }

  .content p:nth-child(2) {
    animation-delay: 1s;
  }

  .content p:nth-child(3) {
    animation-delay: 1.5s;
  }

  .content p:nth-child(4) {
    animation-delay: 2s;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Adjust for mobile screens */
  @media (max-width: 768px) {
    .content {
      padding: 20px 15px;
    }

    .content h1 {
      font-size: 2em;
    }

    .content p {
      font-size: 1em;
    }

    .content .message {
      font-size: 1.3em;
    }
  }
</style>

<div 
  class="score-summary" 
  in:fade={{ duration: 500 }} 
  out:fade={{ duration: 500 }}
  style="background-image: url('{backgroundPath}')"
>
  <div class="content">
    <p>You answered <strong>{score}</strong> out of <strong>{total}</strong> questions correctly.</p>
    <p>Your score: <strong>{Math.round(percentage)}</strong>/100</p>
    <p>
      Probability of achieving this score or better by random guessing*: <br />
      <strong>{(probability * 100).toFixed(2)}%</strong>
    </p>
    
    <p class="message">{message}</p>
  </div>

  <!-- Click-to-Advance Overlay -->
  <ClickToAdvanceOverlay onAdvance={handleClick} />
</div>
