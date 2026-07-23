import { useEffect, useMemo, useRef, useState } from 'react';

interface VirtualGridProps<T> {
  items: T[];
  itemHeight?: number;
  gap?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
}

export function VirtualItemGrid<T>({
  items,
  itemHeight = 220,
  gap = 16,
  renderItem,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setContainerHeight(el.clientHeight);
      setContainerWidth(el.clientWidth);
      setScrollTop(el.scrollTop);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const columns = useMemo(() => {
    if (containerWidth < 768) return 1;
    if (containerWidth < 1280) return 2;
    return 3;
  }, [containerWidth]);

  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * itemHeight + Math.max(0, totalRows - 1) * gap;

  const startRow = Math.max(0, Math.floor(scrollTop / (itemHeight + gap)));
  const visibleRows = Math.ceil(containerHeight / (itemHeight + gap)) + 1;
  const endRow = Math.min(totalRows - 1, startRow + visibleRows);

  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length, (endRow + 1) * columns);
  const visibleItems = items.slice(startIndex, endIndex);

  const paddingTop = startRow * (itemHeight + gap);

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      <div style={{ height: totalHeight, paddingTop }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 content-start">
        {visibleItems.map((item, i) => (
          <div key={startIndex + i} style={{ minHeight: itemHeight }}>
            {renderItem(item, startIndex + i)}
          </div>
        ))}
      </div>
    </div>
  );
}
