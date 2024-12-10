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
    <p class="subtitle">Explore website structures visually with our advanced crawler</p>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12" y2="8"/>
          </svg>
          Start Crawling
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
          <span class="label">Screenshots</span>
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
              <span class="status captured">✔ Screenshot Captured</span>
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
  /* Maintain existing styles */
  :root {
    --primary: #4CAF50;
    --primary-hover: #45A049;
    --danger: #f44336;
    --surface: #fff;
    --surface-lighter: #f1f1f1;
    --text-secondary: #666;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;
    background: linear-gradient(45deg, var(--primary), var(--primary-hover));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    color: var(--text-secondary);
    margin: 0.5rem 0 0;
  }

  .input-section {
    margin-bottom: 2rem;
  }

  .url-input {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  input {
    flex: 1;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .stat {
    background: var(--surface);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .stat .label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .stat .value {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .content-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .links-list {
    border: 1px solid #ddd;
    background: var(--surface);
    padding: 15px;
    border-radius: 5px;
  }

  .link-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
  }

  .link-item:last-child {
    border-bottom: none;
  }

  .view-canvas {
    margin-top: 1rem;
  }

  .spinner {
    animation: spin 1s linear infinite;
    width: 16px;
    height: 16px;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>

