<!-- src/slides/ChatSlide.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { getAssetPath } from '../utils/assetHelper.js';
  import { assetPaths, asyncPlaySound } from '../stores.js';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import { fade } from 'svelte/transition';

  export let chats = []; // Array of chat messages
  export let chatName = ''; // Chat heading name
  export let soundEffect = '';
  export let isMuted = false;
  export let updateSlide;
  export let background = '';
  export let reflectionText = '';
  export let reference = '';
  export let pic = ''; 

  // Paths to assets
  $: backgroundPath = getAssetPath('background', background, $assetPaths);
  $: soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
  // Compute the image path for 'pic'

  // Sanitize reflectionText
  $: sanitizedReflectionText = reflectionText
    ? DOMPurify.sanitize(marked.parse(reflectionText))
    : '';

  let showScrollTip = false;
  let chatContainer;
  let chatHeader; // Reference to the chat header
  let messageInputBar; // Reference to the message input bar
  let bannerMessage; // Reference to the banner message
  let hasScrolled = false;

  // Variables for animation
  let displayedChats = []; // Chats that are currently displayed
  let chatInterval;
  let currentChatIndex = 0;

  // Variables for click-and-drag scrolling with momentum
  let isDragging = false;
  let startY;
  let scrollTopAtStart;
  let positions = []; // Store positions and timestamps
  let velocity = 0; // Initial scroll velocity
  let momentumID; // ID for requestAnimationFrame

  // Variable to control the display of the banner message
  let showBannerMessage = false;

  function handleScroll() {
    if (!hasScrolled && chatContainer.scrollTop > 0) {
      hasScrolled = true;
      showScrollTip = false;
    }
  }

  function handleClickOutside(event) {
    if (
      !chatContainer.contains(event.target) &&
      !chatHeader.contains(event.target) &&
      !messageInputBar.contains(event.target) &&
      !(bannerMessage && bannerMessage.contains(event.target))
    ) {
      console.log("triggered")
      //updateSlide();
    }
  }

  // Event handlers for click-and-drag scrolling with momentum
  function handleMouseDown(event) {
    isDragging = true;
    startY = event.clientY;
    scrollTopAtStart = chatContainer.scrollTop;
    positions = [{ time: Date.now(), y: event.clientY }];
    chatContainer.classList.add('grabbing'); // Change cursor
    event.preventDefault(); // Prevent text selection

    // Stop any ongoing momentum scrolling
    if (momentumID) {
      cancelAnimationFrame(momentumID);
    }
  }

  function handleMouseMove(event) {
    if (isDragging) {
      const deltaY = startY - event.clientY;
      chatContainer.scrollTop = scrollTopAtStart + deltaY;

      // Record the position and time
      positions.push({ time: Date.now(), y: event.clientY });

      // Keep only the last 5 positions to calculate velocity
      if (positions.length > 5) {
        positions.shift();
      }
    }
  }

  function handleMouseUp() {
    if (isDragging) {
      isDragging = false;
      chatContainer.classList.remove('grabbing'); // Reset cursor

      // Calculate velocity
      if (positions.length >= 2) {
        const lastPosition = positions[positions.length - 1];
        const secondLastPosition = positions[positions.length - 2];

        const deltaY = lastPosition.y - secondLastPosition.y;
        const deltaTime = lastPosition.time - secondLastPosition.time;

        velocity = deltaY / deltaTime; // pixels per millisecond
        // Invert velocity to match scroll direction
        velocity = -velocity;

        // Start momentum scrolling if velocity is significant
        if (Math.abs(velocity) > 0.1) {
          momentumScroll();
        }
      }

      positions = []; // Reset positions
    }
  }

  function handleMouseLeave() {
    if (isDragging) {
      handleMouseUp();
    }
  }

  function momentumScroll() {
    if (Math.abs(velocity) > 0.1) {
      chatContainer.scrollTop += velocity * 16; // Assuming 60fps, 16ms per frame
      velocity *= 0.95; // Apply friction to slow down

      // Prevent scrolling beyond the content
      if (
        chatContainer.scrollTop < 0 ||
        chatContainer.scrollTop > chatContainer.scrollHeight - chatContainer.clientHeight
      ) {
        velocity = 0;
      }

      momentumID = requestAnimationFrame(momentumScroll);
    } else {
      cancelAnimationFrame(momentumID);
    }
  }

  // Handle click on the message input bar
  function handleMessageInputClick() {
    showBannerMessage = true;
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
    }, 100); // Adjust the interval as needed (e.g., 100ms between messages) - this is the rate at which messages are populated initially. Currently at 100ms to make long conversations load faster.
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
    // Clean up the interval
    clearInterval(chatInterval);
    // Cancel any ongoing momentum scrolling
    if (momentumID) {
      cancelAnimationFrame(momentumID);
    }
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
      z-index: 1000;
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

      /* Custom scrollbar styling */
      scrollbar-width: thin; /* For Firefox */
      scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    }
  
    /* WebKit-based browsers */
    .chat-messages::-webkit-scrollbar {
      width: 4px; /* Adjust the width to make it thin */
    }
  
    .chat-messages::-webkit-scrollbar-track {
      background: transparent; /* Make the track transparent */
    }
  
    .chat-messages::-webkit-scrollbar-thumb {
      background-color: rgba(0, 0, 0, 0.2); /* Dark grey thumb */
      border-radius: 10px; /* Rounded corners */
    }
  
    .chat-messages::-webkit-scrollbar-thumb:hover {
      background-color: rgba(0, 0, 0, 0.4); /* Darker on hover */
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
      font-family: 'Roboto', sans-serif;
      font-size: 0.9em; /* Reduced font size */
    }
  
    .message {
      background-color: #ffffff;
      padding-top: 3px; /* reduced top to make it look more natural and space efficient */
      padding-left: 8px; /* reduced other paddings to render a sleek, modern feel */
      padding-right: 8px;
      padding-bottom: 8px;
      border-radius: 10px;
      word-wrap: break-word;
      position: relative;
      display: flex;
      flex-direction: column;
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

    .message-image {
      max-width: 100%;
      max-height: 200px;
      margin-bottom: 5px;
      border-radius: 5px;
      object-fit: contain; /* Preserve aspect ratio */
    }

    .system-message {
      text-align: center;
      color: gray;
      font-size: 0.8em;
      margin: 10px 0;
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
      cursor: pointer; /* Make it look clickable */
      z-index: 1000;
    }
  
    .message-input-bar .input-placeholder {
      color: #999999;
      font-size: 0.9em; /* Reduced font size */
      z-index: 1000;
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
  
    /* Banner Message */
    .banner-message {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      color: #fff;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2000; /* Higher than other elements */
      padding: 20px;
      box-sizing: border-box;
      text-align: center;
    }
  
    .banner-message p {
      margin: 10px 0;
      font-size: 1.2em;
    }
  


    .content-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .slide-image {
      max-width: 50%;      /* Adjust as needed */
      max-height: 80vh;    /* Keep image within viewport height */
      object-fit: contain; /* Preserve aspect ratio without stretching */
      margin: 0 20px;      /* Space between image and chat */
    }

    /* Adjustments for mobile */
    @media (max-width: 600px) {
      .chat-container {
        width: 95%;
        height: 80vh;
      }
      .content-container {
        flex-direction: column; /* Stack image and chat vertically on small screens */
      }

      .slide-image, .chat-container {
        max-width: 90%;    /* Full width on mobile */
        margin: 10px 0;    /* Space between elements */
      }

      .message {
        max-width: 80%;
      }
  
      .reflection-box {
        width: 100%;
        height: 20%; /* Slightly taller on mobile */
      }
  
      .banner-message p {
        font-size: 1em;
      }

    }
  </style>
  
  <div class="chat-slide" style="background-image: url('{backgroundPath}');">
    <!-- Removed ClickToAdvanceOverlay -->
    <div class="content-container">
      {#if pic}
        <!-- Display the image -->
        <img src="{getAssetPath('character', pic, $assetPaths)}" alt="Slide Image" class="slide-image" />
      {/if}
      <!-- Chat Container -->
      <div class="chat-container">
        <!-- Chat Header -->
        <div class="chat-header" bind:this={chatHeader}>
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
            {#if chat.recall}
              <!-- Recalled Message -->
              <div class="system-message" transition:fade="{{duration: 300}}">
                {chat.who} has recalled a message.
              </div>
            {:else if chat.joined}
              <!-- Joined Message -->
              <div class="system-message" transition:fade="{{duration: 300}}">
                {chat.who} has joined the chat.
              </div>
            {:else}
              <!-- Regular Message -->
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
                      {#if chat['chat-image']}
                      <!-- Remember that all chat images are stored under 'character' too. -->
                        <img
                          src="{getAssetPath('character', chat['chat-image'], $assetPaths)}" 
                          alt="Chat Image"
                          class="message-image"
                        />
                      {/if}
                      {#if chat.text}
                        <div class="text">{chat.text}</div>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <!-- Right-aligned message -->
                  <div class="message-content">
                    <div class="message {chat.position}">
                      <div class="sender-name right">{chat.who}</div>
                      {#if chat['chat-image']}
                      <!-- Remember that all chat images are stored under 'character' too. -->
                        <img
                          src="{getAssetPath('character', chat['chat-image'], $assetPaths)}"
                          alt="Chat Image"
                          class="message-image"
                        />
                      {/if}
                      {#if chat.text}
                        <div class="text">{chat.text}</div>
                      {/if}
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
            {/if}
          {/each}
          {#if showScrollTip}
            <div class="scroll-tip">Scroll to read more</div>
          {/if}
        </div>
        <!-- Message Input Bar -->
        <div class="message-input-bar" on:click={handleMessageInputClick} bind:this={messageInputBar}>
          <div class="input-placeholder">Type a message...</div>
        </div>
        <!-- Banner Message -->
        {#if showBannerMessage}
          <div
            class="banner-message"
            bind:this={bannerMessage}
            on:click={(event) => {
              showBannerMessage = false;
              event.stopPropagation();
            }}
          >
            <p>Glad to see that you're keen to join the conversation</p>
            <p>In the future I might put an AI in there so you can have a good chat...</p>
            <p>But for now, email me your thoughts instead :)</p>
          </div>
        {/if}
      </div>
    </div>
    <!-- Reflection Text -->
    {#if reflectionText}
      <div class="reflection-box">
        {@html sanitizedReflectionText}
      </div>
    {/if}
  </div>


  