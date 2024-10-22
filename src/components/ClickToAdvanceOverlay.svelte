<!-- src/components/ClickToAdvanceOverlay.svelte -->
<script>
    export let onAdvance = () => {};
  </script>
  
  <style>
    .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      /* Invisible overlay */
      background: transparent;
      cursor: pointer;
      z-index: 998; /* Ensure it's on top */
    }
  </style>
  
  <div class="overlay" on:click={onAdvance}></div>
  