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
          <span>🚀 Start Crawling</span>
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

{#if screenshots.size > 0}
      <button
        class="view-canvas toggle-canvas-btn"
        on:click={toggleCanvas}
      >
        {isCanvasOpen ? 'Hide Screenshots' : 'View Screenshots'}
      </button>
    {/if}

  <div class="content-section">
    {#if totalLinks > 0}
      <div class="links-list">
        <h2>Discovered Links</h2>
        {#each Array.from(uniqueLinks) as link}
          <div class="link-item">
            <span class="link-url">{link}</span>
            {#if screenshots.has(link)}
              <span class="status captured">Captured</span>
            {/if}
          </div>
        {/each}
      </div>
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
  /* Global variables for colors and fonts */
  :root {
    --primary: #6c63ff;
    --primary-hover: #584fd1;
    --secondary: #f3f4f6;
    --text-primary: #333;
    --text-secondary: #666;
    --background: #f9f9fb;
    --surface: #fff;
    --shadow: rgba(0, 0, 0, 0.1);
    --border-radius: 10px;
    --font-family: 'Roboto', sans-serif;
  }

  /* General styles */
  body {
    font-family: var(--font-family);
    color: var(--text-primary);
    background: var(--background);
    margin: 0;
    padding: 0;
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    box-shadow: 0 4px 6px var(--shadow);
    border-radius: var(--border-radius);
    background: var(--surface);
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
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
    font-size: 1rem;
  }

  .input-section {
    margin-bottom: 2rem;
    padding: 1rem;
    background: linear-gradient(135deg, var(--primary-hover), var(--primary));
    border-radius: var(--border-radius);
    box-shadow: 0 4px 6px var(--shadow);
    color: white;
  }

  .url-input {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  input {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: var(--border-radius);
    box-shadow: inset 0 2px 4px var(--shadow);
    width: 100%;
  }

  input:disabled {
    background: var(--secondary);
  }

  .submit-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--border-radius);
    background: var(--surface);
    color: var(--primary-hover);
    cursor: pointer;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.3s;
  }

  .submit-btn:disabled {
    background: var(--secondary);
    color: var(--text-secondary);
    cursor: not-allowed;
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--primary-hover);
    color: white;
    transform: translateY(-2px);
  }

  .stats {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    justify-content: space-between;
  }

  .stat {
    padding: 1rem;
    background: var(--secondary);
    border-radius: var(--border-radius);
    text-align: center;
    box-shadow: 0 2px 4px var(--shadow);
  }

  .stat .label {
    color: var(--text-secondary);
    font-size: 0.875rem;
  }

  .stat .value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-hover);
  }

  .content-section {
    margin-top: 2rem;
  }

  .links-list {
    padding: 1rem;
    border-radius: var(--border-radius);
    background: var(--surface);
    box-shadow: 0 2px 4px var(--shadow);
  }

  .link-item {
    padding: 0.5rem 0;
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
  }

  .status {
    background: var(--primary);
    color: white;
    padding: 0.25rem 0.5rem;
    border-radius: var(--border-radius);
    font-size: 0.875rem;
    font-weight: bold;
  }

  .toggle-canvas-btn {
    margin-top: 1rem;
    background: var(--primary);
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: var(--border-radius);
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .toggle-canvas-btn:hover {
    transform: translateY(-3px);
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

  /* Responsive Design */
  @media (max-width: 768px) {
    .container {
        padding-top: 2rem;
        padding-right: 1rem;
        padding-bottom: 2rem;
        padding-left: 1rem
    }

    h1 {
      font-size: 1.8rem;
    }

    .input-section {
      flex-direction: column;
      gap: 0.5rem;
    }

    .url-input {
      flex-direction: column;
      gap: 1rem;
    }

    .stats {
      flex-direction: column;
      gap: 0.5rem;
    }

    .stat {
      padding: 0.5rem;
    }

    .links-list {
      font-size: 0.9rem;
    }

    .toggle-canvas-btn {
      font-size: 0.9rem;
    }
  }

  @media (max-width: 480px) {
    h1 {
      font-size: 2rem;
    }

    .input-section {
      padding-top: 1rem;
      padding-right: 1rem;
      padding-bottom: 1rem;
      padding-left: 1rem;
    }

    .stats {
      flex-direction: column;
    }

    .link-url {
      font-size: 0.85rem;
    }
.status {
    font-size: 0.7rem;
  }
  }
</style>
