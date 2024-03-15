import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface QualityMetric {
  id: string;
  name: string;
  value: number;
  threshold: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  timestamp: string;
  category: string;
}

interface QualityMetricsProps {
  metrics: QualityMetric[];
  title?: string;
  height?: number;
  showPieChart?: boolean;
  showBarChart?: boolean;
}

export const QualityMetrics: React.FC<QualityMetricsProps> = ({
  metrics,
  title = "Quality Metrics Dashboard",
  height = 400,
  showPieChart = true,
  showBarChart = true
}) => {
  // Process data for charts
  const statusCounts = metrics.reduce((acc, metric) => {
    acc[metric.status] = (acc[metric.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    status
  }));

  const barData = metrics.map(metric => ({
    name: metric.name,
    value: metric.value,
    threshold: metric.threshold,
    status: metric.status,
    category: metric.category
  }));

  // Color scheme for different statuses
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'warning': return '#FF9800';
      case 'critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const COLORS = ['#4CAF50', '#8BC34A', '#FF9800', '#F44336'];

  return (
    <div className="quality-metrics">
      <h3 className="chart-title">{title}</h3>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className={`summary-card ${status}`}>
            <div className="card-icon">
              <span className={`status-indicator ${status}`}></span>
            </div>
            <div className="card-content">
              <h4>{status.charAt(0).toUpperCase() + status.slice(1)}</h4>
              <p className="count">{count}</p>
              <p className="percentage">
                {((count / metrics.length) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-container">
        {showPieChart && (
          <div className="chart-section">
            <h4>Status Distribution</h4>
            <ResponsiveContainer width="100%" height={height / 2}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {showBarChart && (
          <div className="chart-section">
            <h4>Metric Values vs Thresholds</h4>
            <ResponsiveContainer width="100%" height={height / 2}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}${name === 'value' ? '' : ''}`,
                    name === 'value' ? 'Value' : 'Threshold'
                  ]}
                />
                <Legend />
                <Bar 
                  dataKey="value" 
                  fill="#2196F3" 
                  name="Value"
                />
                <Bar 
                  dataKey="threshold" 
                  fill="#FF9800" 
                  name="Threshold"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Detailed Metrics Table */}
      <div className="metrics-table">
        <h4>Detailed Metrics</h4>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Value</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Category</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.id} className={`metric-row ${metric.status}`}>
                  <td>{metric.name}</td>
                  <td>{metric.value.toFixed(2)}</td>
                  <td>{metric.threshold.toFixed(2)}</td>
                  <td>
                    <span className={`status-badge ${metric.status}`}>
                      {metric.status}
                    </span>
                  </td>
                  <td>{metric.category}</td>
                  <td>{new Date(metric.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .quality-metrics {
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .chart-title {
          margin-bottom: 20px;
          color: #333;
          font-size: 1.5em;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 30px;
        }

        .summary-card {
          display: flex;
          align-items: center;
          padding: 15px;
          border-radius: 8px;
          background: #f9f9f9;
          border-left: 4px solid;
        }

        .summary-card.excellent { border-left-color: #4CAF50; }
        .summary-card.good { border-left-color: #8BC34A; }
        .summary-card.warning { border-left-color: #FF9800; }
        .summary-card.critical { border-left-color: #F44336; }

        .card-icon {
          margin-right: 15px;
        }

        .status-indicator {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: block;
        }

        .status-indicator.excellent { background-color: #4CAF50; }
        .status-indicator.good { background-color: #8BC34A; }
        .status-indicator.warning { background-color: #FF9800; }
        .status-indicator.critical { background-color: #F44336; }

        .card-content h4 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 1.1em;
        }

        .card-content .count {
          margin: 0 0 5px 0;
          font-size: 1.5em;
          font-weight: bold;
          color: #333;
        }

        .card-content .percentage {
          margin: 0;
          color: #666;
          font-size: 0.9em;
        }

        .charts-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .chart-section {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 6px;
        }

        .chart-section h4 {
          margin-bottom: 15px;
          color: #333;
        }

        .metrics-table {
          margin-top: 20px;
        }

        .metrics-table h4 {
          margin-bottom: 15px;
          color: #333;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        th {
          background: #f5f5f5;
          font-weight: bold;
          color: #333;
        }

        .metric-row:hover {
          background: #f9f9f9;
        }

        .status-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8em;
          text-transform: uppercase;
          color: white;
        }

        .status-badge.excellent { background-color: #4CAF50; }
        .status-badge.good { background-color: #8BC34A; }
        .status-badge.warning { background-color: #FF9800; }
        .status-badge.critical { background-color: #F44336; }
      `}</style>
    </div>
  );
};

export default QualityMetrics;
