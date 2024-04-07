import { Bar } from 'react-chartjs-2';

const BarChart = ({ data, labels }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Probabilité de prédiction',
        data: data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)',
          'rgba(153, 102, 255, 0.2)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      x: {
        ticks: {
          color: '#dfe8e8',
        },
        title: {
          display: true,
          text: 'Catégories',
          color: '#dfe8e8',
        },
      },
      y: {
        ticks: {
          color: '#dfe8e8',
        },
        title: {
          display: true,
          text: 'Probabilité',
          color: '#dfe8e8',
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#dfe8e8',
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default BarChart;
