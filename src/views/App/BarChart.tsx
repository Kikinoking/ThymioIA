import { Bar } from 'react-chartjs-2';

const BarChart = ({ data, labels }) => {
  const chartData = {
    labels: labels,
    datasets: [
      {
        label: 'Prediction Probability',
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
        borderWidth: 0.15,
      },
    ],
  };

  const options = {
    maintainAspectRatio: true, // Permet au graphique de remplir le conteneur
    scales: {
      x: {
        ticks: {
          color: '#dfe8e8',
          font: {
            family: 'Roboto', // Utilisez la police Roboto
            size: 14, // Taille de la police pour les ticks de l'axe X
          }
        },
        title: {
          display: true,
          text: 'Actions',
          color: '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 16, // Taille de la police pour le titre de l'axe X
          }
        },
      },
      y: {
        ticks: {
          color: '#dfe8e8',
          font: {
            family: 'Roboto', // Utilisez la police Roboto
            size: 14, // Taille de la police pour les ticks de l'axe Y
          }
        },
        title: {
          display: true,
          text: 'Probability',
          color: '#dfe8e8',
          font: {
            family: 'Roboto',
            size: 16, // Taille de la police pour le titre de l'axe Y
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
            size: 18, // Taille de la police pour la légende
          }
        },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default BarChart;
