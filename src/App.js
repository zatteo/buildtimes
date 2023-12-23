import React, { useState } from 'react';

import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
  
import 'chartjs-adapter-date-fns';

import { Line } from 'react-chartjs-2';

ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
  );

const TravisBuildTimes = () => {
  const [buildTimes, setBuildTimes] = useState([]);

  function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const formJson = Object.fromEntries(formData.entries());
    fetchBuildTimes(formJson);
  }

  const fetchBuildTimes = async ({ repositorySlug, travisToken }) => {
    try {
      const encodedRepositorySlug = encodeURIComponent(repositorySlug);

      const response = await fetch(
        `https://api.travis-ci.com/repo/${encodedRepositorySlug}/builds?state=passed&event_type=push&limit=100&branch.name=master`,
        {
          headers: {
            'Travis-API-Version': '3',
            Authorization: `token ${travisToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      const builds = data.builds || [];

      const formattedBuildTimes = builds.map((build) => ({
        date: new Date(build.started_at).toISOString(),
        duration: build.duration / 60, // convert seconds to minutes
      })).sort((a, b) => a.date - b.date);

      setBuildTimes(formattedBuildTimes);
    } catch (error) {
      console.error('Error fetching build information:', error.message);
    }
  };

  const chartData = {
    labels: buildTimes.map((build) => build.date),
    datasets: [
      {
        label: 'Build duration (minutes)',
        data: buildTimes.map((build) => build.duration),
        borderColor: 'rgb(75, 192, 192)'
      },
    ],
  };

  const chartOptions = {
    scales: {
      x: {
        type: 'time',
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div>
      <h1>Travis Build Times</h1>

      <form method="post" onSubmit={handleSubmit}>
        <label>
          Repository slug: <input name="repositorySlug" defaultValue="cozy/cozy-contacts" />
        </label>
        <label>
          Travis token: <input name="travisToken" type="password" defaultValue={process.env.REACT_APP_TRAVIS_TOKEN} />
        </label>
        <button type="submit">Submit form</button>
      </form>

      {buildTimes.length > 0 ? (
        <div>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : (
        <p>Waiting...</p>
      )}
    </div>
  );
};

export default TravisBuildTimes;
