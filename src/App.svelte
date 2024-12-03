<script lang="ts">
  import InfiniteCanvas from './lib/InfiniteCanvas.svelte';
  import { onMount, onDestroy } from 'svelte';
  
  let url = "";
  let crawledLinks: Array<{ url: string; depth: number }> = [];
  let screenshots: Map<string, string> = new Map();
  let logs: string[] = [];
  let eventSource: EventSource | null = null;
  let isProcessing = false;
  let isCanvasOpen = false;
  let totalLinks = 0;
  let linksByDepth: Map<number, string[]> = new Map();
  let baseUrl = "";

  // Azure Function URL - Replace with your actual Azure Function URL
  const AZURE_FUNCTION_URL = import.meta.env.VITE_AZURE_FUNCTION_URL || 'https://your-function-app.azurewebsites.net/api';

  function addLog(message: string) {
    logs = [...logs, message];
  }

  function setupEventSource() {
    closeEventSource();
    
    const functionKey = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';
    eventSource = new EventSource(`${AZURE_FUNCTION_URL}/events?code=${functionKey}`);
    
    eventSource.onopen = () => {
      addLog('Connected to screenshot service');
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'link':
          const { url: linkUrl, depth, total } = data.data;
          crawledLinks = [...crawledLinks, { url: linkUrl, depth }];
          totalLinks = total;
          
          if (!linksByDepth.has(depth)) {
            linksByDepth.set(depth, []);
          }
          linksByDepth.get(depth)?.push(linkUrl);
          linksByDepth = new Map(linksByDepth);
          break;
        case 'screenshot':
          const { url: screenshotUrl, data: screenshotData } = data.data;
          screenshots.set(screenshotUrl, screenshotData);
          screenshots = new Map(screenshots);
          break;
        case 'error':
          addLog(`Error: ${data.data}`);
          break;
        case 'info':
          addLog(data.data);
          if (data.data === 'Crawling completed' || data.data.includes('completed')) {
            isProcessing = false;
          }
          break;
      }
    };

    eventSource.onerror = (error) => {
      addLog('Error connecting to screenshot service');
      closeEventSource();
    };
  }

  function closeEventSource() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  async function startCrawling() {
    if (!url) return;
    
    isProcessing = true;
    crawledLinks = [];
    screenshots = new Map();
    logs = [];
    totalLinks = 0;
    linksByDepth = new Map();
    baseUrl = new URL(url).origin;
    
    try {
      setupEventSource(); // Only set up EventSource when starting crawling
      
      const functionKey = import.meta.env.VITE_AZURE_FUNCTION_KEY || '';
      const response = await fetch(`${AZURE_FUNCTION_URL}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-functions-key': functionKey
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      addLog('Started crawling ' + url);
      isCanvasOpen = true;
    } catch (error) {
      addLog(`Error starting crawl: ${error.message}`);
      isProcessing = false;
      closeEventSource();
    }
  }

  onMount(() => {
    // Removed automatic setup of EventSource
  });

  onDestroy(() => {
    closeEventSource();
  });
</script>

<main class="container">
  <div class="header">
    <h1>Count Website Pages & Explore It's Design </h1>
    <p class="subtitle">Explore website structures visually with our advanced crawler</p>
  </div>

  <div class="input-section">
    <div class="url-input">
      <input
        type="url"
        bind:value={url}
        placeholder="Enter website URL (e.g., https://example.com)"
        on:keydown={(e) => e.key === 'Enter' && startCrawling()}
      />
      <button
        class="primary"
        on:click={startCrawling}
        disabled={isProcessing}
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

    <div class="stats">
      <div class="stat">
        <span class="label">Pages Found</span>
        <span class="value">{crawledLinks.length}</span>
      </div>
      <div class="stat">
        <span class="label">Screenshots</span>
        <span class="value">{screenshots.size}</span>
      </div>

    </div>
  </div>

  <div class="content-section">
  {#if screenshots.size > 0}
      <button
        class="view-canvas"
        on:click={() => isCanvasOpen = true}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        View Screenshots
      </button>
    {/if}

    <div class="logs">
      <h2>Activity Log</h2>
      <div class="log-container">
        {#each logs as log}
          <div class="log-entry">{log}</div>
        {/each}
      </div>
    </div>
  </div>

  <InfiniteCanvas
    {screenshots}
    {crawledLinks}
    isOpen={isCanvasOpen}
    onClose={() => isCanvasOpen = false}
  />
</main>

<style>
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
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
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

  .logs {
    background: var(--surface);
    border-radius: 0.5rem;
    padding: 1rem;
  }

  h2 {
    margin: 0 0 1rem;
    font-size: 1.25rem;
  }

  .log-container {
    height: 200px;
    overflow-y: auto;
    font-family: monospace;
    font-size: 0.875rem;
  }

  .log-entry {
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--surface-lighter);
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .view-canvas {
    align-self: center;
    margin-top: 1rem;
  }

  .spinner {
    animation: spin 1s linear infinite;
    width: 16px;
    height: 16px;
  }

  .spinner circle {
    opacity: 0.25;
  }

  .spinner circle:nth-child(1) {
    opacity: 1;
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    animation: spinner 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes spinner {
    0% { stroke-dashoffset: 60; }
    50% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -60; }
  }
</style>
