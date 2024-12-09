<script lang="ts">
  import { onMount } from 'svelte';
  import InfiniteCanvas from './lib/InfiniteCanvas.svelte';
  
  let url = "";
  let crawledLinks: Array<{ url: string; depth: number }> = [];
  let screenshots: Map<string, string> = new Map();
  let logs: string[] = [];
  let eventSource: EventSource | null = null;
  let isProcessing = false;
  let isCanvasOpen = false;
  let totalLinks = 0;
  let uniqueLinks = new Set<string>();

  function addLog(message: string) {
    logs = [...logs, `[${new Date().toLocaleTimeString()}] ${message}`];
  }

  function setupEventSource() {
    eventSource = new EventSource(import.meta.env.VITE_AZURE_FUNCTION_URL);

    eventSource.onopen = () => {
      addLog('Connected to screenshot service');
    };

    eventSource.addEventListener('connected', (event) => {
      addLog(event.data);
    });

    eventSource.addEventListener('links_found', (event) => {
      const data = JSON.parse(event.data);
      const { url: linkUrl, links, depth } = data;
      addLog(`Found ${links.length} links on ${linkUrl}`);
      
      // Add to crawledLinks array
      crawledLinks = [...crawledLinks, { url: linkUrl, depth }];
      
      // Add to uniqueLinks set
      links.forEach(link => uniqueLinks.add(link));
      uniqueLinks = new Set(uniqueLinks); // Trigger reactivity
      
      totalLinks = uniqueLinks.size;
    });

    eventSource.addEventListener('screenshot_complete', (event) => {
      const data = JSON.parse(event.data);
      screenshots.set(data.url, data.data);
      screenshots = new Map(screenshots);
      addLog(`Screenshot captured for ${data.url}`);
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      addLog(`Error: ${data.error}`);
      if (data.url) {
        addLog(`Failed URL: ${data.url}`);
      }
    });

    eventSource.onerror = () => {
      addLog('Connection error. Retrying...');
      isProcessing = false;
    };
  }

  async function startCrawling() {
    if (!url) {
      addLog('Please enter a URL');
      return;
    }

    try {
      // Reset state
      crawledLinks = [];
      screenshots = new Map();
      logs = [];
      uniqueLinks.clear();
      totalLinks = 0;
      isProcessing = true;

      // Setup SSE if not already connected
      if (!eventSource) {
        setupEventSource();
      }

      // Start crawling
      const response = await fetch(import.meta.env.VITE_AZURE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Failed to start crawling');
      }

      addLog(`Started crawling from ${url}`);

    } catch (error) {
      addLog(`Failed to start crawling: ${error.message}`);
      isProcessing = false;
    }
  }

  async function stopCrawling() {
    try {
      await fetch(import.meta.env.VITE_AZURE_FUNCTION_URL, {
        method: 'POST'
      });
      addLog('Stopping crawler...');
      
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      
      isProcessing = false;
    } catch (error) {
      addLog(`Error stopping crawler: ${error.message}`);
    }
  }

  async function submitUrl() {
    if (!url) return;

    try {
      const response = await fetch(import.meta.env.VITE_AZURE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      crawledLinks = data.links;
      screenshots = new Map(data.screenshots.map(s => [s.url, s.data]));
    } catch (error) {
      addLog('Error: ' + error.message);
    }
  }

  function toggleCanvas() {
    isCanvasOpen = !isCanvasOpen;
  }

  onMount(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
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
      <button on:click={stopCrawling} class="stop">Stop</button>
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

    <div class="logs">
      <h3>Activity Log</h3>
      <div class="log-content">
        {#each logs as log}
          <div class="log-entry">{log}</div>
        {/each}
      </div>
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

  .status.pending {
    background: #FFC107;
    color: black;
  }

  .logs {
    border: 1px solid #ddd;
    padding: 10px;
  }

  .log-content {
    height: 500px;
    overflow-y: auto;
  }

  .log-entry {
    padding: 5px 0;
    border-bottom: 1px solid #eee;
  }
</style>
