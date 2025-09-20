import * as echarts from 'echarts';
import { useEffect, useRef, useMemo } from 'react';

interface DoughnutChartData {
  label: string;
  value: number;
  color?: string; // 개별 데이터의 색상 속성 추가
}

// 데이터 개수에 따른 높이 계산 함수 (2개 단위로 조정)
const calculateDynamicHeight = (dataLength: number, minHeight = 300, maxHeight = 700) => {
  // 0개일 때는 매우 작은 높이
  if (dataLength === 0) return Math.max(minHeight * 0.6, 120);

  // 2개 단위로 높이 단계 설정: 0, 2, 4, 6, 8, 10+
  const steps = [
    { height: minHeight, max: 2 },
    { height: minHeight + (maxHeight - minHeight) * 0.2, max: 4 },
    { height: minHeight + (maxHeight - minHeight) * 0.4, max: 6 },
    { height: minHeight + (maxHeight - minHeight) * 0.6, max: 8 },
    { height: minHeight + (maxHeight - minHeight) * 0.8, max: 10 },
    { height: maxHeight, max: Infinity }, // 10개 이상 (11개 포함)
  ];

  const step = steps.find((s) => dataLength <= s.max);
  return Math.round(step?.height || maxHeight);
};

const useDoughnutChart = (data: DoughnutChartData[]) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const myChart = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      myChart.current = echarts.init(chartRef.current);
    }

    return () => {
      myChart.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!myChart.current) return;

    // 어두운 배경에 맞는 밝고 생동감 있는 색상 팔레트 (기본 색상)
    const defaultColorPalette = [
      '#FF6B6B', // 산호 핑크
      '#4ECDC4', // 터쿼이즈
      '#45B7D1', // 스카이 블루
      '#96CEB4', // 민트 그린
      '#FFEAA7', // 따뜻한 노랑
      '#DDA0DD', // 라벤더
      '#98D8C8', // 페일 터쿼이즈
      '#F7DC6F', // 골든 옐로우
      '#BB8FCE', // 연보라
      '#85C1E9', // 라이트 블루
      '#CCCCCC', // 그레이
    ];

    // 각 데이터 항목의 개별 색상을 추출하거나 기본 색상 사용
    const chartData = data
      .filter((item) => item.value > 0)
      .map((item, index) => ({
        itemStyle: {
          // 개별 색상이 지정되어 있으면 사용, 없으면 기본 팔레트에서 선택
          color: item.color || defaultColorPalette[index % defaultColorPalette.length],
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
        name: item.label,
        value: item.value,
      }));

    const option: echarts.EChartsOption = {
      // 전체 차트 배경색을 투명하게 설정
      backgroundColor: 'transparent',
      color: defaultColorPalette, // 기본 색상 팔레트 (개별 itemStyle이 우선)
      legend: {
        show: false, // 범례는 숨기고 지시선으로 대체
      },
      series: [
        {
          animationDuration: 500,
          animationType: 'scale',
          avoidLabelOverlap: true,

          center: ['50%', '50%'], // 차트 중심 위치

          // 라벨 겹침 방지 활성화
          data: chartData,

          emphasis: {
            label: {
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: 'bold',
              show: true,
            },
            scale: true,
            scaleSize: 8,
          },

          label: {
            // 라벨 텍스트 색상
            color: '#FFFFFF',

            // 지시선과 라벨 사이 거리 증가
            distanceToLabelLine: 10,

            // 폰트 크기를 약간 줄여서 공간 확보
            fontSize: 12,
            fontWeight: 500,

            // 자산명만 표시 (비율은 제거)
            formatter: '{b}',

            // 라벨을 차트 외부에 배치
            position: 'outside',

            // 라벨 표시 활성화
            show: true,
          },

          labelLine: {
            // 지시선 표시 활성화
            length: 20,
            // 첫 번째 지시선 길이 증가
            length2: 15,
            // 직선 지시선
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.8)', // 지시선 색상
              width: 1.5, // 지시선 두께
            },

            show: true,
            // 두 번째 지시선 길이 증가
            smooth: false,
          },

          name: '포트폴리오',
          radius: ['0%', '70%'], // 도넛 크기를 조금 줄여서 라벨 공간 확보
          type: 'pie',
        },
      ],
    };

    myChart.current.setOption(option);
  }, [data]);

  return { chartRef };
};

interface Props {
  data: {
    label: string;
    value: number;
    color?: string; // 개별 색상 속성 추가
    [key: string]: unknown;
  }[];
  width?: number | string;
  minHeight?: number; // 최소 높이
  maxHeight?: number; // 최대 높이
}

const DoughnutChart = ({ data, width = '100%', minHeight = 350, maxHeight = 700 }: Props) => {
  const { chartRef } = useDoughnutChart(data);

  // 유효한 데이터 개수 계산 (value > 0인 항목만)
  const validDataCount = useMemo(() => {
    return data.filter((item) => item.value > 0).length;
  }, [data]);

  // 동적 높이 계산 (지시선을 위해 조금 더 여유 공간 확보)
  const dynamicHeight = useMemo(() => {
    const calculatedHeight = calculateDynamicHeight(validDataCount, minHeight, maxHeight);
    return calculatedHeight;
  }, [validDataCount, minHeight, maxHeight]);

  const dynamicContainerHeight = useMemo(() => {
    // 컨테이너 높이는 차트 높이보다 약간 작게 설정
    const calculatedHeight = calculateDynamicHeight(validDataCount, minHeight, maxHeight);
    const containerHeightValue = Math.max(calculatedHeight, minHeight); // 지시선을 위한 충분한 여유 공간
    console.log(`📦 DoughnutChart: 컨테이너 높이 ${containerHeightValue}px (지시선 포함)`);
    return containerHeightValue;
  }, [validDataCount, minHeight, maxHeight]);

  return (
    <div style={{ height: dynamicContainerHeight, overflow: 'hidden' }}>
      <div
        ref={chartRef}
        style={{
          borderRadius: '12px',
          height: dynamicHeight,
          width,
        }}
      />
    </div>
  );
};

export default DoughnutChart;
