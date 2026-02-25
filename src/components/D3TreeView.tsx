import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface D3TreeViewProps {
  data: any;
}

interface TreeNode {
  name: string;
  fullText?: string;
  isExpandedText?: boolean;
  value?: any;
  children?: TreeNode[];
  _children?: TreeNode[];
  id?: number;
  color?: string;
}

export function D3TreeView({ data }: D3TreeViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    // Transform JSON to D3 Hierarchy format
    const transformData = (name: string, value: any): TreeNode => {
      if (Array.isArray(value)) {
        return {
          name,
          children: value.map((item, index) => {
            const childName = item?.id || item?.label || item?.name || `[${index}]`;
            return transformData(childName, item);
          }),
        };
      } else if (value !== null && typeof value === 'object') {
        return {
          name,
          children: Object.entries(value).map(([k, v]) => transformData(k, v)),
        };
      } else {
        // Truncate long text values for the graph
        let valStr = String(value);
        let isLong = valStr.length > 50;
        return {
          name: isLong ? `${name}: ${valStr.substring(0, 47)}...` : `${name}: ${valStr}`,
          fullText: isLong ? `${name}: ${valStr}` : undefined,
          isExpandedText: false,
          value: 1,
        };
      }
    };

    const rootData: TreeNode = {
      name: 'root',
      children: Object.entries(data).map(([k, v]) => transformData(k, v)),
    };

    const width = Math.max(dimensions.width, 800);
    const dx = 60; // vertical spacing
    const dy = 250; // horizontal spacing
    const margin = { top: 20, right: 120, bottom: 20, left: 40 };

    const root = d3.hierarchy<TreeNode>(rootData);
    
    // Assign colors
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    root.each(d => {
      if (d.depth === 1) {
        (d as any).color = colorScale(d.data.name);
      } else if (d.depth > 1) {
        (d as any).color = (d.parent as any).color;
      } else {
        (d as any).color = '#f8fafc';
      }
    });

    // Calculate tree height based on number of nodes
    const treeHeight = root.descendants().length * dx;
    const height = Math.max(dimensions.height, treeHeight + margin.top + margin.bottom);

    const tree = d3.tree<TreeNode>().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal<any, any>().x(d => d.y).y(d => d.x);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const zoomG = svg.append('g');

    const g = zoomG.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        zoomG.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Set initial transform to center the tree vertically
    const initialTransform = d3.zoomIdentity.translate(margin.left, dimensions.height / 2);
    svg.call(zoom.transform as any, initialTransform);

    const gLink = g.append('g')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.1)')
      .attr('stroke-width', 1.5);

    const gNode = g.append('g')
      .attr('cursor', 'pointer')
      .attr('pointer-events', 'all');

    let i = 0;

    const drag = d3.drag()
      .on('start', function(event, d: any) {
        event.sourceEvent.stopPropagation();
        const dx = event.x - d.y;
        const dy = event.y - d.x;
        d._dragStartAngle = Math.atan2(dy, dx);
        d._startRotation = d.circularRotation || 0;
        d3.select(this).attr('cursor', 'grabbing');
      })
      .on('drag', function(event, d: any) {
        const dx = event.x - d.y;
        const dy = event.y - d.x;
        const currentAngle = Math.atan2(dy, dx);
        const delta = currentAngle - d._dragStartAngle;
        d.circularRotation = d._startRotation + delta;
        update(d, 0);
      })
      .on('end', function(event, d: any) {
        d3.select(this).attr('cursor', 'grab');
      });

    function update(source: any, duration = 400) {
      const nodes = root.descendants().reverse();
      const links = root.links();

      // Compute the new tree layout.
      tree(root);

      // Adjust positions for circular leaves
      const circularParents: any[] = [];
      root.each(d => {
        if (d.children && d.children.length > 1) {
          // Check if all children are true leaves
          const allLeaves = d.children.every(c => !c.children && !c.data._children && c.data.value === 1);
          if (allLeaves && d.children.length > 5) { // Only circular if > 5 options
            const r = Math.max(60, d.children.length * 8);
            (d as any).circularRadius = r;
            if ((d as any).circularRotation === undefined) {
              (d as any).circularRotation = 0;
            }
            circularParents.push(d);
            d.children.forEach((c, index) => {
              const baseAngle = (index / d.children!.length) * 2 * Math.PI;
              const angle = baseAngle + (d as any).circularRotation;
              // d3 tree is horizontal: y is horizontal, x is vertical
              c.y = d.y + r * Math.cos(angle);
              c.x = d.x + r * Math.sin(angle);
              (c as any).isCircular = true;
              (c as any).circularAngle = angle;
            });
          }
        }
      });

      let left = root;
      let right = root;
      root.eachBefore(node => {
        if ((node as any).x < (left as any).x) left = node;
        if ((node as any).x > (right as any).x) right = node;
      });

      const transition = svg.transition()
          .duration(duration);

      // Determine active path for 3D depth effect
      const activeNodes = new Set();
      let curr: any = root;
      activeNodes.add(curr);

      while (curr && curr.children) {
        const expandedChild = curr.children.find((c: any) => c.children && c.children.length > 0);
        if (expandedChild) {
          activeNodes.add(expandedChild);
          curr = expandedChild;
        } else {
          curr.children.forEach((c: any) => activeNodes.add(c));
          break;
        }
      }

      // Update the nodes...
      const node = gNode.selectAll<SVGGElement, d3.HierarchyPointNode<TreeNode>>('g.node')
        .data(nodes, d => (d.data as any).id || ((d.data as any).id = ++i));

      // Enter any new nodes at the parent's previous position.
      const nodeEnter = node.enter().append('g')
          .attr('class', 'node')
          .attr('transform', d => `translate(${source.y0 || 0},${source.x0 || 0})`)
          .style('opacity', 0)
          .on('click', (event, d: any) => {
            // If it's a leaf node with long text, toggle text
            if (d.data.fullText && !d.children && !d.data._children) {
              d.data.isExpandedText = !d.data.isExpandedText;
              update(d);
              return;
            }

            // Exclusive expand (accordion)
            if (d.parent && d.data._children) {
              d.parent.children.forEach((sibling: any) => {
                if (sibling !== d && sibling.children) {
                  sibling.data._children = sibling.children;
                  sibling.children = null;
                }
              });
            }

            d.children = d.children ? null : d.data._children;
            update(d);

            // Zoom focus on the clicked node
            const scale = d3.zoomTransform(svg.node() as Element).k;
            const x = dimensions.width / 2 - (d.y + margin.left) * scale;
            const y = dimensions.height / 2 - (d.x + margin.top) * scale;

            svg.transition().duration(750).call(
              zoom.transform as any, 
              d3.zoomIdentity.translate(x, y).scale(scale)
            );
          });

      nodeEnter.append('circle')
          .attr('r', 8)
          .attr('fill', d => {
            if (d.data._children) return (d as any).color;
            return '#1C1C1E';
          })
          .attr('stroke', d => (d as any).color)
          .attr('stroke-width', 2);

      nodeEnter.append('text')
          .attr('class', 'node-text-bg text-[12px] font-medium')
          .attr('dy', '-1.2em')
          .attr('x', 0)
          .attr('text-anchor', 'middle')
          .text(d => {
            let text = d.data.isExpandedText && d.data.fullText ? d.data.fullText : d.data.name;
            if ((d as any).isCircular) text = text.replace(/^\[\d+\]:\s*/, '');
            return text;
          })
          .attr('stroke-linejoin', 'round')
          .attr('stroke-width', 3)
          .attr('stroke', '#1C1C1E');

      nodeEnter.append('text')
          .attr('class', 'node-text-fg text-[12px] font-medium')
          .attr('dy', '-1.2em')
          .attr('x', 0)
          .attr('text-anchor', 'middle')
          .attr('fill', '#FFFFFF')
          .text(d => {
            let text = d.data.isExpandedText && d.data.fullText ? d.data.fullText : d.data.name;
            if ((d as any).isCircular) text = text.replace(/^\[\d+\]:\s*/, '');
            return text;
          });

      const nodeMerge = node.merge(nodeEnter);

      // Update text values (in case of toggle)
      nodeMerge.selectAll('text.node-text-bg, text.node-text-fg')
          .text((d: any) => {
            let text = d.data.isExpandedText && d.data.fullText ? d.data.fullText : d.data.name;
            if ((d as any).isCircular) text = text.replace(/^\[\d+\]:\s*/, '');
            return text;
          });

      // Update circle colors (in case of theme change or expand/collapse)
      nodeMerge.selectAll('circle')
          .attr('fill', (d: any) => {
            if (d.data._children) return (d as any).color;
            return '#1C1C1E';
          })
          .attr('stroke', (d: any) => (d as any).color);

      // Transition nodes to their new position.
      const nodeUpdate = nodeMerge.transition(transition)
          .attr('transform', d => `translate(${d.y},${d.x})`)
          .style('opacity', d => activeNodes.has(d) ? 1 : 0.05);

      // Transition exiting nodes to the parent's new position.
      const nodeExit = node.exit().transition(transition).remove()
          .attr('transform', d => `translate(${source.y},${source.x})`)
          .style('opacity', 0);

      // Update the links...
      const link = gLink.selectAll<SVGPathElement, d3.HierarchyPointLink<TreeNode>>('path.link')
        .data(links, d => (d.target.data as any).id);

      // Enter any new links at the parent's previous position.
      const linkEnter = link.enter().append('path')
          .attr('class', 'link')
          .attr('d', d => {
            const o = {x: source.x0 || 0, y: source.y0 || 0};
            return diagonal({source: o, target: o} as any);
          })
          .style('opacity', 0);

      // Transition links to their new position.
      link.merge(linkEnter).transition(transition)
          .attr('d', diagonal as any)
          .style('opacity', d => activeNodes.has(d.target) ? 0.6 : 0.02);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition(transition).remove()
          .attr('d', d => {
            const o = {x: source.x, y: source.y};
            return diagonal({source: o, target: o} as any);
          })
          .style('opacity', 0);

      // Circular links
      const circleLink = gLink.selectAll<SVGCircleElement, any>('circle.circular-link')
        .data(circularParents, d => d.data.id);

      const circleLinkEnter = circleLink.enter().append('circle')
          .attr('class', 'circular-link')
          .attr('fill', 'transparent')
          .attr('stroke', 'rgba(255,255,255,0.1)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '4 4')
          .attr('cursor', 'grab')
          .style('pointer-events', 'all')
          .attr('cx', d => source.y0 || source.y)
          .attr('cy', d => source.x0 || source.x)
          .attr('r', 0)
          .style('opacity', 0)
          .call(drag as any);

      circleLink.merge(circleLinkEnter).transition(transition)
          .attr('cx', d => d.y)
          .attr('cy', d => d.x)
          .attr('r', d => d.circularRadius)
          .style('opacity', d => activeNodes.has(d) ? 0.4 : 0.02);

      circleLink.exit().transition(transition).remove()
          .attr('cx', d => source.y)
          .attr('cy', d => source.x)
          .attr('r', 0)
          .style('opacity', 0);

      // Stash the old positions for transition.
      root.eachBefore(d => {
        (d as any).x0 = (d as any).x;
        (d as any).y0 = (d as any).y;
      });
    }

    // Initialize the display to show a few nodes.
    (root as any).x0 = dy / 2;
    (root as any).y0 = 0;
    root.descendants().forEach((d: any) => {
      d.data.id = ++i;
      d.data._children = d.children;
      if (d.depth > 0) d.children = null; // Collapse nodes deeper than level 0 (only root visible)
    });

    update(root);

  }, [data, dimensions]);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-surface-soft dark:bg-[#1C1C1E] rounded-[16px] min-h-[500px] relative transition-colors duration-200">
      <div className="absolute top-4 right-4 z-10 bg-white/80 dark:bg-[#2C2C2E]/80 backdrop-blur px-3 py-1.5 rounded-full text-[12px] font-medium text-text-muted dark:text-[#9A9AA0] shadow-sm border border-divider dark:border-white/5 pointer-events-none">
        Usa el scroll para hacer zoom, arrastra para mover y gira los círculos punteados
      </div>
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
    </div>
  );
}
