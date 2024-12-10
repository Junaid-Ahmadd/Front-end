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

  function addLog(message: string) {
   
    console.log(message); // Log to the browser console
  }

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
          screenshot.data
        ])
      );

      // Log the contents of the screenshots Map
      console.log("Screenshots Map:", Array.from(screenshots.entries()));

      addLog(`Crawled ${totalLinks} unique links`);
      isProcessing = false;

    } catch (error) {
      addLog(`Crawling error: ${error.message}`);
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
              {:else}
                <span class="status pending">Pending</span>
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
    font-family: Arial, sans-serif;
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }

  h1 {
    color: #333;
    text-align: center;
    margin-bottom: 20px;
  }

  .input-group {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }

  input[type="text"], input[type="number"] {
    padding: 10px;
    margin-right: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    width: 300px;
  }

  button {
   padding: 10px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }


  button:hover {
    background-color: #0056b3;
  }

  .stats {
     text-align: center;
    margin-top: 20px;
    font-size: 18px;
    color: #555;
  }

 .stop {
    background-color: #dc3545;
  }

  .stop:hover {
    background-color: #c82333;
  }

  
</style>
