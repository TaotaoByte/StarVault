import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { TagNetwork } from '@starvault/core';

type EChartsInstance = ReturnType<typeof echarts.init>;

export function TagNetworkChart({ data }: { data: TagNetwork }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsInstance | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = echarts.init(ref.current);
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(
      {
        tooltip: {
          formatter: (params: { dataType: string; name: string; value?: number }) => {
            if (params.dataType === 'node') {
              return `${params.name}<br/>项目数: ${params.value ?? 0}`;
            }
            return `${params.name}<br/>共现次数: ${params.value ?? 0}`;
          },
        },
        series: [
          {
            type: 'graph',
            layout: 'force',
            data: data.nodes.map(node => ({
              id: node.id,
              name: node.name,
              value: node.count,
              symbolSize: 12 + Math.sqrt(node.count) * 6,
              itemStyle: { color: node.color },
            })),
            links: data.edges.map(edge => ({
              source: edge.source,
              target: edge.target,
              value: edge.weight,
            })),
            roam: true,
            label: { show: true, color: 'var(--text-primary)' },
            force: { repulsion: 240, edgeLength: 90 },
            lineStyle: { color: 'source', curveness: 0.1, opacity: 0.6 },
            emphasis: {
              focus: 'adjacency',
              lineStyle: { width: 4 },
            },
          },
        ],
      },
      true
    );
  }, [data]);

  return <div ref={ref} className="w-full h-full min-h-[400px]" />;
}
