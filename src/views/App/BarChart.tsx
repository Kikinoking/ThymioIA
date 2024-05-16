import { Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import Chart from 'chart.js/auto';

const backgroundPlugin = {
  id: 'customCanvasBackground',
  beforeDraw: (chart) => {
    const ctx = chart.ctx;
    const canvas = chart.canvas;
    ctx.save();
    ctx.fillStyle = chart.options.plugins.customCanvasBackground.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
};

const BarChart = ({ data, labels, theme }) => {
  const { t } = useTranslation();

  // Define more vivid colors for light theme
  const lightThemeColors = [
    'rgba(255, 50, 102, 1)',   // More opaque and brighter red
    'rgba(13, 10, 235, 1)',   // Brighter blue
    'rgba(255, 230, 56, 1)',   // Brighter yellow
    'rgba(30, 220, 220, 1)',   // Brighter cyan
    'rgba(80, 242, 40, 1)'   // Brighter purple
  ];

  const darkThemeColors = [
    'rgba(255, 99, 132, 0.9)',
    'rgba(54, 162, 235, 0.9)',
    'rgba(255, 206, 86, 0.9)',
    'rgba(75, 192, 192, 0.9)',
    'rgba(153, 102, 255, 0.9)',
  ];

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: t('bar_chart.prediction_probability'),
        data: data,
        backgroundColor: theme === 'light' ? lightThemeColors : darkThemeColors,
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 0.15,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme === 'light' ? '#ffffff' : '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 18,
          }
        },
      },
      customCanvasBackground: {
        color: theme === 'light' ? '#828080' : 'transparent',
      }
    },
    scales: {
      x: {
        ticks: {
          color: theme === 'light' ? '#ffffff' : '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 14,
          }
        },
        grid: {
          drawBorder: false,
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: t('bar_chart.actions'),
          color: theme === 'light' ? '#ffffff' : '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 16,
          }
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: theme === 'light' ? '#ffffff' : '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 14,
          }
        },
        grid: {
          drawBorder: false,
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: t('bar_chart.probability'),
          color: theme === 'light' ? '#ffffff' : '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 16,
          }
        },
      },
    },
  };

  Chart.register(backgroundPlugin);

  return <Bar data={chartData} options={options} />;
};

export default BarChart;
