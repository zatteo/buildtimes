import React, { useEffect, useState } from 'react';

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
import { useDebounce } from './useDebounce'

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
  const [fetchStatus, setFetchStatus] = useState('idle');
  const [repositorySlug, setRepositorySlug] = useState('cozy/cozy-contacts');
  const [travisToken, setTravisToken] = useState(process.env.REACT_APP_TRAVIS_TOKEN ?? '');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if(searchParams.has('repository')) {
      setRepositorySlug(searchParams.get('repository'));
    }
    if(searchParams.has('travis-token')) {
      setTravisToken(searchParams.get('travis-token'));
    }
  }, [])

  const debouncedRepositorySlug = useDebounce(repositorySlug, {
    delay: 500,
    ignore: repositorySlug === ''
  })

  const fetchBuildTimes = async ({ repositorySlug, travisToken } = {}) => {
    setBuildTimes([]);
    setFetchStatus('loading');
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
      setFetchStatus('loaded');
    } catch (error) {
      setFetchStatus('failed');
      console.error('Error fetching build information:', error.message);
    }
  };

  useEffect(() => {
    if(debouncedRepositorySlug !== '' && travisToken !== '') {
      fetchBuildTimes({ repositorySlug: debouncedRepositorySlug, travisToken });
    }
  }, [debouncedRepositorySlug, travisToken]);

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

  const handleRepositoryChange = (e) => {
    const value = e.target.value
    setRepositorySlug(value);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('repository', value);
    window.history.replaceState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
  }

  const handleTravisTokenChange = (e) => {
    setTravisToken(e.target.value);
  }

  return (
    <div style={{ margin: '1rem' }}>
      <h1>Travis Build Times</h1>

      <form method="post">
        <label>
          Repository slug: <input name="repositorySlug" value={repositorySlug} onChange={handleRepositoryChange} />
        </label>
        <label>
          Travis token: <input name="travisToken" type="password" value={travisToken} onChange={handleTravisTokenChange} />
        </label>
      </form>

      {fetchStatus === 'loading' ? <p>Waiting...</p> : null}
      {fetchStatus === 'failed' ? <p style={{ color: 'red' }}>Failed to fetch build times</p> : null}

      {fetchStatus === 'loaded' && buildTimes.length > 0 ? (
        <div>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : null }
    </div>
  );
};

export default TravisBuildTimes;
