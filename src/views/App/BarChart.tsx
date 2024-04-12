import { Bar } from 'react-chartjs-2';

const BarChart = ({ data, labels }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Prediction Probability',
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
    maintainAspectRatio: true,
    scales: {
      x: {
        ticks: {
          color: '#dfe8e8', // Couleur des étiquettes de l'axe X
          font: {
            family: 'Roboto',
            size: 14,
          }
        },
        grid: {
          drawBorder: true, // Dessine la bordure de l'axe
          borderWidth: 2, // Épaisseur de la bordure de l'axe
          borderColor: 'rgba(223, 232, 232, 1)', // Couleur de la bordure de l'axe
          drawOnChartArea: false, // N'affiche pas les grilles dans la zone du graphique
        },
        title: {
          display: true,
          text: 'Actions',
          color: '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 16,
          }
        },
      },
      y: {
        ticks: {
          color: '#dfe8e8', // Couleur des étiquettes de l'axe Y
          font: {
            family: 'Roboto',
            size: 14,
          }
        },
        grid: {
          drawBorder: true, // Dessine la bordure de l'axe
          borderWidth: 20, // Épaisseur de la bordure de l'axe
          borderColor: 'rgba(255, 255, 255, 1)', // Couleur de la bordure de l'axe
          drawOnChartArea: false, // N'affiche pas les grilles dans la zone du graphique
        },
        title: {
          display: true,
          text: 'Probability',
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
