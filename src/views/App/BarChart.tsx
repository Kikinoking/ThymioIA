import { Bar } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
const BarChart = ({ data, labels }) => {
  const { t } = useTranslation();
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: t('bar_chart.prediction_probability'),
        data: data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.9)',
          'rgba(54, 162, 235, 0.9)',
          'rgba(255, 206, 86, 0.9)',
          'rgba(75, 192, 192, 0.9)',
          'rgba(153, 102, 255, 0.9)',
        ],
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
    maintainAspectRatio: false, // Cela permet au graphique de s'adapter à la hauteur définie
    layout: {
      padding: {
        top: 15,
        right: 15,
        bottom: 15,
        left: 15
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#dfe8e8',
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
          color: '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 16,
          }
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#dfe8e8',
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
          color: '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 16,
          }
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 18,
          }
        },
      },
    },
  };
  
  
  

  return <Bar data={chartData} options={options} />;
};

export default BarChart;
