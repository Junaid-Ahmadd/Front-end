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
  <p class="description">Enter a URL to start crawling and capturing screenshots</p>

  <div class="input-group">
    <input
      type="text"
      bind:value={url}
      placeholder="Enter website URL (e.g., https://example.com)"
      disabled={isProcessing}
    />
    {#if !isProcessing}
      <button on:click={submitUrl} disabled={!url} class="submit-btn">
        Submit URL
      </button>
    {:else}
      <button on:click={() => (isProcessing = false)} class="stop-btn">
        Stop
      </button>
    {/if}
  </div>

  {#if totalLinks > 0}
    <div class="stats">
      <span>Unique Pages Found: {totalLinks}</span>
      <span>Screenshots: {screenshots.size}</span>
      <button on:click={toggleCanvas} class="toggle-canvas-btn">
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
                <span class="status captured">✔ Screenshot Captured</span>
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
  /* General Styling */
  :root {
    --primary-color: #4CAF50;
    --secondary-color: #2196F3;
    --danger-color: #f44336;
    --background-light: #f9f9f9;
    --text-color: #333;
    --font-family: 'Roboto', sans-serif;
  }

  body {
    margin: 0;
    font-family: var(--font-family);
    background: var(--background-light);
    color: var(--text-color);
  }

  main {
    max-width: 100%;
    padding: 20px;
    margin: auto;
  }

  h1 {
    text-align: center;
    font-size: 2.5em;
    margin-bottom: 10px;
  }

  .description {
    text-align: center;
    color: #666;
    font-size: 1.2em;
    margin-bottom: 20px;
  }

  /* Input Group */
  .input-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  input {
    width: 100%;
    max-width: 600px;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 1em;
  }

  button {
    padding: 10px 20px;
    font-size: 1em;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.3s, transform 0.2s;
  }

  button:hover {
    transform: scale(1.05);
  }

  .submit-btn {
    background: var(--primary-color);
    color: white;
  }

  .submit-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .stop-btn {
    background: var(--danger-color);
    color: white;
  }

  .toggle-canvas-btn {
    background: var(--secondary-color);
    color: white;
  }

  /* Stats Section */
  .stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
    margin: 20px 0;
  }

  /* Content Section */
  .content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .links-list {
    border: 1px solid #ddd;
    background: white;
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

  .link-url {
    word-break: break-word;
  }

  .status {
    font-size: 0.9em;
    padding: 5px 10px;
    border-radius: 5px;
  }

  .status.captured {
    background: var(--primary-color);
    color: white;
  }

  /* Responsive Design */
  @media (min-width: 600px) {
    .input-group {
      flex-direction: row;
      gap: 10px;
    }

    input {
      flex: 1;
    }
  }

  @media (min-width: 800px) {
    .content {
      flex-direction: row;
    }

    .links-list {
      flex: 1;
    }
  }
</style>
