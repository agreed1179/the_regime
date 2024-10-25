<!-- src/components/ClickToAdvanceOverlay.svelte -->
<script>
  export let onAdvance = () => {};

  function handleKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAdvance();
    }
  }
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
    z-index: 998; /* Ensure it's below elements with higher z-index like buttons */
    display: flex;
    align-items: center;
    justify-content: center;
  }

</style>

<div 
  class="overlay" 
  on:click={onAdvance} 
  on:keydown={handleKeydown} 
  tabindex="0" 
  role="button" 
  aria-label="Click to advance to the next chapter"
>
</div>
