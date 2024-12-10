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

<main>
  <h1>Web Crawler & Screenshot Tool</h1>
  <p>Enter a URL to start crawling and capturing screenshots</p>

  <div class="input-group">
    <input
      type="text"
      bind:value={url}
      placeholder="Enter website URL (e.g., https://example.com)"
      disabled={isProcessing}
    />
    {#if !isProcessing}
      <button on:click={submitUrl} disabled={!url}>Submit URL</button>
    {:else}
      <button on:click={() => isProcessing = false} class="stop">Stop</button>
    {/if}
  </div>

  {#if totalLinks > 0}
    <div class="stats">
      <span>Unique Pages Found: {totalLinks}</span>
      <span>Screenshots: {screenshots.size}</span>
      <button on:click={toggleCanvas} class="view-screenshots">
        {isCanvasOpen ? 'Hide Screenshots' : 'View Screenshots'}
      </button>
    </div>
  {/if}

  <div class="content">
    <div class="results">
      {#if uniqueLinks.size > 0}
        <div class="links-list">
          <h3>Discovered Links</h3>
          {#each Array.from(uniqueLinks) as link}
            <div class="link-item">
              <span class="link-url">{link}</span>
              {#if screenshots.has(link)}
                <span class="status captured">Screenshot Captured</span>
             
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</main>

{#if isCanvasOpen}
  <InfiniteCanvas
    {screenshots}
    {crawledLinks}
    isOpen={isCanvasOpen}
    onClose={toggleCanvas}
  />
{/if}

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  h1 {
    text-align: center;
  }

  .input-group {
    display: flex;
    gap: 10px;
    margin: 20px 0;
  }

  input {
    flex: 1;
    padding: 8px;
  }

  button {
    padding: 8px 16px;
    background: #4CAF50;
    color: white;
    border: none;
    cursor: pointer;
  }

  button:disabled {
    background: #ccc;
  }

  button.stop {
    background: #f44336;
  }

  button.view-screenshots {
    background: #2196F3;
  }

  .stats {
    margin: 20px 0;
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .content {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 20px;
  }

  .links-list {
    border: 1px solid #ddd;
    padding: 10px;
    margin-bottom: 20px;
  }

  .link-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #eee;
  }

  .link-url {
    word-break: break-all;
    margin-right: 10px;
  }

  .status {
    font-size: 0.9em;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .status.captured {
    background: #4CAF50;
    color: white;
  }

  
</style>
