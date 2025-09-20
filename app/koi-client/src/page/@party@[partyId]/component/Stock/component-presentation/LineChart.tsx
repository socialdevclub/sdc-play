import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

interface LineChartData {
  year: string;
  value: number;
}

interface LineChartProps {
  data: LineChartData[];
  height?: number;
}

const LineChart = ({ data, height = 300 }: LineChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = echarts.init(chartRef.current);

    const option = {
      grid: {
        bottom: '0%',
        containLabel: true,
        left: '0%',
        right: '0%',
        top: '0%',
      },
      series: [
        {
          areaStyle: {
            color: {
              colorStops: [
                {
                  color: 'rgba(69, 183, 209, 0.3)',
                  offset: 0,
                },
                {
                  color: 'rgba(69, 183, 209, 0.05)',
                  offset: 1,
                },
              ],
              type: 'linear',
              x: 0,
              x2: 0,
              y: 0,
              y2: 1,
            },
          },
          data: data.map((item) => item.value),
          emphasis: {
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 3,
              color: '#45B7D1',
              shadowBlur: 10,
              shadowColor: 'rgba(69, 183, 209, 0.5)',
            },
          },
          itemStyle: {
            borderColor: '#ffffff',
            borderWidth: 2,
            color: '#45B7D1',
          },
          lineStyle: {
            color: '#45B7D1',
            width: 3,
          },
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          type: 'line',
        },
      ],
      tooltip: {
        backgroundColor: 'rgba(50, 50, 50, 0.9)',
        borderColor: '#333',
        formatter: (params: unknown) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const param = (params as any[])[0];
          return `${param.axisValue}<br/>총자산: ${param.value.toLocaleString()}원`;
        },
        textStyle: {
          color: '#fff',
        },
        trigger: 'axis',
      },
      xAxis: {
        axisLabel: {
          color: '#666666',
          fontSize: 12,
        },
        axisLine: {
          lineStyle: {
            color: '#e0e0e0',
          },
        },
        axisTick: {
          alignWithLabel: true,
        },
        data: data.map((item) => item.year),
        type: 'category',
      },
      yAxis: {
        axisLabel: {
          color: '#666666',
          fontSize: 12,
          formatter: (value: number) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(0)}M`;
            }
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}K`;
            }
            return value.toString();
          },
        },
        axisLine: {
          lineStyle: {
            color: '#e0e0e0',
          },
        },
        splitLine: {
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed',
          },
        },
        type: 'value',
      },
    };

    chart.setOption(option);

    // 반응형 처리
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    // eslint-disable-next-line consistent-return
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div
        style={{
          alignItems: 'center',
          color: '#999',
          display: 'flex',
          fontSize: '14px',
          height,
          justifyContent: 'center',
        }}
      >
        데이터가 없습니다
      </div>
    );
  }

  return <div ref={chartRef} style={{ height, width: '100%' }} />;
};

export default LineChart;
