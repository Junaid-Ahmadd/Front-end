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
    <p class="subtitle">Explore website structures visually and capture screenshots easily.</p>
  </div>

  <div class="input-section">
    <div class="url-input">
      <input
        type="text"
        bind:value={url}
        placeholder="Enter website URL"
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
          <span class="label">Pages Found</span>
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
  :root {
    --primary: #6c63ff;
    --primary-hover: #584fd1;
    --secondary: #f3f4f6;
    --text-primary: #333;
    --text-secondary: #666;
    --background: #f9f9fb;
    --surface: #fff;
    --shadow: rgba(0, 0, 0, 0.1);
    --border-radius: 8px;
    --font-family: 'Roboto', sans-serif;
  }

  body {
    font-family: var(--font-family);
    color: var(--text-primary);
    background: var(--background);
    margin: 0;
    padding: 0;
  }

  .container {
    max-width: 100%;
    padding: 1rem;
    box-shadow: 0 4px 6px var(--shadow);
    border-radius: var(--border-radius);
    background: var(--surface);
  }

  .header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  h1 {
    font-size: 1.8rem;
    margin: 0;
    background: linear-gradient(45deg, var(--primary), var(--primary-hover));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .input-section {
    margin-bottom: 1rem;
  }

  .url-input {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  input {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--secondary);
    border-radius: var(--border-radius);
    box-shadow: inset 0 2px 4px var(--shadow);
    font-size: 0.9rem;
  }

  input:disabled {
    background: var(--secondary);
  }

  .submit-btn {
    padding: 8px 12px;
    border: none;
    border-radius: var(--border-radius);
    background: var(--primary);
    color: white;
    font-size: 0.9rem;
    font-weight: bold;
    white-space: nowrap;
    cursor: pointer;
    transition: all 0.3s;
  }

  .submit-btn:disabled {
    background: var(--secondary);
    color: var(--text-secondary);
    cursor: not-allowed;
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--primary-hover);
  }

  .stats {
    display: flex;
    gap: 1rem;
    justify-content: space-between;
    margin-top: 1rem;
  }

  .stat {
    flex: 1;
    padding: 8px;
    background: var(--secondary);
    border-radius: var(--border-radius);
    text-align: center;
    box-shadow: 0 2px 4px var(--shadow);
  }

  .stat .label {
    color: var(--text-secondary);
    font-size: 0.8rem;
  }

  .stat .value {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--primary-hover);
  }

  .links-list {
    margin-top: 1rem;
    padding: 0.5rem;
    border-radius: var(--border-radius);
    background: var(--surface);
    box-shadow: 0 2px 4px var(--shadow);
  }

  .link-item {
    padding: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--secondary);
  }

  .link-item:last-child {
    border-bottom: none;
  }

  .link-url {
    color: var(--primary-hover);
    word-break: break-word;
    font-size: 0.85rem;
  }

  .status {
    background: var(--primary);
    color: white;
    padding: 2px 6px;
    border-radius: var(--border-radius);
    font-size: 0.8rem;
    font-weight: bold;
  }

  .toggle-canvas-btn {
    margin-top: 1rem;
    background: var(--primary);
    color: white;
    padding: 8px 12px;
    border: none;
    border-radius: var(--border-radius);
    font-size: 0.9rem;
    cursor: pointer;
    transition: transform 0.2s;
    white-space: nowrap;
  }

  .toggle-canvas-btn:hover {
    background: var(--primary-hover);
    transform: translateY(-2px);
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

  @media (max-width: 768px) {
    .stats {
      flex-direction: column;
    }

    .url-input {
      flex-direction: column;
    }

    input,
    .submit-btn {
      width: 100%;
    }
  }
</style>
