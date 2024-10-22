// src/utils/transitions.js
import { cubicOut } from 'svelte/easing';
import { fade } from 'svelte/transition'; // Import Svelte's built-in fade
import { scale } from 'svelte/transition'; // Import Svelte's built-in scale

// Define the different transition effects
export const transitions = {
  no_effect: {
    name: null,
    duration: 0
  },
  fade_short: {
    name: fade, // Directly use Svelte's fade transition
    duration: 500 // 0.5 seconds
  },
  fade_long: {
    name: fade, // Directly use Svelte's fade transition
    duration: 2000 // 2 seconds
  },
  fade_scale: {
    name: 'fadeScale', // Custom transition name
    duration: 700 // 0.7 seconds
  }
};

// Function to get transition based on the slide
export function getTransition(slide) {
  return transitions[slide.transition] || transitions.no_effect;
}

/**
 * Custom fade transition with customizable duration.
 * @param {Object} params - Transition parameters.
 * @param {number} params.duration - Duration of the transition in milliseconds.
 */
export function customFade(node, { duration = 500 }) {
  return {
    duration,
    css: t => `
      opacity: ${t}
    `
  };
}

/**
 * Custom fly transition with direction and duration.
 * @param {Object} params - Transition parameters.
 * @param {string} params.direction - Direction from which the element flies in ('left', 'right', 'up', 'down').
 * @param {number} params.duration - Duration of the transition in milliseconds.
 */
export function customFly(node, { direction = 'left', duration = 500 }) {
  let x = 0;
  let y = 0;

  switch(direction) {
    case 'left':
      x = -200;
      break;
    case 'right':
      x = 200;
      break;
    case 'up':
      y = -200;
      break;
    case 'down':
      y = 200;
      break;
    default:
      break;
  }

  return {
    duration,
    easing: cubicOut,
    css: t => `
      transform: translate(${x * (1 - t)}px, ${y * (1 - t)}px);
      opacity: ${t}
    `
  };
}

/**
 * Combined Fade and Scale Transition
 * @param {Object} params - Transition parameters.
 * @param {number} params.duration - Duration of the transition in milliseconds.
 */
export function fadeScale(node, { duration = 700 }) {
  return {
    duration,
    easing: cubicOut,
    css: t => `
      opacity: ${t};
      transform: scale(${t});
    `
  };
}
