<script>
    import { createEventDispatcher } from 'svelte';
  
    export let chapters = []; // Array of chapter data passed from App.svelte
  
    const dispatch = createEventDispatcher();
  
    function selectChapter(index) {
      dispatch('selectChapter', { chapterIndex: index });
    }
  
    function closeSelector() {
      dispatch('close');
    }
</script>

<div class="chapter-selector" on:click|self={closeSelector}>
    <div class="chapter-list" on:click|stopPropagation>
        <div class="close-button" on:click={closeSelector}>✖</div>
        <h2>Select Chapter</h2>
        <ul class="chapter-items">
            {#each chapters as chapter, index}
            <li class="chapter-item" on:click={() => selectChapter(index)}>
                <div class="chapter-info">
                    <h3 class="chapter-title">{chapter.title}</h3>
                    <span class="slide-count">{chapter.slideCount} slides</span>
                </div>
            </li>
            {/each}
        </ul>
    </div>
</div>
  
<style>
    /* Overlay Background */
    .chapter-selector {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.6); /* Slightly darker overlay */
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000; /* Ensure it's on top */
      backdrop-filter: blur(5px); /* Optional: Add a blur effect */
    }
  
    /* Chapter List Container */
    .chapter-list {
      background-color: #f5f5f5; /* Light grey background */
      padding: 25px 20px;
      width: 90%;
      max-width: 450px;
      max-height: 80vh;
      overflow-y: auto;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      position: relative;
      display: flex;
      flex-direction: column;
    }
  
    /* Close Button */
    .close-button {
      position: absolute;
      top: 15px;
      right: 15px;
      cursor: pointer;
      font-size: 1.2em;
      color: #555;
      transition: color 0.3s ease;
    }
  
    .close-button:hover {
      color: #000;
    }
  
    /* Heading */
    h2 {
      margin: 0;
      margin-bottom: 20px;
      font-size: 1.5em;
      color: #333;
      text-align: center;
      font-weight: 400;
    }
  
    /* Chapter Items List */
    .chapter-items {
      list-style: none;
      padding: 0;
      margin: 0;
    }
  
    /* Individual Chapter Item */
    .chapter-item {
      padding: 12px 10px;
      border-bottom: 1px solid #ddd;
      cursor: pointer;
      transition: background-color 0.2s ease, transform 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  
    .chapter-item:last-child {
      border-bottom: none;
    }
  
    .chapter-item:hover {
      background-color: #eaeaea;
      transform: translateX(5px);
    }
  
    /* Chapter Information */
    .chapter-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
  
    /* Chapter Title */
    .chapter-title {
      margin: 0;
      font-size: 1em;
      color: #222;
      font-weight: 500;
    }
  
    /* Slide Count */
    .slide-count {
      font-size: 0.85em;
      color: #777;
      margin-top: 4px;
    }
  
    /* Responsive Adjustments */
    @media (max-width: 500px) {
      .chapter-list {
        padding: 20px 15px;
      }
  
      .chapter-item {
        padding: 10px 8px;
      }
  
      h2 {
        font-size: 1.3em;
        margin-bottom: 15px;
      }
    }
</style>
