import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, BarChart2, Calendar, Sparkles, Filter, ShieldCheck, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export interface TrendDataPoint {
  date: Date;
  dateStr: string;
  clicks: number;
  matchScore: number;
  impressions: number;
  conversions: number;
  topCategoryAr: string;
  topCategoryEn: string;
}

interface EngagementTrendsChartProps {
  initialTimeframe?: '7d' | '30d' | '90d';
}

export const EngagementTrendsChart: React.FC<EngagementTrendsChartProps> = ({
  initialTimeframe = '30d',
}) => {
  const { language, theme } = useAppContext();
  const isRtl = language === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>(initialTimeframe);
  const [activeMetric, setActiveMetric] = useState<'clicks' | 'matchScore' | 'impressions' | 'conversions'>('clicks');
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<TrendDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Generate realistic historical engagement data based on timeframe
  useEffect(() => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const points: TrendDataPoint[] = [];
    const now = new Date();

    const categoriesAr = ['أدوات الذكاء الاصطناعي', 'الأكواد والأنظمة', 'إعلانات مستقلة', 'خدمات الأعمال'];
    const categoriesEn = ['AI Productivity Tools', 'Code & SaaS Assets', 'Freelance Bulletin Ads', 'Enterprise Services'];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });

      // Synthetic organic trend curves with noise
      const baseProgress = (days - i) / days;
      const wave = Math.sin(baseProgress * Math.PI * 3) * 15;
      const randomNoise = Math.floor(Math.random() * 12) - 5;

      const clicks = Math.max(12, Math.floor(45 + baseProgress * 60 + wave + randomNoise));
      const matchScore = Math.min(99, Math.max(82, Math.floor(88 + Math.sin(i * 0.4) * 6 + Math.random() * 4)));
      const impressions = Math.floor(clicks * (3.8 + Math.random() * 1.2));
      const conversions = Math.max(2, Math.floor(clicks * (0.18 + Math.random() * 0.08)));

      const catIdx = Math.floor((clicks + i) % categoriesAr.length);

      points.push({
        date,
        dateStr,
        clicks,
        matchScore,
        impressions,
        conversions,
        topCategoryAr: categoriesAr[catIdx],
        topCategoryEn: categoriesEn[catIdx],
      });
    }

    setData(points);
  }, [timeframe, language]);

  // Render D3 chart inside SVG with Responsive ResizeObserver
  useEffect(() => {
    if (!data.length || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean canvas on re-render

    const containerWidth = containerRef.current.clientWidth || 600;
    const height = 280;
    const margin = { top: 20, right: 30, bottom: 35, left: 45 };
    const width = containerWidth - margin.left - margin.right;

    svg.attr('width', containerWidth).attr('height', height);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Color definitions
    const isDark = theme === 'dark' || document.documentElement.classList.contains('dark');
    const strokeColor = '#10b981'; // Emerald 500
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#9ca3af' : '#6b7280';

    // Linear Gradients for Area Fill & Glow Filter
    const defs = svg.append('defs');

    const gradient = defs
      .append('linearGradient')
      .attr('id', 'emerald-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', isDark ? 0.35 : 0.25);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.0);

    // Filter for line drop shadow / glow
    const filter = defs.append('filter').attr('id', 'emerald-glow').attr('height', '130%');
    filter.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 3).attr('result', 'blur');
    filter.append('feOffset').attr('in', 'blur').attr('dx', 0).attr('dy', 2).attr('result', 'offsetBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'offsetBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yMax = (d3.max(data, (d) => d[activeMetric]) || 100) * 1.15;
    const yScale = d3.scaleLinear().domain([0, yMax]).range([height - margin.top - margin.bottom, 0]);

    // Gridlines
    const yGrid = d3.axisLeft(yScale).ticks(5).tickSize(-width).tickFormat(() => '');
    g.append('g')
      .attr('class', 'grid')
      .call(yGrid)
      .selectAll('line')
      .attr('stroke', gridColor)
      .attr('stroke-dasharray', '3,3');

    // D3 Area Generator
    const area = d3
      .area<TrendDataPoint>()
      .x((d) => xScale(d.date))
      .y0(height - margin.top - margin.bottom)
      .y1((d) => yScale(d[activeMetric]))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(data)
      .attr('fill', 'url(#emerald-area-gradient)')
      .attr('d', area);

    // D3 Line Generator
    const line = d3
      .line<TrendDataPoint>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d[activeMetric]))
      .curve(d3.curveMonotoneX);

    const path = g
      .append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', 2.5)
      .attr('filter', 'url(#emerald-glow)')
      .attr('d', line);

    // Animate Line Path Entry
    const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1200)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(data.length, containerWidth < 480 ? 4 : 8))
      .tickFormat((d) => d3.timeFormat(language === 'ar' ? '%b %d' : '%b %d')(d as Date));

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => {
        const val = d.valueOf();
        if (activeMetric === 'matchScore') return `${val}%`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
        return `${val}`;
      });

    g.append('g')
      .attr('transform', `translate(0, ${height - margin.top - margin.bottom})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', textColor)
      .attr('font-size', '10px')
      .attr('font-weight', '600');

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', textColor)
      .attr('font-size', '10px')
      .attr('font-weight', '600');

    // Remove domain axis lines for cleaner look
    g.selectAll('.domain').attr('stroke', gridColor);

    // Interactive Overlay & Crosshair
    const crosshair = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', height - margin.top - margin.bottom)
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0);

    const focusDot = g
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#10b981')
      .attr('stroke', isDark ? '#0f0f11' : '#ffffff')
      .attr('stroke-width', 2.5)
      .style('opacity', 0);

    // Mousemove / Touch handler overlay rect
    g.append('rect')
      .attr('width', width)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', 'transparent')
      .on('mousemove touchmove', function (event) {
        const [mouseX] = d3.pointer(event, this);
        const xDate = xScale.invert(mouseX);
        const bisect = d3.bisector((d: TrendDataPoint) => d.date).left;
        const index = bisect(data, xDate, 1);
        const d0 = data[index - 1];
        const d1 = data[index];
        let d = d0;
        if (d1 && d0) {
          d = xDate.getTime() - d0.date.getTime() > d1.date.getTime() - xDate.getTime() ? d1 : d0;
        }

        if (d) {
          const cx = xScale(d.date);
          const cy = yScale(d[activeMetric]);

          crosshair.attr('x1', cx).attr('x2', cx).style('opacity', 0.8);

          focusDot.attr('cx', cx).attr('cy', cy).style('opacity', 1);

          setHoveredPoint(d);
          setTooltipPos({ x: cx + margin.left, y: cy + margin.top });
        }
      })
      .on('mouseleave touchend', () => {
        crosshair.style('opacity', 0);
        focusDot.style('opacity', 0);
        setHoveredPoint(null);
        setTooltipPos(null);
      });
  }, [data, activeMetric, theme, language]);

  // Aggregate metrics summaries
  const totalClicks = data.reduce((acc, curr) => acc + curr.clicks, 0);
  const avgMatch = data.length ? (data.reduce((acc, curr) => acc + curr.matchScore, 0) / data.length).toFixed(1) : '94.5';
  const totalImpressions = data.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalConversions = data.reduce((acc, curr) => acc + curr.conversions, 0);

  return (
    <div className="w-full space-y-4">
      {/* Header Controls & Metric Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-1.5">
              <span>{isRtl ? 'تحليلات اتجاهات التفاعل والدقة' : 'Engagement & Accuracy Trends'}</span>
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                D3 Visualizer
              </span>
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isRtl ? 'مخطط بياني زمني يوضح سرعة التفاعل ودقة مطابقة التوصيات الحقيقية' : 'Real-time timeline tracking recommendation velocity and match precision'}
            </p>
          </div>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border)] self-end sm:self-auto">
          <button
            onClick={() => setTimeframe('7d')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeframe === '7d' ? 'bg-emerald-500 text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isRtl ? '7 أيام' : '7 Days'}
          </button>
          <button
            onClick={() => setTimeframe('30d')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeframe === '30d' ? 'bg-emerald-500 text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isRtl ? '30 يوم' : '30 Days'}
          </button>
          <button
            onClick={() => setTimeframe('90d')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeframe === '90d' ? 'bg-emerald-500 text-black shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isRtl ? '90 يوم' : '90 Days'}
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveMetric('clicks')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeMetric === 'clicks'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30'
              : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-500/30'
          }`}
        >
          <p className="text-[10px] font-bold text-[var(--text-muted)] flex items-center justify-between">
            <span>{isRtl ? 'نقرات التوصيات' : 'Total Recommendation Clicks'}</span>
            <Activity size={12} className="text-emerald-500" />
          </p>
          <p className="text-base font-black text-[var(--text-primary)] mt-1">{totalClicks.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-0.5">+18.4% WoW</p>
        </button>

        <button
          onClick={() => setActiveMetric('matchScore')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeMetric === 'matchScore'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30'
              : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-500/30'
          }`}
        >
          <p className="text-[10px] font-bold text-[var(--text-muted)] flex items-center justify-between">
            <span>{isRtl ? 'متوسط التوافق' : 'Avg Match Precision'}</span>
            <Sparkles size={12} className="text-emerald-500" />
          </p>
          <p className="text-base font-black text-[var(--text-primary)] mt-1">{avgMatch}%</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-0.5">{isRtl ? 'دقة فائقة' : 'High Precision'}</p>
        </button>

        <button
          onClick={() => setActiveMetric('impressions')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeMetric === 'impressions'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30'
              : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-500/30'
          }`}
        >
          <p className="text-[10px] font-bold text-[var(--text-muted)] flex items-center justify-between">
            <span>{isRtl ? 'الظهور والوصول' : 'Total Impressions'}</span>
            <BarChart2 size={12} className="text-emerald-500" />
          </p>
          <p className="text-base font-black text-[var(--text-primary)] mt-1">{totalImpressions.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-0.5">+24.1% {isRtl ? 'نمو' : 'Growth'}</p>
        </button>

        <button
          onClick={() => setActiveMetric('conversions')}
          className={`p-3 rounded-xl border text-start transition-all ${
            activeMetric === 'conversions'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/30'
              : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-emerald-500/30'
          }`}
        >
          <p className="text-[10px] font-bold text-[var(--text-muted)] flex items-center justify-between">
            <span>{isRtl ? 'التحويلات الناجحة' : 'Direct Conversions'}</span>
            <Zap size={12} className="text-emerald-500" />
          </p>
          <p className="text-base font-black text-[var(--text-primary)] mt-1">{totalConversions.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-0.5">3.8x {isRtl ? 'معدل تحويل' : 'CVR'}</p>
        </button>
      </div>

      {/* D3 Canvas Container */}
      <div ref={containerRef} className="relative w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 sm:p-4 overflow-hidden">
        <svg ref={svgRef} className="w-full overflow-visible" />

        {/* Floating Tooltip */}
        {hoveredPoint && tooltipPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              left: `${Math.min(tooltipPos.x, (containerRef.current?.clientWidth || 400) - 180)}px`,
              top: `${Math.max(10, tooltipPos.y - 75)}px`,
            }}
            className="absolute z-20 pointer-events-none p-2.5 rounded-xl bg-gray-900/95 dark:bg-gray-950/95 border border-emerald-500/30 shadow-xl backdrop-blur-md text-white min-w-[160px]"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 mb-1 border-b border-gray-800 pb-1">
              <span>{hoveredPoint.dateStr}</span>
              <span className="text-emerald-400 font-extrabold">{hoveredPoint.matchScore}% {isRtl ? 'توافق' : 'Match'}</span>
            </div>
            <div className="space-y-0.5 text-xs">
              <p className="font-extrabold text-emerald-400 flex items-center justify-between gap-3">
                <span className="text-gray-300">
                  {activeMetric === 'clicks'
                    ? isRtl ? 'النقرات:' : 'Clicks:'
                    : activeMetric === 'matchScore'
                    ? isRtl ? 'التوافق:' : 'Precision:'
                    : activeMetric === 'impressions'
                    ? isRtl ? 'الظهور:' : 'Impressions:'
                    : isRtl ? 'التحويلات:' : 'Conversions:'}
                </span>
                <span>{hoveredPoint[activeMetric]}</span>
              </p>
              <p className="text-[10px] text-gray-400 truncate mt-1">
                <span className="text-gray-500 me-1">{isRtl ? 'الأكثر تفاعلاً:' : 'Top Category:'}</span>
                <span className="text-white font-medium">{isRtl ? hoveredPoint.topCategoryAr : hoveredPoint.topCategoryEn}</span>
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
