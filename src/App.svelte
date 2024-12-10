<script lang="ts">
  import { onMount } from 'svelte';
  import InfiniteCanvas from './lib/InfiniteCanvas.svelte';
  
  let url = "";
  let crawledLinks: Array<{ url: string; depth: number }> = [];
  let screenshots: Map<string, string> = new Map();
  let isProcessing = false;
  let isCanvasOpen = false;
  let totalLinks = 0;
  let uniqueLinks = new Set<string>();

  async function submitUrl() {
    if (!url) return;

    try {
      // Reset all state
      crawledLinks = [];
      screenshots = new Map();
      uniqueLinks.clear();
      totalLinks = 0;
      isProcessing = true;

      // Directly fetch from Azure Function
      const response = await fetch(import.meta.env.VITE_AZURE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Crawling failed');
      }

      const data = await response.json();

      // Process links
      crawledLinks = data.links.map(link => ({ url: link, depth: 0 }));
      uniqueLinks = new Set(crawledLinks.map(link => link.url));
      totalLinks = uniqueLinks.size;

      // Process screenshots
      screenshots = new Map(
        data.screenshots.map(screenshot => [
          screenshot.url, 
          screenshot.data // This should be the base64 encoded data
        ])
      );

      // Log the contents of the screenshots Map
      console.log("Screenshots Map:", Array.from(screenshots.entries()));

      isProcessing = false;

    } catch (error) {
      console.error(`Crawling error: ${error.message}`);
      isProcessing = false;
    }
  }

  function toggleCanvas() {
    isCanvasOpen = !isCanvasOpen;
  }

  onMount(() => {
    return () => {
    };
  });
</script>


<main class="container">
  <div class="header">
    <h1>Web Crawler & Screenshot Tool</h1>
    <p class="subtitle">Uncover website structures and capture visual representations effortlessly.</p>
  </div>

  <div class="input-section">
    <div class="url-input">
      <input
        type="text"
        bind:value={url}
        placeholder="Enter website URL (e.g., https://example.com)"
        on:keydown={(e) => e.key === 'Enter' && submitUrl()}
        disabled={isProcessing}
      />
      <button
        class="submit-btn"
        on:click={submitUrl}
        disabled={!url || isProcessing}
      >
        {#if isProcessing}
          <svg class="spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="4" />
          </svg>
          Processing...
        {:else}
          <span>Start Crawling</span>
        {/if}
      </button>
    </div>

    {#if totalLinks > 0}
      <div class="stats">
        <div class="stat">
          <span class="label">Unique Pages Found</span>
          <span class="value">{totalLinks}</span>
        </div>
        <div class="stat">
          <span class="label">Screenshots Captured</span>
          <span class="value">{screenshots.size}</span>
        </div>
      </div>
    {/if}
  </div>

  <div class="content-section">
    {#if totalLinks > 0}
      <div class="links-list">
        <h2>Discovered Links</h2>
        {#each Array.from(uniqueLinks) as link}
          <div class="link-item">
            <span class="link-url">{link}</span>
            {#if screenshots.has(link)}
              <span class="status captured">✔ Captured</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if screenshots.size > 0}
      <button
        class="view-canvas toggle-canvas-btn"
        on:click={toggleCanvas}
      >
        {isCanvasOpen ? 'Hide Screenshots' : 'View Screenshots'}
      </button>
    {/if}
  </div>

  {#if isCanvasOpen}
    <InfiniteCanvas
      {screenshots}
      {crawledLinks}
      isOpen={isCanvasOpen}
      onClose={toggleCanvas}
    />
  {/if}
</main>

<style>
  /* General styles */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem; /* Reduced padding for better responsiveness */
  }

  .header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 2rem; /* Slightly smaller font for better mobile readability */
    margin: 0;
  }

  .subtitle {
    font-size: 1rem;
    margin: 0.5rem 0 0;
  }

  .input-section {
    margin-bottom: 1.5rem;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .url-input {
    display: flex;
    gap: 0.5rem; /* Reduced gap for compact layout */
    align-items: center;
    flex-wrap: wrap; /* Ensures input and button stack on smaller screens */
  }

  input {
    flex: 1;
    padding: 8px; /* Compact padding */
    border: 1px solid #ccc;
    border-radius: 8px;
  }

  .submit-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 8px;
    background: #4CAF50;
    color: white;
    cursor: pointer;
    white-space: nowrap; /* Prevents text wrapping */
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .stats {
    display: flex;
    flex-wrap: wrap; /* Ensures stats stack on smaller screens */
    gap: 1rem;
    margin-top: 1rem;
    justify-content: space-between;
  }

  .stat {
    padding: 0.5rem;
    border-radius: 8px;
    background: #f9f9fb;
    text-align: center;
  }

  .content-section {
    margin-top: 1.5rem;
  }

  .links-list {
    padding: 1rem;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .link-item {
    padding: 0.5rem 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
  }

  .link-item:last-child {
    border-bottom: none;
  }

  .link-url {
    word-break: break-word;
  }

  .status {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    background: #4CAF50;
    color: white;
  }

  .toggle-canvas-btn {
    padding: 8px 16px;
    margin-top: 1rem;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 8px;
    white-space: nowrap; /* Prevents text wrapping */
    cursor: pointer;
  }

  .spinner {
    animation: spin 1s linear infinite;
    width: 16px;
    height: 16px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Mobile Responsiveness */
  @media (max-width: 768px) {
    .stats {
      flex-direction: column;
    }

    .url-input {
      flex-direction: column; /* Stack input and button vertically */
    }

    input,
    .submit-btn {
      width: 100%; /* Full width on smaller screens */
    }

    .toggle-canvas-btn {
      width: 100%; /* Full width for consistent layout */
    }

    .links-list {
      font-size: 0.875rem; /* Slightly smaller text for better readability */
    }
  }
</style>

