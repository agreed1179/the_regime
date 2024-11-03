<!-- src/slides/ChatSlide.svelte -->
<script>
    import { onMount, onDestroy, tick } from 'svelte';
    import { getAssetPath } from '../utils/assetHelper.js';
    import { assetPaths, asyncPlaySound } from '../stores.js';
    import { marked } from 'marked';
    import DOMPurify from 'dompurify';
    import ClickToAdvanceOverlay from '../components/ClickToAdvanceOverlay.svelte';
    import { fade } from 'svelte/transition';
  
    export let chats = []; // Array of chat messages
    export let chatName = ''; // Chat heading name
    export let soundEffect = '';
    export let isMuted = false;
    export let updateSlide;
    export let background = '';
    export let reflectionText = '';
    export let reference = '';
  
    // Paths to assets
    $: backgroundPath = getAssetPath('background', background, $assetPaths);
    $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
  
    // Sanitize reflectionText
    $: sanitizedReflectionText = reflectionText
      ? DOMPurify.sanitize(marked.parse(reflectionText))
      : '';
  
    let showScrollTip = false;
    let chatContainer;
    let hasScrolled = false;
  
    // Variables for animation
    let displayedChats = []; // Chats that are currently displayed
    let chatInterval;
    let currentChatIndex = 0;
  
    // Variables for click-and-drag scrolling
    let isDragging = false;
    let startY;
    let scrollTopAtStart;
  
    function handleScroll() {
      if (!hasScrolled && chatContainer.scrollTop > 0) {
        hasScrolled = true;
        showScrollTip = false;
      }
    }
  
    function handleClickOutside(event) {
      if (!chatContainer.contains(event.target)) {
        updateSlide();
      }
    }
  
    // Event handlers for click-and-drag scrolling
    function handleMouseDown(event) {
      isDragging = true;
      startY = event.clientY;
      scrollTopAtStart = chatContainer.scrollTop;
      chatContainer.classList.add('grabbing'); // Change cursor
      event.preventDefault(); // Prevent text selection
    }
  
    function handleMouseMove(event) {
      if (isDragging) {
        const deltaY = startY - event.clientY;
        chatContainer.scrollTop = scrollTopAtStart + deltaY;
      }
    }
  
    function handleMouseUp() {
      isDragging = false;
      chatContainer.classList.remove('grabbing'); // Reset cursor
    }
  
    function handleMouseLeave() {
      isDragging = false;
      chatContainer.classList.remove('grabbing'); // Reset cursor
    }
  
    onMount(async () => {
        await asyncPlaySound(soundEffectPath, isMuted); // async playSound function to accommodate async function in onMount
  
      // Add event listener for click outside
      document.addEventListener('click', handleClickOutside);
  
      // Wait for the DOM to be ready
      await tick();
  
      // Start displaying chats one after another
      chatInterval = setInterval(async () => {
        if (currentChatIndex < chats.length) {
          // Update displayedChats reactively
          displayedChats = [...displayedChats, chats[currentChatIndex]];
          currentChatIndex++;
  
          // Wait for the DOM to update
          await tick();
  
          // Scroll to bottom to show new message
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        } else {
          clearInterval(chatInterval);
          // Smoothly scroll to top after all messages are displayed
          setTimeout(() => {
            if (chatContainer) {
              chatContainer.scrollTo({ top: 0, behavior: 'smooth' });
              // Check if scroll is needed after messages are rendered
              setTimeout(() => {
                if (chatContainer.scrollHeight > chatContainer.clientHeight) {
                  showScrollTip = true;
                }
              }, 500); // Delay to ensure smooth scroll completes
            }
          }, 100); // Small delay to ensure messages are rendered
        }
      }, 200); // Adjust the interval as needed (e.g., 200ms between messages)
    });
  
    onDestroy(() => {
      document.removeEventListener('click', handleClickOutside);
      // Clean up the interval
      clearInterval(chatInterval);
    });
  </script>
  
  <style>
    .chat-slide {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
  
    .chat-container {
      width: 385px;
      height: 720px;
      background-color: #f5f5f5;
      border-radius: 30px;
      overflow: hidden;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      position: relative;
      display: flex;
      flex-direction: column;
      z-index: 1000;
    }
  
    /* Chat Header */
    .chat-header {
      height: 50px; /* Reduced from 60px */
      background-color: #075e54;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center; /* Center align */
      padding: 0 15px;
      font-size: 1.1em; /* Reduced font size */
      /* Removed font-weight: bold; */
      flex-shrink: 0;
    }
  
    .chat-messages {
      flex-grow: 1;
      padding: 10px;
      overflow-y: auto;
      overflow-x: hidden;
      background-color: #e5ddd5;
      position: relative;
      cursor: grab;
      user-select: none;
    }
  
    .chat-messages.grabbing {
      cursor: grabbing;
    }
  
    .chat-message {
      display: flex;
      align-items: flex-start; /* Align items to the top */
      margin-bottom: 10px;
    }
  
    .chat-message.left {
      justify-content: flex-start;
    }
  
    .chat-message.right {
      justify-content: flex-end;
    }
  
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      object-position: top; /* Align image to the top */
    }
  
    .message-content {
      display: flex;
      flex-direction: column;
      max-width: 70%;
    }
  
    .message {
      background-color: #ffffff;
      padding: 10px;
      border-radius: 10px;
      word-wrap: break-word;
      position: relative;
    }
  
    .message.left {
      background-color: #ffffff;
      border-top-left-radius: 0; /* Sharp corner on top left */
    }
  
    .message.right {
      background-color: #dcf8c6;
      border-top-right-radius: 0; /* Sharp corner on top right */
    }
  
    .message .sender-name {
      font-size: 0.8em;
      color: gray;
      margin-bottom: 5px;
    }
  
    .message .sender-name.right {
      text-align: right;
    }
  
    /* Add triangle (tail) to the message bubble */
    .message.left::before {
      content: '';
      position: absolute;
      top: 0;
      left: -10px;
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-right: 10px solid #ffffff;
    }
  
    .message.right::before {
      content: '';
      position: absolute;
      top: 0;
      right: -10px;
      width: 0;
      height: 0;
      border-top: 10px solid transparent;
      border-left: 10px solid #dcf8c6;
    }
  
    .scroll-tip {
      position: absolute;
      top: 5px;
      right: 10px;
      background-color: rgba(0,0,0,0.7);
      color: white;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 0.9em;
      animation: fadeInOut 3s ease-in-out infinite;
    }
  
    @keyframes fadeInOut {
      0%, 100% { opacity: 0;}
      50% { opacity: 1;}
    }
  
    /* Message Input Bar */
    .message-input-bar {
      height: 50px; /* Reduced from 60px */
      background-color: #ffffff;
      border-top: 1px solid #cccccc;
      display: flex;
      align-items: center;
      padding: 0 15px;
      flex-shrink: 0;
    }
  
    .message-input-bar .input-placeholder {
      color: #999999;
      font-size: 0.9em; /* Reduced font size */
    }
  
    .reflection-box {
      position: absolute;
      bottom: 0;
      width: 100%;
      height: 15%; /* Occupy bottom 15% of the screen */
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 15px;
      box-sizing: border-box;
      text-align: center;
      font-size: 1.2em;
      z-index: 1; /* Ensure it appears above other elements */
    }
  
    /* Adjustments for mobile */
    @media (max-width: 600px) {
      .chat-container {
        width: 95%;
        height: 80vh;
      }
  
      .message {
        max-width: 80%;
      }
  
      .reflection-box {
        width: 100%;
        height: 20%; /* Slightly taller on mobile */
      }
    }
  </style>
  
  <div class="chat-slide" style="background-image: url('{backgroundPath}');">
    <!-- ClickToAdvanceOverlay to capture clicks outside the chat container -->
    <ClickToAdvanceOverlay onAdvance={updateSlide} />
    <div class="chat-container">
      <!-- Chat Header -->
      <div class="chat-header">
        {chatName}
      </div>
      <!-- Chat Messages -->
      <div
        class="chat-messages"
        bind:this={chatContainer}
        on:scroll={handleScroll}
        on:mousedown={handleMouseDown}
        on:mousemove={handleMouseMove}
        on:mouseup={handleMouseUp}
        on:mouseleave={handleMouseLeave}
      >
        <!-- Display chat messages -->
        {#each displayedChats as chat, index (index)}
          <div class="chat-message {chat.position}" transition:fade="{{duration: 300}}">
            {#if chat.position === 'left'}
              <!-- Left-aligned message -->
              <img
                src="{getAssetPath('character', chat['who-img'], $assetPaths)}"
                alt="{chat.who}"
                class="avatar"
                transition:fade="{{duration: 300}}"
              />
              <div class="message-content">
                <div class="message {chat.position}">
                  <div class="sender-name">{chat.who}</div>
                  <div class="text">{chat.text}</div>
                </div>
              </div>
            {:else}
              <!-- Right-aligned message -->
              <div class="message-content">
                <div class="message {chat.position}">
                  <div class="sender-name right">{chat.who}</div>
                  <div class="text">{chat.text}</div>
                </div>
              </div>
              <img
                src="{getAssetPath('character', chat['who-img'], $assetPaths)}"
                alt="{chat.who}"
                class="avatar"
                transition:fade="{{duration: 300}}"
              />
            {/if}
          </div>
        {/each}
        {#if showScrollTip}
          <div class="scroll-tip">Scroll to read more</div>
        {/if}
      </div>
      <!-- Message Input Bar -->
      <div class="message-input-bar">
        <div class="input-placeholder">Type a message...</div>
      </div>
    </div>
    <!-- Reflection Text -->
    {#if reflectionText}
      <div class="reflection-box">
        {@html sanitizedReflectionText}
      </div>
    {/if}
  </div>
  