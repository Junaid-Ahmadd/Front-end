<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { spring } from 'svelte/motion';
  
  export let screenshots: Map<string, string>;
  export let crawledLinks: Array<{ url: string; depth: number }>;
  export let isOpen: boolean;
  export let onClose: () => void;

  const dispatch = createEventDispatcher();
  
  // Canvas state
  let canvas: HTMLDivElement;
  let minimap: HTMLDivElement;
  let isDragging = false;
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  
  // Viewport state
  const viewport = spring({ x: 0, y: 0, scale: 1 }, {
    stiffness: 0.2,
    damping: 0.6
  });
  
  // Constants
  const MIN_SCALE = 0.1;
  const MAX_SCALE = 5;
  const ZOOM_SPEED = 0.002;
  const GRID_SIZE = 50;
  
  // Screenshot layout
  let layout = new Map<string, { x: number, y: number, width: number, height: number }>();
  
  function initLayout() {
    layout.clear();
    let currentX = 0;
    const padding = 20; // Space between screenshots
    
    crawledLinks.forEach(({ url, depth }) => {
      const screenshot = screenshots.get(url);
      if (screenshot) {
        // Create a temporary image to get the natural dimensions
        const img = new Image();
        img.src = screenshot;
        
        // Calculate dimensions maintaining aspect ratio
        const maxWidth = 400; // Maximum width for a screenshot
        const scaleFactor = maxWidth / img.naturalWidth;
        const width = maxWidth;
        const height = img.naturalHeight * scaleFactor;
        
        // Place screenshots in a single row
        layout.set(url, {
          x: currentX,
          y: 50, // Fixed Y position for single row
          width,
          height
        });
        
        currentX += width + padding;
      }
    });
    
    layout = new Map(layout);
  }
  
  function handleWheel(event: WheelEvent) {
    event.preventDefault();
    
    if (event.ctrlKey || event.metaKey) {
      // Zoom
      const rect = canvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      
      const delta = -event.deltaY * ZOOM_SPEED;
      const oldScale = $viewport.scale;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, oldScale * (1 + delta)));
      
      if (newScale !== oldScale) {
        const scaleRatio = newScale / oldScale;
        const focusX = mouseX - $viewport.x;
        const focusY = mouseY - $viewport.y;
        
        viewport.set({
          scale: newScale,
          x: mouseX - focusX * scaleRatio,
          y: mouseY - focusY * scaleRatio
        });
      }
    } else {
      // Pan
      viewport.set({
        ...$viewport,
        x: $viewport.x - event.deltaX,
        y: $viewport.y - event.deltaY
      });
    }
  }
  
  function startDragging(event: MouseEvent) {
    if (event.button !== 0) return;
    
    isDragging = true;
    startX = event.clientX - $viewport.x;
    startY = event.clientY - $viewport.y;
    canvas.style.cursor = 'grabbing';
  }
  
  function handleDrag(event: MouseEvent) {
    if (!isDragging) return;
    
    viewport.set({
      ...$viewport,
      x: event.clientX - startX,
      y: event.clientY - startY
    });
  }
  
  function stopDragging() {
    isDragging = false;
    canvas.style.cursor = 'grab';
  }
  
  function drawMinimap() {
    if (!minimap) return;
    
    const ctx = minimap.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, minimap.width, minimap.height);
    
    // Draw background
    ctx.fillStyle = 'var(--surface)';
    ctx.fillRect(0, 0, minimap.width, minimap.height);
    
    // Draw screenshots
    layout.forEach((pos, url) => {
      ctx.fillStyle = 'var(--primary)';
      ctx.fillRect(
        pos.x * 0.1,
        pos.y * 0.1,
        pos.width * 0.1,
        pos.height * 0.1
      );
    });
    
    // Draw viewport
    ctx.strokeStyle = 'var(--text)';
    ctx.strokeRect(
      -$viewport.x * 0.1,
      -$viewport.y * 0.1,
      canvas.clientWidth * 0.1,
      canvas.clientHeight * 0.1
    );
  }
  
  // Initialize
  onMount(() => {
    console.log("Screenshots received:", screenshots);
    console.log("Screenshots base64 data:", Array.from(screenshots.values()));
    initLayout();
    viewport.subscribe(drawMinimap);
  });
  
  $: {
    if (screenshots || crawledLinks) {
      initLayout();
    }
  }
</script>

<div class="canvas-container" class:open={isOpen}>
  <div class="toolbar">
    <div class="toolbar-left">
      <button on:click={() => viewport.set({ x: 0, y: 0, scale: 1 })}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
        </svg>
        Reset View
      </button>
      <span class="zoom-level">{Math.round($viewport.scale * 100)}%</span>
    </div>
    <div class="toolbar-right">
      <button on:click={onClose}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
  
  <div
    class="canvas"
    bind:this={canvas}
    on:wheel={handleWheel}
    on:mousedown={startDragging}
    on:mousemove={handleDrag}
    on:mouseup={stopDragging}
    on:mouseleave={stopDragging}
  >
    <div
      class="content"
      style="transform: translate({$viewport.x}px, {$viewport.y}px) scale({$viewport.scale})"
    >
      <div class="grid"></div>
      {#each [...layout.entries()] as [url, pos]}
        <div
          class="screenshot"
          style="
            left: {pos.x}px;
            top: {pos.y}px;
            width: {pos.width}px;
            height: {pos.height}px;
          "
        >
          <img
            src={`data:image/jpeg;base64,${screenshots.get(url)}`}
            alt={url}
            draggable="false"
            on:load={() => console.log(`Setting src for ${url}: data:image/jpeg;base64,${screenshots.get(url)}`)}
          />
          <div class="url">{url}</div>
        </div>
      {/each}
    </div>
  </div>
  
  
</div>

<style>
  .canvas-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--surface);
    z-index: 1000;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
  }
  
  .canvas-container.open {
    opacity: 1;
    pointer-events: all;
  }
  
  .toolbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    z-index: 1;
    background-color: #0F172A;
  }
  
  .toolbar-left,
  .toolbar-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .zoom-level {
    font-size: 14px;
    color: var(--text-2);
  }
  
  .canvas {
    width: 100%;
    height: 100%;
    cursor: grab;
    overflow: hidden;
  }
  
  .canvas:active {
    cursor: grabbing;
  }
  
  .screenshot {
    position: absolute;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: transform 0.2s ease;
  }
  
  .screenshot:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }
  
  .screenshot img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .screenshot .url {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    background: var(--surface-3);
    color: var(--text);
    cursor: pointer;
    transition: background 0.2s ease;
  }
  
  button:hover {
    background: var(--surface-4);
  }
  
  .minimap {
    position: fixed;
    bottom: 16px;
    right: 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    opacity: 0.75;
    transition: opacity 0.2s ease;
  }
  
  .minimap:hover {
    opacity: 1;
  }
</style>
