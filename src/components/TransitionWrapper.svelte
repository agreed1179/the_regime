<!-- src/components/TransitionWrapper.svelte -->
<script>
  import { fade, fly } from 'svelte/transition';
  import { customFade, customFly } from '../utils/transitions.js';
  import { getAssetPath } from '../utils/assetHelper.js';
  
  export let transition = {};
  export let character = {};
  export let assetPaths = {}; // Plain object
  export let imgborder = false; // New prop for border control
  
  /**
   * Determines the appropriate transition function and options based on the transition object.
   * @param {Object} transition - The transition configuration.
   * @returns {Object|null} - Contains the transition type and its options or null if no transition.
   */
  function determineTransition(transition) {
    if (!transition || !transition.type) {
      return null; // No transition specified
    }
    switch (transition.type) {
      case 'fade':
        return { type: 'fade', options: { duration: transition.duration || 500 } };
      case 'dream':
        return { type: 'fade', options: { duration: transition.duration || 1500 } };
      case 'fly':
        return {
          type: 'fly',
          options: {
            x:
              transition.direction === 'left'
                ? -200
                : transition.direction === 'right'
                ? 200
                : 0,
            y:
              transition.direction === 'up'
                ? -200
                : transition.direction === 'down'
                ? 200
                : 0,
            duration: transition.duration || 500,
          },
        };
      case 'customFade':
        return { type: 'customFade', options: { duration: transition.duration || 500 } };
      case 'customFly':
        return {
          type: 'customFly',
          options: {
            direction: transition.direction || 'left',
            duration: transition.duration || 500,
          },
        };
      default:
        return null; // Unrecognized transition type; no transition applied
    }
  }

  const transitionConfig = determineTransition(transition);
</script>

<!-- Conditional Blocks to Apply Transitions -->
{#if transitionConfig}
  {#if transitionConfig.type === 'fade'}
    <img
      class:enhanced={imgborder}
      src="{getAssetPath('character', character.imageSrc, assetPaths)}"
      alt="{character.speaker || 'Character'}"
      in:fade={transitionConfig.options}
      out:fade={{ duration: transitionConfig.options.duration || 500 }}
      loading="lazy"
    />
  {:else if transitionConfig.type === 'fly'}
    <img
      class:enhanced={imgborder}
      src="{getAssetPath('character', character.imageSrc, assetPaths)}"
      alt="{character.speaker || 'Character'}"
      in:fly={transitionConfig.options}
      out:fade={{ duration: transitionConfig.options.duration || 500 }}
      loading="lazy"
    />
  {:else if transitionConfig.type === 'customFade'}
    <img
      class:enhanced={imgborder}
      src="{getAssetPath('character', character.imageSrc, assetPaths)}"
      alt="{character.speaker || 'Character'}"
      in:customFade={transitionConfig.options}
      out:fade={{ duration: transitionConfig.options.duration || 500 }}
      loading="lazy"
    />
  {:else if transitionConfig.type === 'customFly'}
    <img
      class:enhanced={imgborder}
      src="{getAssetPath('character', character.imageSrc, assetPaths)}"
      alt="{character.speaker || 'Character'}"
      in:customFly={transitionConfig.options}
      out:fade={{ duration: transitionConfig.options.duration || 500 }}
      loading="lazy"
    />
  {/if}
{:else}
  <!-- No Transition Applied -->
  <img
    class:enhanced={imgborder}
    src="{getAssetPath('character', character.imageSrc, assetPaths)}"
    alt="{character.speaker || 'Character'}"
    loading="lazy"
  />
{/if}

<style>
  /* Character Image Styling */
  img {
    display: block;
    max-width: 100%;
    height: auto;
  }

  /* Enhanced styles applied when 'enhanced' class is present */
  img.enhanced {
    border-radius: 20px; /* Rounded corners */
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2); /* Shadow for depth */
    transition: transform 0.3s ease, box-shadow 0.3s ease; /* Smooth transitions */
  }

  /* Hover Effects for Enhanced Images */
  img.enhanced:hover {
    transform: scale(1.05); /* Slight zoom on hover */
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3); /* Darker shadow on hover */
  }
</style>
