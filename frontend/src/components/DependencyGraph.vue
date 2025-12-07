<template>
  <div class="dependency-graph-container relative w-full h-full min-h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
    <div v-if="!graph || !graph.nodes || graph.nodes.length === 0" class="flex items-center justify-center h-full text-gray-500">
      No dependency data available.
    </div>
    <div ref="graphContainer" class="w-full h-full cursor-move"></div>
    
    <!-- Legend overlay -->
    <div class="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 p-3 rounded shadow-lg text-xs border border-gray-200 dark:border-gray-700 z-10 transition-opacity duration-300">
        <h4 class="font-semibold mb-2 dark:text-gray-200">Package Status</h4>
        <div class="flex items-center gap-2 mb-1">
            <span class="w-3 h-3 rounded-full bg-blue-500"></span>
            <span class="dark:text-gray-300">Safe Dependency</span>
        </div>
        <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-red-500"></span>
            <span class="dark:text-gray-300">Vulnerable</span>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import * as d3 from 'd3';

const props = defineProps({
  graph: {
    type: Object,
    default: () => null,
  },
  vulnerabilities: {
    type: Array, 
    default: () => [],
  }
});

const graphContainer = ref<HTMLElement | null>(null);
let simulation: any = null;

const renderGraph = () => {
  if (!props.graph || !props.graph.nodes || !graphContainer.value) return;
  
  // Clear previous
  d3.select(graphContainer.value).selectAll('*').remove();

  const width = graphContainer.value.clientWidth;
  const height = graphContainer.value.clientHeight;

  // Deep copy to avoid mutating props by reference during simulation
  const data = JSON.parse(JSON.stringify(props.graph));
  
  // Identify vulnerable nodes
  const vulnerablePackages = new Set();
  if (Array.isArray(props.vulnerabilities)) {
      props.vulnerabilities.forEach((v: any) => {
          if (v && v.packageName) vulnerablePackages.add(v.packageName);
      });
  }

  const svg = d3.select(graphContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .attr('class', 'w-full h-full block');

  // Group for zooming
  const g = svg.append('g');

  const zoom = d3.zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
          g.attr('transform', event.transform);
      });

  svg.call(zoom as any);

  // Initialize simulation
  simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(40).strength(0.7));

  // Links
  const link = g.append('g')
      .attr('stroke', '#9CA3AF') // gray-400
      .attr('stroke-opacity', 0.6)
      .attr('class', 'dark:stroke-gray-600')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('stroke-width', 1.5);

  // Node Container (Circle + Text)
  const node = g.append('g')
      .selectAll('.node')
      .data(data.nodes)
      .join('g')
      .attr('class', 'node cursor-pointer')
      .call(drag(simulation));

  // Node Circles
  const circles = node.append('circle')
      .attr('r', (d: any) => d.group === 1 ? 14 : (d.group === 2 ? 10 : 7))
      .attr('fill', (d: any) => vulnerablePackages.has(d.id) ? '#EF4444' : '#3B82F6') // red-500 : blue-500
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('class', 'dark:stroke-gray-800 transition-colors duration-300');

  // Hover effect using D3
  node.on('mouseover', function(event, d: any) {
      d3.select(this).select('circle')
        .attr('stroke', '#10B981') // emerald-500 highlight
        .attr('stroke-width', 3);
      
      d3.select(this).select('text')
        .attr('opacity', 1)
        .attr('font-weight', 'bold');
  }).on('mouseout', function() {
      d3.select(this).select('circle')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);
      
      d3.select(this).select('text')
        .attr('opacity', 0.7)
        .attr('font-weight', 'normal');
  });

  // Labels
  node.append('text')
      .text((d: any) => d.id)
      .attr('x', 15)
      .attr('y', 4)
      .attr('font-size', '12px')
      .attr('fill', 'currentColor')
      .attr('class', 'text-gray-700 dark:text-gray-300 pointer-events-none opacity-70 transition-opacity')
      .style('text-shadow', '0 1px 2px rgba(0,0,0,0.1)'); // better readability

  node.append('title')
      .text((d: any) => `${d.id} (Depth: ${d.group})`);

  simulation.on('tick', () => {
    link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
  });
};

const drag = (simulation: any) => {
  function dragstarted(event: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: any) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
}

onMounted(() => {
    if(props.graph) renderGraph();
});

watch(() => [props.graph, props.vulnerabilities], () => {
    renderGraph();
}, { deep: true });

onUnmounted(() => {
    if (simulation) simulation.stop();
});
</script>
